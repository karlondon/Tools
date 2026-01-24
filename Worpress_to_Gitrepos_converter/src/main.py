"""
WordPress to Git Repository Converter - Main Entry Point
Command-line interface for the migration tool
"""

import sys
import click
from pathlib import Path
from loguru import logger
from colorama import init as colorama_init, Fore, Style

from .config_manager import ConfigManager, ConfigurationError
from .migration_orchestrator import MigrationOrchestrator

# Initialize colorama for cross-platform colored output
colorama_init(autoreset=True)

def setup_logging(log_level: str, log_file: str, console_output: bool, colorize: bool):
    """Setup logging configuration"""
    logger.remove()  # Remove default handler
    
    # Console logging
    if console_output:
        if colorize:
            logger.add(
                sys.stderr,
                format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
                level=log_level,
                colorize=True
            )
        else:
            logger.add(
                sys.stderr,
                format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
                level=log_level
            )
    
    # File logging
    if log_file:
        logger.add(
            log_file,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
            level="DEBUG",  # Always log debug to file
            rotation="10 MB",
            retention="7 days"
        )

def print_banner():
    """Print application banner"""
    banner = f"""
{Fore.CYAN}{'=' * 70}
{Fore.CYAN}  WordPress to Git Repository Converter
{Fore.CYAN}  Migrate your WordPress site to GitHub with ease
{Fore.CYAN}{'=' * 70}{Style.RESET_ALL}
"""
    print(banner)

@click.command()
@click.option(
    '--config', '-c',
    default='config.yaml',
    help='Path to configuration file (default: config.yaml)',
    type=click.Path(exists=True)
)
@click.option(
    '--dry-run',
    is_flag=True,
    help='Preview migration without committing/pushing to GitHub'
)
@click.option(
    '--types',
    help='Content types to migrate (comma-separated: posts,pages,media)',
    type=str
)
@click.option(
    '--skip-media',
    is_flag=True,
    help='Skip media download'
)
@click.option(
    '--verbose', '-v',
    is_flag=True,
    help='Enable verbose (DEBUG) logging'
)
def main(config: str, dry_run: bool, types: str, skip_media: bool, verbose: bool):
    """
    WordPress to Git Repository Converter
    
    Migrates WordPress site content (posts, pages, media) to a Git repository
    or GitHub Pages. Converts HTML content to Markdown with front matter.
    
    Examples:
    
        # Basic migration with default config
        python main.py
        
        # Dry run to preview changes
        python main.py --dry-run
        
        # Migrate only posts and pages
        python main.py --types posts,pages
        
        # Skip media download
        python main.py --skip-media
        
        # Use custom config file
        python main.py --config my-config.yaml
    """
    print_banner()
    
    try:
        # Load configuration
        logger.info(f"Loading configuration from: {config}")
        config_manager = ConfigManager(config)
        
        # Setup logging based on config
        log_config = config_manager.get_logging_config()
        log_level = 'DEBUG' if verbose else log_config.get('level', 'INFO')
        setup_logging(
            log_level=log_level,
            log_file=log_config.get('log_file', 'migration.log'),
            console_output=log_config.get('console_output', True),
            colorize=log_config.get('colorize', True)
        )
        
        # Override content types if specified
        if types:
            content_types = [t.strip() for t in types.split(',')]
            config_manager.config['migration']['content_types'] = content_types
            logger.info(f"Content types overridden: {content_types}")
        
        # Override media download if specified
        if skip_media:
            config_manager.config['migration']['download_media'] = False
            logger.info("Media download disabled via command line")
        
        # Create migration orchestrator
        orchestrator = MigrationOrchestrator(config_manager)
        
        # Execute migration
        orchestrator.migrate(dry_run=dry_run)
        
        # Success message
        print(f"\n{Fore.GREEN}✓ Migration completed successfully!{Style.RESET_ALL}")
        
        if dry_run:
            print(f"\n{Fore.YELLOW}Note: This was a dry run. No changes were committed or pushed.{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Run without --dry-run to perform actual migration.{Style.RESET_ALL}")
        
        return 0
        
    except ConfigurationError as e:
        logger.error(f"Configuration error: {e}")
        print(f"\n{Fore.RED}✗ Configuration Error:{Style.RESET_ALL}")
        print(f"{Fore.RED}{e}{Style.RESET_ALL}")
        print(f"\n{Fore.YELLOW}Tip: Make sure you've created config.yaml from config.template.yaml{Style.RESET_ALL}")
        return 1
        
    except Exception as e:
        logger.exception(f"Migration failed: {e}")
        print(f"\n{Fore.RED}✗ Migration Failed:{Style.RESET_ALL}")
        print(f"{Fore.RED}{e}{Style.RESET_ALL}")
        print(f"\n{Fore.YELLOW}Check the log file for detailed error information.{Style.RESET_ALL}")
        return 1

if __name__ == '__main__':
    sys.exit(main())