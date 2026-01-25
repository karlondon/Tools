#!/usr/bin/env python3
"""
Sync Coordinator - Core bidirectional sync logic
Coordinates between WordPress and GitHub, prevents loops, handles conflicts
"""

import os
import sys
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'Worpress_to_Gitrepos_converter_v1.1'))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'Git_to_WordPress_Importer'))

from src.wordpress_client import WordPressClient
from src.github_manager import GitHubManager
from src.content_converter import ContentConverter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SyncCoordinator:
    """
    Coordinates bidirectional synchronization between WordPress and GitHub.
    
    Responsibilities:
    - Track sync state to prevent loops
    - Detect new/modified content in both directions
    - Coordinate with existing tools (WP→Git and Git→WP)
    - Handle conflict resolution
    - Maintain sync metadata
    """
    
    def __init__(self, config: Dict):
        """
        Initialize the Sync Coordinator.
        
        Args:
            config: Configuration dictionary with WordPress, GitHub, and sync settings
        """
        self.config = config
        self.sync_state_file = config.get('sync', {}).get('sync_state_file', '.sync_state.json')
        self.prevent_loops = config.get('sync', {}).get('prevent_loops', True)
        self.conflict_strategy = config.get('sync', {}).get('conflict_strategy', 'newest_wins')
        
        # Initialize clients
        self.wp_client = None
        self.github_manager = None
        
        # Load sync state
        self.sync_state = self._load_sync_state()
        
        logger.info("Sync Coordinator initialized")
    
    def _load_sync_state(self) -> Dict:
        """Load sync state from file."""
        if os.path.exists(self.sync_state_file):
            try:
                with open(self.sync_state_file, 'r') as f:
                    state = json.load(f)
                    logger.info(f"Loaded sync state: {len(state.get('posts', {}))} posts tracked")
                    return state
            except Exception as e:
                logger.error(f"Failed to load sync state: {e}")
        
        return {
            'posts': {},
            'pages': {},
            'media': {},
            'last_sync': {
                'wp_to_git': None,
                'git_to_wp': None
            },
            'version': '1.0'
        }
    
    def _save_sync_state(self):
        """Save sync state to file."""
        try:
            with open(self.sync_state_file, 'w') as f:
                json.dump(self.sync_state, f, indent=2)
            logger.info(f"Saved sync state to {self.sync_state_file}")
        except Exception as e:
            logger.error(f"Failed to save sync state: {e}")
    
    def _get_content_hash(self, content: str) -> str:
        """Generate hash of content for change detection."""
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def should_sync_to_github(self, post_id: int, post_data: Dict) -> bool:
        """
        Determine if a WordPress post should be synced to GitHub.
        
        Args:
            post_id: WordPress post ID
            post_data: Post data dictionary
            
        Returns:
            True if should sync, False otherwise
        """
        if not self.prevent_loops:
            return True
        
        post_key = f"wp_{post_id}"
        
        # Check if this post originated from GitHub
        if post_key in self.sync_state['posts']:
            post_state = self.sync_state['posts'][post_key]
            if post_state.get('sync_origin') == 'github':
                logger.info(f"Post {post_id} originated from GitHub, skipping sync to GitHub")
                return False
        
        # Check if content has changed since last sync
        content_hash = self._get_content_hash(post_data.get('content', {}).get('rendered', ''))
        if post_key in self.sync_state['posts']:
            last_hash = self.sync_state['posts'][post_key].get('content_hash')
            if last_hash == content_hash:
                logger.debug(f"Post {post_id} unchanged since last sync")
                return False
        
        return True
    
    def should_sync_to_wordpress(self, file_path: str, file_content: str) -> bool:
        """
        Determine if a GitHub file should be synced to WordPress.
        
        Args:
            file_path: Path to markdown file in repository
            file_content: Content of the file
            
        Returns:
            True if should sync, False otherwise
        """
        if not self.prevent_loops:
            return True
        
        file_key = f"git_{file_path}"
        
        # Check if this file originated from WordPress
        if file_key in self.sync_state['posts']:
            file_state = self.sync_state['posts'][file_key]
            if file_state.get('sync_origin') == 'wordpress':
                logger.info(f"File {file_path} originated from WordPress, skipping sync to WordPress")
                return False
        
        # Check if content has changed since last sync
        content_hash = self._get_content_hash(file_content)
        if file_key in self.sync_state['posts']:
            last_hash = self.sync_state['posts'][file_key].get('content_hash')
            if last_hash == content_hash:
                logger.debug(f"File {file_path} unchanged since last sync")
                return False
        
        return True
    
    def record_wp_to_git_sync(self, post_id: int, file_path: str, post_data: Dict):
        """
        Record that a WordPress post was synced to GitHub.
        
        Args:
            post_id: WordPress post ID
            file_path: Path where file was created in repository
            post_data: Post data dictionary
        """
        content_hash = self._get_content_hash(post_data.get('content', {}).get('rendered', ''))
        
        post_key = f"wp_{post_id}"
        self.sync_state['posts'][post_key] = {
            'wordpress_id': post_id,
            'github_path': file_path,
            'sync_origin': 'wordpress',
            'content_hash': content_hash,
            'last_sync': datetime.now().isoformat(),
            'sync_direction': 'wp_to_git'
        }
        
        # Also track by GitHub path
        file_key = f"git_{file_path}"
        self.sync_state['posts'][file_key] = {
            'wordpress_id': post_id,
            'github_path': file_path,
            'sync_origin': 'wordpress',
            'content_hash': content_hash,
            'last_sync': datetime.now().isoformat(),
            'sync_direction': 'wp_to_git'
        }
        
        self.sync_state['last_sync']['wp_to_git'] = datetime.now().isoformat()
        self._save_sync_state()
        
        logger.info(f"Recorded WP→Git sync: Post {post_id} → {file_path}")
    
    def record_git_to_wp_sync(self, file_path: str, post_id: int, file_content: str):
        """
        Record that a GitHub file was synced to WordPress.
        
        Args:
            file_path: Path to file in repository
            post_id: Created WordPress post ID
            file_content: Content of the file
        """
        content_hash = self._get_content_hash(file_content)
        
        file_key = f"git_{file_path}"
        self.sync_state['posts'][file_key] = {
            'wordpress_id': post_id,
            'github_path': file_path,
            'sync_origin': 'github',
            'content_hash': content_hash,
            'last_sync': datetime.now().isoformat(),
            'sync_direction': 'git_to_wp'
        }
        
        # Also track by WordPress ID
        post_key = f"wp_{post_id}"
        self.sync_state['posts'][post_key] = {
            'wordpress_id': post_id,
            'github_path': file_path,
            'sync_origin': 'github',
            'content_hash': content_hash,
            'last_sync': datetime.now().isoformat(),
            'sync_direction': 'git_to_wp'
        }
        
        self.sync_state['last_sync']['git_to_wp'] = datetime.now().isoformat()
        self._save_sync_state()
        
        logger.info(f"Recorded Git→WP sync: {file_path} → Post {post_id}")
    
    def detect_conflicts(self) -> List[Dict]:
        """
        Detect potential sync conflicts.
        
        Returns:
            List of conflict dictionaries
        """
        conflicts = []
        
        for key, state in self.sync_state['posts'].items():
            # Check for posts that have been modified in both locations
            # This is a simplified conflict detection
            # In production, you'd check actual modification times
            pass
        
        return conflicts
    
    def resolve_conflict(self, conflict: Dict) -> str:
        """
        Resolve a sync conflict based on strategy.
        
        Args:
            conflict: Conflict dictionary
            
        Returns:
            Resolution decision: 'wordpress', 'github', or 'manual'
        """
        strategy = self.conflict_strategy
        
        if strategy == 'wordpress_wins':
            return 'wordpress'
        elif strategy == 'github_wins':
            return 'github'
        elif strategy == 'newest_wins':
            # Compare modification times
            # For now, return manual
            return 'manual'
        else:
            return 'manual'
    
    def get_sync_statistics(self) -> Dict:
        """
        Get sync statistics.
        
        Returns:
            Statistics dictionary
        """
        posts = self.sync_state['posts']
        
        wp_origin = sum(1 for p in posts.values() if p.get('sync_origin') == 'wordpress')
        git_origin = sum(1 for p in posts.values() if p.get('sync_origin') == 'github')
        
        return {
            'total_synced_posts': len(posts),
            'wordpress_origin': wp_origin,
            'github_origin': git_origin,
            'last_wp_to_git': self.sync_state['last_sync'].get('wp_to_git'),
            'last_git_to_wp': self.sync_state['last_sync'].get('git_to_wp'),
            'state_file': self.sync_state_file
        }
    
    def reset_sync_state(self):
        """Reset sync state (use with caution!)."""
        logger.warning("Resetting sync state!")
        self.sync_state = {
            'posts': {},
            'pages': {},
            'media': {},
            'last_sync': {
                'wp_to_git': None,
                'git_to_wp': None
            },
            'version': '1.0'
        }
        self._save_sync_state()
    
    def export_sync_report(self, output_file: str = 'sync_report.json'):
        """
        Export detailed sync report.
        
        Args:
            output_file: Path to output file
        """
        report = {
            'generated_at': datetime.now().isoformat(),
            'statistics': self.get_sync_statistics(),
            'sync_state': self.sync_state,
            'configuration': {
                'prevent_loops': self.prevent_loops,
                'conflict_strategy': self.conflict_strategy
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"Sync report exported to {output_file}")


def main():
    """Test the sync coordinator."""
    # Example configuration
    config = {
        'sync': {
            'prevent_loops': True,
            'sync_state_file': '.sync_state.json',
            'conflict_strategy': 'newest_wins'
        }
    }
    
    coordinator = SyncCoordinator(config)
    
    # Print statistics
    stats = coordinator.get_sync_statistics()
    print("\n=== Sync Statistics ===")
    for key, value in stats.items():
        print(f"{key}: {value}")
    
    # Export report
    coordinator.export_sync_report()
    print(f"\nSync report exported to sync_report.json")


if __name__ == '__main__':
    main()