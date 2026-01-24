# Git to WordPress Importer - Implementation Plan

This document outlines the complete architecture and implementation plan for the reverse migration tool.

## Overview

The Git to WordPress Importer is the companion tool to the WordPress to Git Converter v1.1. It performs the reverse operation: importing Markdown content from Git repositories into WordPress sites.

## Architecture

### Core Components

```
Git_to_WordPress_Importer/
├── src/
│   ├── __init__.py
│   ├── config_manager.py          # Configuration handling
│   ├── git_client.py               # Git repository operations
│   ├── markdown_parser.py          # Parse Markdown + front matter
│   ├── wordpress_writer.py         # Write to WordPress via REST API
│   ├── plugin_installer.py         # Install WordPress plugins
│   ├── category_tag_manager.py     # Manage categories and tags
│   ├── media_uploader.py           # Upload media to WordPress
│   ├── file_watcher.py             # Watch for file changes
│   └── import_orchestrator.py      # Coordinate import process
├── run.py                          # Main entry point
├── requirements.txt                # Python dependencies
├── config.template.yaml            # Configuration template
├── README.md                       # User documentation
├── IMPLEMENTATION_PLAN.md          # This file
└── verify_installation.py          # Dependency checker
```

## Detailed Component Design

### 1. Git Client (`git_client.py`)

**Purpose:** Handle Git repository operations

**Key Methods:**
```python
class GitClient:
    def __init__(self, repo_url, branch, token=None):
        """Initialize Git client"""
        
    def clone_or_pull(self, local_path):
        """Clone repo or pull latest changes"""
        
    def get_changed_files(self, since_commit):
        """Get list of files changed since commit"""
        
    def get_file_content(self, file_path):
        """Read file content from repository"""
        
    def watch_for_changes(self, callback, interval=300):
        """Watch repository for changes"""
```

**Dependencies:**
- GitPython
- PyGithub (for GitHub API access)

**Features:**
- Clone GitHub/GitLab/local repositories
- Pull latest changes
- Track file modifications
- Support private repositories with tokens

### 2. Markdown Parser (`markdown_parser.py`)

**Purpose:** Parse Markdown files with YAML front matter

**Key Methods:**
```python
class MarkdownParser:
    def parse_file(self, file_path):
        """Parse Markdown file and extract front matter"""
        # Returns: {
        #   'title': str,
        #   'content': str (HTML),
        #   'date': datetime,
        #   'categories': list,
        #   'tags': list,
        #   'author': str,
        #   'featured_image': str,
        #   'excerpt': str,
        #   'status': str (publish/draft)
        # }
        
    def markdown_to_html(self, markdown_content):
        """Convert Markdown to HTML"""
        
    def extract_media_references(self, content):
        """Find all media references in content"""
```

**Dependencies:**
- python-frontmatter
- markdown
- beautifulsoup4

**Features:**
- Parse YAML front matter
- Convert Markdown to HTML
- Extract metadata (title, date, categories, tags)
- Find image/media references
- Handle Jekyll-style front matter

### 3. WordPress Writer (`wordpress_writer.py`)

**Purpose:** Create and update WordPress content via REST API

**Key Methods:**
```python
class WordPressWriter:
    def __init__(self, site_url, username, app_password):
        """Initialize WordPress client"""
        
    def create_post(self, post_data):
        """Create new WordPress post"""
        
    def update_post(self, post_id, post_data):
        """Update existing WordPress post"""
        
    def create_page(self, page_data):
        """Create new WordPress page"""
        
    def get_post_by_slug(self, slug):
        """Find post by slug"""
        
    def set_featured_image(self, post_id, media_id):
        """Set post featured image"""
```

**Dependencies:**
- requests
- WordPress REST API

**Features:**
- Create/update posts and pages
- Set post metadata (categories, tags, date)
- Assign featured images
- Handle post status (publish/draft)
- Support custom fields

### 4. Plugin Installer (`plugin_installer.py`)

**Purpose:** Automatically install WordPress plugins

**Key Methods:**
```python
class PluginInstaller:
    def __init__(self, wp_site_url, admin_user, admin_pass):
        """Initialize plugin installer"""
        
    def read_plugin_list(self, json_file):
        """Read plugins from site_documentation/plugins.json"""
        
    def install_plugin(self, plugin_slug, version=None):
        """Install plugin from WordPress.org"""
        
    def activate_plugin(self, plugin_slug):
        """Activate installed plugin"""
        
    def get_installed_plugins(self):
        """List currently installed plugins"""
        
    def install_from_documentation(self, docs_dir):
        """Install all plugins from documentation"""
```

**Installation Methods:**
1. **WP-CLI** (if available on server)
2. **WordPress REST API** (fallback)
3. **Manual links** (if automated fails)

