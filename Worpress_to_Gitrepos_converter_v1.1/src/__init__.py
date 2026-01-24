"""
WordPress to Git Repository Converter
A tool to migrate WordPress sites to Git repositories
"""

__version__ = '1.0.0'
__author__ = 'WordPress Migration Tool'
__description__ = 'Migrate WordPress sites to Git repositories or GitHub Pages'

from .config_manager import ConfigManager, ConfigurationError
from .wordpress_client import WordPressClient, WordPressAPIError
from .content_converter import ContentConverter
from .github_manager import GitHubManager, GitHubManagerError
from .migration_orchestrator import MigrationOrchestrator

__all__ = [
    'ConfigManager',
    'ConfigurationError',
    'WordPressClient',
    'WordPressAPIError',
    'ContentConverter',
    'GitHubManager',
    'GitHubManagerError',
    'MigrationOrchestrator',
]