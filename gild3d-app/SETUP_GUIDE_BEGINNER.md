# 🚀 Complete Beginner Setup Guide
## gild3d.com on AWS Lightsail + Cloudflare

This guide walks you through every step. No prior server experience needed.

---

## PART 1 — AWS Lightsail: Create Your Server

### Step 1.1 — Log in to Lightsail
1. Go to [lightsail.aws.amazon.com](https://lightsail.aws.amazon.com)
2. Sign in with your AWS account
3. Make sure the region in the top-right says **US East (N. Virginia)**
   - If not, click the region name and select **US East (N. Virginia)**

### Step 1.2 — Create an Instance
1. Click the orange **"Create instance"** button
2. Select:
   - **Platform:** Linux/Unix
   - **Blueprint:** Click **"OS Only"** tab → select **Ubuntu 22.04 LTS**
3. Scroll down to **"Choose your instance plan"**
   - Select the **$20/month plan** (4 GB RAM, 2 vCPUs, 80 GB SSD)
   - *(The $10/month plan may run out of memory during builds)*
4. Scroll down to **"Identify your instance"**
   - Name it: `gild3d-production`
5. Click **"Create instance"** (orange button at bottom)
6. Wait about 2 minutes for it to show **"Running"** (green dot)

### Step 1.3 — Assign a Static IP
1. Click on your new instance `gild3d-production`
2. Click the **"Networking"** tab
3. Under **"Public IP"**, click **"Attach static IP"**
4. Click **"Create static IP"** → name it `gild3d-static-ip` → click **Create**
5. **Write down this IP address** — you will need it (e.g. `44.123.456.789`)

### Step 1.4 — Configure Firewall
Still on the **Networking** tab, scroll to **Firewall**:
1. Click **"Add rule"** → select **HTTPS** → Save  
2. Click **"Add rule"** → select **HTTP** → Save  
   *(SSH port 22 should already be there)*

---

## PART 2 — Cloudflare: Point Your Domain to Lightsail

### Step 2.1 — Log in to Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click on **gild3d.com**
3. Click **DNS** in the left sidebar → **Records**

### Step 2.2 — Add DNS Records
Delete any existing A records for `@` or `www` first, then add:

**Record 1:**
- Type: **A**
- Name: **@** (this means gild3d.com)
- IPv4 address: *(your Lightsail static IP)*
- Proxy status: **DNS only** (grey cloud — NOT orange/proxied for now)
- TTL: Auto
- Click **Save**

**Record 2:**
- Type: **A**  
- Name: **www**
- IPv4 address: *(your Lightsail static IP — same)*
- Proxy status: **DNS only** (grey cloud)
- TTL: Auto
- Click **Save**

> ⏱️ DNS changes take 5–30 minutes to propagate. Continue with the next steps while you wait.

---

## PART 3 — Connect to Your Server

### Step 3.1 — Open the Browser SSH Terminal
1. In Lightsail, click on `gild3d-production`
2. Click the **"Connect"** tab
3. Click **"Connect using SSH"** — a black terminal window opens in your browser
4. You are now inside your server!

### Step 3.2 — Install Docker
Copy and paste these commands **one at a time** into the terminal:

```bash
sudo apt update && sudo apt upgrade -y
```
*(Press Enter, wait for it to finish — may take 2 minutes)*

```bash
curl -fsSL https://get.docker.com | sudo sh
```
*(Installs Docker — wait 1-2 minutes)*

```bash
sudo usermod -aG docker ubuntu
```

```bash
newgrp docker
```

```bash
docker --version
```
*(Should show something like: `Docker version 25.x.x`)*

```bash
sudo apt install -y docker-compose-plugin git
```

```bash
docker compose version
```
*(Should show: `Docker Compose version v2.x.x`)*

---

## PART 4 — Upload and Configure the Application

### Step 4.1 — Upload Your Project Files

**Option A: Using Git (Recommended)**

If you have the project in a GitHub repository:
```bash
git clone https://github.com/YOUR_USERNAME/gild3d-app.git
cd gild3d-app
```

**Option B: Upload files manually**

In Lightsail, use the file upload button in the browser SSH terminal, or use the Lightsail file manager. Upload the entire `gild3d-app` folder.

Then navigate to it:
```bash
cd gild3d-app
```

### Step 4.2 — Create Your Configuration File
```bash
cp .env.example .env
nano .env
```

A text editor opens. Update these values (use arrow keys to navigate, type to edit):

```
NODE_ENV=production
SITE_URL=https://gild3d.com
NEXT_PUBLIC_SITE_NAME=Gilded Companions
NEXT_PUBLIC_API_URL=https://gild3d.com/api

DB_USER=gild3duser
DB_PASSWORD=MyStrongPassword123!
DB_NAME=gild3d

JWT_SECRET=PasteA64CharacterRandomStringHereAbcDefGhiJklMnoPqrStuVwxYz12345
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://gild3d.com

UPLOAD_PROVIDER=local

BTCPAY_URL=https://your-btcpay-server.com
BTCPAY_API_KEY=your_btcpay_api_key
BTCPAY_STORE_ID=your_btcpay_store_id
BTCPAY_WEBHOOK_SECRET=your_webhook_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=noreply@gild3d.com

NEXT_PUBLIC_BTCPAY_URL=https://your-btcpay-server.com
```

To **generate a random JWT_SECRET**, run this in a separate line first:
```bash
openssl rand -hex 32
```
Copy the output and paste it as your JWT_SECRET value.

**To save and exit nano:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## PART 5 — Get Free SSL Certificate (HTTPS)

### Step 5.1 — Install Certbot
```bash
sudo apt install -y certbot
```

### Step 5.2 — Get Your Certificate
Replace `your@email.com` with your real email:
```bash
sudo certbot certonly --standalone -d gild3d.com -d www.gild3d.com --email your@email.com --agree-tos --no-eff-email
```

If it says "port 80 already in use", that's fine for now — run this after the app is started. Skip to Part 6 first, then come back.

> ✅ If successful, your certificates are saved at:
> `/etc/letsencrypt/live/gild3d.com/`

### Step 5.3 — Update Nginx Config for SSL

Edit the nginx config:
```bash
nano nginx/nginx.conf
```

Replace the entire `server` block with this (keep the upstream blocks at the top):
```nginx
server {
    listen 80;
    server_name gild3d.com www.gild3d.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name gild3d.com www.gild3d.com;

    ssl_certificate /etc/letsencrypt/live/gild3d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gild3d.com/privkey.pem;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://backend:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://backend:4000/uploads/;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

You also need to mount the certificates in docker-compose. Add this volume to the nginx service in `docker-compose.yml`:
```bash
nano docker-compose.yml
```

Find the `nginx:` section and add under `volumes:`:
```yaml
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

Save and exit.

---

## PART 6 — Start the Application

### Step 6.1 — Build and Start Everything
```bash
docker compose up -d --build
```
This will take **5–10 minutes** the first time (downloading and building everything).

Watch the progress:
```bash
docker compose logs -f
```
Press `Ctrl+C` to stop watching logs (the app keeps running).

### Step 6.2 — Run Database Setup
```bash
docker compose exec backend npx prisma migrate deploy
```
*(Sets up all the database tables)*

### Step 6.3 — Check Everything is Running
```bash
docker compose ps
```
You should see 4 containers all showing **"Up"**:
- `gild3d-postgres`
- `gild3d-backend`
- `gild3d-frontend`
- `gild3d-nginx`

---

## PART 7 — Test Your Website

1. Open a browser and go to: **http://gild3d.com**
   - You should see the Gilded Companions landing page!
2. If you set up SSL: try **https://gild3d.com**

### If something doesn't work:
```bash
# Check backend logs
docker compose logs backend

# Check frontend logs
docker compose logs frontend

# Check nginx logs
docker compose logs nginx

# Restart everything
docker compose restart
```

---

## PART 8 — Enable Cloudflare Proxy (Optional but recommended)

Once your site is working:
1. Go back to Cloudflare → DNS → Records
2. Click the edit (pencil) icon on both your A records
3. Change **Proxy status** from grey cloud to **orange cloud** (Proxied)
4. This gives you DDoS protection and hides your server IP

---

## PART 9 — Set Up Gmail for Email Notifications

To send booking confirmation emails via Gmail:

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** → **2-Step Verification** → enable it
3. Go back to Security → scroll down → **App passwords**
4. Select app: **Mail** → Select device: **Other** → name it `gild3d`
5. Click **Generate** → copy the 16-character password
6. In your `.env` file:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.gmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx    (the 16-char app password)
   SMTP_FROM=noreply@gild3d.com
   ```
7. Restart the backend:
   ```bash
   docker compose restart backend
   ```

---

## PART 10 — Set Up Bitcoin Payments (BTCPay Server)

For the easiest start, use a **hosted BTCPay** service:

### Option A — BTCPay Server (free hosted)
1. Go to [btcpayserver.org](https://btcpayserver.org) → Find a host
2. Or use: [mainnet.demo.btcpayserver.org](https://mainnet.demo.btcpayserver.org) to test
3. Register → Create a Store → name it `Gilded Companions`
4. Go to Store Settings → connect your Bitcoin wallet
5. Go to Account → API Keys → Generate Key (check all invoice permissions)
6. Copy your `Store ID` from the URL and the `API Key`
7. Update your `.env`:
   ```
   BTCPAY_URL=https://your-btcpay-host.com
   BTCPAY_STORE_ID=your_store_id
   BTCPAY_API_KEY=your_api_key
   BTCPAY_WEBHOOK_SECRET=create_a_random_string
   ```
8. In BTCPay → Store → Webhooks → Add Webhook:
   - URL: `https://gild3d.com/api/payments/webhook`
   - Events: Check **InvoiceSettled**
   - Secret: same as your `BTCPAY_WEBHOOK_SECRET`
9. Restart: `docker compose restart backend`

---

## 🔧 Useful Daily Commands

```bash
# SSH into your server (from browser: Lightsail → Connect → Connect using SSH)

# See all running containers
docker compose ps

# View live logs
docker compose logs -f

# Restart the app
docker compose restart

# Stop the app
docker compose down

# Start the app
docker compose up -d

# Update the app (after uploading new files)
docker compose up -d --build

# Database backup
docker compose exec postgres pg_dump -U gild3duser gild3d > backup_$(date +%Y%m%d).sql
```

---

## 💰 Monthly Cost Summary

| Item | Cost |
|------|------|
| Lightsail $20/mo instance | **$20/mo** |
| Cloudflare (free plan) | **$0** |
| SSL certificate (Let's Encrypt) | **$0** |
| Gmail SMTP | **$0** |
| BTCPay hosted (some free options) | **$0–$10/mo** |
| **Total** | **~$20–30/mo** |

---

## 🆘 Need Help?

Common issues and fixes:

| Problem | Fix |
|---------|-----|
| Site not loading | Check `docker compose ps` — all containers should show "Up" |
| Port 80 error on certbot | Run `docker compose stop nginx` first, then certbot, then `docker compose start nginx` |
| Database error | Run `docker compose exec backend npx prisma migrate deploy` again |
| Changes not showing | Run `docker compose up -d --build` to rebuild |
| Out of disk space | Run `docker system prune -f` to clean up |