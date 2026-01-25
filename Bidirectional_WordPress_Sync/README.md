# Bidirectional WordPress ↔ GitHub Pages Sync System

Complete solution for keeping WordPress and GitHub Pages in perfect sync, allowing you to write content in either location and have it automatically synchronized.

## 🎯 Overview

This system creates a **bidirectional sync** between your WordPress blog and GitHub Pages repository:

```
WordPress Blog ←→ GitHub Pages (Jekyll)
```

- ✅ Write posts in WordPress → Automatically published to GitHub Pages
- ✅ Write posts in Markdown on GitHub → Automatically published to WordPress
- ✅ Keeps both platforms in sync automatically
- ✅ Prevents sync loops and conflicts
- ✅ Preserves all metadata (categories, tags, plugins)

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    BIDIRECTIONAL SYNC                         │
└──────────────────────────────────────────────────────────────┘

Direction 1: WordPress → GitHub Pages
┌─────────────────┐
│  WordPress Site │  (Source of Truth)
└────────┬────────┘
         │
         │ GitHub Actions (Scheduled: Hourly/Daily)
         │ Uses: Wordpress_to_Gitrepos_converter_v1.1
         │
         ↓
┌─────────────────┐
│  GitHub Pages   │
│   Repository    │  (Jekyll/Hugo)
└─────────────────┘

Direction 2: GitHub Pages → WordPress
┌─────────────────┐
│  GitHub Pages   │
│   Repository    │  (New .md files detected)
└────────┬────────┘
         │
         │ Watch Service (Continuous: Every 1-5 min)
         │ Uses: Git_to_WordPress_Importer
         │
         ↓
┌─────────────────┐
│  WordPress Site │  (Auto Updated)
└─────────────────┘
```

## 📋 Components

1. **Sync Coordinator** - Prevents infinite loops, tracks sync state
2. **GitHub Actions Workflow** - Automated WordPress → Git sync
3. **Watch Service** - Continuous Git → WordPress sync
4. **Unified Config** - Single configuration for both directions
5. **Deployment Scripts** - Easy setup and installation

## 🚀 Quick Start

### Prerequisites

- WordPress site with admin access
- GitHub repository
- Python 3.8+
- Git installed

### Installation

```bash
# Navigate to the bidirectional sync directory
cd Bidirectional_WordPress_Sync

# Install dependencies
pip install -r requirements.txt

# Copy and configure
cp config.template.yaml config.yaml
vim config.yaml  # Edit with your settings

# Verify setup
python verify_setup.py

# Initialize sync
python setup_sync.py
```

## ⚙️ Configuration

### config.yaml

```yaml
# WordPress Configuration
wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "admin"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"
  
# GitHub Configuration
github:
  token: "ghp_your_github_token"
  username: "your_github_username"
  repository: "your-blog-repo"
  branch: "main"

# Sync Settings
sync:
  # Which direction should be primary (source of truth)
  primary_source: "wordpress"  # or "github"
  
  # WordPress → GitHub sync
  wp_to_git:
    enabled: true
    schedule: "0 */2 * * *"  # Every 2 hours (cron format)
    
  # GitHub → WordPress sync  
  git_to_wp:
    enabled: true
    watch_interval: 300  # Check every 5 minutes (seconds)
    
  # Conflict Resolution
  conflict_strategy: "newest_wins"  # newest_wins, wordpress_wins, github_wins
  
  # Sync Coordination
  prevent_loops: true
  sync_state_file: ".sync_state.json"
  
  # Content Types
  sync_content:
    - posts
    - pages
    - media
    - categories
    - tags
```

## 📦 Deployment Options

### Option 1: GitHub Actions + Local Watch (Recommended)

**Best for**: Personal blogs, small teams

**Setup:**
```bash
# 1. Configure GitHub Actions (automated)
python setup_sync.py --github-actions

# 2. Start local watch service
python run_watch_service.py

# Optional: Install as system service
sudo python install_service.py
```

**How it works:**
- GitHub Actions runs on schedule (cloud, free)
- Local watch service monitors Git repo
- No server costs, works on any machine

### Option 2: Full GitHub Actions (Cloud)

**Best for**: Teams, production environments

**Setup:**
```bash
# Configure both directions in GitHub Actions
python setup_sync.py --full-cloud
```

**How it works:**
- Both directions run on GitHub infrastructure
- Completely serverless
- Requires GitHub Actions secrets setup

### Option 3: Webhook-Based (Real-time)

**Best for**: Real-time publishing needs

**Setup:**
```bash
# Setup WordPress webhook
python setup_sync.py --webhooks

