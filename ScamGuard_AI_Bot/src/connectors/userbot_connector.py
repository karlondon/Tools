"""
Telegram Userbot connector using Telethon.

This connects to YOUR personal Telegram account and monitors all incoming
private messages. It runs scam detection on messages from unknown contacts
and responds accordingly — without the sender knowing it's automated.

Requires:
    - Telegram API ID and API Hash from https://my.telegram.org
    - First run will ask for your phone number and verification code

IMPORTANT: This acts AS YOU on Telegram. Messages sent by the bot appear
as if you sent them personally.
"""

import asyncio
import logging
import os
from typing import Optional

from telethon import TelegramClient, events
from telethon.tl.types import User

from ..detection.scam_detector import ScamDetector, Classification
from ..response.scam_responder import ScamResponder
from ..response.legitimate_handler import LegitimateHandler
from ..reporting.scam_reporter import ScamReporter
from ..utils.contact_manager import ContactManager
from ..utils.notification import NotificationManager

logger = logging.getLogger(__name__)


class UserbotConnector:
    """
    Telegram Userbot that monitors ALL incoming private messages
    on your personal Telegram account.

    How it works:
    - Connects as your personal Telegram account (not a bot)
    - Monitors incoming private messages from non-contacts or unknown users
    - Runs scam detection on each message
    - For scams: auto-responds with time-wasting messages (appears as YOU typing)
    - For legitimate: sends polite auto-reply and notifies you via the bot
    - For known/whitelisted contacts: does nothing (lets messages through)

    Modes:
    - "all_unknown": Monitor messages from anyone not in your phone contacts
    - "non_contacts_only": Monitor messages from non-mutual contacts only
    - "all_private": Monitor ALL private messages (except whitelisted)
    """

    def __init__(
        self,
        api_id: int,
        api_hash: str,
        owner_id: str,
        session_name: str,
        scam_detector: ScamDetector,
        scam_responder: ScamResponder,
        legitimate_handler: LegitimateHandler,
        contact_manager: ContactManager,
        notification_manager: NotificationManager,
        scam_reporter: ScamReporter,
        monitor_mode: str = "all_unknown",
        auto_respond: bool = True,
    ):
        self.api_id = api_id
        self.api_hash = api_hash
        self.owner_id = owner_id
        self.session_name = session_name
        self.scam_detector = scam_detector
        self.scam_responder = scam_responder
        self.legitimate_handler = legitimate_handler
        self.contact_manager = contact_manager
        self.notification_manager = notification_manager
        self.scam_reporter = scam_reporter
        self.monitor_mode = monitor_mode
        self.auto_respond = auto_respond

        self.client: Optional[TelegramClient] = None
        self._my_contacts: set[int] = set()
        self._pending_responses: dict[str, asyncio.Task] = {}

        logger.info(
            "UserbotConnector initialized (mode=%s, auto_respond=%s)",
            monitor_mode, auto_respond
        )

    async def start(self) -> None:
        """Start the userbot client and begin monitoring."""
        # Create session directory
        session_dir = os.path.dirname(self.session_name) or "."
        os.makedirs(session_dir, exist_ok=True)

        self.client = TelegramClient(
            self.session_name,
            self.api_id,
            self.api_hash,
        )

        # Connect and authenticate
        await self.client.start()

        me = await self.client.get_me()
        logger.info(
            "Userbot connected as: %s (ID: %s)",
            me.first_name if me else "Unknown",
            me.id if me else "Unknown",
        )

        # Load phone contacts for filtering
        await self._load_contacts()

        # Register event handler for incoming private messages
        self.client.add_event_handler(
            self._handle_incoming_message,
            events.NewMessage(incoming=True, func=lambda e: e.is_private),
        )

        logger.info(
            "Userbot monitoring started (mode=%s, contacts=%d)",
            self.monitor_mode, len(self._my_contacts)
        )

        # Notify owner via bot
        await self.notification_manager.notify_system_event(
            "👁️ Userbot monitor is now active.\n"
            f"Mode: {self.monitor_mode}\n"
            f"Phone contacts loaded: {len(self._my_contacts)}\n"
            f"Auto-respond: {'ON' if self.auto_respond else 'OFF (notify only)'}"
        )

    async def stop(self) -> None:
        """Stop the userbot client."""
        # Cancel pending responses
        for task in self._pending_responses.values():
            task.cancel()
        self._pending_responses.clear()

        if self.client:
            await self.client.disconnect()
            logger.info("Userbot disconnected")

    async def _load_contacts(self) -> None:
        """Load the user's phone contacts from Telegram."""
        if not self.client:
            return

        try:
            result = await self.client.get_contacts()
            self._my_contacts = set()
            for user in result:
                if isinstance(user, User):
                    self._my_contacts.add(user.id)

            logger.info("Loaded %d phone contacts", len(self._my_contacts))
        except Exception as e:
            logger.warning("Could not load contacts: %s", e)
            self._my_contacts = set()

    def _should_monitor(self, sender: User) -> bool:
        """Determine if we should monitor messages from this sender."""
        sender_id = str(sender.id)

        # Never monitor the owner's own messages
        if sender_id == self.owner_id:
            return False

        # Never monitor whitelisted contacts
        if self.contact_manager.is_known_contact(sender_id):
            return False

        # Check blocked contacts - ignore silently
        if self.contact_manager.is_blocked(sender_id):
            return False

        # Check based on monitor mode
        if self.monitor_mode == "all_private":
            # Monitor ALL private messages except whitelisted
            return True
        elif self.monitor_mode == "non_contacts_only":
            # Only monitor people NOT in phone contacts
            return sender.id not in self._my_contacts
        elif self.monitor_mode == "all_unknown":
            # Monitor non-contacts AND contacts not in whitelist
            # This is the most protective mode
            if sender.id in self._my_contacts:
                # Phone contact but not whitelisted — optionally monitor
                # For now, let phone contacts through
                return False
            return True
        else:
            # Default: monitor non-contacts
            return sender.id not in self._my_contacts

    async def _handle_incoming_message(self, event) -> None:
        """Handle an incoming private message on the personal account."""
        if not event.message or not event.message.text:
            return

        sender = await event.get_sender()
        if not sender or not isinstance(sender, User):
            return

        # Check if we should monitor this sender
        if not self._should_monitor(sender):
            return

        sender_id = str(sender.id)
        sender_name = f"{sender.first_name or ''} {sender.last_name or ''}".strip()
        if not sender_name:
            sender_name = sender.username or f"User-{sender_id}"
        message_text = event.message.text

        logger.info(
            "[Userbot] Message from %s (%s): %s",
            sender_name, sender_id, message_text[:100]
        )

        # Save incoming message
        self.contact_manager.save_message(sender_id, "user", message_text)

        # Get conversation history
        history = self.contact_manager.get_conversation_history(sender_id)
        is_first_message = len(history) <= 1

        # Run scam detection
        detection = await self.scam_detector.analyze_message(
            message=message_text,
            sender_id=sender_id,
            sender_name=sender_name,
            conversation_history=history,
            is_first_message=is_first_message,
        )

        # Update contact record
        self.contact_manager.add_or_update_contact(
            sender_id=sender_id,
            sender_name=sender_name,
            platform="telegram_personal",
            status=detection.classification.value,
            scam_type=detection.scam_type,
            scam_score=detection.scam_score,
        )

        # Route based on classification
        if detection.is_scam:
            await self._handle_scam(event, sender_id, sender_name, message_text, detection)
        elif detection.is_legitimate:
            await self._handle_legitimate(event, sender_id, sender_name, message_text, detection)
        else:
            await self._handle_uncertain(event, sender_id, sender_name, message_text, detection)

    async def _handle_scam(
        self, event, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle detected scam on personal account."""
        logger.info(
            "[Userbot] SCAM from %s (score=%.2f, type=%s)",
            sender_id, detection.scam_score, detection.scam_type
        )

        # Notify owner via bot
        await self.notification_manager.notify_scam_detected(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram_personal",
            scam_score=detection.scam_score,
            scam_type=detection.scam_type,
            message_preview=message_text,
        )

        if self.auto_respond:
            # Generate time-wasting response
            history = self.contact_manager.get_conversation_history(sender_id)
            response_text, delay = await self.scam_responder.generate_response(
                scam_type=detection.scam_type,
                latest_message=message_text,
                conversation_history=history,
                sender_id=sender_id,
            )

            # Send with delay (looks like you're typing)
            await self._send_delayed_response(event, sender_id, response_text, delay)

            # Save bot response
            self.contact_manager.save_message(
                sender_id, "assistant", response_text, detection.classification.value
            )

        # Check if we should auto-report
        await self.scam_reporter.check_and_report(
            sender_id=sender_id,
            sender_name=sender_name,
            platform="telegram_personal",
            scam_type=detection.scam_type,
        )

    async def _handle_legitimate(
        self, event, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle legitimate message on personal account."""
        logger.info(
            "[Userbot] Legitimate from %s (score=%.2f)",
            sender_id, detection.scam_score
        )

        if self.auto_respond:
            # Get auto-reply
            reply = self.legitimate_handler.get_auto_reply(sender_id)
            if reply:
                # Small delay to seem natural
                await asyncio.sleep(3)
                await event.respond(reply)
                self.contact_manager.save_message(
                    sender_id, "assistant", reply, detection.classification.value
                )

        # Notify owner via bot
        await self.notification_manager.notify_legitimate_message(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram_personal",
            message_text=message_text,
            legitimacy_score=1.0 - detection.scam_score,
        )

    async def _handle_uncertain(
        self, event, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle uncertain message — notify owner, don't respond."""
        logger.info(
            "[Userbot] Uncertain from %s (score=%.2f)",
            sender_id, detection.scam_score
        )

        # Notify owner for manual review
        await self.notification_manager.notify_uncertain_message(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram_personal",
            scam_score=detection.scam_score,
            message_text=message_text,
        )

    async def _send_delayed_response(
        self, event, sender_id: str, text: str, delay: float
    ) -> None:
        """Send a delayed response to simulate typing on personal account."""
        if sender_id in self._pending_responses:
            self._pending_responses[sender_id].cancel()

        async def _delayed_send():
            try:
                # Simulate reading time
                await asyncio.sleep(min(delay, 60))

                # Send message as yourself
                await event.respond(text)

            except asyncio.CancelledError:
                logger.debug("Delayed userbot response cancelled for %s", sender_id)
            except Exception as e:
                logger.error("Failed to send userbot response to %s: %s", sender_id, e)
            finally:
                self._pending_responses.pop(sender_id, None)

        task = asyncio.create_task(_delayed_send())
        self._pending_responses[sender_id] = task