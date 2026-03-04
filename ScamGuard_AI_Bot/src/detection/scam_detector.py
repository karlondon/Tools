"""
AI-powered scam detection engine (Layer 2).
Combines pattern matching with LLM analysis for accurate scam classification.
"""

import json
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .pattern_matcher import PatternMatcher, PatternMatchResult

logger = logging.getLogger(__name__)


class Classification(Enum):
    """Message classification categories."""
    SCAM = "scam"
    SUSPICIOUS = "suspicious"
    LEGITIMATE = "legitimate"
    UNKNOWN = "unknown"


@dataclass
class DetectionResult:
    """Complete scam detection result combining all analysis layers."""
    classification: Classification
    scam_score: float  # 0.0 (legitimate) to 1.0 (definite scam)
    scam_type: str
    confidence: float  # How confident we are in the classification
    pattern_result: Optional[PatternMatchResult] = None
    ai_reasoning: str = ""
    conversation_history: list = field(default_factory=list)

    @property
    def is_scam(self) -> bool:
        return self.classification == Classification.SCAM

    @property
    def is_legitimate(self) -> bool:
        return self.classification == Classification.LEGITIMATE

    @property
    def needs_review(self) -> bool:
        return self.classification in (Classification.SUSPICIOUS, Classification.UNKNOWN)


