#!/bin/bash
set -e

# ============================================
# VibeList - Build & Push Docker Images
# ============================================
# Usage: ./build-and-push.sh <dockerhub-username>
# Example: ./build-and-push.sh vibelistuk
# ============================================

DOCKERHUB_USER="${1:-vibelistuk}"

echo "============================================"
echo "Building VibeList Docker images"
echo "Docker Hub user: $DOCKERHUB_USER"
echo "============================================"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker Desktop first."
  exit 1
fi

# Login to Docker Hub
echo ""
echo ">> Logging in to Docker Hub..."
docker login

# Build backend
echo ""
echo ">> Building backend image..."
cd "$(dirname "$0")/backend"
docker build -t "$DOCKERHUB_USER/vibelist-api:latest" .

# Build frontend
echo ""
echo ">> Building frontend image..."
cd "../frontend"
docker build -t "$DOCKERHUB_USER/vibelist-web:latest" .

# Push images
echo ""
echo ">> Pushing images to Docker Hub..."
docker push "$DOCKERHUB_USER/vibelist-api:latest"
docker push "$DOCKERHUB_USER/vibelist-web:latest"

echo ""
echo "============================================"
echo "SUCCESS! Images pushed to Docker Hub:"
echo "  $DOCKERHUB_USER/vibelist-api:latest"
echo "  $DOCKERHUB_USER/vibelist-web:latest"
echo ""
echo "Now SSH into your server and run:"
echo "  cd ~/vibelist"
echo "  docker compose --env-file .env up -d"
echo "============================================"