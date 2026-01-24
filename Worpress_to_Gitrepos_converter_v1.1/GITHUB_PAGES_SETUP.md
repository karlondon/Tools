# GitHub Pages Setup Guide

This guide shows you how to use the WordPress to Git Converter to create a GitHub Pages site from your WordPress content.

## What is GitHub Pages?

GitHub Pages is a free hosting service that turns your Git repository into a website. It supports:
- ✅ Markdown files (what this tool generates!)
- ✅ Jekyll static site generator
- ✅ Custom domains
- ✅ Free HTTPS
- ✅ Automatic deployment

## Quick Setup

### Step 1: Configure for GitHub Pages

Edit your `config.yaml`:

```yaml
wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "your_username"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"

github:
  token: "ghp_your_github_token"
  username: "your_github_username"
  repository: "my-blog"           # Your blog name
  branch: "gh-pages"              # ← IMPORTANT: Use gh-pages branch
  create_if_missing: true
  visibility: "public"            # Must be public for free GitHub Pages

migration:
  content_types:
    - posts
    - pages
    - media
  output_directory: "./output"
  markdown_flavor: "jekyll"       # ← IMPORTANT: Use Jekyll flavor
  download_media: true
  create_index: true
```

### Step 2: Run Migration

```bash
cd Worpress_to_Gitrepos_converter_v1.1

# Test first
python run.py --dry-run

# Run actual migration
python run.py
```

### Step 3: Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/my-blog`
2. Click **Settings**
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click **Save**

### Step 4: Access Your Site

Your site will be available at:
```
https://YOUR_USERNAME.github.io/my-blog/
```

## Jekyll Configuration

The tool generates Markdown files with Jekyll-compatible front matter. You can enhance your site by adding Jekyll configuration.

### Create `_config.yml` in output directory

```yaml
# Site settings
title: My Blog
description: Migrated from WordPress
author: Your Name
email: your-email@example.com

# Build settings
markdown: kramdown
theme: minima  # or any Jekyll theme

# Permalinks
permalink: /posts/:year/:month/:day/:title/

# Collections
collections:
  posts:
    output: true
    permalink: /posts/:year/:month/:day/:title/

# Defaults
defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
  - scope:
      path: ""
      type: "pages"
    values:
      layout: "page"

# Plugins
plugins:
  - jekyll-feed
  - jekyll-seo-tag
  - jekyll-sitemap
```

### Add this to your `config.yaml`

```yaml
migration:
  # ... other settings ...
  
  # Custom front matter for Jekyll
  custom_frontmatter:
    layout: "post"
    comments: true
```

## Folder Structure for GitHub Pages

The tool creates a structure compatible with GitHub Pages:

```
output/ (pushed to gh-pages branch)
├── _posts/                    # Jekyll posts folder
│   ├── 2024-01-15-post-1.md
│   └── 2024-01-20-post-2.md
├── pages/                     # Static pages
│   ├── about.md
│   └── contact.md
├── assets/                    # Media files
│   └── images/
│       ├── image1.jpg
│       └── image2.png
├── site_documentation/        # Documentation
├── _config.yml               # Jekyll configuration (add manually)
└── index.md                  # Home page
```

## Choosing a Theme

### Option 1: Use Built-in Themes

GitHub Pages supports several themes by default:

1. Add to `_config.yml`:
   ```yaml
   theme: minima  # or: slate, architect, cayman, etc.
   ```

2. Available themes:
   - `minima` - Clean, minimal design
   - `slate` - Dark theme
   - `architect` - Header-focused
   - `cayman` - Modern, clean
   - `dinky` - Compact
   - `hacker` - Terminal style
   - `leap-day` - Sidebar layout
   - `merlot` - Rich design
   - `midnight` - Dark with sidebar
   - `minimal` - Very minimal
   - `modernist` - Clean lines
   - `tactile` - Tactile header
   - `time-machine` - Retro style

### Option 2: Use Remote Themes

Add to `_config.yml`:
```yaml
remote_theme: pages-themes/modernist@v0.2.0
plugins:
  - jekyll-remote-theme
```

### Option 3: Custom Theme

1. Create `_layouts/` folder
2. Add layout files (HTML with Liquid)
3. Reference in front matter

## Custom Domain

### Setup Custom Domain

1. Buy domain (e.g., `myblog.com`)
2. Add to GitHub Pages settings
3. Configure DNS:

