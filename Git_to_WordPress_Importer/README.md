# Git to WordPress Importer

**Reverse migration tool** - Import content from Git repositories or GitHub Pages into WordPress sites.

This tool is the reverse of the WordPress to Git Converter. It takes Markdown content from Git repositories and creates WordPress posts/pages, installs plugins, and configures your WordPress site automatically.

## 🎯 Features

### Content Import
- ✅ Import Markdown posts to WordPress
- ✅ Import Markdown pages to WordPress
- ✅ Upload media files to WordPress library
- ✅ Preserve categories and tags
- ✅ Maintain post metadata (date, author, etc.)

### Automatic Plugin Installation
- ✅ Read plugin list from migration documentation
- ✅ Automatically install WordPress plugins
- ✅ Activate installed plugins
- ✅ Match plugin versions when possible

### Intelligent Sync
- ✅ Watch Git repository for changes
- ✅ Automatically create new WordPress posts when new Markdown files are added
- ✅ Update existing posts when Markdown files change
- ✅ Incremental sync - only process changed files

### Site Configuration
- ✅ Read site documentation from v1.1 migration
- ✅ Configure WordPress settings
- ✅ Import categories and tags
- ✅ Set up site structure

## Requirements

- Python 3.8+
- WordPress site with:
  - REST API enabled
  - Admin credentials
  - Write permissions
- Git repository (local or GitHub)
- WordPress Admin access (for plugin installation)

## Installation

```bash
cd Git_to_WordPress_Importer
pip install -r requirements.txt
python verify_installation.py
```

## Quick Start

### Step 1: Configure

Create `config.yaml`:

```yaml
# Git Repository Source
git:
  # GitHub repository URL or local path
  repository: "https://github.com/username/blog-repo"
  # Or local path: "/path/to/local/repo"
  
  branch: "main"  # or "gh-pages"
  
  # GitHub credentials (only if private repo)
  github_token: "ghp_optional_for_private_repos"

# Target WordPress Site
wordpress:
  site_url: "https://your-new-wordpress-site.com"
  username: "admin_username"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"
  
  # Admin credentials (required for plugin installation)
  admin_username: "admin"
  admin_password: "your_admin_password"

# Import Settings
import:
  # What to import
  content_types:
    - posts
    - pages
    - media
    - categories
    - tags
  
  # Automatic sync settings
  watch_for_changes: true  # Watch repo for new content
  sync_interval: 300  # Check every 5 minutes (in seconds)
  
  # Plugin installation
  install_plugins: true  # Auto-install from documentation
  activate_plugins: true  # Auto-activate installed plugins
  
  # Content mapping
  posts_directory: "posts"  # Where to find posts in repo
  pages_directory: "pages"  # Where to find pages in repo
  media_directory: "assets/images"  # Where to find media
  
  # Documentation directory (from v1.1 migration)
  documentation_directory: "site_documentation"
```

### Step 2: Import Content

```bash
# One-time import
python run.py --import

# Watch mode (continuous sync)
python run.py --watch

# Dry run (preview only)
python run.py --dry-run
```

### Step 3: Install Plugins

```bash
# Install plugins from documentation
python run.py --install-plugins

# Install specific plugins
python run.py --install-plugins --plugins "plugin1,plugin2,plugin3"
```

## Usage Examples

### Import Everything
```bash
python run.py --import --install-plugins
```

### Watch for Changes
```bash
# Start watching repository for new posts
python run.py --watch
```

This will:
1. Monitor the Git repository
2. Detect new `.md` files in `posts/` or `pages/`
3. Automatically create WordPress posts/pages
4. Upload any new media files

### Import Only Posts
```bash
python run.py --import --types posts
```

### Install Plugins Only
```bash
python run.py --install-plugins
```

### Sync from Local Repository
```bash
# config.yaml
git:
  repository: "/Users/you/my-blog"
  
python run.py --import
```

## How It Works

### 1. Content Detection

The tool scans your Git repository for:
- **Posts**: `posts/*.md` or `_posts/*.md` (Jekyll style)
- **Pages**: `pages/*.md`
- **Media**: `assets/images/*`
- **Documentation**: `site_documentation/*.json`

### 2. Markdown Parsing

Reads front matter from Markdown files:

```markdown
---
title: My Blog Post
date: 2024-01-15
categories: [Technology, Programming]
tags: [python, wordpress]
author: John Doe
featured_image: /assets/images/featured.jpg
---

# Content here...
```

### 3. WordPress Creation

Creates WordPress posts with:
- Title from front matter
- Content converted from Markdown to HTML
- Categories and tags applied
- Featured image set
- Publication date maintained

### 4. Plugin Installation

Reads `site_documentation/plugins.json`:

```json
[
  {
    "name": "Yoast SEO",
    "slug": "wordpress-seo",
    "version": "21.5",
    "status": "active"
  }
]
```

Automatically:
1. Downloads plugin from WordPress.org
2. Installs via REST API
3. Activates if specified

### 5. Continuous Sync (Watch Mode)

When in watch mode:
```
New file detected: posts/2024-01-20-new-post.md
↓
Parse Markdown and front matter
↓
Create WordPress post via REST API
↓
Upload any referenced media
↓
Apply categories and tags
↓
✅ Post published!
```

## Configuration Guide

### Git Repository Options

