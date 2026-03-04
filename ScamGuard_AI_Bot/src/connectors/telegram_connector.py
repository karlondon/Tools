"""
Telegram Bot connector.
Handles all Telegram bot interactions including message receiving,
command processing, and message sending with delays.
"""

import asyncio
import logging
import os
from typing import Optional

from telegram import Update, Bot
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from ..detection.scam_detector import ScamDetector, Classification
from ..response.scam_responder import ScamResponder
from ..response.legitimate_handler import LegitimateHandler
from ..reporting.scam_reporter import ScamReporter
from ..utils.contact_manager import ContactManager
from ..utils.notification import NotificationManager

logger = logging.getLogger(__name__)


class TelegramConnector:
    """
    Telegram Bot integration for ScamGuard.
    
    Handles:
    - Receiving messages from unknown users
    - Running scam detection
    - Sending appropriate responses (time-wasting or polite)
    - Owner commands (whitelist, block, report, stats)
    - Notifications to the owner
    """

    def __init__(
        self,
        bot_token: str,
        owner_id: str,
        scam_detector: ScamDetector,
        scam_responder: ScamResponder,
        legitimate_handler: LegitimateHandler,
        contact_manager: ContactManager,
        notification_manager: NotificationManager,
        scam_reporter: ScamReporter,
    ):
        self.bot_token = bot_token
        self.owner_id = owner_id
        self.scam_detector = scam_detector
        self.scam_responder = scam_responder
        self.legitimate_handler = legitimate_handler
        self.contact_manager = contact_manager
        self.notification_manager = notification_manager
        self.scam_reporter = scam_reporter

        # Pending delayed responses: {sender_id: asyncio.Task}
        self._pending_responses: dict[str, asyncio.Task] = {}

        self.application: Optional[Application] = None

        logger.info("TelegramConnector initialized (owner=%s)", owner_id)

    async def start(self) -> None:
        """Initialize and start the Telegram bot."""
        self.application = (
            Application.builder()
            .token(self.bot_token)
            .build()
        )

        # Set bot reference for notifications and reporting
        bot = self.application.bot
        self.notification_manager.set_bot(bot)
        self.scam_reporter.set_bot(bot)

        # Register handlers
        self._register_handlers()

        # Start polling
        logger.info("Starting Telegram bot...")
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling(drop_pending_updates=True)  # type: ignore[union-attr]

        # Notify owner that bot is online
        await self.notification_manager.notify_system_event(
            "🟢 ScamGuard Bot is now online and monitoring messages."
        )

        logger.info("Telegram bot started successfully")

    async def stop(self) -> None:
        """Stop the Telegram bot."""
        if self.application:
            # Cancel pending responses
            for task in self._pending_responses.values():
                task.cancel()
            self._pending_responses.clear()

            await self.notification_manager.notify_system_event(
                "🔴 ScamGuard Bot is shutting down."
            )

            await self.application.updater.stop()  # type: ignore[union-attr]
            await self.application.stop()
            await self.application.shutdown()
            logger.info("Telegram bot stopped")

    def _register_handlers(self) -> None:
        """Register all message and command handlers."""
        if self.application is None:
            return

        # Owner commands
        self.application.add_handler(CommandHandler("start", self._cmd_start))
        self.application.add_handler(CommandHandler("help", self._cmd_help))
        self.application.add_handler(CommandHandler("stats", self._cmd_stats))
        self.application.add_handler(CommandHandler("whitelist", self._cmd_whitelist))
        self.application.add_handler(CommandHandler("block", self._cmd_block))
        self.application.add_handler(CommandHandler("scam", self._cmd_mark_scam))
        self.application.add_handler(CommandHandler("legit", self._cmd_mark_legit))
        self.application.add_handler(CommandHandler("release", self._cmd_release))
        self.application.add_handler(CommandHandler("report", self._cmd_report))

        # General message handler (must be last)
        self.application.add_handler(
            MessageHandler(filters.TEXT & ~filters.COMMAND, self._handle_message)
        )

        logger.info("Registered %d handlers", 10)

    # ==========================================
    # MESSAGE HANDLER
    # ==========================================

    async def _handle_message(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle incoming text messages."""
        if update.message is None or update.message.text is None:
            return

        sender = update.message.from_user
        if sender is None:
            return

        sender_id = str(sender.id)
        sender_name = sender.full_name or sender.username or "Unknown"
        message_text = update.message.text

        logger.info("Message from %s (%s): %s", sender_name, sender_id, message_text[:100])

        # Check if this is the owner
        if sender_id == self.owner_id:
            # Owner messages are not screened
            return

        # Check if sender is whitelisted
        if self.contact_manager.is_known_contact(sender_id):
            logger.info("Message from whitelisted contact %s - passing through", sender_id)
            return

        # Check if sender is blocked
        if self.contact_manager.is_blocked(sender_id):
            logger.info("Message from blocked contact %s - ignoring", sender_id)
            return

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
            platform="telegram",
            status=detection.classification.value,
            scam_type=detection.scam_type,
            scam_score=detection.scam_score,
        )

        # Route based on classification
        if detection.is_scam:
            await self._handle_scam(update, sender_id, sender_name, message_text, detection)
        elif detection.is_legitimate:
            await self._handle_legitimate(update, sender_id, sender_name, message_text, detection)
        else:
            await self._handle_uncertain(update, sender_id, sender_name, message_text, detection)

    async def _handle_scam(
        self, update: Update, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle a detected scam message."""
        logger.info("SCAM detected from %s (score=%.2f, type=%s)",
                     sender_id, detection.scam_score, detection.scam_type)

        # Notify owner
        await self.notification_manager.notify_scam_detected(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram",
            scam_score=detection.scam_score,
            scam_type=detection.scam_type,
            message_preview=message_text,
        )

        # Generate time-wasting response
        history = self.contact_manager.get_conversation_history(sender_id)
        response_text, delay = await self.scam_responder.generate_response(
            scam_type=detection.scam_type,
            latest_message=message_text,
            conversation_history=history,
            sender_id=sender_id,
        )

        # Send response with delay (simulating human typing time)
        await self._send_delayed_response(update, sender_id, response_text, delay)

        # Save bot response
        self.contact_manager.save_message(
            sender_id, "assistant", response_text, detection.classification.value
        )

        # Check if we should auto-report
        await self.scam_reporter.check_and_report(
            sender_id=sender_id,
            sender_name=sender_name,
            platform="telegram",
            scam_type=detection.scam_type,
        )

    async def _handle_legitimate(
        self, update: Update, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle a legitimate message from an unknown contact."""
        logger.info("Legitimate message from %s (score=%.2f)", sender_id, detection.scam_score)

        # Get auto-reply
        reply = self.legitimate_handler.get_auto_reply(sender_id)

        if reply and update.message:
            await update.message.reply_text(reply)
            self.contact_manager.save_message(
                sender_id, "assistant", reply, detection.classification.value
            )

        # Notify owner
        await self.notification_manager.notify_legitimate_message(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram",
            message_text=message_text,
            legitimacy_score=1.0 - detection.scam_score,
        )

    async def _handle_uncertain(
        self, update: Update, sender_id: str, sender_name: str,
        message_text: str, detection
    ) -> None:
        """Handle an uncertain message that needs manual review."""
        logger.info("Uncertain message from %s (score=%.2f)", sender_id, detection.scam_score)

        # Notify owner for review
        await self.notification_manager.notify_uncertain_message(
            sender_name=sender_name,
            sender_id=sender_id,
            platform="telegram",
            scam_score=detection.scam_score,
            message_text=message_text,
        )

        # Don't respond yet - wait for owner decision

    async def _send_delayed_response(
        self, update: Update, sender_id: str, text: str, delay: float
    ) -> None:
        """Send a response after a delay to simulate human behavior."""
        # Cancel any existing pending response for this sender
        if sender_id in self._pending_responses:
            self._pending_responses[sender_id].cancel()

        async def _delayed_send():
            try:
                # Simulate typing
                if update.message:
                    await update.message.chat.send_action("typing")

                # Wait for the delay
                await asyncio.sleep(min(delay, 5))  # Cap actual typing indicator

                # Send the remaining delay in background
                remaining = delay - 5
                if remaining > 0:
                    await asyncio.sleep(remaining)

                # Send the message
                if update.message:
                    await update.message.reply_text(text)

            except asyncio.CancelledError:
                logger.debug("Delayed response cancelled for %s", sender_id)
            except Exception as e:
                logger.error("Failed to send delayed response to %s: %s", sender_id, e)
            finally:
                self._pending_responses.pop(sender_id, None)

        task = asyncio.create_task(_delayed_send())
        self._pending_responses[sender_id] = task

    # ==========================================
    # OWNER COMMANDS
    # ==========================================

    async def _cmd_start(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /start command."""
        if update.message is None:
            return

        sender_id = str(update.message.from_user.id) if update.message.from_user else ""

        if sender_id == self.owner_id:
            stats = self.contact_manager.get_stats()
            await update.message.reply_text(
                "🛡️ **ScamGuard AI Bot** is active!\n\n"
                f"📊 Stats:\n"
                f"  • Contacts tracked: {stats['total_contacts']}\n"
                f"  • Scammers detected: {stats['scammers_detected']}\n"
                f"  • Contacts blocked: {stats['contacts_blocked']}\n"
                f"  • Contacts whitelisted: {stats['contacts_whitelisted']}\n"
                f"  • Total messages: {stats['total_messages']}\n"
                f"  • Reports filed: {stats['reports_filed']}\n\n"
                "Type /help for available commands.",
                parse_mode="Markdown",
            )
        else:
            await update.message.reply_text(
                "👋 Hello! This is an automated screening bot. "
                "Your message has been received and will be reviewed. "
                "If your message is genuine, you'll hear back soon!"
            )

    async def _cmd_help(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /help command."""
        if update.message is None:
            return

        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        await update.message.reply_text(
            "🛡️ **ScamGuard Bot Commands**\n\n"
            "/stats - Show detection statistics\n"
            "/whitelist <user_id> - Add contact to whitelist\n"
            "/block <user_id> - Block a contact\n"
            "/scam <user_id> - Mark as scam & engage time-wasting\n"
            "/legit <user_id> - Mark as legitimate & send auto-reply\n"
            "/release <user_id> - Release from scam mode\n"
            "/report <user_id> - Manually report a scammer\n"
            "/help - Show this help message",
            parse_mode="Markdown",
        )

    async def _cmd_stats(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /stats command."""
        if update.message is None:
            return

        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        stats = self.contact_manager.get_stats()
        await update.message.reply_text(
            "📊 **ScamGuard Statistics**\n\n"
            f"👥 Total contacts: {stats['total_contacts']}\n"
            f"🚨 Scammers detected: {stats['scammers_detected']}\n"
            f"🚫 Contacts blocked: {stats['contacts_blocked']}\n"
            f"✅ Contacts whitelisted: {stats['contacts_whitelisted']}\n"
            f"💬 Total messages: {stats['total_messages']}\n"
            f"📋 Reports filed: {stats['reports_filed']}",
            parse_mode="Markdown",
        )

    async def _cmd_whitelist(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /whitelist <user_id> command."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /whitelist <user_id>")
            return

        target_id = context.args[0]
        self.contact_manager.whitelist_contact(target_id)
        self.legitimate_handler.whitelist_sender(target_id)
        await update.message.reply_text(f"✅ User {target_id} has been whitelisted.")

    async def _cmd_block(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /block <user_id> command."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /block <user_id>")
            return

        target_id = context.args[0]
        self.contact_manager.block_contact(target_id)
        self.scam_responder.reset_conversation(target_id)
        await update.message.reply_text(f"🚫 User {target_id} has been blocked.")

    async def _cmd_mark_scam(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /scam <user_id> command - mark as scammer."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /scam <user_id>")
            return

        target_id = context.args[0]
        self.contact_manager.add_or_update_contact(
            sender_id=target_id, status="scam", scam_type="manual",
        )
        await update.message.reply_text(
            f"🚨 User {target_id} marked as scam. Bot will engage in time-wasting mode."
        )

    async def _cmd_mark_legit(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /legit <user_id> command - mark as legitimate."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /legit <user_id>")
            return

        target_id = context.args[0]
        self.contact_manager.add_or_update_contact(
            sender_id=target_id, status="legitimate",
        )
        self.legitimate_handler.reset_sender(target_id)
        await update.message.reply_text(
            f"✅ User {target_id} marked as legitimate. Auto-reply sent."
        )

    async def _cmd_release(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /release <user_id> command - release from scam mode."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /release <user_id>")
            return

        target_id = context.args[0]
        self.contact_manager.add_or_update_contact(
            sender_id=target_id, status="unknown",
        )
        self.scam_responder.reset_conversation(target_id)
        self.legitimate_handler.reset_sender(target_id)
        await update.message.reply_text(
            f"🔓 User {target_id} released from scam mode. Status reset to unknown."
        )

    async def _cmd_report(
        self, update: Update, context: ContextTypes.DEFAULT_TYPE
    ) -> None:
        """Handle /report <user_id> command - manually report a scammer."""
        if update.message is None:
            return
        sender_id = str(update.message.from_user.id) if update.message.from_user else ""
        if sender_id != self.owner_id:
            return

        if not context.args:
            await update.message.reply_text("Usage: /report <user_id>")
            return

        target_id = context.args[0]
        success = await self.scam_reporter.manual_report(target_id, "telegram")
        if success:
            await update.message.reply_text(f"📋 Report filed for user {target_id}.")
        else:
            await update.message.reply_text(f"❌ Failed to file report for {target_id}.")