"""
Bot manager - orchestrates all components of the ScamGuard system.
"""

import logging
import os
from typing import Optional

from .detection.scam_detector import ScamDetector
from .response.scam_responder import ScamResponder
from .response.legitimate_handler import LegitimateHandler
from .reporting.scam_reporter import ScamReporter
from .utils.contact_manager import ContactManager
from .utils.notification import NotificationManager
from .connectors.telegram_connector import TelegramConnector
from .connectors.whatsapp_connector import WhatsAppConnector

logger = logging.getLogger(__name__)

class BotManager:
    """
    Central manager that initializes and coordinates all ScamGuard components.
    """

    def __init__(self):
        self.telegram: Optional[TelegramConnector] = None
        self.whatsapp: Optional[WhatsAppConnector] = None
        self.contact_manager: Optional[ContactManager] = None
        self._initialized = False

    def initialize(self) -> None:
        """Initialize all components from environment variables."""
        logger.info("Initializing ScamGuard Bot Manager...")

        # Required config
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        owner_id = os.getenv("OWNER_TELEGRAM_ID", "")

        if not bot_token or bot_token == "your_telegram_bot_token_here":
            raise ValueError(
                "TELEGRAM_BOT_TOKEN not configured. "
                "Get a token from @BotFather on Telegram and set it in .env"
            )
        if not owner_id or owner_id == "your_telegram_user_id_here":
            raise ValueError(
                "OWNER_TELEGRAM_ID not configured. "
                "Message @userinfobot on Telegram to get your ID and set it in .env"
            )

        # AI config
        ai_provider = os.getenv("AI_PROVIDER", "openai")
        openai_api_key = os.getenv("OPENAI_API_KEY", "")
        openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3")

        # Thresholds
        scam_threshold = float(os.getenv("SCAM_THRESHOLD", "0.7"))
        legitimate_threshold = float(os.getenv("LEGITIMATE_THRESHOLD", "0.3"))

        # Response delays
        min_delay = int(os.getenv("MIN_RESPONSE_DELAY", "5"))
        max_delay = int(os.getenv("MAX_RESPONSE_DELAY", "120"))
        delay_multiplier = float(os.getenv("SCAMMER_DELAY_MULTIPLIER", "1.5"))

        # Database
        db_path = os.getenv("DATABASE_PATH", "data/scamguard.db")

        # Initialize components
        self.contact_manager = ContactManager(db_path=db_path)

        notification_manager = NotificationManager(owner_id=owner_id)

        scam_detector = ScamDetector(
            ai_provider=ai_provider,
            openai_api_key=openai_api_key,
            openai_model=openai_model,
            ollama_base_url=ollama_base_url,
            ollama_model=ollama_model,
            scam_threshold=scam_threshold,
            legitimate_threshold=legitimate_threshold,
        )

        scam_responder = ScamResponder(
            ai_provider=ai_provider,
            openai_api_key=openai_api_key,
            openai_model=openai_model,
            ollama_base_url=ollama_base_url,
            ollama_model=ollama_model,
            min_delay=min_delay,
            max_delay=max_delay,
            delay_multiplier=delay_multiplier,
        )

        legitimate_handler = LegitimateHandler()

        scam_reporter = ScamReporter(
            contact_manager=self.contact_manager,
            notification_manager=notification_manager,
        )

        # Initialize Telegram connector
        self.telegram = TelegramConnector(
            bot_token=bot_token,
            owner_id=owner_id,
            scam_detector=scam_detector,
            scam_responder=scam_responder,
            legitimate_handler=legitimate_handler,
            contact_manager=self.contact_manager,
            notification_manager=notification_manager,
            scam_reporter=scam_reporter,
        )

        # Initialize WhatsApp connector (if configured)
        whatsapp_enabled = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
        if whatsapp_enabled:
            self.whatsapp = WhatsAppConnector(
                api_url=os.getenv("WHATSAPP_API_URL", ""),
                phone_number_id=os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""),
                access_token=os.getenv("WHATSAPP_ACCESS_TOKEN", ""),
            )

        self._initialized = True
        logger.info("Bot Manager initialized successfully")

    async def start(self) -> None:
        """Start all connectors."""
        if not self._initialized:
            self.initialize()

        logger.info("Starting ScamGuard Bot...")

        if self.telegram:
            await self.telegram.start()

        if self.whatsapp and self.whatsapp.is_enabled:
            await self.whatsapp.start()

        logger.info("ScamGuard Bot is running!")

    async def stop(self) -> None:
        """Stop all connectors."""
        logger.info("Stopping ScamGuard Bot...")

        if self.telegram:
            await self.telegram.stop()

        if self.whatsapp:
            await self.whatsapp.stop()

        logger.info("ScamGuard Bot stopped")