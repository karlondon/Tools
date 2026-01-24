# Test Data for Git to WordPress Importer

This directory contains sample Markdown files for testing the importer.

## Structure

```
test_data/
├── posts/           # Sample blog posts
│   └── sample-post.md
└── pages/           # Sample pages
    └── about.md
```

## Testing with Local Repository

To test the importer with this test data:

### 1. Update your config.yaml

```yaml
git:
  repository: "test_data"  # Use this test directory
  branch: "main"

wordpress:
  site_url: "https://your-test-site.com"
  username: "admin"
  app_password: "your-app-password"

import:
  content_types: [posts, pages]
  posts_directory: "posts"
  pages_directory: "pages"
```

### 2. Run Import

```bash
# Dry run first to preview
python run.py --import --dry-run

# Then import for real
python run.py --import
```

### 3. Expected Results

After import, you should see:

**Posts:**
- "Getting Started with Git to WordPress Importer"
  - Categories: Technology, WordPress
  - Tags: git, wordpress, automation, markdown

**Pages:**
- "About This Blog"

## Creating Your Own Test Content

Add more test files following this format:

```markdown
---
title: Your Post Title
date: 2024-01-15
categories: [Category1, Category2]
tags: [tag1, tag2, tag3]
status: publish
---

# Your Content Here

Write your blog post content...
```

## Notes

- Dates should be in YYYY-MM-DD format
- Categories and tags are created automatically if they don't exist
- Status can be `publish` or `draft`
- All standard Markdown formatting is supported