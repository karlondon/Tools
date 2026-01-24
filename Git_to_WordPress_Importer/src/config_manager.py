"""Configuration management for Git to WordPress Importer"""

import os
import yaml
from typing import Dict, Any, Optional
from pathlib import Path


class ConfigManager:
    """Manage configuration for the importer"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize configuration manager
        
        Args:
            config_path: Path to configuration file
        """
        self.config_path = config_path
        self.config: Dict[str, Any] = {}
        
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file
        
        Returns:
            Configuration dictionary
        """
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found: {self.config_path}\n"
                f"Please copy config.template.yaml to config.yaml and fill in your details."
            )
        
        with open(self.config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Validate required fields
        self._validate_config()
        
        # Load environment variables if .env exists
        self._load_env_overrides()
        
        return self.config
    
    def _validate_config(self):
        """Validate required configuration fields"""
        required_fields = {
            'git': ['repository'],
            'wordpress': ['site_url', 'username', 'app_password'],
            'import': ['content_types']
        }
        
        for section, fields in required_fields.items():
            if section not in self.config:
                raise ValueError(f"Missing required config section: {section}")
            
            for field in fields:
                if field not in self.config[section]:
                    raise ValueError(f"Missing required field: {section}.{field}")
    
    def _load_env_overrides(self):
        """Load environment variable overrides"""
        # WordPress credentials from environment
        if os.getenv('WP_SITE_URL'):
            self.config['wordpress']['site_url'] = os.getenv('WP_SITE_URL')
        if os.getenv('WP_USERNAME'):
            self.config['wordpress']['username'] = os.getenv('WP_USERNAME')
        if os.getenv('WP_APP_PASSWORD'):
            self.config['wordpress']['app_password'] = os.getenv('WP_APP_PASSWORD')
        if os.getenv('WP_ADMIN_PASSWORD'):
            self.config['wordpress']['admin_password'] = os.getenv('WP_ADMIN_PASSWORD')
        
        # Git credentials from environment
        if os.getenv('GITHUB_TOKEN'):
            self.config['git']['github_token'] = os.getenv('GITHUB_TOKEN')
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """Get configuration value by dot-notation path
        
        Args:
            key_path: Dot-notation path (e.g., 'wordpress.site_url')
            default: Default value if not found
            
        Returns:
            Configuration value
        """
        keys = key_path.split('.')
        value = self.config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    def get_git_config(self) -> Dict[str, Any]:
        """Get Git configuration"""
        return self.config.get('git', {})
    
    def get_wordpress_config(self) -> Dict[str, Any]:
        """Get WordPress configuration"""
        return self.config.get('wordpress', {})
    
    def get_import_config(self) -> Dict[str, Any]:
        """Get import configuration"""
        return self.config.get('import', {})
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration"""
        return self.config.get('logging', {
            'level': 'INFO',
            'log_file': 'importer.log'
        })