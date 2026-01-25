# GitHub Secrets Setup Guide

## 🔐 Configure GitHub Secrets for Automated Sync

Your GitHub Actions workflow is now live in your repository! To make it work, you need to add these secrets:

### Step-by-Step Instructions

1. **Go to your repository secrets page:**
   
   Open this URL in your browser:
   ```
   https://github.com/karlondon/ksanks.myblognow.uk/settings/secrets/actions
   ```

2. **Click "New repository secret"** (green button on the right)

3. **Add these 3 secrets one by one:**

   **Secret 1:**
   - Name: `WP_SITE_URL`
   - Value: `https://ksanks.myblognow.uk/`
   - Click "Add secret"

   **Secret 2:**
   - Name: `WP_USERNAME`
   - Value: `ksanks`
   - Click "Add secret"

   **Secret 3:**
   - Name: `WP_APP_PASSWORD`
   - Value: `r5vg 8r32 sUJX brZK diNr rb8d`
   - Click "Add secret"

4. **Verify all three secrets are added**

   You should see:
   - ✅ WP_SITE_URL
   - ✅ WP_USERNAME
   - ✅ WP_APP_PASSWORD
   - ✅ GITHUB_TOKEN (automatically provided)

### 🎯 Test the Workflow

Once secrets are configured:

1. Go to: https://github.com/karlondon/ksanks.myblognow.uk/actions

2. Click on "WordPress to GitHub Sync" workflow

3. Click "Run workflow" button (right side)

4. Click green "Run workflow" button to trigger it manually

5. Watch it sync your WordPress content!

### 📅 Automatic Schedule

The workflow will automatically run:
- **Every 2 hours** to sync WordPress → GitHub
- You can change this in `.github/workflows/wordpress_to_github.yml`

### ✅ What Happens When It Runs

1. Connects to your WordPress site
2. Fetches new/updated posts and pages
3. Converts to Jekyll markdown
4. Commits to GitHub
5. GitHub Pages rebuilds your site automatically

**Your site will be live at:**
```
https://karlondon.github.io/ksanks.myblognow.uk/
```

(Enable GitHub Pages in repository settings → Pages → Source: gh_pages branch)