"""
Tests for the scam detection engine.
Tests pattern matching (Layer 1) without requiring API keys.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.detection.pattern_matcher import PatternMatcher, PatternMatchResult

class TestPatternMatcher:
    """Test the rule-based pattern matcher."""

    @pytest.fixture
    def matcher(self):
        return PatternMatcher()

    # --- Scam Detection Tests ---

    def test_advance_fee_scam(self, matcher):
        msg = "Congratulations! You have won a lottery of 5 million dollars! Send money for processing fee to claim your prize."
        result = matcher.analyze(msg)
        assert result.final_score > 0.5
        assert len(result.matched_categories) > 0
        assert "financial_keywords" in result.matched_categories

    def test_phishing_message(self, matcher):
        msg = "URGENT: Your account has been compromised. Click here to verify your account immediately: http://bit.ly/fake-login"
        result = matcher.analyze(msg)
        assert result.final_score > 0.5
        assert "phishing_keywords" in result.matched_categories or "urgency_keywords" in result.matched_categories

    def test_romance_scam(self, matcher):
        msg = "I fell in love with you the moment I saw your profile. I am a soldier deployed overseas and I need help with money to come see you."
        result = matcher.analyze(msg)
        assert result.final_score > 0.4
        assert "romance_scam_keywords" in result.matched_categories

    def test_tech_support_scam(self, matcher):
        msg = "ALERT: Your computer has a virus! Call Microsoft Support immediately. We need remote access via TeamViewer to fix it."
        result = matcher.analyze(msg)
        assert result.final_score > 0.4
        assert "tech_support_keywords" in result.matched_categories

    def test_job_scam(self, matcher):
        msg = "Work from home and make money fast! No experience needed. Earn £5000 per week with this easy passive income opportunity!"
        result = matcher.analyze(msg)
        assert result.final_score > 0.3
        assert "job_scam_keywords" in result.matched_categories

    def test_delivery_scam(self, matcher):
        msg = "Failed delivery attempt. Your package is waiting at customs. Pay the customs fee of £2.99 to reschedule delivery: http://fake-royal-mail.xyz/pay"
        result = matcher.analyze(msg)
        assert result.final_score > 0.3
        assert "delivery_scam_keywords" in result.matched_categories

    def test_threat_extortion(self, matcher):
        msg = "We have your photos and we recorded you. Pay us in bitcoin or we will expose you. Legal action will be taken. You will be arrested."
        result = matcher.analyze(msg)
        assert result.final_score > 0.5
        assert "threat_keywords" in result.matched_categories

    def test_crypto_investment_scam(self, matcher):
        msg = "Amazing investment opportunity! Guaranteed returns of 500% on your cryptocurrency. Double your money in just 24 hours!"
        result = matcher.analyze(msg)
        assert result.final_score > 0.4

    # --- Legitimate Message Tests ---

    def test_simple_hello(self, matcher):
        msg = "Hello, how are you?"
        result = matcher.analyze(msg)
        assert result.final_score < 0.3

    def test_legitimate_business(self, matcher):
        msg = "Hi, I was referred by your colleague about the project. Following up on our meeting last week regarding the proposal."
        result = matcher.analyze(msg)
        # Legitimate indicators should reduce the score
        assert result.final_score < 0.3
        assert len(result.legitimate_indicators) > 0

    def test_normal_conversation(self, matcher):
        msg = "Hey, just wanted to check if you're free for coffee this weekend?"
        result = matcher.analyze(msg)
        assert result.final_score < 0.2

    def test_professional_message(self, matcher):
        msg = "Good morning. I'm reaching out regarding the interview scheduled for next Tuesday. Could you confirm the time?"
        result = matcher.analyze(msg)
        assert result.final_score < 0.3

    # --- Structural Analysis Tests ---

    def test_excessive_caps_detection(self, matcher):
        msg = "YOU HAVE WON A PRIZE CLAIM IT NOW BEFORE IT EXPIRES"
        result = matcher.analyze(msg)
        assert "excessive_caps" in result.structural_flags

    def test_excessive_exclamation(self, matcher):
        msg = "Amazing deal!!!! Don't miss out!!!! Act now!!!!"
        result = matcher.analyze(msg)
        assert "excessive_exclamation" in result.structural_flags

    def test_url_in_first_message(self, matcher):
        msg = "Check this out: https://totally-legit-site.xyz/free-money"
        result = matcher.analyze(msg, is_first_message=True)
        assert "contains_url" in result.structural_flags

    def test_asks_for_info_first_message(self, matcher):
        msg = "Hello! Can you share your bank account details with me please?"
        result = matcher.analyze(msg, is_first_message=True)
        assert "first_message_asks_for_info" in result.structural_flags

    # --- Suspicious URL Tests ---

    def test_suspicious_shortened_url(self, matcher):
        msg = "Click here for your prize: http://bit.ly/scam123"
        result = matcher.analyze(msg)
        assert result.final_score > 0.3

    def test_suspicious_xyz_domain(self, matcher):
        msg = "Visit http://paypal-verify.xyz/login to confirm your account"
        result = matcher.analyze(msg)
        assert result.final_score > 0.3

    # --- Scam Type Detection Tests ---

    def test_get_scam_type_financial(self, matcher):
        msg = "Send money via western union for the processing fee to claim your inheritance"
        result = matcher.analyze(msg)
        scam_type = matcher.get_detected_scam_type(result)
        assert "financial" in scam_type.lower() or "advance" in scam_type.lower()

    def test_get_scam_type_phishing(self, matcher):
        msg = "Verify your account now - your account has been compromised with unusual activity"
        result = matcher.analyze(msg)
        scam_type = matcher.get_detected_scam_type(result)
        assert "phishing" in scam_type.lower()

    def test_get_scam_type_unknown(self, matcher):
        msg = "Hello there"
        result = matcher.analyze(msg)
        scam_type = matcher.get_detected_scam_type(result)
        assert scam_type == "unknown"

    # --- Edge Cases ---

    def test_empty_message(self, matcher):
        result = matcher.analyze("")
        assert result.final_score == 0.0

    def test_very_short_message(self, matcher):
        result = matcher.analyze("Hi")
        assert result.final_score < 0.1

    def test_message_with_only_emojis(self, matcher):
        result = matcher.analyze("😀😀😀")
        assert result.final_score < 0.2

    def test_combined_scam_indicators(self, matcher):
        """A message combining multiple scam types should score very high."""
        msg = (
            "URGENT!! You have won 5 million dollars in our lottery! "
            "Click http://bit.ly/claim-prize to verify your account "
            "and send the processing fee via gift card immediately! "
            "Your account will be closed if you don't act now!!!"
        )
        result = matcher.analyze(msg)
        assert result.final_score > 0.7
        assert len(result.matched_categories) >= 3


class TestPatternMatchResult:
    """Test the PatternMatchResult class."""

    def test_score_clamping_high(self):
        result = PatternMatchResult()
        result.score = 1.5
        assert result.final_score == 1.0

    def test_score_clamping_low(self):
        result = PatternMatchResult()
        result.score = -0.5
        assert result.final_score == 0.0

    def test_repr(self):
        result = PatternMatchResult()
        result.score = 0.75
        result.matched_categories = ["phishing_keywords"]
        repr_str = repr(result)
        assert "0.75" in repr_str
        assert "phishing_keywords" in repr_str