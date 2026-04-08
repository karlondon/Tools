# Cloning a Website to GitHub Pages: What's Possible & What's Not

## TL;DR

**Yes, you can clone a static website and host it on GitHub Pages.** However, there are significant limitations depending on the type of site. Here's the full breakdown.

---

## What CAN Be Cloned

### ✅ Fully Clonable

| Content Type | Tool | Notes |
|---|---|---|
| **Static HTML/CSS/JS** | `wget`, `httrack`, `curl` | Perfect candidates — what you see is what you get |
| **Images, fonts, icons** | `wget --mirror` | Downloaded as-is |
| **Client-side JavaScript** | `wget` | JS files download fine; runtime behaviour preserved |
| **PDF/document links** | `wget -r` | Follow and download linked documents |
| **Favicon, manifest files** | `wget` | Included in mirror |
| **Simple blogs/portfolios** | `httrack` | Static content mirrors well |
| **Single Page Apps (partial)** | Puppeteer/Playwright | Can capture rendered HTML, but interactivity may break |

### ⚠️ Partially Clonable (with caveats)

| Content Type | What Works | What Doesn't |
|---|---|---|
| **WordPress sites** | Static HTML output, images, CSS | Dynamic features (comments, search, forms, login) |
| **Sites with CDN assets** | Assets from same-origin | Cross-origin resources may have CORS/hotlinking restrictions |
| **JavaScript-rendered (SPA)** | Pre-rendered HTML snapshots | Dynamic routing, API calls, state management |
| **Sites with web fonts** | Font files if directly linked | Fonts behind authentication or licence-gated APIs |
| **Embedded videos** | Embed code (iframe) | Actual video files hosted on YouTube/Vimeo stay on those platforms |

### ❌ CANNOT Be Cloned

| Content Type | Why |
|---|---|
| **Server-side logic** (PHP, Python, Node.js, Ruby) | GitHub Pages only serves static files — no server-side execution |
| **Databases** (MySQL, PostgreSQL, MongoDB) | No database support on GitHub Pages |
| **User authentication/sessions** | Requires server-side processing |
| **Server-side forms** (contact forms, WPForms) | No backend to process submissions |
| **E-commerce functionality** (WooCommerce, Shopify carts) | Requires server + payment processing |
| **Dynamic search** | Server-side search won't work (but you can add client-side search like Lunr.js) |
| **Comments systems** (native WordPress comments) | Requires database (but can replace with Disqus/Giscus) |
| **CRON jobs / scheduled tasks** | No server to run them |
| **API endpoints** | GitHub Pages doesn't execute server code |
| **Password-protected pages** | No server-side auth (but can use client-side JS obfuscation — not secure) |
| **`.htaccess` redirects** | Apache-specific; GitHub Pages uses different redirect mechanism |
| **Server-side redirects (301/302)** | Must use `<meta>` refresh or JS redirects, or Jekyll redirect plugin |

---

## Methods & Tools

### Method 1: `wget` Mirror (Simplest)

```bash
# Basic mirror of a website
wget --mirror \
     --convert-links \
     --adjust-extension \
     --page-requisites \
     --no-parent \
     --directory-prefix=./cloned-site \
     https://example.com

# Then push to GitHub
cd cloned-site/example.com
git init
git add .
git commit -m "Initial clone of example.com"
git remote add origin git@github.com:USERNAME/REPO.git
git push -u origin main
```

**Flags explained:**
- `--mirror`: Recursive download with timestamps
- `--convert-links`: Rewrite URLs to work locally
- `--adjust-extension`: Add `.html` extensions where needed
- `--page-requisites`: Download CSS, JS, images needed for each page
- `--no-parent`: Don't go above the starting directory

### Method 2: HTTrack (More Robust)

```bash
# Install
brew install httrack

# Clone
httrack "https://example.com" -O "./cloned-site" \
  "+*.example.com/*" \
  -v
```

HTTrack handles:
- JavaScript-based navigation better than wget
- Relative/absolute URL conversion
- Site structure preservation

### Method 3: Puppeteer/Playwright (For JS-Rendered Sites)

For SPAs or JavaScript-heavy sites where `wget` only gets empty `<div id="root">`:

```javascript
// clone-site.js
const puppeteer = require('puppeteer');
const fs = require('fs');

async function clonePage(url, outputFile) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();
    fs.writeFileSync(outputFile, html);
    await browser.close();
}

clonePage('https://example.com', 'index.html');
```

### Method 4: WordPress-Specific (Using WP2Static or Simply Static Plugin)

If you **own** the WordPress site:

1. Install the **Simply Static** or **WP2Static** plugin
2. Generate a static export
3. Push the output to a GitHub repository
4. Enable GitHub Pages

If you **don't own** the WordPress site, use `wget` or HTTrack (Method 1/2).

---

## Automated Sync Script

Here's a script to periodically re-clone and push updates:

```bash
#!/bin/bash
# sync-website.sh — Clone a website and push to GitHub Pages

SITE_URL="https://example.com"
REPO_DIR="./cloned-site"
GITHUB_REPO="git@github.com:USERNAME/REPO.git"
BRANCH="main"  # or gh-pages

# Clean previous clone
rm -rf "$REPO_DIR"

# Clone the site
wget --mirror \
     --convert-links \
     --adjust-extension \
     --page-requisites \
     --no-parent \
     --directory-prefix="$REPO_DIR" \
     "$SITE_URL"

# Navigate into the cloned directory
cd "$REPO_DIR/$(echo $SITE_URL | sed 's|https\?://||')"

# Init git repo and push
git init
git checkout -b "$BRANCH"
git add .
git commit -m "Sync: $(date '+%Y-%m-%d %H:%M:%S')"
git remote add origin "$GITHUB_REPO"
git push --force origin "$BRANCH"

echo "✅ Site synced to GitHub Pages"
```

