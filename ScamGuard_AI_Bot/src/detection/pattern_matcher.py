"""
Rule-based pattern matching for fast scam detection (Layer 1).
Analyzes messages against known scam patterns, keywords, and structural indicators.
"""

import re
import logging
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)


class PatternMatchResult:
    """Result of pattern matching analysis."""

    def __init__(self):
        self.score: float = 0.0
        self.matched_categories: list[str] = []
        self.matched_patterns: list[str] = []
        self.structural_flags: list[str] = []
        self.legitimate_indicators: list[str] = []

    @property
    def final_score(self) -> float:
        """Clamp score between 0.0 and 1.0."""
        return max(0.0, min(1.0, self.score))

    def __repr__(self) -> str:
        return (
            f"PatternMatchResult(score={self.final_score:.2f}, "
            f"categories={self.matched_categories})"
        )


class PatternMatcher:
    """
    Fast rule-based scam pattern matcher.
    Uses keyword matching, URL analysis, and structural analysis
    to produce an initial scam likelihood score.
    """

    def __init__(self, patterns_path: Optional[str] = None):
        if patterns_path is None:
            patterns_path = str(
                Path(__file__).parent.parent.parent / "config" / "scam_patterns.yaml"
            )
        self.patterns = self._load_patterns(patterns_path)
        logger.info("PatternMatcher initialized with %s pattern categories", len(self.patterns))

    def _load_patterns(self, path: str) -> dict:
        """Load scam patterns from YAML configuration."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error("Pattern file not found: %s", path)
            return {}
        except yaml.YAMLError as e:
            logger.error("Error parsing pattern file: %s", e)
            return {}

    def analyze(self, message: str, is_first_message: bool = True) -> PatternMatchResult:
        """
        Analyze a message against all scam patterns.
        
        Args:
            message: The message text to analyze.
            is_first_message: Whether this is the first message from this contact.
            
        Returns:
            PatternMatchResult with score and matched patterns.
        """
        result = PatternMatchResult()
        message_lower = message.lower()

        # Check keyword categories
        keyword_categories = [
            "urgency_keywords",
            "financial_keywords",
            "phishing_keywords",
            "romance_scam_keywords",
            "tech_support_keywords",
            "job_scam_keywords",
            "delivery_scam_keywords",
            "threat_keywords",
        ]

        for category in keyword_categories:
            if category in self.patterns:
                self._check_keyword_category(
                    message_lower, category, self.patterns[category], result
                )

        # Check URL patterns
        if "suspicious_url_patterns" in self.patterns:
            self._check_url_patterns(message, self.patterns["suspicious_url_patterns"], result)

        # Check structural indicators
        if "structure_indicators" in self.patterns:
            self._check_structure(message, is_first_message, self.patterns["structure_indicators"], result)

        # Check legitimate indicators (reduce score)
        if "legitimate_indicators" in self.patterns:
            self._check_legitimate_indicators(message_lower, self.patterns["legitimate_indicators"], result)

        logger.debug(
            "Pattern analysis complete: score=%.2f, categories=%s",
            result.final_score,
            result.matched_categories,
        )
        return result

    def _check_keyword_category(
        self,
        message_lower: str,
        category_name: str,
        category_data: dict,
        result: PatternMatchResult,
    ) -> None:
        """Check message against a keyword category."""
        if not isinstance(category_data, dict) or "patterns" not in category_data:
            return

        weight = category_data.get("weight", 0.1)
        patterns = category_data.get("patterns", [])
        matched = False

        for pattern in patterns:
            if pattern.lower() in message_lower:
                result.matched_patterns.append(pattern)
                matched = True

        if matched:
            result.score += weight
            result.matched_categories.append(category_name)

    def _check_url_patterns(
        self, message: str, url_data: dict, result: PatternMatchResult
    ) -> None:
        """Check message for suspicious URLs."""
        if not isinstance(url_data, dict) or "patterns" not in url_data:
            return

        weight = url_data.get("weight", 0.2)
        patterns = url_data.get("patterns", [])

        # First check if message contains any URLs
        url_regex = r"https?://\S+|www\.\S+"
        urls_found = re.findall(url_regex, message, re.IGNORECASE)

        if not urls_found:
            return

        for url in urls_found:
            for pattern in patterns:
                try:
                    if re.search(pattern, url, re.IGNORECASE):
                        result.matched_patterns.append(f"suspicious_url: {url[:50]}")
                        result.score += weight
                        if "suspicious_urls" not in result.matched_categories:
                            result.matched_categories.append("suspicious_urls")
                        break  # Don't double-count same URL
                except re.error:
                    continue

    def _check_structure(
        self,
        message: str,
        is_first_message: bool,
        structure_data: dict,
        result: PatternMatchResult,
    ) -> None:
        """Check structural indicators of the message."""
        if not isinstance(structure_data, dict):
            return

        # Check excessive caps
        caps_config = structure_data.get("excessive_caps", {})
        if caps_config and len(message) > 10:
            alpha_chars = [c for c in message if c.isalpha()]
            if alpha_chars:
                caps_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
                threshold = caps_config.get("threshold", 0.3)
                if caps_ratio > threshold:
                    result.score += caps_config.get("weight", 0.1)
                    result.structural_flags.append("excessive_caps")

        # Check excessive emojis
        emoji_config = structure_data.get("excessive_emojis", {})
        if emoji_config:
            # Simple emoji detection (covers most common emoji ranges)
            emoji_pattern = re.compile(
                "[\U0001F600-\U0001F64F"
                "\U0001F300-\U0001F5FF"
                "\U0001F680-\U0001F6FF"
                "\U0001F1E0-\U0001F1FF"
                "\U00002702-\U000027B0"
                "\U000024C2-\U0001F251"
                "]+",
                flags=re.UNICODE,
            )
            emoji_count = len(emoji_pattern.findall(message))
            threshold = emoji_config.get("threshold", 10)
            if emoji_count > threshold:
                result.score += emoji_config.get("weight", 0.1)
                result.structural_flags.append("excessive_emojis")

        # Check excessive exclamation marks
        excl_config = structure_data.get("excessive_exclamation", {})
        if excl_config:
            excl_count = message.count("!")
            threshold = excl_config.get("threshold", 3)
            if excl_count > threshold:
                result.score += excl_config.get("weight", 0.1)
                result.structural_flags.append("excessive_exclamation")

        # Check if message contains URLs (from unknown contact)
        url_config = structure_data.get("contains_url", {})
        if url_config:
            if re.search(r"https?://\S+|www\.\S+", message, re.IGNORECASE):
                result.score += url_config.get("weight", 0.15)
                result.structural_flags.append("contains_url")

        # Check if message contains phone numbers
        phone_config = structure_data.get("contains_phone_number", {})
        if phone_config:
            phone_pattern = r"[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{7,15}"
            if re.search(phone_pattern, message):
                result.score += phone_config.get("weight", 0.1)
                result.structural_flags.append("contains_phone_number")

        # Check if first message asks for personal info
        info_config = structure_data.get("very_first_message_asks_for_info", {})
        if info_config and is_first_message:
            info_keywords = [
                "your address",
                "your number",
                "your email",
                "your bank",
                "your password",
                "your details",
                "send me your",
                "give me your",
                "share your",
                "what is your",
            ]
            message_lower = message.lower()
            if any(kw in message_lower for kw in info_keywords):
                result.score += info_config.get("weight", 0.3)
                result.structural_flags.append("first_message_asks_for_info")

    def _check_legitimate_indicators(
        self, message_lower: str, legitimate_data: dict, result: PatternMatchResult
    ) -> None:
        """Check for indicators that suggest the message is legitimate."""
        if not isinstance(legitimate_data, dict):
            return

        for indicator_name, indicator_data in legitimate_data.items():
            if not isinstance(indicator_data, dict):
                continue

            weight = indicator_data.get("weight", -0.2)
            patterns = indicator_data.get("patterns", [])

            for pattern in patterns:
                if pattern.lower() in message_lower:
                    result.score += weight  # weight is negative, reducing score
                    result.legitimate_indicators.append(f"{indicator_name}: {pattern}")

    def get_detected_scam_type(self, result: PatternMatchResult) -> str:
        """
        Determine the most likely scam type from matched categories.
        
        Args:
            result: The PatternMatchResult to analyze.
            
        Returns:
            String describing the detected scam type.
        """
        type_mapping = {
            "urgency_keywords": "Urgency-based scam",
            "financial_keywords": "Financial/advance-fee scam",
            "phishing_keywords": "Phishing attempt",
            "romance_scam_keywords": "Romance scam",
            "tech_support_keywords": "Tech support scam",
            "job_scam_keywords": "Job/employment scam",
            "delivery_scam_keywords": "Delivery/package scam",
            "threat_keywords": "Threat/extortion scam",
            "suspicious_urls": "Suspicious URL detected",
        }

        if not result.matched_categories:
            return "unknown"

        # Return the category with the highest weight
        best_category = None
        best_weight = 0.0
        for category in result.matched_categories:
            if category in self.patterns:
                cat_data = self.patterns[category]
                if isinstance(cat_data, dict):
                    weight = cat_data.get("weight", 0.0)
                    if weight >= best_weight:
                        best_weight = weight
                        best_category = category

        if best_category and best_category in type_mapping:
            return type_mapping[best_category]

        return "Suspicious activity"