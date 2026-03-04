"""
ScamGuard AI Bot - Main Entry Point

AI-powered scam detection and response bot for Telegram.
Detects scammers, wastes their time, and forwards legitimate messages.

Usage:
    python -m src.main
    # or
    python src/main.py
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

# Add project root to path when running directly
if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

def setup_logging() -> None:
    """Configure logging for the application."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_file = os.getenv("LOG_FILE", "logs/scamguard.log")

    # Ensure log directory exists
    log_dir = Path(log_file).parent
    log_dir.mkdir(parents=True, exist_ok=True)

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("telegram").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

async def main() -> None:
    """Main async entry point."""
    # Load environment variables
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        logger.info("Loaded configuration from .env")
    else:
        load_dotenv()  # Try default locations
        logger.warning("No .env file found at %s - using environment variables", env_path)

    # Setup logging after loading env (to get LOG_LEVEL)
    setup_logging()

    logger.info("=" * 60)
    logger.info("  ScamGuard AI Bot Starting...")
    logger.info("=" * 60)

    # Import after env is loaded
    from src.bot_manager import BotManager

    manager = BotManager()

    # Handle shutdown signals
    shutdown_event = asyncio.Event()

    def signal_handler(sig, frame):
        logger.info("Shutdown signal received (%s)", sig)
        shutdown_event.set()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        # Initialize and start
        manager.initialize()
        await manager.start()

        logger.info("ScamGuard Bot is running. Press Ctrl+C to stop.")

        # Wait for shutdown signal
        await shutdown_event.wait()

    except ValueError as e:
        logger.error("Configuration error: %s", e)
        logger.error("Please check your .env file. Copy .env.example to .env and configure it.")
        sys.exit(1)
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error("Fatal error: %s", e, exc_info=True)
        sys.exit(1)
    finally:
        await manager.stop()
        logger.info("ScamGuard Bot shut down cleanly")

if __name__ == "__main__":
    # Setup basic logging before env is loaded
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(main())