# Configure webhook receiver
python run_webhook_server.py
```

**How it works:**
- WordPress triggers sync immediately on publish
- GitHub webhook triggers on push
- Near-instant synchronization

## 🔄 How It Works

### 1. WordPress → GitHub Pages Sync

When you publish a post in WordPress:

```
1. GitHub Action triggers (scheduled or webhook)
2. Sync Coordinator checks what's new/updated
3. WordPress content fetched via REST API
4. Converted to Markdown with front matter
5. Media files downloaded
6. Committed to GitHub repository
7. GitHub Pages automatically rebuilds
8. Sync state updated to prevent loops
```

### 2. GitHub Pages → WordPress Sync

When you add a `.md` file to your repo:

```
1. Watch service detects new file
2. Sync Coordinator checks if already synced
3. Markdown parsed (front matter + content)
4. Converted to HTML
5. Created in WordPress via REST API
6. Categories/tags applied
7. Media uploaded if needed
8. Sync state updated to prevent loops
```

### 3. Loop Prevention

The Sync Coordinator uses metadata to track origin:

```yaml
# In Markdown front matter
wordpress_id: 123
sync_origin: "wordpress"
last_sync: "2024-01-24T18:00:00Z"

# In WordPress post meta
github_path: "posts/2024-01-24-my-post.md"
sync_origin: "github"
last_sync: "2024-01-24T18:00:00Z"
```

**Logic:**
- If post has `sync_origin: "wordpress"`, don't sync back to WordPress
- If post has `sync_origin: "github"`, don't sync back to GitHub
- Only sync genuinely new or externally modified content

## 📁 Directory Structure

```
Bidirectional_WordPress_Sync/
├── README.md                           # This file
├── SETUP_GUIDE.md                      # Detailed setup instructions
├── TROUBLESHOOTING.md                  # Common issues and solutions
├── config.template.yaml                # Configuration template
├── requirements.txt                    # Python dependencies
├── verify_setup.py                     # Setup verification script
├── setup_sync.py                       # Initial setup script
│
├── src/
│   ├── sync_coordinator.py            # Core sync logic
│   ├── loop_prevention.py             # Prevents infinite loops
│   ├── conflict_resolver.py           # Handles conflicts
│   ├── metadata_tracker.py            # Tracks sync state
│   └── notification_manager.py        # Sends notifications
│
├── workflows/
│   ├── wordpress_to_github.yml        # GitHub Actions: WP→Git
│   ├── github_to_wordpress.yml        # GitHub Actions: Git→WP
│   └── webhook_handler.yml            # Webhook-based sync
│
├── services/
│   ├── run_watch_service.py           # Watch service runner
│   ├── install_service.py             # System service installer
│   ├── systemd/                       # Linux service files
│   │   └── wp-sync.service
│   └── launchd/                       # macOS service files
│       └── com.wp-sync.plist
│
├── scripts/
│   ├── initial_sync.py                # First-time sync
│   ├── force_sync.py                  # Force full sync
│   ├── resolve_conflicts.py           # Manual conflict resolution
│   └── sync_status.py                 # Check sync status
│
└── tests/
    ├── test_sync_coordinator.py
    ├── test_loop_prevention.py
    └── test_integration.py
```

## 🛠️ Usage Examples

### Initial Setup and Sync

```bash
# First time setup
cd Bidirectional_WordPress_Sync

# Configure
cp config.template.yaml config.yaml
vim config.yaml

# Run initial sync (WordPress → GitHub)
python scripts/initial_sync.py --direction wp-to-git

# Verify
python scripts/sync_status.py
```

### Start Continuous Sync

```bash
# Option A: Run as foreground process
python services/run_watch_service.py

# Option B: Install as system service (Linux)
sudo python services/install_service.py --platform linux
sudo systemctl start wp-sync
sudo systemctl enable wp-sync

# Option C: Install as system service (macOS)
python services/install_service.py --platform macos
launchctl load ~/Library/LaunchAgents/com.wp-sync.plist
```

### Monitor Sync Status

```bash
# Check current sync status
python scripts/sync_status.py

# View sync history
python scripts/sync_status.py --history

# Check for conflicts
python scripts/sync_status.py --conflicts
```

### Manual Operations

```bash
# Force full sync (WordPress → GitHub)
python scripts/force_sync.py --direction wp-to-git

# Force full sync (GitHub → WordPress)
python scripts/force_sync.py --direction git-to-wp