**Option 1: GitHub Repository**
```yaml
git:
  repository: "https://github.com/username/blog"
  github_token: "ghp_..." # Only for private repos
```

**Option 2: Local Repository**
```yaml
git:
  repository: "/path/to/local/blog"
```

**Option 3: Pull Before Import**
```yaml
git:
  repository: "https://github.com/username/blog"
  auto_pull: true  # Pull latest changes before import
```

### WordPress Authentication

**Required for Content:**
```yaml
wordpress:
  app_password: "xxxx xxxx xxxx xxxx"  # For REST API
```

**Required for Plugins:**
```yaml
wordpress:
  admin_password: "your_password"  # For admin actions
```

### Content Type Mapping

Map repository structure to WordPress:

```yaml
import:
  # Jekyll-style
  posts_directory: "_posts"
  pages_directory: "_pages"
  
  # Or custom structure
  posts_directory: "blog"
  pages_directory: "site-pages"
```

### Automatic Sync Schedule

```yaml
import:
  watch_for_changes: true
  sync_interval: 300  # 5 minutes
  
  # Or more frequent
  sync_interval: 60  # 1 minute
```

## Plugin Installation

### Automatic Installation

Reads from `site_documentation/plugins.json`:

```bash
python run.py --install-plugins
```

The tool will:
1. ✅ Read plugin list from documentation
2. ✅ Check if already installed
3. ✅ Download from WordPress.org if needed
4. ✅ Install via WP-CLI or REST API
5. ✅ Activate if specified
6. ✅ Match version when possible

### Manual Plugin List

```bash
python run.py --install-plugins --plugins "yoast-seo,akismet,jetpack"
```

### Plugin Installation Methods

1. **WP-CLI** (Recommended)
   - Fastest and most reliable
   - Requires WP-CLI on server

2. **WordPress REST API**
   - Works on any WordPress site
   - Requires admin credentials

3. **Manual** (Fallback)
   - Provides download links
   - Manual installation required

## Watch Mode (Automatic Sync)

Perfect for continuous content publishing:

### Setup as Service

**Linux (systemd):**

Create `/etc/systemd/system/wp-sync.service`:
```ini
[Unit]
Description=WordPress Git Sync Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/Git_to_WordPress_Importer
ExecStart=/usr/bin/python3 run.py --watch
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable wp-sync
sudo systemctl start wp-sync
```

**macOS (launchd):**

Create `~/Library/LaunchAgents/com.wpimporter.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.wpimporter</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/path/to/run.py</string>
        <string>--watch</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load:
```bash
launchctl load ~/Library/LaunchAgents/com.wpimporter.plist
```

## Workflow Examples

### Workflow 1: GitHub Pages → WordPress

```bash
# 1. Configure to read from GitHub Pages
vim config.yaml  # Set repository to GitHub Pages repo

# 2. Import all content
python run.py --import --install-plugins

# 3. Start watching for updates
python run.py --watch
```

Now you can:
- Write posts in Markdown on GitHub
- Push to repository
- WordPress automatically syncs!

### Workflow 2: Migration from Another CMS

```bash
# 1. Export CMS to Markdown (manual or tool)
# 2. Commit to Git repository
# 3. Import to WordPress
python run.py --import

# Result: CMS content now in WordPress!
```

### Workflow 3: Multi-Site Publishing

```bash
# Same content → Multiple WordPress sites

# config-site1.yaml
python run.py --config config-site1.yaml --import

# config-site2.yaml  
python run.py --config config-site2.yaml --import

# Result: One Git repo publishing to multiple WordPress sites!
```

## Troubleshooting

### Plugins Won't Install

**Issue:** Plugin installation fails

**Solutions:**
1. Check admin credentials are correct
2. Ensure WordPress has write permissions
3. Try manual installation method
4. Check WordPress.org API availability

### Posts Not Creating

**Issue:** Markdown files found but posts not created

**Solutions:**
1. Check front matter format is valid YAML
2. Verify WordPress REST API is enabled
3. Check authentication credentials
4. Review error logs

### Watch Mode Not Detecting Changes

**Issue:** New files added but not syncing

**Solutions:**
1. Check `sync_interval` setting
2. Verify Git repository is being pulled
3. Check file paths match configuration
4. Review watch service logs

## Best Practices

1. **Test with Dry Run** - Always test imports first
2. **Backup WordPress** - Before bulk imports
3. **Use Application Passwords** - More secure than regular passwords
4. **Monitor Logs** - Check `importer.log` for issues
5. **Version Control** - Keep WordPress backup in Git too
6. **Staged Imports** - Import in batches for large sites

## Security

- Store credentials in environment variables
- Use WordPress Application Passwords
- Don't commit `config.yaml` with passwords
- Use `.env` file for sensitive data
- Restrict admin access after setup

## Limitations

- Plugin settings cannot be automatically configured
- Custom post types require additional setup
- Some plugins may need manual activation
- Theme customizations not imported

## Roadmap

### v1.1 (Coming Soon)
- Comments import
- Custom post types support
- Menu structure import
- Widget configuration

### v2.0 (Future)
- Theme installation
- Plugin configuration import
- Multi-site support
- Scheduled publishing

## Support

For issues or questions, please open an issue on GitHub.

---

**Transform your Git repository into a living WordPress site!** 🚀