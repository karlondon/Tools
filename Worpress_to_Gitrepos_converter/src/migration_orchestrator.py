"""
Migration Orchestrator
Coordinates the entire WordPress to Git migration process
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from tqdm import tqdm
from loguru import logger

from typing import Dict, List, Any, Optional
from .config_manager import ConfigManager
from .wordpress_client import WordPressClient, WordPressAPIError
from .content_converter import ContentConverter
from .github_manager import GitHubManager, GitHubManagerError

class MigrationOrchestrator:
    """Orchestrates the complete migration process"""
    
    def __init__(self, config: ConfigManager):
        """
        Initialize Migration Orchestrator
        
        Args:
            config: Configuration manager instance
        """
        self.config = config
        self.wp_client: Optional[WordPressClient] = None
        self.converter: Optional[ContentConverter] = None
        self.github_manager: Optional[GitHubManager] = None
        self.state_file = Path(config.get('migration.state_file', '.migration_state.json'))
        self.migration_state = self._load_state()
        
    def _load_state(self) -> Dict[str, Any]:
        """Load migration state from file"""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load state file: {e}")
        return {'migrated_posts': [], 'migrated_pages': [], 'migrated_media': []}
    
    def _save_state(self) -> None:
        """Save migration state to file"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.migration_state, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save state file: {e}")
    
    def initialize_clients(self) -> None:
        """Initialize all clients"""
        logger.info("Initializing clients...")
        
        # Initialize WordPress client
        wp_config = self.config.get_wordpress_config()
        try:
            self.wp_client = WordPressClient(
                site_url=wp_config['site_url'],
                username=wp_config.get('username'),
                password=wp_config.get('password'),
                app_password=wp_config.get('app_password'),
                verify_ssl=wp_config.get('verify_ssl', True),
                per_page=wp_config.get('per_page', 100),
                timeout=self.config.get('advanced.request_timeout', 30)
            )
            logger.info("WordPress client initialized")
        except WordPressAPIError as e:
            raise Exception(f"Failed to initialize WordPress client: {e}")
        
        # Initialize content converter
        migration_config = self.config.get_migration_config()
        self.converter = ContentConverter(
            markdown_flavor=migration_config.get('markdown_flavor', 'github'),
            preserve_dates=migration_config.get('preserve_dates', True),
            date_format=migration_config.get('date_format', '%Y-%m-%d'),
            use_slug_in_filename=migration_config.get('use_slug_in_filename', True)
        )
        logger.info("Content converter initialized")
        
        # Initialize GitHub manager
        gh_config = self.config.get_github_config()
        try:
            self.github_manager = GitHubManager(
                token=gh_config['token'],
                username=gh_config['username'],
                repository=gh_config['repository'],
                branch=gh_config.get('branch', 'main'),
                create_if_missing=gh_config.get('create_if_missing', True),
                visibility=gh_config.get('visibility', 'public')
            )
            logger.info("GitHub manager initialized")
        except GitHubManagerError as e:
            raise Exception(f"Failed to initialize GitHub manager: {e}")
    
    def migrate_posts(self, output_dir: Path) -> List[Dict]:
        """Migrate WordPress posts"""
        logger.info("Starting posts migration...")
        
        posts_dir = output_dir / 'posts'
        posts_dir.mkdir(parents=True, exist_ok=True)
        
        # Fetch posts from WordPress
        posts = self.wp_client.get_posts()
        logger.info(f"Found {len(posts)} posts to migrate")
        
        migrated_posts = []
        custom_fm = self.config.get('advanced.custom_frontmatter', {})
        
        for post in tqdm(posts, desc="Migrating posts"):
            post_id = post.get('id')
            
            # Skip if already migrated and tracking changes
            if self.config.get('migration.track_changes', True):
                if post_id in self.migration_state.get('migrated_posts', []):
                    logger.debug(f"Skipping already migrated post: {post_id}")
                    continue
            
            try:
                # Convert post to Markdown
                converted = self.converter.convert_post(post, custom_fm)
                
                # Write to file
                post_file = posts_dir / converted['filename']
                with open(post_file, 'w', encoding='utf-8') as f:
                    f.write(converted['content'])
                
                migrated_posts.append(converted['metadata'])
                self.migration_state['migrated_posts'].append(post_id)
                
                logger.debug(f"Migrated post: {converted['filename']}")
            except Exception as e:
                logger.error(f"Failed to migrate post {post_id}: {e}")
        
        logger.info(f"Migrated {len(migrated_posts)} posts")
        return migrated_posts
    
    def migrate_pages(self, output_dir: Path) -> List[Dict]:
        """Migrate WordPress pages"""
        logger.info("Starting pages migration...")
        
        pages_dir = output_dir / 'pages'
        pages_dir.mkdir(parents=True, exist_ok=True)
        
        # Fetch pages from WordPress
        pages = self.wp_client.get_pages()
        logger.info(f"Found {len(pages)} pages to migrate")
        
        migrated_pages = []
        custom_fm = self.config.get('advanced.custom_frontmatter', {})
        
        for page in tqdm(pages, desc="Migrating pages"):
            page_id = page.get('id')
            
            # Skip if already migrated and tracking changes
            if self.config.get('migration.track_changes', True):
                if page_id in self.migration_state.get('migrated_pages', []):
                    logger.debug(f"Skipping already migrated page: {page_id}")
                    continue
            
            try:
                # Convert page to Markdown
                converted = self.converter.convert_page(page, custom_fm)
                
                # Write to file
                page_file = pages_dir / converted['filename']
                with open(page_file, 'w', encoding='utf-8') as f:
                    f.write(converted['content'])
                
                migrated_pages.append(converted['metadata'])
                self.migration_state['migrated_pages'].append(page_id)
                
                logger.debug(f"Migrated page: {converted['filename']}")
            except Exception as e:
                logger.error(f"Failed to migrate page {page_id}: {e}")
        
        logger.info(f"Migrated {len(migrated_pages)} pages")
        return migrated_pages
    
    def migrate_media(self, output_dir: Path) -> int:
        """Migrate WordPress media files"""
        if not self.config.should_download_media():
            logger.info("Media download disabled, skipping...")
            return 0
        
        logger.info("Starting media migration...")
        
        media_dir = output_dir / self.config.get_media_directory()
        media_dir.mkdir(parents=True, exist_ok=True)
        
        # Fetch media from WordPress
        media_items = self.wp_client.get_media()
        logger.info(f"Found {len(media_items)} media items")
        
        downloaded_count = 0
        rate_limit = self.config.get('advanced.rate_limit_delay', 0.5)
        
        for item in tqdm(media_items, desc="Downloading media"):
            media_id = item.get('id')
            
            # Skip if already downloaded
            if self.config.get('migration.track_changes', True):
                if media_id in self.migration_state.get('migrated_media', []):
                    continue
            
            try:
                source_url = item.get('source_url')
                if not source_url:
                    continue
                
                # Get filename
                filename = Path(source_url).name
                output_path = media_dir / filename
                
                # Download file
                if self.wp_client.download_media_file(
                    source_url,
                    str(output_path),
                    rate_limit
                ):
                    downloaded_count += 1
                    self.migration_state['migrated_media'].append(media_id)
            except Exception as e:
                logger.error(f"Failed to download media {media_id}: {e}")
        
        logger.info(f"Downloaded {downloaded_count} media files")
        return downloaded_count
    
    def create_index(self, output_dir: Path, posts_metadata: List[Dict]) -> None:
        """Create index page"""
        if not self.config.get('migration.create_index', True):
            return
        
        logger.info("Creating index page...")
        
        template = self.config.get('migration.index_template', 'list')
        index_content = self.converter.create_index_page(posts_metadata, template)
        
        index_file = output_dir / 'index.md'
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(index_content)
        
        logger.info("Index page created")
    
    def migrate(self, dry_run: bool = False) -> None:
        """
        Execute complete migration
        
        Args:
            dry_run: If True, don't commit/push to GitHub
        """
        logger.info("=" * 60)
        logger.info("WordPress to Git Migration Started")
        logger.info("=" * 60)
        
        # Initialize clients
        self.initialize_clients()
        
        # Get output directory
        output_dir = self.config.get_output_directory()
        logger.info(f"Output directory: {output_dir}")
        
        # Clone or initialize repository
        self.github_manager.clone_or_init_repo(output_dir)
        
        # Get content types to migrate
        content_types = self.config.get_content_types()
        
        posts_metadata = []
        pages_metadata = []
        media_count = 0
        
        # Migrate content
        if 'posts' in content_types:
            posts_metadata = self.migrate_posts(output_dir)
        
        if 'pages' in content_types:
            pages_metadata = self.migrate_pages(output_dir)
        
        if 'media' in content_types:
            media_count = self.migrate_media(output_dir)
        
        # Create index page
        if posts_metadata:
            self.create_index(output_dir, posts_metadata)
        
        # Save migration state
        self._save_state()
        
        # Create .gitignore if configured
        git_config = self.config.get_git_config()
        if git_config.get('create_gitignore', True):
            self.github_manager.create_gitignore(
                git_config.get('ignore_patterns', [])
            )
        
        if dry_run:
            logger.info("=" * 60)
            logger.info("DRY RUN - No changes committed or pushed")
            logger.info("=" * 60)
        else:
            # Commit changes
            committed = self.github_manager.commit_changes(
                message=git_config.get('commit_message', 'Migrated from WordPress'),
                author_name=git_config.get('author_name'),
                author_email=git_config.get('author_email')
            )
            
            # Push to GitHub if configured
            if committed and self.config.should_push_to_github():
                self.github_manager.push_changes(
                    force=git_config.get('force_push', False)
                )
        
        # Print summary
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Posts migrated: {len(posts_metadata)}")
        logger.info(f"  Pages migrated: {len(pages_metadata)}")
        logger.info(f"  Media downloaded: {media_count}")
        logger.info(f"  Repository: {self.github_manager.get_repository_url()}")
        if git_config.get('branch') == 'gh-pages':
            logger.info(f"  GitHub Pages: {self.github_manager.get_pages_url()}")
        logger.info("=" * 60)
        logger.info("Migration Completed Successfully!")
        logger.info("=" * 60)