# Exporting glided.live to a Local Repo & Hosting Elsewhere

## What I Found About glided.live

Running DNS and HTTP analysis on `https://www.glided.live/` reveals:

```
www.glided.live  →  CNAME  →  an4r8t7y.up.railway.app
                              └── Hosted on Railway.app (PaaS)
                                  Behind Fastly CDN
DNS provider: Namecheap (registrar-servers.com)
```

**Key finding: This is a dynamic application hosted on [Railway.app](https://railway.app)** — a platform-as-a-service that runs containerised Node.js / Python / other backend apps. It is NOT a simple static website.

---

## Why You Can't Simply Download the Source Code

| What you want | What's technically possible |
|---------------|----------------------------|
| Full source code (backend + frontend) | ❌ Not accessible from the public web |
| Database / user data | ❌ Server-side only |
| Frontend HTML/CSS/JS (rendered output) | ⚠️ Partial — scraping gives you the shell |
| A fully working clone | ❌ Not without the actual source repo |

Railway hosts the **running application**, not the source code. The source code lives in the developer's private GitHub/GitLab repository, which Railway deploys from.

---

## Option 1 — Ask the Developers for the Source Code (CORRECT PATH)

Since you appear to be the client/owner who commissioned this site, you are entitled to the source code. Here's what to request:

### What to ask for:

```
1. GitHub / GitLab repository access (or a full export ZIP)
2. Any environment variables / .env files the app needs to run
3. Database export (if the site has a database)
4. Railway project transfer OR instructions to redeploy on a new host
```

### Email template to send to the developers:

---
> Subject: Source Code Handover — glided.live
>
> Hi,
>
> I'd like to take full ownership of the glided.live project and host it on my own
> infrastructure under gild3d.com. Could you please provide:
>
> 1. Full source code repository (GitHub/GitLab access or ZIP export)
> 2. All environment variables / configuration files (.env)
> 3. Database export (if applicable)
> 4. A README with instructions to run/deploy the project locally
>
> Thanks

---

Once you have the repo, you can deploy it anywhere (see hosting options below).

---

## Option 2 — Scrape the Frontend Only (Limited)

If you only want the visual/static shell of the site (HTML, CSS, JS, images), you can scrape it. This will **not** include server-side logic, APIs, or database-driven content.

### Install wget (macOS):
```bash
brew install wget
```

### Scrape the site:
```bash
wget \
  --mirror \
  --convert-links \
  --adjust-extension \
  --page-requisites \
  --no-parent \
  --wait=1 \
  --random-wait \
  --user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -e robots=off \
  -P ./glided-live-clone \
  https://www.glided.live/
```

> ⚠️ **Note:** `glided.live` currently returns 403 to non-browser tools — the scrape may be blocked. If it is, use the Puppeteer method below.

### Alternative — Puppeteer-based scrape (bypasses bot protection):
```bash
npm install -g puppeteer-based-site-scraper  # or use 'website-scraper' package
```

Or use the browser's built-in **Save As → Webpage, Complete** for individual pages.

### What scraping gives you:
- Static HTML pages ✅
- CSS stylesheets ✅
- JavaScript bundles ✅
- Images/fonts ✅
- Dynamic content (login, API-driven data) ❌
- Backend functionality ❌

---

## Option 3 — Use HTTrack (GUI website copier)

[HTTrack](https://www.httrack.com/) is the most user-friendly full-site copier:

```bash
brew install httrack
httrack https://www.glided.live/ -O ./glided-live-clone "+*.glided.live/*"
```

---

## Once You Have the Source Code — Hosting Options

Assuming you get the repo from the developers, here are the best places to host it (all cheaper/free vs Railway):

| Platform | Best for | Cost | Custom domain |
|----------|----------|------|---------------|
| **Vercel** | Next.js / React frontend | Free tier | ✅ |
| **Netlify** | Static / JAMstack | Free tier | ✅ |
| **Railway** (your own account) | Full-stack apps | ~$5/month | ✅ |
| **Render** | Full-stack apps | Free tier | ✅ |
| **Fly.io** | Docker containers | Free tier | ✅ |
| **Cloudflare Pages** | Static / edge functions | Free | ✅ |
| **AWS Lightsail** | Full control VPS | ~$5/month | ✅ |

### Quick deploy steps (once you have the repo):

```bash
# 1. Clone the repo
git clone <repo-url> glided-local
cd glided-local

# 2. Install dependencies
npm install   # or pip install -r requirements.txt for Python

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env with actual values (ask developers for these)

# 4. Run locally
npm run dev   # or npm start

# 5. Deploy to Vercel (example)
npm install -g vercel
vercel --prod
# Follow prompts → add custom domain gild3d.com in Vercel dashboard
```

---

## Summary & Recommended Actions

```
Step 1: Email the developers requesting source code + .env + DB export
         ↓
Step 2: Once received, run locally to verify it works
         ↓
Step 3: Create a new Vercel/Render/Railway account
Step 4: Deploy from your own repo
Step 5: In Cloudflare, add gild3d.com as custom domain → done
```

**The scraping route is a last resort** — it only captures the visual shell, not the working application. If you paid for this site, you are legally entitled to the source code.