**For apex domain (`myblog.com`):**
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

**For subdomain (`www.myblog.com` or `blog.myblog.com`):**
```
Type: CNAME
Name: www (or blog)
Value: YOUR_USERNAME.github.io
```

4. Create `CNAME` file in repository root:
   ```
   myblog.com
   ```

## Advanced Features

### Add Navigation Menu

Create `_data/navigation.yml`:
```yaml
- name: Home
  link: /
- name: About
  link: /pages/about/
- name: Blog
  link: /posts/
```

### Add Comments (Disqus)

Add to `_config.yml`:
```yaml
disqus:
  shortname: your-disqus-shortname
```

Add to post front matter:
```yaml
comments: true
```

### Add Google Analytics

Add to `_config.yml`:
```yaml
google_analytics: UA-XXXXXXXXX-X
```

### SEO Optimization

Install Jekyll SEO plugin:
```yaml
plugins:
  - jekyll-seo-tag
```

Add to layout header:
```html
{% seo %}
```

## Automatic Updates

### Update Content from WordPress

To update your GitHub Pages site with new WordPress content:

1. Run migration again:
   ```bash
   python run.py
   ```

2. Only new/changed content will be migrated (incremental)
3. Changes automatically pushed to GitHub
4. GitHub Pages rebuilds automatically

### Setup Automated Migration

Create a scheduled task or cron job:

**Linux/Mac (crontab):**
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/converter && python run.py
```

**Windows (Task Scheduler):**
```
Action: Start a program
Program: python
Arguments: run.py
Start in: C:\path\to\converter
Trigger: Daily at 2:00 AM
```

## Troubleshooting

### Site Not Building

**Check build status:**
1. Go to repository
2. Click **Actions** tab
3. Check for errors

**Common issues:**
- Invalid `_config.yml` syntax
- Missing dependencies
- Broken Markdown syntax

### Images Not Loading

**Fix image paths:**
1. Ensure images are in `assets/images/`
2. Use correct paths in Markdown:
   ```markdown
   ![Alt text](/assets/images/image.jpg)
   ```

### Posts Not Showing

**Ensure correct structure:**
1. Posts must be in `_posts/` or configured collection
2. Filenames must follow format: `YYYY-MM-DD-title.md`
3. Posts must have valid front matter

### Custom Domain Not Working

**Check:**
1. DNS propagation (takes 24-48 hours)
2. CNAME file in repository root
3. GitHub Pages settings show custom domain
4. HTTPS certificate generated (automatic, may take time)

## Performance Optimization

### Optimize Images

Add to migration config:
```yaml
migration:
  optimize_images: true
  max_image_width: 1920
```

### Enable CDN

GitHub Pages automatically uses CDN for fast delivery.

### Lazy Loading

Add to layout:
```html
<img src="image.jpg" loading="lazy" alt="Description">
```

## Testing Locally

### Install Jekyll

```bash
gem install bundler jekyll
```

### Create Gemfile

```ruby
source 'https://rubygems.org'
gem 'github-pages', group: :jekyll_plugins
```

### Run Locally

```bash
cd output
bundle install
bundle exec jekyll serve
```

Visit: `http://localhost:4000`

## Best Practices

1. **Use descriptive URLs** - Enable permalinks
2. **Optimize images** - Compress before upload
3. **Add meta descriptions** - Use front matter
4. **Create sitemap** - Use jekyll-sitemap plugin
5. **Test locally** - Before pushing to GitHub
6. **Use HTTPS** - Enable in repository settings
7. **Monitor analytics** - Track visitors
8. **Regular backups** - Keep WordPress backup

## Migration Checklist

- [ ] Configure `config.yaml` with `gh-pages` branch
- [ ] Set `markdown_flavor: "jekyll"`
- [ ] Run dry-run migration
- [ ] Run actual migration
- [ ] Enable GitHub Pages in repository settings
- [ ] Add `_config.yml` for Jekyll configuration
- [ ] Choose and configure theme
- [ ] Test site build
- [ ] Configure custom domain (optional)
- [ ] Setup Google Analytics (optional)
- [ ] Add navigation menu
- [ ] Test all pages and links
- [ ] Setup automated updates (optional)

## Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Jekyll Themes](https://jekyllthemes.io/)
- [GitHub Pages Examples](https://github.com/collections/github-pages-examples)

---

**Your WordPress blog is now a fast, free, Git-backed website! 🎉**