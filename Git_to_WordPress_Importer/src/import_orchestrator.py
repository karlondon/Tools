"""Main orchestrator for Git to WordPress import process"""

from pathlib import Path
from typing import Dict, Any, List, Optional
from tqdm import tqdm

from .config_manager import ConfigManager
from .git_client import GitClient
from .markdown_parser import MarkdownParser
from .wordpress_writer import WordPressWriter
from .media_uploader import MediaUploader
from .category_tag_manager import CategoryTagManager


class ImportOrchestrator:
    """Coordinate the entire import process"""
    
    def __init__(self, config: ConfigManager):
        """Initialize orchestrator with configuration
        
        Args:
            config: Configuration manager instance
        """
        self.config = config
        
        # Initialize components
        git_config = config.get_git_config()
        wp_config = config.get_wordpress_config()
        
        self.git_client = GitClient(
            repo_url=git_config['repository'],
            branch=git_config.get('branch', 'main'),
            token=git_config.get('github_token')
        )
        
        self.parser = MarkdownParser()
        
        self.wp_writer = WordPressWriter(
            site_url=wp_config['site_url'],
            username=wp_config['username'],
            app_password=wp_config['app_password']
        )
        
        self.media_uploader = MediaUploader(
            site_url=wp_config['site_url'],
            username=wp_config['username'],
            app_password=wp_config['app_password']
        )
        
        self.cat_tag_manager = CategoryTagManager(
            site_url=wp_config['site_url'],
            username=wp_config['username'],
            app_password=wp_config['app_password']
        )
        
        self.import_config = config.get_import_config()
        self.dry_run = False
    
    def set_dry_run(self, enabled: bool):
        """Enable or disable dry run mode
        
        Args:
            enabled: True to enable dry run
        """
        self.dry_run = enabled
        if self.dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made\n")
    
    def test_connections(self) -> bool:
        """Test all connections
        
        Returns:
            True if all connections successful
        """
        print("Testing connections...")
        
        # Test WordPress connection
        if self.wp_writer.test_connection():
            print("✓ WordPress connection successful")
        else:
            print("✗ WordPress connection failed")
            return False
        
        return True
    
    def import_all(self) -> bool:
        """Import all content from repository
        
        Returns:
            True if successful
        """
        print("\n" + "="*60)
        print("Git to WordPress Importer")
        print("="*60 + "\n")
        
        # Test connections first
        if not self.test_connections():
            return False
        
        # Clone/pull repository
        print("\nCloning/updating repository...")
        try:
            self.git_client.clone_or_pull()
        except Exception as e:
            print(f"✗ Failed to access repository: {e}")
            return False
        
        # Import based on configuration
        content_types = self.import_config.get('content_types', [])
        
        success = True
        
        if 'categories' in content_types or 'tags' in content_types:
            print("\nNote: Categories and tags will be created automatically from posts")
        
        if 'posts' in content_types:
            print("\n" + "-"*60)
            print("Importing Posts")
            print("-"*60)
            if not self.import_posts():
                success = False
        
        if 'pages' in content_types:
            print("\n" + "-"*60)
            print("Importing Pages")
            print("-"*60)
            if not self.import_pages():
                success = False
        
        # Cleanup
        if not self.git_client.is_local_path():
            self.git_client.cleanup()
        
        print("\n" + "="*60)
        if success:
            print("✓ Import completed successfully!")
        else:
            print("⚠ Import completed with some errors")
        print("="*60 + "\n")
        
        return success
    
    def import_posts(self) -> bool:
        """Import blog posts from repository
        
        Returns:
            True if successful
        """
        posts_dir = self.import_config.get('posts_directory', 'posts')
        
        # Find all Markdown files in posts directory
        md_files = self.git_client.get_files_by_pattern('*.md', posts_dir)
        
        if not md_files:
            # Try Jekyll-style _posts directory
            md_files = self.git_client.get_files_by_pattern('*.md', '_posts')
        
        if not md_files:
            print("No Markdown files found in posts directory")
            return True
        
        print(f"Found {len(md_files)} post file(s)")
        
        # Process each post
        success_count = 0
        error_count = 0
        
        for md_file in tqdm(md_files, desc="Importing posts"):
            try:
                if self._import_post(md_file):
                    success_count += 1
                else:
                    error_count += 1
            except Exception as e:
                print(f"\n✗ Error processing {md_file.name}: {e}")
                error_count += 1
        
        print(f"\nResults: {success_count} imported, {error_count} failed")
        return error_count == 0
    
    def _import_post(self, md_file: Path) -> bool:
        """Import a single post
        
        Args:
            md_file: Path to Markdown file
            
        Returns:
            True if successful
        """
        # Parse Markdown file
        post_data = self.parser.parse_file(md_file)
        
        if self.dry_run:
            print(f"\n[DRY RUN] Would import: {post_data['title']}")
            return True
        
        # Check if post already exists
        skip_existing = self.import_config.get('skip_existing', True)
        existing = self.wp_writer.get_post_by_slug(post_data['slug'])
        
        if existing and skip_existing:
            print(f"\n⊘ Skipping existing post: {post_data['title']}")
            return True
        
        # Process categories and tags
        if post_data['categories']:
            post_data['category_ids'] = self.cat_tag_manager.process_categories(
                post_data['categories']
            )
        
        if post_data['tags']:
            post_data['tag_ids'] = self.cat_tag_manager.process_tags(
                post_data['tags']
            )
        
        # Create or update post
        if existing:
            return self.wp_writer.update_post(existing['id'], post_data)
        else:
            post_id = self.wp_writer.create_post(post_data)
            return post_id is not None
    
    def import_pages(self) -> bool:
        """Import pages from repository
        
        Returns:
            True if successful
        """
        pages_dir = self.import_config.get('pages_directory', 'pages')
        
        # Find all Markdown files in pages directory
        md_files = self.git_client.get_files_by_pattern('*.md', pages_dir)
        
        if not md_files:
            print("No Markdown files found in pages directory")
            return True
        
        print(f"Found {len(md_files)} page file(s)")
        
        # Process each page
        success_count = 0
        error_count = 0
        
        for md_file in tqdm(md_files, desc="Importing pages"):
            try:
                page_data = self.parser.parse_file(md_file)
                
                if self.dry_run:
                    print(f"\n[DRY RUN] Would import page: {page_data['title']}")
                    success_count += 1
                    continue
                
                page_id = self.wp_writer.create_page(page_data)
                if page_id:
                    success_count += 1
                else:
                    error_count += 1
                    
            except Exception as e:
                print(f"\n✗ Error processing {md_file.name}: {e}")
                error_count += 1
        
        print(f"\nResults: {success_count} imported, {error_count} failed")
        return error_count == 0
    
    def watch_for_changes(self, interval: int = 300):
        """Watch repository for changes and auto-import
        
        Args:
            interval: Check interval in seconds
        """
        print(f"\n👀 Watching repository for changes (checking every {interval}s)")
        print("Press Ctrl+C to stop\n")
        
        import time
        
        try:
            while True:
                # Pull latest changes
                self.git_client.clone_or_pull()
                
                # Import new content
                self.import_posts()
                
                # Wait for next check
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n\nStopped watching")