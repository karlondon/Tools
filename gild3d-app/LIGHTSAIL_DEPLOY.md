# Gilded Companions – AWS Lightsail Deployment Guide

## Prerequisites
- AWS account with Lightsail access (US-East region recommended)
- Domain name pointed to your Lightsail instance IP
- SSH key pair for the instance

---

## 1. Create Lightsail Instance

1. Log in to [AWS Lightsail](https://lightsail.aws.amazon.com/)
2. Click **Create instance** → **Linux/Unix** → **OS Only** → **Ubuntu 22.04 LTS**
3. Choose plan: **$20/month (4GB RAM / 2 vCPU)** minimum recommended
4. Set region: **US East (N. Virginia)**
5. Name it `gild3d-production` and click **Create**

---

## 2. Configure Networking

In the Lightsail console for your instance:
- **Networking** tab → Static IP → Attach static IP
- **Firewall** rules – add:
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  - Port 22 (SSH) — restrict to your IP

---

## 3. Initial Server Setup

```bash
# SSH into the instance
ssh -i ~/.ssh/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Certbot (SSL)
sudo apt install certbot -y
```

---

## 4. Deploy the Application

```bash
# Clone or upload your project
git clone https://github.com/YOUR_USERNAME/gild3d-app.git
cd gild3d-app

# Copy and configure environment
cp .env.example .env
nano .env
# Fill in all required values (see .env.example for details)

# Build and start all containers
docker compose up -d --build

# Run database migrations
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
```

---

## 5. SSL Certificate (HTTPS)

```bash
# Stop nginx temporarily
docker compose stop nginx

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d gild3d.com -d www.gild3d.com

# Update nginx.conf to point to cert files
# Certs are at: /etc/letsencrypt/live/gild3d.com/

# Restart
docker compose start nginx
```

Update `nginx/nginx.conf` to add SSL:
```nginx
server {
    listen 443 ssl;
    server_name gild3d.com www.gild3d.com;
    ssl_certificate /etc/letsencrypt/live/gild3d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gild3d.com/privkey.pem;
    # ... rest of config
}
```

---

## 6. Set Up BTCPay Server (Bitcoin Payments)

Option A — Use a hosted BTCPay instance (recommended for starting out):
- Create account at [BTCPay Server](https://mainnet.demo.btcpayserver.org)
- Create a store, generate API key
- Copy values to `.env`: `BTCPAY_URL`, `BTCPAY_STORE_ID`, `BTCPAY_API_KEY`
- Set webhook URL: `https://gild3d.com/api/payments/webhook`

Option B — Self-host BTCPay on a separate Lightsail instance (full control):
```bash
# On a separate $10-20/month instance
git clone https://github.com/btcpayserver/btcpayserver-docker
cd btcpayserver-docker
export BTCPAY_HOST="btcpay.gild3d.com"
export NBITCOIN_NETWORK="mainnet"
export BTCPAYGEN_CRYPTO1="btc"
export BTCPAYGEN_REVERSEPROXY="nginx"
. ./btcpay-setup.sh -i
```

---

## 7. File Storage (Uploads)

For production, configure AWS S3 instead of local storage:
1. Create an S3 bucket in us-east-1
2. Create IAM user with S3 access
3. Update `.env` with `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
4. Update `backend/src/middleware/upload.ts` to use `multer-s3`

---

## 8. Useful Commands

```bash
# View logs
docker compose logs -f

# Restart a service
docker compose restart backend

# Database backup
docker compose exec postgres pg_dump -U postgres gild3d > backup_$(date +%Y%m%d).sql

# Update application
git pull
docker compose up -d --build

# Check container status
docker compose ps
```

---

## 9. Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Random 64-char string for JWT signing | ✅ |
| `BTCPAY_URL` | BTCPay Server URL | ✅ |
| `BTCPAY_STORE_ID` | BTCPay store identifier | ✅ |
| `BTCPAY_API_KEY` | BTCPay API key | ✅ |
| `BTCPAY_WEBHOOK_SECRET` | BTCPay webhook HMAC secret | ✅ |
| `SITE_URL` | Your production URL | ✅ |
| `NEXT_PUBLIC_API_URL` | Backend API URL from frontend | ✅ |

---

## 10. Monthly Cost Estimate

| Service | Cost |
|---------|------|
| Lightsail 4GB instance | ~$20/mo |
| Lightsail static IP | Free while attached |
| BTCPay (self-hosted, separate instance) | ~$10/mo |
| Domain name | ~$12/year |
| **Total** | **~$30-40/mo** |