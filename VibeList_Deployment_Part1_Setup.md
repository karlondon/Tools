# VibeList.uk Deployment Guide — Part 1: Setup

> **Suggested Docker Hub username:** `vibelistuk` (register at hub.docker.com)

## What Was Wrong With the Original Guide

The original guide uses `your-dockerhub-user` as a placeholder in `docker-compose.yml` but never instructs you to replace it. It also skips the critical step of building/pushing images before deploying. Docker fails because `your-dockerhub-user/vibelist-api` does not exist on Docker Hub.

---

## Step 1 — Purchase Domain
Cloudflare Registrar → purchase `vibelist.uk`. Add DNS A records later.

## Step 2 — Create Lightsail Instance
AWS Lightsail → Create Instance → Ubuntu 22.04 → 2 GB RAM → name `vibelist-prod`. Attach a **Static IP**. Note the IP.

## Step 3 — Firewall
Open ports 22, 80, 443 in Lightsail Networking.

## Step 4 — SSH In
```bash
ssh ubuntu@<YOUR_STATIC_IP>
```

## Step 5 — Update System
```bash
sudo apt update && sudo apt -y upgrade
```

## Step 6 — Security Tools
```bash
sudo apt install -y ufw fail2ban
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable
sudo systemctl enable fail2ban && sudo systemctl start fail2ban
```

## Step 7 — Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit
```
Re-connect: `ssh ubuntu@<YOUR_STATIC_IP>`, then verify:
```bash
docker --version && docker compose version
```

## Step 8 — Create Folders (on server)
```bash
mkdir -p ~/vibelist/{nginx,certs,uploads,postgres_data}
cd ~/vibelist
```

## Step 9 — Environment File (on server)
```bash
cat > ~/vibelist/.env << 'EOF'
POSTGRES_PASSWORD=Ch4ng3_Th1s_T0_S0m3th1ng_S3cur3
DOCKERHUB_USER=vibelistuk
EOF
```
> ⚠️ Replace `vibelistuk` with YOUR actual Docker Hub username. Replace the password with a strong one.

## Step 10 — docker-compose.yml (on server)
```bash
cat > ~/vibelist/docker-compose.yml << 'YAML'
services:
  postgres:
    image: postgres:16
    container_name: vibelist_postgres
    environment:
      POSTGRES_DB: vibelist
      POSTGRES_USER: vibelist
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
    restart: always

  api:
    image: ${DOCKERHUB_USER}/vibelist-api:latest
    environment:
      DATABASE_URL: postgres://vibelist:${POSTGRES_PASSWORD}@postgres:5432/vibelist
    depends_on:
      - postgres
    restart: always

  web:
    image: ${DOCKERHUB_USER}/vibelist-web:latest
    depends_on:
      - api
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - ./uploads:/var/www/uploads
      - ./certs:/etc/nginx/certs
    depends_on:
      - web
      - api
    restart: always
YAML
```

## Step 11 — Nginx Config (on server)
```bash
cat > ~/vibelist/nginx/default.conf << 'CONF'
server {
    listen 80;
    server_name vibelist.uk www.vibelist.uk;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        alias /var/www/uploads/;
    }
}
CONF
```

---

**Continue to Part 2** → `VibeList_Deployment_Part2_Build_Deploy.md`