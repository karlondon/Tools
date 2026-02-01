# MistressStyle.com Domain DNS Troubleshooting Guide

## Current Situation
- ✅ Website is live on IP: 13.43.151.162
- ❌ Domain mistressstyle.com not pointing to the site yet

## Why Domain Hasn't Propagated

There are typically 3 reasons:

### 1. DNS Records Not Set Up Correctly

You need to configure DNS records at your domain registrar (GoDaddy/Namecheap/etc.)

**Required DNS Records:**

#### Option A: Using A Record (Recommended)
```
Type: A
Host: @
Value: 13.43.151.162
TTL: 3600 (or automatic)

Type: A
Host: www
Value: 13.43.151.162
TTL: 3600
```

#### Option B: Using CNAME (Alternative)
```
Type: CNAME
Host: www
Value: 13.43.151.162
TTL: 3600
```

### 2. Nameservers Not Pointed Correctly

Check if your domain is using the correct nameservers.

**AWS Lightsail Nameservers (if using Lightsail DNS):**
- ns-###.awsdns-##.com
- ns-###.awsdns-##.co.uk
- ns-###.awsdns-##.net
- ns-###.awsdns-##.org

**Or use your registrar's nameservers** with A records pointing to your IP.

### 3. Propagation Time

DNS changes can take 1-48 hours to propagate globally (though usually much faster).

---

## Step-by-Step Fix

### Step 1: Check Current DNS Settings

**Go to your domain registrar** (where you bought mistressstyle.com):

1. Log in to your account
2. Find "DNS Settings" or "Manage DNS"
3. Check what records exist

### Step 2: Add/Update DNS Records

**If using your registrar's DNS:**

1. Delete any existing A records for @ and www
2. Add new A records:
   ```
   Type: A
   Host: @ (or leave blank)
   Points to: 13.43.151.162
   
   Type: A
   Host: www
   Points to: 13.43.151.162
   ```
3. Save changes

**If using AWS Lightsail DNS:**

1. Go to AWS Lightsail Console
2. Click "Networking" → "DNS zones"
3. Click "Create DNS zone"
4. Enter: mistressstyle.com
5. Add these records:
   ```
   A record: @ → 13.43.151.162
   A record: www → 13.43.151.162
   ```
6. Note the nameservers AWS provides
7. Go to your domain registrar
8. Update nameservers to the ones AWS gave you

### Step 3: Configure WordPress for Domain

Once DNS is set up, update WordPress to use the domain:

**Option A: Via WordPress Admin**
1. Go to: http://13.43.151.162/wp-admin
2. Settings → General
3. Change both URLs to: https://mistressstyle.com
4. Save

**Option B: Via SSH (Safer)**
```bash
# Connect to your instance
ssh -i YourKeyPair.pem bitnami@13.43.151.162

# Backup WordPress config
sudo cp /opt/bitnami/wordpress/wp-config.php /opt/bitnami/wordpress/wp-config.php.backup

# Edit wp-config.php
sudo nano /opt/bitnami/wordpress/wp-config.php

# Add these lines before "That's all, stop editing!"
define('WP_HOME','https://mistressstyle.com');
define('WP_SITEURL','https://mistressstyle.com');

# Save: Ctrl+X, Y, Enter

# Restart Apache
sudo /opt/bitnami/ctlscript.sh restart apache
```

### Step 4: Set Up SSL Certificate (HTTPS)

Once domain works, enable HTTPS:

```bash
# Connect via SSH
ssh -i YourKeyPair.pem bitnami@13.43.151.162

# Run Bitnami HTTPS configuration tool
sudo /opt/bitnami/bncert-tool

# Follow prompts:
# 1. Enter domain: mistressstyle.com www.mistressstyle.com
# 2. Enable HTTP to HTTPS redirect: Yes
# 3. Enable non-www to www redirect: Yes (or vice versa, your choice)
# 4. Agree to Let's Encrypt terms
# 5. Enter your email address
```

---

## Quick Diagnosis

### Check DNS Propagation Status

Use these online tools:

1. **https://dnschecker.org**
   - Enter: mistressstyle.com
   - Select: A record
   - Should show: 13.43.151.162

