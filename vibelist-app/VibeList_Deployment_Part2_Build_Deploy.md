# VibeList Deployment - Part 2: Build & Deploy on Server

## Overview

Since Docker Desktop on corporate/managed Macs may be restricted, this guide builds Docker images **directly on the Lightsail server** instead of using Docker Hub. This is simpler and avoids Docker Hub account requirements entirely.

---

## Prerequisites

- Lightsail instance created (see Part 1)
- SSH access to your server working
- The `vibelist-app/` folder with all source code

---

## Option A: Automated Deployment (Recommended)

Run the deploy script from your Mac:

```bash
cd vibelist-app

# If using default SSH key:
./deploy-to-server.sh YOUR_SERVER_IP

# If using a specific SSH key (e.g., Lightsail .pem file):
./deploy-to-server.sh YOUR_SERVER_IP ~/.ssh/your-lightsail-key.pem
```

The script will:
1. Upload all source code to the server
2. Create the nginx config
3. Generate a secure `.env` file
4. Build Docker images on the server
5. Start all containers
6. Show service status

---

## Option B: Manual Deployment

### Step 1: Upload Files to Server

```bash
SERVER=ubuntu@YOUR_SERVER_IP
SSH_KEY="-i ~/.ssh/your-key.pem"  # omit if using default key

# Create directories
ssh $SSH_KEY $SERVER "mkdir -p ~/vibelist/{nginx,certs,uploads,backend/src,frontend/app,frontend/public}"

# Upload backend
scp $SSH_KEY vibelist-app/backend/package.json $SERVER:~/vibelist/backend/
scp $SSH_KEY vibelist-app/backend/tsconfig.json $SERVER:~/vibelist/backend/
scp $SSH_KEY vibelist-app/backend/Dockerfile $SERVER:~/vibelist/backend/
scp $SSH_KEY vibelist-app/backend/.dockerignore $SERVER:~/vibelist/backend/
scp $SSH_KEY vibelist-app/backend/src/main.ts $SERVER:~/vibelist/backend/src/

# Upload frontend
scp $SSH_KEY vibelist-app/frontend/package.json $SERVER:~/vibelist/frontend/
scp $SSH_KEY vibelist-app/frontend/next.config.js $SERVER:~/vibelist/frontend/
scp $SSH_KEY vibelist-app/frontend/Dockerfile $SERVER:~/vibelist/frontend/
scp $SSH_KEY vibelist-app/frontend/.dockerignore $SERVER:~/vibelist/frontend/
scp $SSH_KEY vibelist-app/frontend/app/layout.tsx $SERVER:~/vibelist/frontend/app/
scp $SSH_KEY vibelist-app/frontend/app/page.tsx $SERVER:~/vibelist/frontend/app/

# Upload docker-compose.yml
scp $SSH_KEY vibelist-app/docker-compose.yml $SERVER:~/vibelist/
```

### Step 2: SSH into Server

```bash
ssh $SSH_KEY $SERVER
```

### Step 3: Create Nginx Config

```bash
cat > ~/vibelist/nginx/default.conf << 'EOF'
server {
    listen 80;
    server_name vibelist.uk www.vibelist.uk _;

    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://api:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/uploads/;
    }
}
EOF
```

### Step 4: Create .env File

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" > ~/vibelist/.env
```

### Step 5: Build and Start

```bash
cd ~/vibelist

# Build images (first time takes 3-5 minutes)
docker compose build

# Start all services
docker compose up -d

# Verify everything is running
docker compose ps
```

You should see 4 containers running:
- `vibelist_postgres` - Database
- `vibelist_api` - Backend API
- `vibelist_web` - Frontend
- `vibelist_nginx` - Reverse proxy

---

## Verify Deployment

```bash
# Check all containers are "Up"
docker compose ps

# Test the API
curl http://localhost/api/vibes

# Check logs if something is wrong
docker compose logs api
docker compose logs web
docker compose logs nginx
```

Visit `http://YOUR_SERVER_IP` in your browser - you should see the VibeList app!

---

## Troubleshooting

### Container won't start
```bash
docker compose logs <service-name>
```

### Rebuild after code changes
```bash
# From your Mac, re-run the deploy script:
./deploy-to-server.sh YOUR_SERVER_IP

# Or manually on the server:
cd ~/vibelist
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Database issues
```bash
# Reset the database
docker compose down -v   # WARNING: deletes all data
docker compose up -d
```

---

## Why Build on Server Instead of Docker Hub?

The original guide assumed you'd build images locally and push to Docker Hub. This fails on:
- **Corporate Macs** with Docker Desktop sign-in requirements
- **Machines without Docker** installed
- **Environments** where Docker Hub access is restricted

Building on the server is actually **simpler**:
- No Docker Hub account needed
- No `docker login` step
- No image push/pull over the internet
- Images are built right where they run