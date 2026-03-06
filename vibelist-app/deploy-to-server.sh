#!/bin/bash
set -e

# ============================================
# VibeList - Deploy to Lightsail Server
# ============================================
# Builds Docker images directly on the server.
# No Docker Hub account needed!
#
# Usage: ./deploy-to-server.sh <SERVER_IP> [SSH_KEY_PATH]
# Example: ./deploy-to-server.sh 44.192.10.55
# Example: ./deploy-to-server.sh 44.192.10.55 ~/.ssh/my-key.pem
# ============================================

SERVER_IP="${1}"
SSH_KEY="${2}"
SERVER_USER="ubuntu"

if [ -z "$SERVER_IP" ]; then
  echo "ERROR: Please provide your server IP address"
  echo "Usage: ./deploy-to-server.sh <SERVER_IP> [SSH_KEY_PATH]"
  exit 1
fi

SSH_OPTS=""
SCP_OPTS=""
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS="-i $SSH_KEY"
  SCP_OPTS="-i $SSH_KEY"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  VibeList - Deploy to Server"
echo "  Target: $SERVER_USER@$SERVER_IP"
echo "============================================"

# Step 1: Create directory structure on server
echo ""
echo ">> Step 1: Creating project structure on server..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" "mkdir -p ~/vibelist/{nginx,certs,uploads,backend/src,frontend/app,frontend/public}"

# Step 2: Upload backend files
echo ""
echo ">> Step 2: Uploading backend files..."
scp $SCP_OPTS "$SCRIPT_DIR/backend/package.json" "$SERVER_USER@$SERVER_IP:~/vibelist/backend/"
scp $SCP_OPTS "$SCRIPT_DIR/backend/tsconfig.json" "$SERVER_USER@$SERVER_IP:~/vibelist/backend/"
scp $SCP_OPTS "$SCRIPT_DIR/backend/Dockerfile" "$SERVER_USER@$SERVER_IP:~/vibelist/backend/"
scp $SCP_OPTS "$SCRIPT_DIR/backend/.dockerignore" "$SERVER_USER@$SERVER_IP:~/vibelist/backend/"
scp $SCP_OPTS "$SCRIPT_DIR/backend/src/main.ts" "$SERVER_USER@$SERVER_IP:~/vibelist/backend/src/"

# Step 3: Upload frontend files
echo ""
echo ">> Step 3: Uploading frontend files..."
scp $SCP_OPTS "$SCRIPT_DIR/frontend/package.json" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/"
scp $SCP_OPTS "$SCRIPT_DIR/frontend/next.config.js" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/"
scp $SCP_OPTS "$SCRIPT_DIR/frontend/Dockerfile" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/"
scp $SCP_OPTS "$SCRIPT_DIR/frontend/.dockerignore" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/"
scp $SCP_OPTS "$SCRIPT_DIR/frontend/app/layout.tsx" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/app/"
scp $SCP_OPTS "$SCRIPT_DIR/frontend/app/page.tsx" "$SERVER_USER@$SERVER_IP:~/vibelist/frontend/app/"

# Step 4: Upload docker-compose.yml
echo ""
echo ">> Step 4: Uploading docker-compose.yml..."
scp $SCP_OPTS "$SCRIPT_DIR/docker-compose.yml" "$SERVER_USER@$SERVER_IP:~/vibelist/"

# Step 5: Upload/create nginx config
echo ""
echo ">> Step 5: Creating nginx config on server..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" 'cat > ~/vibelist/nginx/default.conf << '\''NGINXCONF'\''
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
NGINXCONF'

# Step 6: Create .env file if not exists
echo ""
echo ">> Step 6: Setting up .env file..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" 'test -f ~/vibelist/.env || echo "POSTGRES_PASSWORD=vibelist_$(openssl rand -hex 12)" > ~/vibelist/.env && echo ".env file ready"'

# Step 7: Build and start on server
echo ""
echo ">> Step 7: Building and starting containers on server..."
echo "   (This may take 3-5 minutes on first run)"
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" 'cd ~/vibelist && docker compose build 2>&1'

echo ""
echo ">> Step 8: Starting all services..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" 'cd ~/vibelist && docker compose up -d 2>&1'

echo ""
echo ">> Step 9: Checking service status..."
sleep 5
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" 'cd ~/vibelist && docker compose ps 2>&1'

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Visit: http://$SERVER_IP"
echo "============================================"