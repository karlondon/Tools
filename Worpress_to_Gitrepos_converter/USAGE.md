# WordPress to Git Repository Converter - Usage Guide

Complete guide on how to use the WordPress to Git Repository Converter tool.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Basic Usage](#basic-usage)
5. [Advanced Usage](#advanced-usage)
6. [Command-Line Options](#command-line-options)
7. [Migration Process](#migration-process)
8. [Troubleshooting](#troubleshooting)
9. [Examples](#examples)

## Prerequisites

### System Requirements
- Python 3.8 or higher
- Git installed on your system
- Internet connection

### WordPress Requirements
- WordPress 4.7+ (REST API enabled)
- Admin access to WordPress site
- One of the following authentication methods:
  - WordPress username and password
  - Application Password (recommended for WordPress 5.6+)

### GitHub Requirements
- GitHub account
- Personal Access Token with `repo` permissions
- Optional: Existing repository or permission to create new repositories

## Installation

### Step 1: Clone or Download the Tool

```bash
cd /path/to/your/projects
git clone <repository-url> wordpress-to-git
cd wordpress-to-git
```

### Step 2: Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

## Configuration

### Step 1: Create Configuration File

```bash
cp config.template.yaml config.yaml
```

### Step 2: Edit Configuration

Open `config.yaml` in your text editor and update the following sections:

#### WordPress Configuration

```yaml
wordpress:
  site_url: "https://your-wordpress-site.com"
  
  # Option 1: Username and Password
  username: "your_wp_username"
  password: "your_wp_password"
  
  # Option 2: Application Password (Recommended)
  # Generate at: WP Admin > Users > Profile > Application Passwords
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"
```

**Generating WordPress Application Password:**
1. Log in to WordPress Admin
2. Go to Users > Profile
3. Scroll to "Application Passwords"
4. Enter a name (e.g., "Migration Tool")
5. Click "Add New Application Password"
6. Copy the generated password

#### GitHub Configuration

```yaml
github:
  token: "ghp_your_github_personal_access_token"
  username: "your_github_username"
  repository: "your-repo-name"
  branch: "main"  # or "gh-pages" for GitHub Pages
```

**Generating GitHub Personal Access Token:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "WordPress Migration")
4. Select scopes: Check "repo" (Full control of private repositories)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again!)

#### Migration Configuration

```yaml
migration:
  content_types:
    - posts
    - pages
    - media
  output_directory: "./output"
  markdown_flavor: "github"  # github, jekyll, hugo
  download_media: true
```

## Basic Usage

### Simple Migration

```bash
# Navigate to the tool directory
cd Worpress_to_Gitrepos_converter

# Run the migration
python run.py
```

This will:
1. Connect to your WordPress site
2. Fetch all posts, pages, and media
3. Convert content to Markdown
4. Commit and push to GitHub

### Dry Run (Preview Mode)

Test the migration without making any changes to GitHub:

```bash
python run.py --dry-run
```

This is useful for:
- Testing your configuration
- Previewing the conversion
- Checking for errors before actual migration

## Advanced Usage

### Migrate Specific Content Types

```bash
# Migrate only posts
python run.py --types posts

# Migrate posts and pages only (skip media)
python run.py --types posts,pages

# Migrate only pages
python run.py --types pages
```

### Skip Media Download

```bash
python run.py --skip-media
```

Useful when:
- You have large media files
- You want to migrate text content first
- Media is hosted externally

### Use Custom Configuration File

```bash
python run.py --config my-custom-config.yaml
```

### Verbose Logging

```bash
python run.py --verbose
```

This enables DEBUG level logging for troubleshooting.

### Combined Options

```bash
# Dry run with only posts, verbose logging
python run.py --dry-run --types posts --verbose

# Migrate pages only, skip media, custom config
python run.py --types pages --skip-media --config production.yaml
```

## Command-Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Path to configuration file | `config.yaml` |
| `--dry-run` | - | Preview without committing | `False` |
| `--types` | - | Content types (comma-separated) | From config |
| `--skip-media` | - | Skip media download | `False` |
| `--verbose` | `-v` | Enable DEBUG logging | `False` |
| `--help` | `-h` | Show help message | - |

## Migration Process

### What Happens During Migration

1. **Initialization**
   - Loads configuration
   - Validates credentials
   - Connects to WordPress and GitHub

2. **Content Fetching**
   - Retrieves posts via WordPress REST API
   - Retrieves pages via WordPress REST API
   - Retrieves media library items

3. **Content Conversion**
   - Converts HTML to Markdown
   - Generates front matter with metadata
   - Preserves categories, tags, and dates
   - Creates organized file structure

4. **Media Processing** (if enabled)
   - Downloads images and files
   - Organizes in `assets/images/` directory
   - Updates image references in content

5. **Git Operations**
   - Clones or initializes repository
   - Creates/updates files
   - Commits changes
   - Pushes to GitHub

6. **Finalization**
   - Creates index page (if enabled)
   - Generates .gitignore
   - Saves migration state

### Output Structure

```
output/
├── posts/
│   ├── 2024-01-15-my-first-post.md
│   ├── 2024-01-20-another-post.md
│   └── ...
├── pages/
│   ├── about.md
│   ├── contact.md
│   └── ...
├── assets/
│   └── images/
│       ├── image1.jpg
│       ├── image2.png
│       └── ...
├── index.md
├── .gitignore
└── README.md
```

### Markdown Format

Each post/page includes front matter:

```markdown
---
title: "My Post Title"
date: 2024-01-15 10:30:00
author: John Doe
categories:
  - Technology
  - Programming
tags:
  - Python
  - WordPress
featured_image: https://example.com/image.jpg
slug: my-post-title
wordpress_id: 123
status: publish
---

# My Post Title

Post content here in Markdown format...
```

## Troubleshooting

### Common Issues

#### 1. WordPress Connection Failed

**Error:** "Failed to connect to WordPress site"

**Solutions:**
- Verify `site_url` is correct (no trailing slash)
- Check if WordPress REST API is accessible: `https://your-site.com/wp-json/`
- Disable security plugins temporarily
- Check permalink settings (not set to "Plain")
- Verify SSL certificate if using HTTPS

#### 2. Authentication Failed

**Error:** "Authentication failed - check credentials"

**Solutions:**
- Verify username and password are correct
- Use Application Password instead of main password
- Remove spaces from Application Password in config
- Check user has appropriate permissions

#### 3. GitHub Token Issues

**Error:** "Failed to access repository"

**Solutions:**
- Verify token has `repo` permissions
- Check token hasn't expired
- Ensure repository name is correct
- Try creating token with more permissions

#### 4. Media Download Failures

**Error:** "Failed to download media"

**Solutions:**
- Check network connectivity
- Verify media URLs are accessible
- Try with `--skip-media` first
- Increase `request_timeout` in config

#### 5. Git Push Failures

**Error:** "Failed to push changes"

**Solutions:**
- Check you have write access to repository
- Try with `force_push: true` in config (use carefully!)
- Verify branch name is correct
- Check for merge conflicts

### Getting Help

1. Check log file: `migration.log`
2. Run with `--verbose` for detailed output
3. Use `--dry-run` to test without changes
4. Review GitHub repository Issues section
5. Check configuration syntax

## Examples

### Example 1: Full Migration

```bash
# Complete migration with all content
python run.py --config config.yaml
```

### Example 2: Posts Only

```bash
# Migrate only blog posts
python run.py --types posts
```

### Example 3: GitHub Pages Setup

**config.yaml:**
```yaml
github:
  branch: "gh-pages"

migration:
  markdown_flavor: "jekyll"
```

**Run:**
```bash
python run.py
```

### Example 4: Incremental Update

```bash
# First migration
python run.py

# Later, migrate only new content
# (automatically skips already migrated items)
python run.py
```

### Example 5: Large Site Migration

For sites with lots of media:

```bash
# Step 1: Migrate text content first
python run.py --skip-media

# Step 2: Download media separately
python run.py --types media
```

### Example 6: Testing Configuration

```bash
# Test without making changes
python run.py --dry-run --verbose
```

## Best Practices

1. **Always run dry-run first** to verify configuration
2. **Back up your WordPress site** before migration
3. **Use Application Passwords** instead of main password
4. **Test with small content first** (use `--types posts` with few posts)
5. **Monitor the log file** for errors and warnings
6. **Use version control** for your config.yaml (without credentials)
7. **Enable incremental updates** for large sites
8. **Review converted content** before going live

## Next Steps

After successful migration:

1. **Review Generated Content**: Check the output directory
2. **Test Locally**: Use Jekyll/Hugo to preview site
3. **Enable GitHub Pages**: In repository settings
4. **Customize Theme**: Add Jekyll/Hugo theme if needed
5. **Update Links**: Fix any broken internal links
6. **Set Up CI/CD**: Automate future updates

## Additional Resources

- [WordPress REST API Documentation](https://developer.wordpress.org/rest-api/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Markdown Guide](https://www.markdownguide.org/)