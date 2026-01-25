# Quick Start Guide - Bidirectional WordPress ↔ GitHub Pages Sync

Get your bidirectional sync up and running in minutes!

## 🎯 What You'll Achieve

After following this guide, you'll have:
- ✅ WordPress posts automatically syncing to GitHub Pages
- ✅ New GitHub markdown posts automatically creating WordPress posts
- ✅ Automated sync that prevents infinite loops
- ✅ Both platforms staying in perfect sync

## ⚡ Prerequisites

Before starting, make sure you have:

1. **WordPress Site**
   - WordPress 4.7+ with REST API enabled
   - Admin access
   - Application Password generated

2. **GitHub Account**
   - Personal Access Token with `repo` permissions
   - Repository created (or we'll help you create one)

3. **Local Environment**
   - Python 3.8+
   - Git installed
   - Terminal/command line access

## 🚀 Step-by-Step Setup

### Step 1: Get the Code

```bash
# Navigate to your projects directory
cd ~/Documents/___REPOS/PS-Scripts

# The Bidirectional_WordPress_Sync directory should already exist
cd Bidirectional_WordPress_Sync

# If it doesn't exist, you may need to clone the repository
```

### Step 2: Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt

# Verify installation
python -c "import yaml; import requests; print('✅ Dependencies OK')"
```

### Step 3: Create Configuration

```bash
# Copy the template
cp config.template.yaml config.yaml

# Edit with your details
# On macOS:
open -a TextEdit config.yaml

# On Linux:
nano config.yaml  # or vim, gedit, etc.
```

**Edit these critical fields:**

```yaml
wordpress:
  site_url: "https://YOUR-SITE.com"  # Your WordPress URL
  username: "your_username"
  app_password: "xxxx xxxx xxxx xxxx"  # Generate this in WordPress

github:
  token: "ghp_YOUR_TOKEN"  # Generate at github.com/settings/tokens
  username: "your_github_username"
  repository: "your-blog-repo"  # Your repository name
  branch: "main"
```

### Step 4: Generate WordPress Application Password

1. Log in to WordPress Admin
2. Go to **Users → Profile**
3. Scroll to **Application Passwords**
4. Enter name: "Bidirectional Sync"
5. Click **Add New Application Password**
6. Copy the generated password (format: `xxxx xxxx xxxx xxxx`)
7. Paste into `config.yaml` under `wordpress.app_password`

### Step 5: Generate GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Name: "WordPress Sync"
4. Scopes: Check **repo** (all sub-boxes)
5. Click **Generate token**
6. Copy the token (starts with `ghp_`)
7. Paste into `config.yaml` under `github.token`

### Step 6: Test Configuration

```bash
# Test WordPress connection
python3 << 'EOF'
import yaml
import requests

with open('config.yaml') as f:
    config = yaml.safe_load(f)

wp = config['wordpress']
url = f"{wp['site_url']}/wp-json/"
auth = (wp['username'], wp['app_password'])

response = requests.get(url, auth=auth)
if response.status_code == 200:
    print("✅ WordPress connection successful!")
else:
    print(f"❌ WordPress connection failed: {response.status_code}")
EOF
```

### Step 7: Setup GitHub Actions

```bash
# Copy workflow file to your blog repository
# First, clone your blog repository if you haven't already

cd ..
git clone https://github.com/YOUR_USERNAME/your-blog-repo.git
cd your-blog-repo

# Create workflows directory
mkdir -p .github/workflows

# Copy the workflow file
cp ../Bidirectional_WordPress_Sync/workflows/wordpress_to_github.yml .github/workflows/

# Commit and push
git add .github/workflows/wordpress_to_github.yml
git commit -m "Add WordPress to GitHub sync workflow"
git push
```

### Step 8: Configure GitHub Secrets

1. Go to your repository: `https://github.com/YOUR_USERNAME/your-blog-repo`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Name | Value |
|------|-------|
| `WP_SITE_URL` | Your WordPress site URL |
| `WP_USERNAME` | Your WordPress username |
| `WP_APP_PASSWORD` | Your WordPress application password |

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### Step 9: Run Initial Sync (WordPress → GitHub)

```bash
# Go back to sync directory
cd ../Bidirectional_WordPress_Sync

# Run initial sync to get all WordPress content to GitHub
python3 << 'EOF'
import sys
sys.path.insert(0, '../Worpress_to_Gitrepos_converter_v1.1')

from src.main import main as wp_to_git_main
print("🔄 Running initial WordPress → GitHub sync...")
wp_to_git_main()
print("✅ Initial sync complete!")
EOF
```

Or manually trigger the GitHub Action:
1. Go to your repository → **Actions** tab
2. Select **WordPress to GitHub Sync** workflow
3. Click **Run workflow**

### Step 10: Start Watch Service (GitHub → WordPress)

This service monitors your repository for new markdown files and syncs them to WordPress.

**Option A: Run in Terminal (for testing)**

```bash
cd Bidirectional_WordPress_Sync
python3 services/run_watch_service.py
```

Keep this terminal open. You should see:
```
🚀 Starting watch service...
Monitoring directories: posts, pages
Check interval: 300 seconds
Press Ctrl+C to stop
```

**Option B: Install as System Service (for production)**

**On macOS:**
```bash
python3 services/install_service.py --platform macos
launchctl load ~/Library/LaunchAgents/com.wp-sync.plist
```

**On Linux:**
```bash
sudo python3 services/install_service.py --platform linux
sudo systemctl start wp-sync
sudo systemctl enable wp-sync
```

## 🎉 You're Done! Test It Out

### Test WordPress → GitHub Sync

1. Go to WordPress admin
2. Create a new post
3. Publish it
4. Wait 2 hours (or trigger GitHub Action manually)
5. Check your GitHub repository - the post should appear as a `.md` file!

### Test GitHub → WordPress Sync

1. In your blog repository, create a new file: `posts/2024-01-24-test-post.md`

```markdown
---
title: "Test Post from GitHub"
date: 2024-01-24
categories: [Testing]
tags: [github, markdown]
---

# Hello from GitHub!

This post was created in Markdown and will automatically sync to WordPress.
```

2. Commit and push:
```bash
git add posts/2024-01-24-test-post.md
git commit -m "Add test post"
git push
```

3. Wait 5 minutes (default watch interval)
4. Check WordPress admin - the post should appear!

## 📊 Monitor Sync Status

```bash
# Check sync statistics
cd Bidirectional_WordPress_Sync
python3 src/sync_coordinator.py

# View sync logs
tail -f watch_service.log

# Check GitHub Actions logs
# Visit: https://github.com/YOUR_USERNAME/your-blog-repo/actions
```

## 🔧 Troubleshooting

### WordPress Connection Issues

```bash
# Test WordPress REST API directly
curl https://YOUR-SITE.com/wp-json/

# Should return JSON with API information
```

### GitHub Actions Not Running

1. Check if workflow file is in `.github/workflows/` directory
2. Verify secrets are set correctly
3. Check Actions tab for error messages
4. Try manual trigger: Actions → Select workflow → Run workflow

### Watch Service Not Detecting Changes

```bash
# Run with verbose logging
python3 services/run_watch_service.py --interval 60

# Check for errors in log
cat watch_service.log
```

### Sync Loop (Posts Keep Syncing)

```bash
# Reset sync state
python3 << 'EOF'
from src.sync_coordinator import SyncCoordinator
coordinator = SyncCoordinator({'sync': {'sync_state_file': '.sync_state.json'}})
coordinator.reset_sync_state()
print("✅ Sync state reset")
EOF
```

## 🎯 Next Steps

Now that sync is working:

1. **Customize Sync Schedule**
   - Edit `config.yaml` → `sync.wp_to_git.schedule`
   - Edit `.github/workflows/wordpress_to_github.yml` cron schedule

2. **Adjust Watch Interval**
   - Edit `config.yaml` → `sync.git_to_wp.watch_interval`
   - Restart watch service

3. **Enable Notifications**
   - Edit `config.yaml` → `notifications` section
   - Configure email or Slack webhooks

4. **Customize Jekyll Theme**
   - Add `_config.yml` to your repository
   - Choose a Jekyll theme
   - Customize layouts and styles

5. **Enable GitHub Pages**
   - Repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main (or gh-pages)
   - Click Save

## 📚 Additional Resources

- **Full Documentation**: See [README.md](README.md)
- **Configuration Guide**: See [config.template.yaml](config.template.yaml)
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub Actions**: [GitHub Actions Documentation](https://docs.github.com/actions)
- **Jekyll**: [Jekyll Documentation](https://jekyllrb.com/docs/)

## 💡 Pro Tips

1. **Start with WordPress → GitHub only** until you're comfortable, then enable GitHub → WordPress

2. **Use draft posts** for testing before publishing live

3. **Backup your sync state file** (`.sync_state.json`) regularly

4. **Monitor logs** for the first few days to catch any issues early

5. **Set realistic sync intervals** - every 2-6 hours is usually sufficient

---

**Need Help?** Open an issue on GitHub or check the full documentation in README.md