class ScamDetector:
    """
    Multi-layer scam detection engine.
    
    Layer 1: Fast pattern matching (rule-based)
    Layer 2: AI/LLM classification (OpenAI or Ollama)
    Layer 3: Behavioral analysis (conversation context)
    """

    # System prompt for AI scam classification
    CLASSIFICATION_PROMPT = """You are a scam detection AI. Your job is to analyze messages from unknown contacts and determine if they are scam/fraud attempts or legitimate messages.

Analyze the following message and classify it. Consider:
1. Is the sender trying to get money, personal information, or access to accounts?
2. Does the message use urgency, fear, or too-good-to-be-true promises?
3. Are there signs of phishing, social engineering, or manipulation?
4. Could this be a legitimate message from a real person with a genuine reason to reach out?

You MUST respond with ONLY a JSON object in this exact format:
{
    "classification": "scam" | "suspicious" | "legitimate" | "unknown",
    "scam_score": 0.0 to 1.0,
    "scam_type": "type of scam or 'none'",
    "confidence": 0.0 to 1.0,
    "reasoning": "Brief explanation of your analysis"
}

Scam types: phishing, advance_fee, romance, tech_support, investment, job_scam, delivery_scam, threat_extortion, crypto_scam, impersonation, none

Important rules:
- Be cautious but fair. Not every unknown message is a scam.
- A simple "hello" or "hi" should be classified as "unknown" not "scam"
- Messages with specific context about mutual connections are more likely legitimate
- Messages immediately asking for money, personal info, or clicking links are suspicious
- Broken English alone is NOT evidence of a scam"""

    def __init__(
        self,
        ai_provider: str = "openai",
        openai_api_key: Optional[str] = None,
        openai_model: str = "gpt-4o-mini",
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3",
        scam_threshold: float = 0.7,
        legitimate_threshold: float = 0.3,
    ):
        self.ai_provider = ai_provider
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self.openai_model = openai_model
        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model
        self.scam_threshold = scam_threshold
        self.legitimate_threshold = legitimate_threshold

        # Initialize pattern matcher (Layer 1)
        self.pattern_matcher = PatternMatcher()

        # Lazy-load AI clients
        self._openai_client = None
        self._httpx_client = None

        logger.info(
            "ScamDetector initialized (provider=%s, scam_threshold=%.2f, legit_threshold=%.2f)",
            ai_provider, scam_threshold, legitimate_threshold,
        )

    @property
    def openai_client(self):
        """Lazy-load OpenAI client."""
        if self._openai_client is None and self.ai_provider == "openai":
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.error("openai package not installed. Run: pip install openai")
                raise
        return self._openai_client

    async def analyze_message(
        self,
        message: str,
        sender_id: str = "",
        sender_name: str = "",
        conversation_history: Optional[list[dict]] = None,
        is_first_message: bool = True,
    ) -> DetectionResult:
        """
        Perform full multi-layer scam analysis on a message.
        
        Args:
            message: The message text to analyze.
            sender_id: Unique identifier for the sender.
            sender_name: Display name of the sender.
            conversation_history: Previous messages in this conversation.
            is_first_message: Whether this is the first message from this contact.
            
        Returns:
            DetectionResult with classification and details.
        """
        if conversation_history is None:
            conversation_history = []

        # Layer 1: Fast pattern matching
        pattern_result = self.pattern_matcher.analyze(message, is_first_message)
        logger.info(
            "Layer 1 (patterns) for %s: score=%.2f, categories=%s",
            sender_id or "unknown",
            pattern_result.final_score,
            pattern_result.matched_categories,
        )

        # If pattern matching is very confident, we can skip AI analysis
        if pattern_result.final_score >= 0.85:
            scam_type = self.pattern_matcher.get_detected_scam_type(pattern_result)
            return DetectionResult(
                classification=Classification.SCAM,
                scam_score=pattern_result.final_score,
                scam_type=scam_type,
                confidence=0.8,
                pattern_result=pattern_result,
                ai_reasoning="Skipped AI analysis - high pattern match confidence",
                conversation_history=conversation_history,
            )

        # Layer 2: AI classification
        ai_result = await self._ai_classify(message, conversation_history)

        # Combine results from both layers
        combined_score = self._combine_scores(pattern_result.final_score, ai_result)
        classification = self._determine_classification(combined_score)
        scam_type = ai_result.get("scam_type", "unknown")
        if scam_type == "none" and pattern_result.matched_categories:
            scam_type = self.pattern_matcher.get_detected_scam_type(pattern_result)

        result = DetectionResult(
            classification=classification,
            scam_score=combined_score,
            scam_type=scam_type,
            confidence=ai_result.get("confidence", 0.5),
            pattern_result=pattern_result,
            ai_reasoning=ai_result.get("reasoning", ""),
            conversation_history=conversation_history,
        )

        logger.info(
            "Final detection for %s: classification=%s, score=%.2f, type=%s",
            sender_id or "unknown",
            result.classification.value,
            result.scam_score,
            result.scam_type,
        )

        return result

    async def _ai_classify(
        self, message: str, conversation_history: list[dict]
    ) -> dict:
        """
        Use AI/LLM to classify the message.
        
        Returns dict with: classification, scam_score, scam_type, confidence, reasoning
        """
        try:
            if self.ai_provider == "openai":
                return await self._classify_with_openai(message, conversation_history)
            elif self.ai_provider == "ollama":
                return await self._classify_with_ollama(message, conversation_history)
            else:
                logger.warning("Unknown AI provider: %s, using pattern-only", self.ai_provider)
                return self._default_ai_result()
        except Exception as e:
            logger.error("AI classification failed: %s", e)
            return self._default_ai_result()

    async def _classify_with_openai(
        self, message: str, conversation_history: list[dict]
    ) -> dict:
        """Classify using OpenAI API."""
        import asyncio

        messages = [{"role": "system", "content": self.CLASSIFICATION_PROMPT}]

        # Add conversation context if available
        if conversation_history:
            context = "\n".join(
                f"{'Sender' if m.get('role') == 'user' else 'Bot'}: {m.get('content', '')}"
                for m in conversation_history[-5:]  # Last 5 messages for context
            )
            messages.append({
                "role": "user",
                "content": f"Previous conversation context:\n{context}\n\nNew message to analyze:\n{message}",
            })
        else:
            messages.append({
                "role": "user",
                "content": f"Message from unknown contact:\n{message}",
            })

        # Run synchronous OpenAI call in executor
        def _call_openai() -> str:
            client = self.openai_client
            if client is None:
                return "{}"
            response = client.chat.completions.create(
                model=self.openai_model,
                messages=messages,  # type: ignore[arg-type]
                temperature=0.1,
                max_tokens=300,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            return content if content is not None else "{}"

        loop = asyncio.get_event_loop()
        response_text = await loop.run_in_executor(None, _call_openai)

        return self._parse_ai_response(response_text)

    async def _classify_with_ollama(
        self, message: str, conversation_history: list[dict]
    ) -> dict:
        """Classify using local Ollama instance."""
        import httpx

        prompt = self.CLASSIFICATION_PROMPT + f"\n\nMessage from unknown contact:\n{message}"

        if conversation_history:
            context = "\n".join(
                f"{'Sender' if m.get('role') == 'user' else 'Bot'}: {m.get('content', '')}"
                for m in conversation_history[-5:]
            )
            prompt += f"\n\nPrevious conversation context:\n{context}"

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return self._parse_ai_response(data.get("response", "{}"))

    def _parse_ai_response(self, response_text: str) -> dict:
        """Parse AI response JSON into a standardized dict."""
        try:
            result = json.loads(response_text)
            return {
                "classification": result.get("classification", "unknown"),
                "scam_score": float(result.get("scam_score", 0.5)),
                "scam_type": result.get("scam_type", "unknown"),
                "confidence": float(result.get("confidence", 0.5)),
                "reasoning": result.get("reasoning", ""),
            }
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            logger.error("Failed to parse AI response: %s | Response: %s", e, response_text[:200])
            return self._default_ai_result()

    def _default_ai_result(self) -> dict:
        """Return default result when AI is unavailable."""
        return {
            "classification": "unknown",
            "scam_score": 0.5,
            "scam_type": "unknown",
            "confidence": 0.0,
            "reasoning": "AI analysis unavailable - using pattern matching only",
        }

    def _combine_scores(self, pattern_score: float, ai_result: dict) -> float:
        """
        Combine pattern matching and AI scores into a final score.
        
        Weights: Pattern matching 30%, AI analysis 70%
        If AI confidence is low, pattern matching gets more weight.
        """
        ai_score = ai_result.get("scam_score", 0.5)
        ai_confidence = ai_result.get("confidence", 0.0)

        if ai_confidence < 0.3:
            # Low AI confidence - rely more on patterns
            combined = pattern_score * 0.6 + ai_score * 0.4
        elif ai_confidence > 0.8:
            # High AI confidence - rely more on AI
            combined = pattern_score * 0.2 + ai_score * 0.8
        else:
            # Normal weighting
            combined = pattern_score * 0.3 + ai_score * 0.7

        return max(0.0, min(1.0, combined))

    def _determine_classification(self, score: float) -> Classification:
        """Determine classification based on combined score."""
        if score >= self.scam_threshold:
            return Classification.SCAM
        elif score <= self.legitimate_threshold:
            return Classification.LEGITIMATE
        elif score > 0.5:
            return Classification.SUSPICIOUS
        else:
            return Classification.UNKNOWN