# WordPress Importer Setup Instructions

## Quick Setup Guide for Publishing Your Gmail Scam Detection Post

Your blog post is ready to publish! Follow these steps to configure the WordPress importer and publish it.

---

## Step 1: Create WordPress Application Password

1. Log in to your WordPress site admin panel
2. Go to **Users → Your Profile**
3. Scroll down to **Application Passwords** section
4. In the "New Application Password Name" field, enter: `Git Importer`
5. Click **Add New Application Password**
6. **Important:** Copy the generated password immediately (format: `xxxx xxxx xxxx xxxx xxxx xxxx`)
   - This is the only time you'll see it!
   - Keep it secure - treat it like a regular password

---

## Step 2: Create config.yaml File

1. Navigate to the `Git_to_WordPress_Importer` directory:
   ```bash
   cd Git_to_WordPress_Importer
   ```

2. Copy the template file:
   ```bash
   cp config.template.yaml config.yaml
   ```

3. Open `config.yaml` in your text editor:
   ```bash
   open config.yaml
   # or
   nano config.yaml
   # or
   code config.yaml
   ```

---

## Step 3: Configure Your Settings

Edit the `config.yaml` file with your details:

```yaml
# Git Repository Source
git:
  # Use local path since files are already here
  repository: "/Users/karthiksankaran/Library/CloudStorage/OneDrive-Deloitte(O365D)/Documents/___REPOS/PS-Scripts/Git_to_WordPress_Importer/test_data"
  branch: "main"
  auto_pull: false

# Target WordPress Site
wordpress:
  # REPLACE WITH YOUR WORDPRESS SITE URL
  site_url: "https://your-wordpress-site.com"
  
  # REPLACE WITH YOUR WORDPRESS USERNAME
  username: "your-username"
  
  # PASTE YOUR APPLICATION PASSWORD HERE (from Step 1)
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"

# Import Settings
import:
  content_types:
    - posts
  
  posts_directory: "posts"
  pages_directory: "pages"
  media_directory: "assets/images"
  
  skip_existing: true
  update_existing: false
  preserve_dates: true

# Logging
logging:
  level: "INFO"
  log_file: "importer.log"
```

**Important: Replace these values:**
- `site_url`: Your WordPress site URL (include https://)
- `username`: Your WordPress username
- `app_password`: The application password you generated in Step 1

---

## Step 4: Install Dependencies (If Not Already Installed)

```bash
cd Git_to_WordPress_Importer
pip3 install -r requirements.txt
```

---

## Step 5: Verify Configuration

Test your configuration without making changes:

```bash
python3 run.py --import --dry-run
```

This will show you what would be imported without actually publishing anything.

---

## Step 6: Publish the Post

Once you're ready, run:

```bash
python3 run.py --import --types posts
```

This will:
- ✅ Connect to your WordPress site
- ✅ Parse the Gmail scam detection post
- ✅ Create categories (Technology, Security, Email)
- ✅ Create tags (gmail, ai, scam-detection, etc.)
- ✅ Publish the post live
- ✅ Preserve the publication date (2026-01-25)

---

## Step 7: Verify Publication

After successful import, you should see:

```
✅ Successfully created post: "Complete Guide: Using Gmail's AI to Detect and Block Scam Emails"
```

Visit your WordPress site to view the published post!

---

## Troubleshooting

### Connection Failed

**Error:** `WordPress connection failed`

**Solutions:**
1. Verify `site_url` includes `https://` or `http://`
2. Check application password is correct (no extra spaces)
3. Ensure WordPress REST API is enabled (it's enabled by default)
4. Try accessing: `https://your-site.com/wp-json/wp/v2/posts` in browser
   - Should show JSON data, not 404

### Authentication Failed

**Error:** `401 Unauthorized`

**Solutions:**
1. Regenerate application password in WordPress
2. Make sure you're using application password, NOT regular password
3. Verify username is correct
4. Check for extra spaces in config.yaml

### No Posts Found

**Error:** `No Markdown files found`

**Don't worry!** The post is already in the correct location:
- File: `test_data/posts/gmail-ai-scam-detection-complete-guide.md`
- This should be detected automatically

### Permission Denied

**Error:** `User doesn't have permission to create posts`

**Solutions:**
1. Verify your WordPress user has "Author" or "Administrator" role
2. Regenerate application password
3. Check WordPress settings: Settings → Writing → "Who can post?"

---

## Post Details

Your blog post includes:

- **Title:** "Complete Guide: Using Gmail's AI to Detect and Block Scam Emails"
- **Categories:** Technology, Security, Email
- **Tags:** gmail, ai, scam-detection, email-security, google-apps-script, phishing, cybersecurity
- **Word Count:** ~5,000 words
- **Status:** publish (will go live immediately)
- **Features:**
  - Complete working Apps Script code
  - Step-by-step instructions
  - Cross-device compatibility guide
  - Troubleshooting section
  - Comparison tables
  - Implementation checklist

---

## Security Notes

⚠️ **Important Security Tips:**

1. **Never commit config.yaml to Git** (it contains credentials)
   - The `.gitignore` file already excludes it
   
2. **Application passwords are safer than regular passwords**
   - They can be revoked without changing your main password
   - They work only for the WordPress REST API
   
3. **Store credentials securely**
   - Don't share config.yaml
   - Don't paste credentials in public places

---

## Next Steps After Publishing

1. **Review the post** on your WordPress site
2. **Add a featured image** (optional, can be added through WordPress admin)
3. **Share on social media** - this is great technical content!
4. **Monitor comments** - readers may have questions
5. **Update the post** if you discover new scam patterns

---

## Alternative: Manual Publishing

If you prefer not to use the importer, you can:

1. Copy the content from: `test_data/posts/gmail-ai-scam-detection-complete-guide.md`
2. Log in to WordPress admin
3. Go to Posts → Add New
4. Paste the markdown content
5. Manually set categories and tags
6. Click Publish

---

## Need Help?

If you encounter any issues:

1. Check the log file: `cat importer.log`
2. Run with verbose mode: `python3 run.py --import --verbose`
3. Use dry-run first: `python3 run.py --import --dry-run`
4. Verify installation: `python3 verify_installation.py`

---

**Your post is ready to go live! 🚀**

Once configured, the entire process takes less than 30 seconds to publish.