2. **https://www.whatsmydns.net**
   - Enter: mistressstyle.com
   - Check worldwide propagation

3. **Command Line Check:**
   ```bash
   # Mac/Linux
   dig mistressstyle.com
   nslookup mistressstyle.com
   
   # Windows
   nslookup mistressstyle.com
   ```

### Test Direct IP Access

Can you access the site via IP?
- http://13.43.151.162 ✅ (Should work)
- http://mistressstyle.com ❌ (Doesn't work yet)

---

## Common Issues & Solutions

### Issue 1: "DNS_PROBE_FINISHED_NXDOMAIN"
**Solution:** DNS records not set up yet. Follow Step 2 above.

### Issue 2: "This site can't be reached"
**Solution:** Either DNS not propagated yet (wait), or records incorrect (check Step 2).

### Issue 3: Site shows but looks broken
**Solution:** WordPress URLs not updated. Follow Step 3.

### Issue 4: Mixed content warnings
**Solution:** SSL not configured. Follow Step 4.

### Issue 5: www vs non-www confusion
**Solution:** Set up both A records, then configure redirect in Step 4.

---

## Verification Checklist

Once DNS propagates, verify:

- [ ] http://mistressstyle.com loads the site
- [ ] http://www.mistressstyle.com loads the site
- [ ] Both redirect to https:// (after SSL setup)
- [ ] All images load correctly
- [ ] All posts are accessible
- [ ] WordPress admin works at https://mistressstyle.com/wp-admin

---

## Expected Timeline

| Action | Time |
|--------|------|
| Add DNS records | 5 minutes |
| DNS propagation starts | Immediate |
| DNS fully propagated | 1-48 hours (usually 1-4 hours) |
| SSL certificate issued | 5-10 minutes (after DNS works) |
| Site fully live with HTTPS | ~1-4 hours total |

---

## Your Domain Registrar Specific Guides

### GoDaddy
1. Log in to GoDaddy
2. My Products → Domains
3. Click on mistressstyle.com
4. DNS → Manage Zones
5. Add A records as specified above

### Namecheap
1. Log in to Namecheap
2. Domain List → Manage
3. Advanced DNS tab
4. Add New Record → A Record
5. Add records as specified above

### Google Domains
1. Log in to Google Domains
2. Click mistressstyle.com
3. DNS section
4. Custom resource records
5. Add A records as specified above

### Cloudflare (if using)
1. Log in to Cloudflare
2. Select mistressstyle.com
3. DNS tab
4. Add A records (with orange cloud OFF initially)
5. After testing works, turn orange cloud ON for CDN

---

## Need Help?

If DNS still not working after 4 hours:

1. **Check which nameservers your domain is using:**
   ```bash
   dig NS mistressstyle.com
   ```

2. **Verify A record at registrar:**
   - Should show 13.43.151.162

3. **Try flushing your local DNS cache:**
   ```bash
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   
   # Linux
   sudo systemd-resolve --flush-caches
   ```

4. **Test from different location:**
   - Use mobile data instead of WiFi
   - Try from different computer
   - Use online proxy: https://hide.me/en/proxy

---

## What You Should See When It Works

1. **Type:** https://mistressstyle.com
2. **Should show:** Your WordPress fashion blog
3. **Posts visible:**
   - 10 Essential Wardrobe Pieces
   - Budget Capsule Wardrobe
   - Sustainable Fashion Brands
   - Dressing Your Body Type
   - Best Winter Coats

4. **Address bar shows:** 🔒 Secure | https://mistressstyle.com

---

## Next Steps After Domain Works

Once mistressstyle.com is live:

1. ✅ Submit sitemap to Google Search Console
2. ✅ Set up Pinterest business account
3. ✅ Create social media profiles
4. ✅ Add affiliate links to posts
5. ✅ Create email capture forms
6. ✅ Design Pinterest graphics
7. ✅ Start promoting content

---

**Current Status:** Site is live on IP, waiting for DNS to point domain.

**Next Action:** Set up DNS A records at your domain registrar (see Step 2).

**Expected Time:** Domain should work within 1-4 hours of setting up DNS.