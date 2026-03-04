"""
Tests for the scam response generator and legitimate handler.
Tests template responses and contact manager without requiring API keys.
"""

import os
import pytest
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.response.scam_responder import ScamResponder
from src.response.legitimate_handler import LegitimateHandler
from src.utils.contact_manager import ContactManager

class TestScamResponder:
    """Test the scam time-wasting responder."""

    @pytest.fixture
    def responder(self):
        return ScamResponder(ai_provider="none")  # Don't use AI for tests

    def test_template_response_advance_fee(self, responder):
        response = responder._get_template_response("advance_fee", 0)
        assert len(response) > 0
        assert isinstance(response, str)

    def test_template_response_phishing(self, responder):
        response = responder._get_template_response("phishing", 0)
        assert len(response) > 0

    def test_template_response_romance(self, responder):
        response = responder._get_template_response("romance", 0)
        assert len(response) > 0

    def test_template_response_tech_support(self, responder):
        response = responder._get_template_response("tech_support", 0)
        assert len(response) > 0

    def test_template_response_stalling(self, responder):
        """Stalling responses should be returned for ongoing conversations."""
        response = responder._get_template_response("advance_fee", 5)
        assert len(response) > 0

    def test_template_response_unknown_type(self, responder):
        """Unknown scam types should fall back to generic responses."""
        response = responder._get_template_response("unknown_type", 0)
        assert len(response) > 0

    def test_delay_increases(self, responder):
        """Response delays should increase with each interaction."""
        delay1 = responder._calculate_delay("test_user")
        delay2 = responder._calculate_delay("test_user")
        delay3 = responder._calculate_delay("test_user")
        assert delay2 >= delay1
        assert delay3 >= delay2

    def test_delay_capped(self, responder):
        """Delays should not exceed max_delay."""
        for _ in range(50):
            delay = responder._calculate_delay("test_cap")
        assert delay <= responder.max_delay

    def test_reset_conversation(self, responder):
        """Resetting should clear delay tracking."""
        responder._calculate_delay("test_reset")
        responder._calculate_delay("test_reset")
        responder.reset_conversation("test_reset")
        assert "test_reset" not in responder._conversation_delays

    def test_mapped_scam_types(self, responder):
        """Verify that mapped scam types return appropriate templates."""
        mapped_types = [
            "Financial/advance-fee scam",
            "Phishing attempt",
            "Romance scam",
            "Tech support scam",
            "Job/employment scam",
        ]
        for scam_type in mapped_types:
            response = responder._get_template_response(scam_type, 0)
            assert len(response) > 0, f"No template for {scam_type}"


class TestLegitimateHandler:
    """Test the legitimate message handler."""

    @pytest.fixture
    def handler(self):
        return LegitimateHandler()

    def test_auto_reply_first_time(self, handler):
        reply = handler.get_auto_reply("new_user_123")
        assert reply is not None
        assert len(reply) > 0

    def test_auto_reply_second_time(self, handler):
        """Should NOT send a second auto-reply to the same sender."""
        handler.get_auto_reply("user_456")
        reply2 = handler.get_auto_reply("user_456")
        assert reply2 is None

    def test_different_users_get_replies(self, handler):
        reply1 = handler.get_auto_reply("user_a")
        reply2 = handler.get_auto_reply("user_b")
        assert reply1 is not None
        assert reply2 is not None

    def test_reset_sender(self, handler):
        handler.get_auto_reply("user_reset")
        handler.reset_sender("user_reset")
        reply = handler.get_auto_reply("user_reset")
        assert reply is not None  # Should get a new reply after reset

    def test_format_owner_notification(self, handler):
        notification = handler.format_owner_notification(
            sender_name="John Doe",
            sender_id="12345",
            platform="telegram",
            message_text="Hi, I'd like to discuss a project",
            legitimacy_score=0.85,
        )
        assert "John Doe" in notification
        assert "12345" in notification
        assert "telegram" in notification
        assert "85%" in notification

    def test_follow_up(self, handler):
        reply = handler.get_follow_up("any_user")
        assert reply is not None
        assert len(reply) > 0


class TestContactManager:
    """Test the contact manager with SQLite database."""

    @pytest.fixture
    def manager(self):
        # Use a temporary database for tests
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name
        mgr = ContactManager(db_path=db_path)
        yield mgr
        # Cleanup
        os.unlink(db_path)

    def test_new_contact_unknown(self, manager):
        assert manager.get_contact_status("new_user") is None

    def test_add_contact(self, manager):
        manager.add_or_update_contact("user1", "Test User", "telegram", "unknown")
        assert manager.get_contact_status("user1") == "unknown"

    def test_whitelist_contact(self, manager):
        manager.whitelist_contact("user2")
        assert manager.is_known_contact("user2")
        assert not manager.is_blocked("user2")

    def test_block_contact(self, manager):
        manager.block_contact("user3")
        assert manager.is_blocked("user3")
        assert not manager.is_known_contact("user3")

    def test_save_and_get_messages(self, manager):
        manager.save_message("user4", "user", "Hello there")
        manager.save_message("user4", "assistant", "Hi! How can I help?")
        history = manager.get_conversation_history("user4")
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["role"] == "assistant"

    def test_message_count(self, manager):
        manager.save_message("user5", "user", "msg 1")
        manager.save_message("user5", "user", "msg 2")
        manager.save_message("user5", "assistant", "reply 1")
        assert manager.get_message_count("user5") == 3

    def test_stats(self, manager):
        manager.whitelist_contact("wl1")
        manager.block_contact("bl1")
        manager.add_or_update_contact("sc1", status="scammer")
        manager.save_message("sc1", "user", "scam msg")
        stats = manager.get_stats()
        assert stats["contacts_whitelisted"] >= 1
        assert stats["contacts_blocked"] >= 1
        assert stats["total_messages"] >= 1

    def test_save_report(self, manager):
        manager.save_report("user6", "telegram", "phishing", '{"test": true}')
        stats = manager.get_stats()
        assert stats["reports_filed"] >= 1

    def test_conversation_history_limit(self, manager):
        for i in range(30):
            manager.save_message("user7", "user", f"message {i}")
        history = manager.get_conversation_history("user7", limit=10)
        assert len(history) == 10

    def test_update_existing_contact(self, manager):
        manager.add_or_update_contact("user8", "Name1", "telegram", "unknown")
        manager.add_or_update_contact("user8", "Name2", "telegram", "scam", scam_score=0.9)
        assert manager.get_contact_status("user8") == "scam"