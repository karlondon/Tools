# Quick Start Guide

Get up and running with the WordPress to Git Repository Converter in 5 minutes!

## Prerequisites Checklist

- [ ] Python 3.8+ installed
- [ ] Git installed
- [ ] WordPress admin access
- [ ] GitHub account

## 5-Minute Setup

### 1. Install the Tool (2 minutes)

```bash
cd Worpress_to_Gitrepos_converter
pip install -r requirements.txt
```

### 2. Get Your Credentials (2 minutes)

#### WordPress Application Password
1. Go to your WordPress Admin
2. Navigate to: **Users → Your Profile**
3. Scroll to "Application Passwords"
4. Name it: "Migration Tool"
5. Click "Add New" and **copy the password**

#### GitHub Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: "WordPress Migration"
4. Select scope: **✓ repo**
5. Click "Generate" and **copy the token**

### 3. Configure (1 minute)

```bash
# Copy template
cp config.template.yaml config.yaml

# Edit config.yaml with your credentials
```

**Minimal config.yaml:**
```yaml
wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "your_wp_username"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"  # Paste from step 2

github:
  token: "ghp_xxxxxxxxxxxxx"  # Paste from step 2
  username: "your_github_username"
  repository: "my-blog"  # Will be created if doesn't exist
  branch: "main"

migration:
  content_types:
    - posts
    - pages
    - media
  output_directory: "./output"
  markdown_flavor: "github"
  download_media: true
```

### 4. Test Run (30 seconds)

```bash
# Dry run to test everything
python run.py --dry-run
```

If you see "Migration Completed Successfully!" - you're ready!

### 5. Migrate! (30 seconds)

```bash
# Actual migration
python run.py
```

## What Just Happened?

Your WordPress content is now in a Git repository! 🎉

Check the results:
- **Local files**: `./output/` directory
- **GitHub**: https://github.com/your-username/my-blog

## Common First-Time Issues

### Issue: "Configuration file not found"
**Fix:** Make sure you created `config.yaml` from the template
```bash
cp config.template.yaml config.yaml
```

### Issue: "Authentication failed"
**Fix:** Check your WordPress credentials
- Use Application Password, not your main password
- Remove all spaces from the Application Password in config

### Issue: "Failed to connect to WordPress"
**Fix:** Verify your site URL
- No trailing slash: ✓ `https://example.com`
- With trailing slash: ✗ `https://example.com/`

### Issue: "GitHub token invalid"
**Fix:** Regenerate token with correct permissions
- Must have `repo` scope checked
- Copy the entire token (starts with `ghp_`)

## Next Steps

### Option 1: Set Up GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages"
3. Select branch: `main` (or `gh-pages`)
4. Click Save
5. Visit: `https://your-username.github.io/my-blog/`

### Option 2: Customize Output

Edit `config.yaml` to change:
- Markdown flavor (Jekyll, Hugo, etc.)
- Output directory
- Content types to migrate
- File naming conventions

### Option 3: Run Incremental Updates

```bash
# Migrate only new content (skips already migrated items)
python run.py
```

The tool tracks what's been migrated in `.migration_state.json`

## Useful Commands

```bash
# Migrate only posts
python run.py --types posts

# Skip media download (faster)
python run.py --skip-media

# Verbose output for debugging
python run.py --verbose

# Use different config file
python run.py --config production.yaml
```

## Getting Help

- **Detailed Guide**: See [USAGE.md](USAGE.md)
- **Log File**: Check `migration.log` for errors
- **Verbose Mode**: Run with `--verbose` flag

## Example Workflow

### For a Blog Migration:

```bash
# 1. Test first
python run.py --dry-run --types posts

# 2. Migrate posts only
python run.py --types posts

# 3. Review and test

# 4. Migrate everything
python run.py
```

### For GitHub Pages:

**config.yaml:**
```yaml
github:
  branch: "gh-pages"
migration:
  markdown_flavor: "jekyll"
```

```bash
python run.py
```

Then enable GitHub Pages in repository settings!

## Tips for Success

1. **Start with dry-run** - Always test first
2. **Backup WordPress** - Just in case
3. **Test incrementally** - Migrate posts first, then pages, then media
4. **Check logs** - Review `migration.log` for any issues
5. **Use Application Passwords** - More secure than main password

## You're All Set! 🚀

Your WordPress content is now version-controlled and easily deployable. Update your site by simply running the migration tool again!

For more advanced usage, check out [USAGE.md](USAGE.md).