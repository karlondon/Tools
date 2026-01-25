#!/usr/bin/env python3
"""
Watch Service - Continuous Git to WordPress sync
Monitors Git repository for new Markdown files and syncs to WordPress
"""

import os
import sys
import time
import yaml
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'Git_to_WordPress_Importer'))
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('watch_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WatchService:
    """
    Watches Git repository for new/modified Markdown files and syncs to WordPress.
    """
    
    def __init__(self, config_path: str = 'config.yaml'):
        """Initialize watch service."""
        self.config = self._load_config(config_path)
        self.sync_interval = self.config.get('sync', {}).get('git_to_wp', {}).get('watch_interval', 300)
        self.posts_dir = self.config.get('import', {}).get('posts_directory', 'posts')
        self.pages_dir = self.config.get('import', {}).get('pages_directory', 'pages')
        
        # Track processed files
        self.processed_files: Set[str] = set()
        self.file_hashes: Dict[str, str] = {}
        
        # Load sync state
        self.sync_state_file = self.config.get('sync', {}).get('sync_state_file', '.sync_state.json')
        
        logger.info(f"Watch service initialized")
        logger.info(f"Monitoring directories: {self.posts_dir}, {self.pages_dir}")
        logger.info(f"Check interval: {self.sync_interval} seconds")
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration file."""
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                logger.info(f"Loaded configuration from {config_path}")
                return config
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            sys.exit(1)
    
    def _get_file_hash(self, file_path: str) -> str:
        """Get hash of file content."""
        import hashlib
        try:
            with open(file_path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()
        except Exception as e:
            logger.error(f"Failed to hash file {file_path}: {e}")
            return ""
    
    def _scan_directory(self, directory: str) -> List[str]:
        """Scan directory for Markdown files."""
        md_files = []
        
        if not os.path.exists(directory):
            logger.warning(f"Directory not found: {directory}")
            return md_files
        
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.md'):
                    file_path = os.path.join(root, file)
                    md_files.append(file_path)
        
        return md_files
    
    def _is_new_or_modified(self, file_path: str) -> bool:
        """Check if file is new or has been modified."""
        current_hash = self._get_file_hash(file_path)
        
        # New file
        if file_path not in self.processed_files:
            return True
        
        # Modified file
        if self.file_hashes.get(file_path) != current_hash:
            return True
        
        return False
    
    def _sync_file_to_wordpress(self, file_path: str) -> bool:
        """
        Sync a single Markdown file to WordPress.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            from src.sync_coordinator import SyncCoordinator
            from src.import_orchestrator import ImportOrchestrator
            
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Initialize sync coordinator
            coordinator = SyncCoordinator(self.config)
            
            # Check if should sync
            if not coordinator.should_sync_to_wordpress(file_path, content):
                logger.info(f"⏭️  Skipping {file_path} (originated from WordPress or no changes)")
                return False
            
            # Initialize importer
            importer = ImportOrchestrator(self.config)
            
            # Import file to WordPress
            logger.info(f"🔄 Syncing {file_path} to WordPress...")
            post_id = importer.import_markdown_file(file_path)
            
            if post_id:
                # Record sync
                coordinator.record_git_to_wp_sync(file_path, post_id, content)
                
                # Update tracking
                self.processed_files.add(file_path)
                self.file_hashes[file_path] = self._get_file_hash(file_path)
                
                logger.info(f"✅ Successfully synced {file_path} → WordPress post {post_id}")
                return True
            else:
                logger.error(f"❌ Failed to sync {file_path}")
                return False
                
        except ImportError as e:
            logger.error(f"Import error: {e}")
            logger.info("Make sure Git_to_WordPress_Importer is available")
            return False
        except Exception as e:
            logger.error(f"Error syncing {file_path}: {e}", exc_info=True)
            return False
    
    def _check_for_changes(self):
        """Check for new or modified files."""
        logger.debug("Checking for changes...")
        
        # Scan directories
        all_files = []
        all_files.extend(self._scan_directory(self.posts_dir))
        all_files.extend(self._scan_directory(self.pages_dir))
        
        logger.debug(f"Found {len(all_files)} total Markdown files")
        
        # Check each file
        synced_count = 0
        for file_path in all_files:
            if self._is_new_or_modified(file_path):
                logger.info(f"📝 Detected change: {file_path}")
                if self._sync_file_to_wordpress(file_path):
                    synced_count += 1
                    time.sleep(1)  # Small delay between syncs
        
        if synced_count > 0:
            logger.info(f"✅ Synced {synced_count} file(s) to WordPress")
        else:
            logger.debug("No changes detected")
    
    def run(self):
        """Main watch loop."""
        logger.info("🚀 Starting watch service...")
        logger.info(f"Press Ctrl+C to stop")
        
        try:
            while True:
                try:
                    self._check_for_changes()
                except Exception as e:
                    logger.error(f"Error during check: {e}", exc_info=True)
                
                # Wait for next check
                logger.debug(f"Waiting {self.sync_interval} seconds until next check...")
                time.sleep(self.sync_interval)
                
        except KeyboardInterrupt:
            logger.info("\n⏹️  Watch service stopped by user")
        except Exception as e:
            logger.error(f"Fatal error: {e}", exc_info=True)

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Watch Git repository and sync to WordPress')
    parser.add_argument('--config', '-c', default='config.yaml', help='Path to config file')
    parser.add_argument('--interval', '-i', type=int, help='Check interval in seconds')
    parser.add_argument('--once', action='store_true', help='Run once and exit')
    
    args = parser.parse_args()
    
    # Initialize service
    service = WatchService(args.config)
    
    # Override interval if provided
    if args.interval:
        service.sync_interval = args.interval
        logger.info(f"Using custom interval: {args.interval} seconds")
    
    if args.once:
        # Run once and exit
        logger.info("Running single check...")
        service._check_for_changes()
        logger.info("Single check complete")
    else:
        # Run continuous watch
        service.run()

if __name__ == '__main__':
    main()