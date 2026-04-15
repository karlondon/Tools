# Pointing gild3d.com → glided.live via Cloudflare

## Understanding Your Options

There are **two distinct outcomes** — choose based on what you want:

| Option | URL visitors see | Changes to site | Effort |
|--------|-----------------|-----------------|--------|
| A. **Redirect** | `glided.live` (URL changes) | None | 5 min |
| B. **Reverse Proxy (recommended)** | `gild3d.com` (URL stays) | None | 10 min |

---

## Option A — Simple Redirect (URL changes to glided.live)

Best if you just want `gild3d.com` to forward visitors to `glided.live`.

### Steps in Cloudflare Dashboard

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your **gild3d.com** zone
3. Go to **Rules → Redirect Rules**
4. Click **Create rule**
5. Configure:
   - **Rule name**: Redirect to glided.live
   - **When incoming requests match**: Custom filter expression
   - **Field**: Hostname | **Operator**: equals | **Value**: `gild3d.com`
   - Also add: Hostname equals `www.gild3d.com`
6. **Then**: Static redirect
   - **Redirect URL**: `https://glided.live`
   - **Status code**: `301` (permanent) or `302` (temporary)
   - Check **Preserve query string** ✓
7. Click **Deploy**

> **Also add a DNS placeholder record** (Cloudflare requires at least one record for redirect rules to work):
> - DNS → Add record → Type: **A** | Name: `@` | IPv4: `192.0.2.1` | Proxy: **Proxied (orange cloud)**
> - Repeat for `www`

---

## Option B — Reverse Proxy via Cloudflare Workers (RECOMMENDED)

This makes `gild3d.com` **serve the glided.live content** — visitors never see the `glided.live` domain. This is the best option if you want your brand domain to be the permanent home.

### Step 1 — Add DNS Records in Cloudflare

1. Go to **DNS → Records** for `gild3d.com`
2. Add these two records:

   | Type | Name | IPv4 Address | Proxy |
   |------|------|-------------|-------|
   | A | `@` | `192.0.2.1` | ✅ Proxied |
   | A | `www` | `192.0.2.1` | ✅ Proxied |

   > The IP `192.0.2.1` is a placeholder — traffic never reaches it because the Worker intercepts it.

### Step 2 — Create a Cloudflare Worker

1. Go to **Workers & Pages → Overview** in Cloudflare
2. Click **Create application → Create Worker**
3. Name it: `gild3d-proxy`
4. Replace the default code with:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Replace the hostname with glided.live
    url.hostname = 'glided.live';
    
    // Forward the request to glided.live
    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(modifiedRequest);

    // Return the response as-is
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
```

5. Click **Save and Deploy**

### Step 3 — Attach Worker to gild3d.com

1. In the Worker detail page, go to **Settings → Triggers**
2. Under **Custom Domains**, click **Add Custom Domain**
3. Enter: `gild3d.com`
4. Also add: `www.gild3d.com`
5. Click **Add Custom Domain**

Cloudflare will automatically provision SSL certificates.

---

## Option C — If glided.live Uses a Platform That Supports Custom Domains

If `glided.live` is hosted on **Vercel, Netlify, GitHub Pages, Webflow, Squarespace**, etc., the cleanest solution is to add `gild3d.com` as a custom domain directly in their platform.

### How to check:
Ask the developers of `glided.live` what platform/host they use. Then:

| Platform | How to add custom domain |
|----------|--------------------------|
| **Vercel** | Project → Settings → Domains → Add `gild3d.com` |
| **Netlify** | Site → Domain management → Add custom domain |
| **GitHub Pages** | Repo → Settings → Pages → Custom domain |
| **Webflow** | Project Settings → Hosting → Custom domain |

After adding it there, Cloudflare DNS config is:

```
Type: CNAME  |  Name: @  |  Target: <platform-provided-value>  |  Proxy: ON
Type: CNAME  |  Name: www  |  Target: <platform-provided-value>  |  Proxy: ON
```

---

## ⚠️ Important Caveats for Reverse Proxy

If using the Worker proxy (Option B), be aware:

1. **Internal links on glided.live** — If the site has hardcoded links pointing to `glided.live`, those will still work but may redirect users away from `gild3d.com`.
2. **Cookies** — Some sites use domain-specific cookies which may behave differently.
3. **CORS / API calls** — Backend API calls that are domain-restricted on `glided.live` may fail.
4. **Best long-term fix** — Ask the `glided.live` developers to officially add `gild3d.com` as a custom domain so it's fully supported.

---

## Recommended Path Summary

```
Short-term (today, no dev needed):
  → Use Option B (Cloudflare Worker proxy)
  → gild3d.com will serve glided.live content immediately

Long-term (proper setup):
  → Ask glided.live devs to add gild3d.com as a custom domain
  → Point DNS CNAME to their hosting platform
  → Remove the Worker once properly set up
```

---

## DNS Propagation

After any DNS change, allow **up to 48 hours** for full propagation (usually 5–15 minutes with Cloudflare's proxied records).

You can check propagation at: [dnschecker.org](https://dnschecker.org/#A/gild3d.com)