**Features:**
- Read plugin list from documentation
- Check if plugin already installed
- Download from WordPress.org
- Install and activate
- Match versions when possible
- Handle installation errors gracefully

### 5. Category & Tag Manager (`category_tag_manager.py`)

**Purpose:** Import and manage categories and tags

**Key Methods:**
```python
class CategoryTagManager:
    def __init__(self, wp_client):
        """Initialize manager"""
        
    def import_categories_from_json(self, json_file):
        """Import categories from site_documentation/categories.json"""
        
    def import_tags_from_json(self, json_file):
        """Import tags from site_documentation/tags.json"""
        
    def create_category(self, name, slug, parent=None, description=""):
        """Create category in WordPress"""
        
    def create_tag(self, name, slug, description=""):
        """Create tag in WordPress"""
        
    def get_or_create_category(self, name):
        """Get existing or create new category"""
```

**Features:**
- Import category hierarchy
- Import tags
- Create missing categories/tags
- Preserve category relationships
- Handle duplicates

### 6. Media Uploader (`media_uploader.py`)

**Purpose:** Upload media files to WordPress

**Key Methods:**
```python
class MediaUploader:
    def __init__(self, wp_client):
        """Initialize uploader"""
        
    def upload_file(self, file_path, alt_text=""):
        """Upload file to WordPress media library"""
        
    def get_media_by_filename(self, filename):
        """Find media by filename"""
        
    def batch_upload(self, file_list):
        """Upload multiple files"""
```

**Features:**
- Upload images, videos, documents
- Set alt text and metadata
- Avoid duplicate uploads
- Return WordPress media IDs
- Handle large files

### 7. File Watcher (`file_watcher.py`)

**Purpose:** Monitor repository for changes

**Key Methods:**
```python
class FileWatcher:
    def __init__(self, repo_path, callback):
        """Initialize file watcher"""
        
    def start_watching(self, interval=300):
        """Start watching for changes"""
        
    def stop_watching(self):
        """Stop watching"""
        
    def get_new_files(self):
        """Get list of new Markdown files"""
        
    def get_modified_files(self):
        """Get list of modified files"""
```

**Dependencies:**
- watchdog (file system events)
- GitPython (Git tracking)

**Features:**
- Monitor file system for changes
- Detect new Markdown files
- Track file modifications
- Configurable check interval
- Call callback on changes

### 8. Import Orchestrator (`import_orchestrator.py`)

**Purpose:** Coordinate the entire import process

**Key Methods:**
```python
class ImportOrchestrator:
    def __init__(self, config):
        """Initialize orchestrator with all components"""
        
    def import_content(self, content_types=None):
        """Import content from repository"""
        
    def import_posts(self):
        """Import all posts"""
        
    def import_pages(self):
        """Import all pages"""
        
    def import_media(self):
        """Import media files"""
        
    def import_categories_and_tags(self):
        """Import categories and tags"""
        
    def install_plugins(self, plugin_list=None):
        """Install WordPress plugins"""
        
    def start_watch_mode(self):
        """Start continuous sync mode"""
```

**Workflow:**
```
1. Initialize all components
2. Clone/pull Git repository
3. Read documentation (if exists)
4. Import categories and tags
5. Import media files
6. Import posts and pages
7. Install plugins (if requested)
8. Enter watch mode (if requested)
```

## Configuration Structure

### `config.yaml`

```yaml
# Git Repository Source
git:
  repository: "https://github.com/username/blog"  # or local path
  branch: "main"
  auto_pull: true
  github_token: ""  # Optional, for private repos

# WordPress Target
wordpress:
  site_url: "https://new-wordpress-site.com"
  username: "admin"
  app_password: "xxxx xxxx xxxx xxxx"
  
  # For plugin installation
  admin_username: "admin"
  admin_password: "password"

# Import Settings
import:
  content_types:
    - posts
    - pages
    - media
    - categories
    - tags
  
  # Directory mappings
  posts_directory: "posts"
  pages_directory: "pages"
  media_directory: "assets/images"
  documentation_directory: "site_documentation"
  
  # Watch mode
  watch_for_changes: false
  sync_interval: 300
  
  # Plugin settings
  install_plugins: true
  activate_plugins: true
  
  # Content handling
  skip_existing: true
  update_existing: false
  preserve_dates: true

# Logging
logging:
  level: "INFO"
  log_file: "importer.log"
```

## Command Line Interface

### `run.py`

```python
import click

@click.command()
@click.option('--config', default='config.yaml', help='Config file')
@click.option('--import', 'do_import', is_flag=True, help='Import content')
@click.option('--watch', is_flag=True, help='Watch mode (continuous sync)')
@click.option('--install-plugins', is_flag=True, help='Install plugins')
@click.option('--plugins', help='Comma-separated plugin list')
@click.option('--types', help='Content types to import')
@click.option('--dry-run', is_flag=True, help='Preview only')
@click.option('--verbose', is_flag=True, help='Verbose logging')
def main(config, do_import, watch, install_plugins, plugins, types, dry_run, verbose):
    """Git to WordPress Importer"""
    # Implementation
    pass
```

