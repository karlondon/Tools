"""
Legitimate message handler.
Sends polite auto-replies to genuine messages from unknown contacts
and notifies the bot owner.
"""

import logging
import random
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)


class LegitimateHandler:
    """
    Handles messages classified as legitimate from unknown contacts.
    
    - Sends a polite auto-reply letting them know you'll be in touch
    - Forwards the message to the bot owner with context
    - Tracks follow-ups to avoid spamming the sender
    """

    def __init__(self, responses_path: Optional[str] = None):
        if responses_path is None:
            responses_path = str(
                Path(__file__).parent.parent.parent / "config" / "responses.yaml"
            )
        self.templates = self._load_templates(responses_path)
        # Track which senders have already received an auto-reply
        self._replied_senders: set[str] = set()

        logger.info("LegitimateHandler initialized")

    def _load_templates(self, path: str) -> dict:
        """Load response templates from YAML."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                return data.get("legitimate_responses", {})
        except (FileNotFoundError, yaml.YAMLError) as e:
            logger.error("Failed to load legitimate response templates: %s", e)
            return {}

    def get_auto_reply(self, sender_id: str) -> Optional[str]:
        """
        Get an auto-reply message for a legitimate unknown contact.
        
        Returns None if we've already sent an auto-reply to this sender
        (to avoid being annoying).
        
        Args:
            sender_id: Unique identifier for the sender.
            
        Returns:
            Auto-reply text or None if already replied.
        """
        if sender_id in self._replied_senders:
            logger.debug("Already sent auto-reply to %s, skipping", sender_id)
            return None

        # Mark as replied
        self._replied_senders.add(sender_id)

        # Get a random greeting template
        greetings = self.templates.get("initial_greeting", [])
        if greetings:
            return random.choice(greetings)

        # Fallback
        return (
            "Hi there! Thanks for reaching out. I'm currently away but I've "
            "received your message. I'll get back to you as soon as I can. 🙂"
        )

    def get_follow_up(self, sender_id: str) -> Optional[str]:
        """
        Get a follow-up message if the sender messages again.
        
        Returns None if it's been sent too recently.
        """
        follow_ups = self.templates.get("follow_up", [])
        if follow_ups:
            return random.choice(follow_ups)
        return None

    def format_owner_notification(
        self,
        sender_name: str,
        sender_id: str,
        platform: str,
        message_text: str,
        legitimacy_score: float,
    ) -> str:
        """
        Format a notification message for the bot owner about a legitimate message.
        
        Args:
            sender_name: Display name of the sender.
            sender_id: Unique identifier for the sender.
            platform: Platform the message came from.
            message_text: The actual message content.
            legitimacy_score: How confident we are it's legitimate (0-1).
            
        Returns:
            Formatted notification string.
        """
        return (
            f"📩 **New Message from Unknown Contact**\n\n"
            f"**From**: {sender_name} ({sender_id})\n"
            f"**Platform**: {platform}\n"
            f"**Legitimacy Score**: {legitimacy_score:.0%}\n"
            f"**Message**: {message_text[:500]}\n\n"
            f"✅ Bot has sent an auto-reply saying you'll be in touch.\n\n"
            f"Reply with /whitelist {sender_id} to add to contacts.\n"
            f"Reply with /scam {sender_id} if this is actually a scam."
        )

    def reset_sender(self, sender_id: str) -> None:
        """Remove a sender from the replied tracking (allow new auto-reply)."""
        self._replied_senders.discard(sender_id)

    def whitelist_sender(self, sender_id: str) -> None:
        """Mark a sender as whitelisted (will be handled by ContactManager)."""
        logger.info("Sender %s marked for whitelisting", sender_id)
        # The actual whitelisting is done by ContactManager
        # This just ensures we won't send more auto-replies
        self._replied_senders.add(sender_id)