# Resolve conflicts manually
python scripts/resolve_conflicts.py

# Dry run (preview what would sync)
python scripts/force_sync.py --dry-run
```

## 🔔 Notifications

Configure notifications for sync events:

```yaml
# In config.yaml
notifications:
  enabled: true
  methods:
    - email
    - slack
    
  email:
    smtp_host: "smtp.gmail.com"
    smtp_port: 587
    from: "sync@example.com"
    to: "admin@example.com"
    
  slack:
    webhook_url: "https://hooks.slack.com/..."
    
  events:
    - sync_completed
    - sync_failed
    - conflict_detected
    - new_content_synced
```

## 🎯 Use Cases

### Use Case 1: Personal Blog

**Scenario**: You write most posts in WordPress but occasionally write in Markdown

**Setup**: 
- WordPress → GitHub: Every 6 hours
- GitHub → WordPress: Watch mode (5 min checks)

**Workflow**:
1. Write post in WordPress, publish
2. 6 hours later, automatically on GitHub Pages
3. Occasionally write in Markdown, push to GitHub
4. Within 5 minutes, appears in WordPress

### Use Case 2: Team Blog

**Scenario**: Technical team writes in Markdown, non-technical in WordPress

**Setup**:
- WordPress → GitHub: Every 2 hours
- GitHub → WordPress: Real-time (webhook)

**Workflow**:
1. Developers write in Markdown, PR review, merge
2. Immediately synced to WordPress
3. Marketing writes in WordPress
4. Synced to GitHub for version control

### Use Case 3: Multi-Platform Publishing

**Scenario**: Want same content on WordPress and GitHub Pages

**Setup**:
- WordPress as primary source
- GitHub Pages as mirror
- One-way sync (WP → Git only)

**Workflow**:
1. All content authored in WordPress
2. Automatically mirrored to GitHub Pages
3. GitHub Pages serves as backup and alternative view

## 🐛 Troubleshooting

### Sync Loop Detected

**Issue**: Posts keep syncing back and forth

**Solution**:
```bash
# Check sync state
python scripts/sync_status.py --conflicts

# Reset sync state
python scripts/resolve_conflicts.py --reset-state

# Ensure prevent_loops is enabled
vim config.yaml  # Set prevent_loops: true
```

### Posts Not Syncing

**Issue**: New posts not appearing

**Solution**:
```bash
# Check watch service is running
ps aux | grep watch_service

# Check GitHub Actions logs
# Visit: https://github.com/[user]/[repo]/actions

# Force manual sync
python scripts/force_sync.py --direction git-to-wp
```

### Authentication Errors

**Issue**: 401 or 403 errors

**Solution**:
```bash
# Verify WordPress credentials
curl -u username:app_password https://your-site.com/wp-json/

# Verify GitHub token
curl -H "Authorization: token ghp_..." https://api.github.com/user

# Regenerate tokens if needed
```

## 🔐 Security Best Practices

1. **Never commit credentials**
   ```bash
   # Add to .gitignore
   echo "config.yaml" >> .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use GitHub Secrets for Actions**
   - Store credentials in GitHub repository secrets
   - Reference in workflows: `${{ secrets.WP_PASSWORD }}`

3. **Use WordPress Application Passwords**
   - Don't use main admin password
   - Create app-specific passwords

4. **Rotate credentials regularly**
   - Change tokens every 90 days
   - Use expiring tokens when possible

## 📈 Performance

**Sync Timings (typical):**
- WordPress → Git: 2-5 minutes (100 posts)
- Git → WordPress: 30 seconds per post
- Watch mode overhead: ~5 MB RAM

**Optimization Tips:**
- Sync only modified content
- Use incremental sync
- Adjust check intervals based on needs
- Cache media files

## 🗺️ Roadmap

### v1.0 (Current)
- ✅ Bidirectional sync
- ✅ Loop prevention
- ✅ Multiple deployment options
- ✅ Conflict resolution

### v1.1 (Planned)
- [ ] Real-time webhook sync
- [ ] Web dashboard for monitoring
- [ ] Advanced conflict resolution UI
- [ ] Multi-site support

### v2.0 (Future)
- [ ] Comments synchronization
- [ ] Custom post types support
- [ ] Media optimization
- [ ] AI-powered conflict resolution

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Discussions**: GitHub Discussions
- **Email**: support@example.com

## 📄 License

MIT License - See LICENSE file

---

**Transform your WordPress blog into a Git-powered content hub!** 🚀