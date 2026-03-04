"""
Scam time-wasting response generator.
Generates convincing but useless responses to keep scammers engaged,
wasting their time and preventing them from targeting real victims.
"""

import asyncio
import json
import logging
import os
import random
from pathlib import Path
from typing import Optional

import yaml

logger = logging.getLogger(__name__)


class ScamResponder:
    """
    Generates time-wasting responses for detected scammers.
    
    Uses a combination of:
    1. Template-based responses (from config/responses.yaml)
    2. AI-generated contextual responses (via OpenAI/Ollama)
    
    Features:
    - Scam-type-specific responses
    - Increasing response delays to simulate real person
    - Conversation memory for consistency
    - Never reveals real personal information
    """

    RESPONSE_PROMPT = """You are pretending to be a naive, elderly person who is being contacted by a scammer. Your goal is to WASTE THE SCAMMER'S TIME by being:

1. Interested but confused - you want to help/participate but don't understand technology well
2. Slow - you take time to do things, frequently get distracted
3. Forgetful - you ask them to repeat things, forget what they said
4. Compliant but incompetent - you try to follow their instructions but always make mistakes
5. Chatty - you go off on tangents about your pets, grandchildren, the weather

CRITICAL RULES:
- NEVER provide real personal information (addresses, bank details, passwords, etc.)
- NEVER click any links or download anything
- NEVER send real money or gift card codes
- If they ask for specific info, stall with excuses (can't find glasses, printer broken, etc.)
- Keep them engaged by seeming willing but unable to complete their requests
- Add realistic typos and informal language
- Occasionally express mild doubt but then come back around

Scam type: {scam_type}
Conversation history: {conversation_history}
Latest scammer message: {latest_message}

Generate a single response that will waste the scammer's time. Keep it natural and under 200 words."""

    def __init__(
        self,
        ai_provider: str = "openai",
        openai_api_key: Optional[str] = None,
        openai_model: str = "gpt-4o-mini",
        ollama_base_url: str = "http://localhost:11434",
        ollama_model: str = "llama3",
        min_delay: int = 5,
        max_delay: int = 120,
        delay_multiplier: float = 1.5,
        responses_path: Optional[str] = None,
    ):
        self.ai_provider = ai_provider
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY", "")
        self.openai_model = openai_model
        self.ollama_base_url = ollama_base_url
        self.ollama_model = ollama_model
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.delay_multiplier = delay_multiplier

        # Track response delays per conversation
        self._conversation_delays: dict[str, float] = {}

        # Load response templates
        if responses_path is None:
            responses_path = str(
                Path(__file__).parent.parent.parent / "config" / "responses.yaml"
            )
        self.templates = self._load_templates(responses_path)

        # Lazy-load AI client
        self._openai_client = None

        logger.info("ScamResponder initialized (provider=%s)", ai_provider)

    def _load_templates(self, path: str) -> dict:
        """Load response templates from YAML."""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        except (FileNotFoundError, yaml.YAMLError) as e:
            logger.error("Failed to load response templates: %s", e)
            return {}

    @property
    def openai_client(self):
        """Lazy-load OpenAI client."""
        if self._openai_client is None and self.ai_provider == "openai":
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=self.openai_api_key)
            except ImportError:
                logger.error("openai package not installed")
                raise
        return self._openai_client

    async def generate_response(
        self,
        scam_type: str,
        latest_message: str,
        conversation_history: list[dict],
        sender_id: str = "",
    ) -> tuple[str, float]:
        """
        Generate a time-wasting response for a scammer.
        
        Args:
            scam_type: The detected type of scam.
            latest_message: The scammer's latest message.
            conversation_history: Previous messages in the conversation.
            sender_id: Unique ID for delay tracking.
            
        Returns:
            Tuple of (response_text, delay_seconds).
        """
        # Calculate response delay
        delay = self._calculate_delay(sender_id)

        # Determine response stage based on conversation length
        msg_count = len(conversation_history)

        try:
            if msg_count <= 1:
                # First response - use template + AI
                response = await self._generate_initial_response(scam_type, latest_message)
            else:
                # Ongoing conversation - use AI for contextual response
                response = await self._generate_contextual_response(
                    scam_type, latest_message, conversation_history
                )
        except Exception as e:
            logger.error("AI response generation failed: %s", e)
            # Fallback to template
            response = self._get_template_response(scam_type, msg_count)

        logger.info(
            "Generated scam response for %s (type=%s, delay=%.0fs, length=%d)",
            sender_id or "unknown",
            scam_type,
            delay,
            len(response),
        )

        return response, delay

    async def _generate_initial_response(
        self, scam_type: str, message: str
    ) -> str:
        """Generate the first response to a scammer."""
        # Try template first for a natural opening
        template = self._get_template_response(scam_type, 0)
        if template and random.random() < 0.6:  # 60% chance to use template for first response
            return template

        # Use AI for more contextual response
        return await self._ai_generate(scam_type, message, [])

    async def _generate_contextual_response(
        self,
        scam_type: str,
        latest_message: str,
        conversation_history: list[dict],
    ) -> str:
        """Generate a contextual response based on conversation history."""
        return await self._ai_generate(scam_type, latest_message, conversation_history)

    async def _ai_generate(
        self,
        scam_type: str,
        latest_message: str,
        conversation_history: list[dict],
    ) -> str:
        """Generate response using AI."""
        history_text = ""
        if conversation_history:
            history_text = "\n".join(
                f"{'Scammer' if m.get('role') == 'user' else 'You'}: {m.get('content', '')}"
                for m in conversation_history[-8:]
            )

        prompt = self.RESPONSE_PROMPT.format(
            scam_type=scam_type,
            conversation_history=history_text or "None (first message)",
            latest_message=latest_message,
        )

        try:
            if self.ai_provider == "openai":
                return await self._generate_with_openai(prompt)
            elif self.ai_provider == "ollama":
                return await self._generate_with_ollama(prompt)
            else:
                return self._get_template_response(scam_type, len(conversation_history))
        except Exception as e:
            logger.error("AI generation failed: %s", e)
            return self._get_template_response(scam_type, len(conversation_history))

    async def _generate_with_openai(self, prompt: str) -> str:
        """Generate response using OpenAI."""

        def _call() -> str:
            client = self.openai_client
            if client is None:
                return ""
            response = client.chat.completions.create(
                model=self.openai_model,
                messages=[{"role": "user", "content": prompt}],  # type: ignore[arg-type]
                temperature=0.9,
                max_tokens=300,
            )
            content = response.choices[0].message.content
            return content if content is not None else ""

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _call)

    async def _generate_with_ollama(self, prompt: str) -> str:
        """Generate response using Ollama."""
        import httpx

        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def _get_template_response(self, scam_type: str, msg_count: int) -> str:
        """Get a response from templates based on scam type and conversation stage."""
        scam_responses = self.templates.get("scam_responses", {})

        # Map scam type to template key
        type_mapping = {
            "advance_fee": "advance_fee",
            "Financial/advance-fee scam": "advance_fee",
            "phishing": "phishing",
            "Phishing attempt": "phishing",
            "romance": "romance",
            "Romance scam": "romance",
            "tech_support": "tech_support",
            "Tech support scam": "tech_support",
            "investment": "investment",
            "crypto_scam": "investment",
            "job_scam": "job_scam",
            "Job/employment scam": "job_scam",
        }

        template_key = type_mapping.get(scam_type, "")
        responses = scam_responses.get(template_key, {})

        if isinstance(responses, dict):
            if msg_count <= 1 and "initial" in responses:
                return random.choice(responses["initial"])
            elif "stalling" in responses:
                return random.choice(responses["stalling"])
            elif "fake_compliance" in responses:
                return random.choice(responses["fake_compliance"])

        # Fallback to generic engagement
        generic = scam_responses.get("generic_engagement", [])
        if generic:
            return random.choice(generic)

        return "Oh really? That's interesting... tell me more about that?"

    def _calculate_delay(self, sender_id: str) -> float:
        """
        Calculate response delay for a conversation.
        Delays increase over time to simulate a real person getting busier.
        """
        if sender_id not in self._conversation_delays:
            # First response - random delay in the base range
            delay = random.uniform(self.min_delay, self.min_delay * 3)
            self._conversation_delays[sender_id] = delay
        else:
            # Increase delay each time
            prev_delay = self._conversation_delays[sender_id]
            delay = min(
                prev_delay * self.delay_multiplier + random.uniform(0, 30),
                self.max_delay,
            )
            self._conversation_delays[sender_id] = delay

        return delay

    def reset_conversation(self, sender_id: str) -> None:
        """Reset delay tracking for a conversation."""
        self._conversation_delays.pop(sender_id, None)