## Dependencies (`requirements.txt`)

```
# Core dependencies
requests>=2.31.0
PyYAML>=6.0.1
python-dotenv>=1.0.0

# Git operations
GitPython>=3.1.40
PyGithub>=2.1.1

# Markdown processing
markdown>=3.5.1
python-frontmatter>=1.1.0
markdownify>=0.11.6
beautifulsoup4>=4.12.0

# File watching
watchdog>=3.0.0

# CLI
click>=8.1.7
colorama>=0.4.6
tqdm>=4.66.1

# Utilities
python-slugify>=8.0.1
python-dateutil>=2.9.0
loguru>=0.7.2
```

## Implementation Priority

### Phase 1: Core Functionality (MVP)
1. ✅ Configuration manager
2. ✅ Git client (clone/pull)
3. ✅ Markdown parser
4. ✅ WordPress writer (posts only)
5. ✅ Basic CLI

### Phase 2: Enhanced Features
6. ✅ Media uploader
7. ✅ Category/tag manager
8. ✅ Pages import
9. ✅ Documentation reader

### Phase 3: Advanced Features
10. ✅ Plugin installer
11. ✅ File watcher / watch mode
12. ✅ Incremental sync
13. ✅ Error recovery

### Phase 4: Polish
14. ✅ Comprehensive logging
15. ✅ Dry-run mode
16. ✅ Progress indicators
17. ✅ Documentation

## Usage Scenarios

### Scenario 1: One-Time Import

```bash
# Setup
cp config.template.yaml config.yaml
# Edit config.yaml with credentials

# Import everything
python run.py --import --install-plugins

# Result: WordPress site populated from Git repo
```

### Scenario 2: Continuous Sync

```bash
# Start watch mode
python run.py --watch

# Now:
# 1. Create new .md file in Git repo
# 2. Push to GitHub
# 3. Tool detects change
# 4. Automatically creates WordPress post
```

### Scenario 3: Plugin Migration

```bash
# Read plugins from documentation and install
python run.py --install-plugins

# Or install specific plugins
python run.py --install-plugins --plugins "yoast-seo,akismet"
```

## Testing Strategy

### Unit Tests
- Test each component independently
- Mock WordPress API responses
- Test Markdown parsing edge cases
- Test category/tag creation

### Integration Tests
- Test full import workflow
- Test with sample repository
- Test plugin installation
- Test watch mode

### Manual Testing
- Test with real WordPress site
- Test with various Markdown formats
- Test error handling
- Test recovery scenarios

## Security Considerations

1. **Credentials:**
   - Use environment variables
   - Support `.env` files
   - Never log passwords

2. **WordPress Security:**
   - Use application passwords
   - Require HTTPS
   - Validate inputs

3. **File Operations:**
   - Validate file paths
   - Sanitize filenames
   - Check file sizes

## Error Handling

1. **Network Errors:**
   - Retry with exponential backoff
   - Log failures
   - Continue with remaining items

2. **WordPress Errors:**
   - Parse error responses
   - Provide actionable messages
   - Don't stop entire import

3. **Git Errors:**
   - Handle merge conflicts
   - Validate repository access
   - Clear error messages

## Performance Optimization

1. **Batch Operations:**
   - Upload media in batches
   - Create multiple posts in parallel

2. **Caching:**
   - Cache category/tag IDs
   - Cache media IDs
   - Store sync state

3. **Incremental Sync:**
   - Track processed files
   - Only process changes
   - Use Git history

## Future Enhancements

1. **Comments Import**
2. **Custom Post Types**
3. **Menu Structure**
4. **Widget Configuration**
5. **Theme Installation**
6. **Multi-site Support**
7. **Scheduled Publishing**
8. **Draft Management**

## Conclusion

This implementation plan provides a complete architecture for the Git to WordPress Importer tool. The tool will be the perfect companion to the WordPress to Git Converter v1.1, enabling bi-directional content flow between WordPress and Git repositories.

**Key Benefits:**
- Automatic plugin installation from documentation
- Continuous sync capability
- Category/tag preservation
- Media handling
- Production-ready architecture

**Timeline Estimate:**
- Phase 1 (MVP): 2-3 days
- Phase 2 (Enhanced): 2-3 days
- Phase 3 (Advanced): 3-4 days
- Phase 4 (Polish): 1-2 days
- **Total**: ~10 days development time

This tool completes the WordPress ↔ Git ecosystem, enabling users to easily move content in both directions.