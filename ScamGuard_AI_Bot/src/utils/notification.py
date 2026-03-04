"""
Owner notification system.
Sends alerts to the bot owner via Telegram about incoming messages,
detected scams, and system events.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

class NotificationManager:
    """
    Manages notifications to the bot owner.
    Uses the Telegram bot to send direct messages to the owner.
    """

    def __init__(self, owner_id: str):
        self.owner_id = owner_id
        self._bot = None  # Set by bot_manager after initialization
        logger.info("NotificationManager initialized (owner=%s)", owner_id)

    def set_bot(self, bot) -> None:
        """Set the Telegram bot instance for sending messages."""
        self._bot = bot

    async def notify_scam_detected(
        self,
        sender_name: str,
        sender_id: str,
        platform: str,
        scam_score: float,
        scam_type: str,
        message_preview: str,
    ) -> None:
        """Notify owner that a scam has been detected."""
        text = (
            f"🚨 **SCAM DETECTED** 🚨\n\n"
            f"**From**: {sender_name} ({sender_id})\n"
            f"**Platform**: {platform}\n"
            f"**Scam Score**: {scam_score:.0%}\n"
            f"**Scam Type**: {scam_type}\n"
            f"**Message**: {message_preview[:300]}\n\n"
            f"⏳ Bot is engaging the scammer in time-wasting mode.\n\n"
            f"Reply with /block {sender_id} to block them.\n"
            f"Reply with /release {sender_id} if this is legitimate."
        )
        await self._send_to_owner(text)

    async def notify_legitimate_message(
        self,
        sender_name: str,
        sender_id: str,
        platform: str,
        message_text: str,
        legitimacy_score: float,
    ) -> None:
        """Notify owner about a legitimate message from an unknown contact."""
        text = (
            f"📩 **New Message from Unknown Contact**\n\n"
            f"**From**: {sender_name} ({sender_id})\n"
            f"**Platform**: {platform}\n"
            f"**Legitimacy Score**: {legitimacy_score:.0%}\n"
            f"**Message**: {message_text[:500]}\n\n"
            f"✅ Bot has sent an auto-reply saying you'll be in touch.\n\n"
            f"Reply with /whitelist {sender_id} to add to contacts.\n"
            f"Reply with /scam {sender_id} if this is actually a scam."
        )
        await self._send_to_owner(text)

    async def notify_uncertain_message(
        self,
        sender_name: str,
        sender_id: str,
        platform: str,
        scam_score: float,
        message_text: str,
    ) -> None:
        """Notify owner about an uncertain message that needs review."""
        text = (
            f"❓ **Uncertain Message - Needs Review**\n\n"
            f"**From**: {sender_name} ({sender_id})\n"
            f"**Platform**: {platform}\n"
            f"**Scam Score**: {scam_score:.0%}\n"
            f"**Message**: {message_text[:500]}\n\n"
            f"Bot is holding response pending your review.\n\n"
            f"Reply with /scam {sender_id} to engage scam-wasting mode.\n"
            f"Reply with /legit {sender_id} to send a polite auto-reply."
        )
        await self._send_to_owner(text)

    async def notify_report_filed(
        self,
        sender_name: str,
        sender_id: str,
        platform: str,
        message_count: int,
        time_wasted: str,
    ) -> None:
        """Notify owner that a scammer has been reported."""
        text = (
            f"📋 **Scammer Reported**\n\n"
            f"**Scammer**: {sender_name} ({sender_id})\n"
            f"**Platform**: {platform}\n"
            f"**Messages exchanged**: {message_count}\n"
            f"**Time wasted**: {time_wasted}\n"
            f"**Status**: Reported to {platform} abuse team"
        )
        await self._send_to_owner(text)

    async def notify_system_event(self, message: str) -> None:
        """Send a system notification to the owner."""
        text = f"⚙️ **System**: {message}"
        await self._send_to_owner(text)

    async def _send_to_owner(self, text: str) -> None:
        """Send a message to the bot owner via Telegram."""
        if self._bot is None:
            logger.warning("Bot not set - cannot send notification")
            return

        try:
            await self._bot.send_message(
                chat_id=int(self.owner_id),
                text=text,
                parse_mode="Markdown",
            )
            logger.debug("Notification sent to owner")
        except Exception as e:
            logger.error("Failed to send notification to owner: %s", e)
            # Try without markdown in case of formatting issues
            try:
                await self._bot.send_message(
                    chat_id=int(self.owner_id),
                    text=text.replace("**", "").replace("*", ""),
                )
            except Exception as e2:
                logger.error("Failed to send plain notification: %s", e2)