### GitHub Actions for Automated Scheduled Sync

```yaml
# .github/workflows/sync-site.yml
name: Sync External Website

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Clone external site
        run: |
          wget --mirror \
               --convert-links \
               --adjust-extension \
               --page-requisites \
               --no-parent \
               --reject "robots.txt" \
               -e robots=off \
               --directory-prefix=./site \
               https://example.com || true
          
      - name: Prepare files
        run: |
          # Move files to root, removing the domain directory
          DOMAIN=$(echo "https://example.com" | sed 's|https\?://||' | sed 's|/.*||')
          if [ -d "./site/$DOMAIN" ]; then
            cp -r ./site/$DOMAIN/* ./docs/ 2>/dev/null || true
          fi
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

---

## GitHub Pages Setup

1. Go to repository **Settings** → **Pages**
2. Set **Source** to the branch containing your cloned site (e.g., `main` or `gh-pages`)
3. Set the folder to `/ (root)` or `/docs`
4. Your site will be live at `https://USERNAME.github.io/REPO/`

### Custom Domain (Optional)

```bash
# Add a CNAME file to your repo root
echo "yourdomain.com" > CNAME
```

Then configure DNS:
- **A records** pointing to GitHub's IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- **CNAME record**: `USERNAME.github.io`

---

## Alternatives to GitHub Pages

| Platform | Free Tier | Advantages |
|---|---|---|
| **GitHub Pages** | 1GB storage, 100GB/mo bandwidth | Git integration, custom domains, HTTPS |
| **Netlify** | 100GB/mo bandwidth | Form handling, serverless functions, deploy previews |
| **Vercel** | 100GB/mo bandwidth | Edge functions, framework support |
| **Cloudflare Pages** | Unlimited bandwidth | Global CDN, Workers for server-side logic |
| **Surge.sh** | Unlimited | Single command deploy (`surge`) |
| **Render** | Static sites free | Auto-deploy from Git |

---

## Replacing Dynamic Features with Static Alternatives

| Dynamic Feature | Static Replacement |
|---|---|
| Contact forms | [Formspree](https://formspree.io), [Netlify Forms](https://netlify.com/products/forms/), [Google Forms embed](https://forms.google.com) |
| Comments | [Giscus](https://giscus.app) (GitHub Discussions), [Disqus](https://disqus.com), [Utterances](https://utteranc.es) |
| Search | [Lunr.js](https://lunrjs.com), [Pagefind](https://pagefind.app), [Algolia DocSearch](https://docsearch.algolia.com) |
| Analytics | [Google Analytics](https://analytics.google.com), [Plausible](https://plausible.io), [Umami](https://umami.is) |
| Newsletter signup | [Mailchimp embed](https://mailchimp.com), [Buttondown](https://buttondown.email) |
| E-commerce | [Snipcart](https://snipcart.com), [Stripe Payment Links](https://stripe.com/payments/payment-links) |
| Authentication | [Auth0](https://auth0.com) (client-side), [Clerk](https://clerk.com) |
| Database/CMS | [Headless CMS](https://www.sanity.io) + static site generator, [Airtable](https://airtable.com) |

---

## Legal & Ethical Considerations

⚠️ **Important**: Before cloning any website, consider:

1. **Copyright**: Website content (text, images, design) is copyrighted. Cloning someone else's site without permission may violate copyright law.
2. **Terms of Service**: Many sites explicitly prohibit scraping/mirroring in their ToS.
3. **robots.txt**: Respect `robots.txt` directives (though this is a convention, not a legal requirement in all jurisdictions).
4. **Legitimate use cases**:
   - Cloning **your own site** for backup/migration ✅
   - Creating an offline archive of **public domain** content ✅
   - Archiving a site **you have permission** to clone ✅
   - Migrating **your own** WordPress site to static hosting ✅
5. **Trademark**: Don't pass off a cloned site as your own if it contains someone else's branding.

---

## Quick Decision Matrix

```
Is it YOUR site?
├── YES → Use wget/httrack/Simply Static → Push to GitHub Pages ✅
│         (Full control, all methods work)
│
└── NO → Do you have PERMISSION?
    ├── YES → Use wget/httrack → Push to GitHub Pages ✅
    │         (Respect any conditions set by owner)
    │
    └── NO → Is the content PUBLIC DOMAIN or open-licensed?
        ├── YES → Clone with attribution ✅
        │
        └── NO → ❌ Do NOT clone without permission
                  (Copyright infringement risk)
```

---

## Summary

| Aspect | Verdict |
|---|---|
| **Can you clone a static website?** | ✅ Yes, easily with `wget` or `httrack` |
| **Can you host it on GitHub Pages?** | ✅ Yes, push the files and enable Pages |
| **Can you automate sync?** | ✅ Yes, with GitHub Actions on a schedule |
| **Can you clone dynamic features?** | ❌ No — server-side logic, databases, auth won't work |
| **Can you replace dynamic features?** | ⚠️ Partially — use static alternatives (see table above) |
| **Is it legal to clone others' sites?** | ⚠️ Only with permission or if content is openly licensed |