"""
Configuration Manager for WordPress to Git Repository Converter
Handles loading and validating configuration from YAML files
"""

import os
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
from loguru import logger


class ConfigurationError(Exception):
    """Custom exception for configuration errors"""
    pass


class ConfigManager:
    """Manages configuration loading and validation"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Initialize ConfigManager
        
        Args:
            config_path: Path to configuration file
        """
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self._load_config()
        self._validate_config()
        
    def _load_config(self) -> None:
        """Load configuration from YAML file"""
        if not self.config_path.exists():
            raise ConfigurationError(
                f"Configuration file not found: {self.config_path}\n"
                f"Please copy config.template.yaml to config.yaml and update with your credentials."
            )
        
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = yaml.safe_load(f)
            logger.info(f"Configuration loaded from {self.config_path}")
        except yaml.YAMLError as e:
            raise ConfigurationError(f"Error parsing YAML configuration: {e}")
        except Exception as e:
            raise ConfigurationError(f"Error loading configuration: {e}")
    
    def _validate_config(self) -> None:
        """Validate required configuration parameters"""
        errors = []
        
        # Validate WordPress configuration
        if 'wordpress' not in self.config:
            errors.append("Missing 'wordpress' section in configuration")
        else:
            wp_config = self.config['wordpress']
            if not wp_config.get('site_url'):
                errors.append("Missing 'wordpress.site_url' in configuration")
            
            # Check authentication method
            has_basic_auth = wp_config.get('username') and wp_config.get('password')
            has_app_password = wp_config.get('app_password')
            
            if not (has_basic_auth or has_app_password):
                errors.append(
                    "Missing WordPress authentication. Provide either:\n"
                    "  - username and password, or\n"
                    "  - app_password"
                )
        
        # Validate GitHub configuration
        if 'github' not in self.config:
            errors.append("Missing 'github' section in configuration")
        else:
            gh_config = self.config['github']
            required_fields = ['token', 'username', 'repository']
            for field in required_fields:
                if not gh_config.get(field):
                    errors.append(f"Missing 'github.{field}' in configuration")
        
        # Validate migration configuration
        if 'migration' not in self.config:
            logger.warning("Missing 'migration' section, using defaults")
            self.config['migration'] = self._get_default_migration_config()
        
        if errors:
            error_msg = "Configuration validation failed:\n" + "\n".join(f"  - {e}" for e in errors)
            raise ConfigurationError(error_msg)
        
        logger.info("Configuration validated successfully")
    
    def _get_default_migration_config(self) -> Dict[str, Any]:
        """Get default migration configuration"""
        return {
            'content_types': ['posts', 'pages', 'media'],
            'output_directory': './output',
            'markdown_flavor': 'github',
            'preserve_dates': True,
            'download_media': True,
            'media_directory': 'assets/images',
            'create_index': True
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value using dot notation
        
        Args:
            key: Configuration key (e.g., 'wordpress.site_url')
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
                if value is None:
                    return default
            else:
                return default
        
        return value
    
    def get_wordpress_config(self) -> Dict[str, Any]:
        """Get WordPress configuration section"""
        return self.config.get('wordpress', {})
    
    def get_github_config(self) -> Dict[str, Any]:
        """Get GitHub configuration section"""
        return self.config.get('github', {})
    
    def get_migration_config(self) -> Dict[str, Any]:
        """Get migration configuration section"""
        return self.config.get('migration', self._get_default_migration_config())
    
    def get_git_config(self) -> Dict[str, Any]:
        """Get Git configuration section"""
        defaults = {
            'commit_message': 'Migrated from WordPress on {date}',
            'author_name': 'WordPress Migration Bot',
            'author_email': 'migration@example.com',
            'auto_push': True,
            'force_push': False,
            'create_gitignore': True,
            'ignore_patterns': ['*.log', '.DS_Store', 'Thumbs.db']
        }
        return {**defaults, **self.config.get('git', {})}
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration section"""
        defaults = {
            'level': 'INFO',
            'log_file': 'migration.log',
            'console_output': True,
            'colorize': True
        }
        return {**defaults, **self.config.get('logging', {})}
    
    def get_advanced_config(self) -> Dict[str, Any]:
        """Get advanced configuration section"""
        defaults = {
            'max_retries': 3,
            'retry_delay': 5,
            'request_timeout': 30,
            'rate_limit_delay': 0.5,
            'custom_frontmatter': {},
            'run_post_processors': False,
            'post_processor_scripts': []
        }
        return {**defaults, **self.config.get('advanced', {})}
    
    def get_output_directory(self) -> Path:
        """Get output directory as Path object"""
        output_dir = self.get('migration.output_directory', './output')
        return Path(output_dir).resolve()
    
    def get_media_directory(self) -> Path:
        """Get media directory as Path object (relative to output directory)"""
        media_dir = self.get('migration.media_directory', 'assets/images')
        return Path(media_dir)
    
    def should_download_media(self) -> bool:
        """Check if media should be downloaded"""
        return self.get('migration.download_media', True)
    
    def should_push_to_github(self) -> bool:
        """Check if changes should be pushed to GitHub"""
        return self.get('git.auto_push', True)
    
    def get_content_types(self) -> list:
        """Get list of content types to migrate"""
        return self.get('migration.content_types', ['posts', 'pages', 'media'])
    
    def __repr__(self) -> str:
        """String representation of ConfigManager"""
        return f"ConfigManager(config_path='{self.config_path}')"