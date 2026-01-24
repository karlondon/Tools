# Git to WordPress Importer - Quick Start Guide

Get up and running in 5 minutes! 🚀

## Prerequisites

- Python 3.8 or higher
- WordPress site with REST API enabled
- Git repository with Markdown content (or local folder)

## Installation

### Step 1: Install Dependencies

```bash
cd Git_to_WordPress_Importer
pip install -r requirements.txt
```

### Step 2: Verify Installation

```bash
python verify_installation.py
```

This checks that all dependencies are installed correctly.

### Step 3: Configure

```bash
# Copy the template
cp config.template.yaml config.yaml

# Edit with your details
nano config.yaml  # or use any text editor
```

**Minimum required configuration:**

```yaml
git:
  repository: "https://github.com/yourusername/your-blog-repo"
  branch: "main"

wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "your-username"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"

import:
  content_types:
    - posts
```

### Step 4: Get WordPress Application Password

1. Log in to your WordPress site
2. Go to **Users → Profile**
3. Scroll to **Application Passwords**
4. Enter name: "Git Importer"
5. Click **Add New Application Password**
6. Copy the generated password (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
7. Paste it in `config.yaml` under `wordpress.app_password`

## Usage

### Import Everything (One-Time)

```bash
python run.py --import
```

This will:
- Clone/pull your Git repository
- Parse all Markdown files
- Create WordPress posts
- Create categories and tags automatically

### Preview Before Importing (Dry Run)

```bash
python run.py --import --dry-run
```

Shows what would be imported without making any changes.

### Import Only Posts

```bash
python run.py --import --types posts
```

### Import Only Pages

```bash
python run.py --import --types pages
```

### Watch Mode (Continuous Sync)

```bash
python run.py --watch
```

Monitors your repository and automatically imports new posts every 5 minutes.

## Repository Structure

Your Git repository should have this structure:

```
your-repo/
├── posts/              # Blog posts (*.md files)
│   ├── my-first-post.md
│   ├── another-post.md
│   └── ...
├── pages/              # Pages (*.md files)
│   ├── about.md
│   └── contact.md
└── assets/
    └── images/         # Media files
        └── ...
```

**Alternative Jekyll-style structure also supported:**

```
your-repo/
├── _posts/             # Blog posts
│   ├── 2024-01-15-my-post.md
│   └── ...
└── _pages/             # Pages
    └── ...
```

## Markdown Format

Posts should have YAML front matter:

```markdown
---
title: My Blog Post
date: 2024-01-15
categories: [Technology, Programming]
tags: [python, wordpress, automation]
status: publish
---

# Your Content Here

Write your blog post in Markdown...
```

**Supported Front Matter Fields:**

- `title` - Post title (required)
- `date` - Publication date (YYYY-MM-DD format)
- `categories` - List of categories
- `tags` - List of tags
- `excerpt` - Short description
- `status` - `publish` or `draft`
- `slug` - URL slug (auto-generated if not provided)
- `author` - Author name
- `featured_image` - Path to featured image

## Examples

### Example 1: Import from GitHub

```yaml
# config.yaml
git:
  repository: "https://github.com/username/blog"
  branch: "main"

wordpress:
  site_url: "https://myblog.com"
  username: "admin"
  app_password: "your-app-password-here"

import:
  content_types: [posts, pages]
```

```bash
python run.py --import
```

### Example 2: Import from Local Folder

```yaml
# config.yaml
git:
  repository: "/Users/you/Documents/my-blog"
  branch: "main"

wordpress:
  site_url: "https://myblog.com"
  username: "admin"
  app_password: "your-app-password-here"

import:
  content_types: [posts]
  posts_directory: "articles"  # Custom directory name
```

```bash
python run.py --import
```

### Example 3: Automatic Sync Setup

Start the tool in watch mode to automatically sync new posts:

```bash
# Terminal 1 - Start the importer in watch mode
python run.py --watch

# Terminal 2 - Create a new post
cd /path/to/your-blog-repo
echo "---
title: New Post
date: 2024-01-20
---

# Hello World" > posts/new-post.md

git add posts/new-post.md
git commit -m "Add new post"
git push

# The importer will automatically detect and import it!
```

## Troubleshooting

### Connection Failed

**Error:** `WordPress connection failed`

**Solution:**
1. Verify `site_url` is correct (include https://)
2. Check application password is correct
3. Ensure WordPress REST API is enabled
4. Check WordPress site is accessible

### No Files Found

**Error:** `No Markdown files found in posts directory`

**Solution:**
1. Check `posts_directory` in config matches your repo structure
2. Verify repository was cloned successfully
3. Check for `_posts` directory (Jekyll style)

### Import Errors

**Error:** `Failed to create post`

**Solution:**
1. Check WordPress user has publishing permissions
2. Verify application password has correct permissions
3. Look at detailed error message in output
4. Try with `--verbose` flag for more details

### Authentication Issues

**Error:** `401 Unauthorized`

**Solution:**
1. Regenerate application password in WordPress
2. Make sure you're using application password, not regular password
3. Check username is correct

## Next Steps

- Read the full [README.md](README.md) for advanced features
- Check [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for architecture details
- Set up watch mode for continuous sync
- Configure custom directory mappings
- Explore plugin installation features (coming soon)

## Getting Help

If you encounter issues:

1. Run verification: `python verify_installation.py`
2. Check logs: `cat importer.log`
3. Use verbose mode: `python run.py --import --verbose`
4. Try dry run first: `python run.py --import --dry-run`

## Common Commands Reference

```bash
# Verify installation
python verify_installation.py

# One-time import
python run.py --import

# Preview only (no changes)
python run.py --import --dry-run

# Import specific types
python run.py --import --types posts
python run.py --import --types pages
python run.py --import --types posts,pages

# Watch mode (continuous sync)
python run.py --watch

# Help
python run.py --help
```

---

**You're all set! Happy importing! 🎉**