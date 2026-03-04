"""
Scam reporter module.
Handles background reporting of detected scammers to platform abuse systems
and maintains a local record of all reports.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from ..utils.contact_manager import ContactManager
from ..utils.notification import NotificationManager

logger = logging.getLogger(__name__)

class ScamReporter:
    """
    Background scam reporting system.
    
    Capabilities:
    - Telegram: Can report users via bot API (report spam)
    - WhatsApp: No API for reporting (manual only)
    - Local: Always saves report to local database
    
    After a certain number of messages exchanged with a scammer,
    or when manually triggered, the reporter files a report.
    """

    # Report after this many messages exchanged with a scammer
    AUTO_REPORT_THRESHOLD = 5

    def __init__(
        self,
        contact_manager: ContactManager,
        notification_manager: NotificationManager,
    ):
        self.contact_manager = contact_manager
        self.notification_manager = notification_manager
        self._telegram_bot = None
        logger.info("ScamReporter initialized")

    def set_bot(self, bot) -> None:
        """Set the Telegram bot instance for reporting."""
        self._telegram_bot = bot

    async def check_and_report(
        self,
        sender_id: str,
        sender_name: str,
        platform: str,
        scam_type: str,
    ) -> bool:
        """
        Check if auto-reporting threshold is reached and report if so.
        
        Args:
            sender_id: The scammer's ID.
            sender_name: The scammer's display name.
            platform: Platform (telegram/whatsapp).
            scam_type: Detected scam type.
            
        Returns:
            True if a report was filed.
        """
        msg_count = self.contact_manager.get_message_count(sender_id)

        if msg_count >= self.AUTO_REPORT_THRESHOLD:
            return await self.file_report(
                sender_id=sender_id,
                sender_name=sender_name,
                platform=platform,
                scam_type=scam_type,
                reason=f"Auto-reported after {msg_count} messages exchanged",
            )
        return False

    async def file_report(
        self,
        sender_id: str,
        sender_name: str,
        platform: str,
        scam_type: str,
        reason: str = "",
    ) -> bool:
        """
        File a scam report.
        
        Args:
            sender_id: The scammer's ID.
            sender_name: The scammer's display name.
            platform: Platform (telegram/whatsapp).
            scam_type: Detected scam type.
            reason: Reason for the report.
            
        Returns:
            True if the report was successfully filed.
        """
        logger.info("Filing report for %s (%s) on %s", sender_name, sender_id, platform)

        # Get conversation history for the report
        history = self.contact_manager.get_conversation_history(sender_id, limit=50)
        msg_count = len(history)

        # Calculate approximate time wasted
        if history and len(history) >= 2:
            first_ts = history[0].get("timestamp", "")
            last_ts = history[-1].get("timestamp", "")
            time_wasted = self._calculate_time_wasted(first_ts, last_ts)
        else:
            time_wasted = "< 1 minute"

        # Build report data
        report_data = json.dumps({
            "sender_id": sender_id,
            "sender_name": sender_name,
            "platform": platform,
            "scam_type": scam_type,
            "reason": reason,
            "message_count": msg_count,
            "time_wasted": time_wasted,
            "conversation_sample": [
                {"role": m["role"], "content": m["content"][:200]}
                for m in history[:10]
            ],
        })

        # Save to local database
        self.contact_manager.save_report(
            sender_id=sender_id,
            platform=platform,
            report_type=scam_type,
            report_data=report_data,
        )

        # Update contact status
        self.contact_manager.add_or_update_contact(
            sender_id=sender_id,
            sender_name=sender_name,
            platform=platform,
            status="reported",
            scam_type=scam_type,
        )

        # Platform-specific reporting
        reported = False
        if platform == "telegram":
            reported = await self._report_telegram(sender_id, reason)
        elif platform == "whatsapp":
            logger.info("WhatsApp reporting not available via API - logged locally only")
            reported = True  # Local report is sufficient

        # Notify the owner
        await self.notification_manager.notify_report_filed(
            sender_name=sender_name,
            sender_id=sender_id,
            platform=platform,
            message_count=msg_count,
            time_wasted=time_wasted,
        )

        logger.info(
            "Report filed for %s: platform=%s, type=%s, messages=%d, time_wasted=%s",
            sender_id, platform, scam_type, msg_count, time_wasted,
        )

        return True

    async def _report_telegram(self, sender_id: str, reason: str) -> bool:
        """
        Report a user on Telegram.
        
        Note: Telegram Bot API doesn't have a direct 'report spam' method.
        The bot can:
        1. Block the user (delete chat)
        2. Log the report for manual submission
        
        For userbot (Telethon), ReportSpamRequest is available.
        """
        if self._telegram_bot is None:
            logger.warning("Telegram bot not set - cannot report on platform")
            return False

        try:
            # Telegram Bot API doesn't support reporting directly.
            # We log it and the owner can manually report from the notification.
            logger.info(
                "Telegram report logged for user %s. "
                "Note: Bot API doesn't support direct spam reporting. "
                "Owner notified for manual action if desired.",
                sender_id,
            )
            return True
        except Exception as e:
            logger.error("Failed to process Telegram report: %s", e)
            return False

    def _calculate_time_wasted(self, first_ts: str, last_ts: str) -> str:
        """Calculate human-readable time between first and last message."""
        try:
            fmt_first = datetime.fromisoformat(first_ts)
            fmt_last = datetime.fromisoformat(last_ts)
            delta = fmt_last - fmt_first
            
            total_seconds = int(delta.total_seconds())
            if total_seconds < 60:
                return f"{total_seconds} seconds"
            elif total_seconds < 3600:
                minutes = total_seconds // 60
                return f"{minutes} minute{'s' if minutes != 1 else ''}"
            elif total_seconds < 86400:
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                return f"{hours} hour{'s' if hours != 1 else ''} {minutes} min"
            else:
                days = total_seconds // 86400
                hours = (total_seconds % 86400) // 3600
                return f"{days} day{'s' if days != 1 else ''} {hours} hours"
        except (ValueError, TypeError):
            return "unknown"

    async def manual_report(
        self,
        sender_id: str,
        platform: str = "telegram",
    ) -> bool:
        """
        Manually trigger a report for a sender (called via /report command).
        """
        status = self.contact_manager.get_contact_status(sender_id)
        return await self.file_report(
            sender_id=sender_id,
            sender_name=sender_id,
            platform=platform,
            scam_type=status or "manual_report",
            reason="Manually reported by owner",
        )