#!/bin/bash
# Run this from the PS-Scripts directory:
# bash gild3d-app/admin-deploy.sh

PEM="gild3d-app/gild3d-production.pem"
HOST="ubuntu@3.93.100.110"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no"
SCP="scp -i $PEM -o StrictHostKeyChecking=no"

echo "========================================"
echo "  Gild3d Full Fix Deploy"
echo "========================================"

echo ""
echo "[1/6] Uploading backend files..."
$SCP gild3d-app/backend/src/controllers/adminController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/adminController.ts
$SCP gild3d-app/backend/src/routes/admin.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/admin.ts
echo "  Backend files uploaded"

echo ""
echo "[2/6] Uploading frontend files..."
$SSH $HOST "mkdir -p /home/ubuntu/gild3d-app/frontend/app/admin"
$SCP gild3d-app/frontend/app/admin/page.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/app/admin/page.tsx
$SCP gild3d-app/frontend/components/Navbar.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/components/Navbar.tsx
$SCP gild3d-app/frontend/lib/auth.ts \
  $HOST:/home/ubuntu/gild3d-app/frontend/lib/auth.ts
$SCP gild3d-app/frontend/app/page.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/app/page.tsx
$SCP "gild3d-app/frontend/app/book/[profileId]/page.tsx" \
  $HOST:"/home/ubuntu/gild3d-app/frontend/app/book/[profileId]/page.tsx"
echo "  Frontend files uploaded"

echo ""
echo "[3/6] Fixing companion inCall=true in database..."
$SSH $HOST "docker exec gild3d-db psql -U gild3duser -d gild3d -c \"UPDATE \\\"Profile\\\" SET \\\"inCall\\\" = true WHERE \\\"inCall\\\" = false;\" 2>&1"
echo "  DB fix applied"

echo ""
echo "[4/6] Rebuilding backend..."
$SSH $HOST "cd /home/ubuntu/gild3d-app && docker compose build backend 2>&1 | tail -3 && docker compose up -d backend"
echo "  Backend rebuilt"

echo ""
echo "[5/6] Rebuilding frontend (takes ~3 min)..."
$SSH $HOST "cd /home/ubuntu/gild3d-app && docker compose build frontend 2>&1 | tail -3 && docker compose up -d frontend && sleep 20 && docker ps --format 'table {{.Names}}\t{{.Status}}'"
echo "  Frontend rebuilt"

echo ""
echo "[6/6] Verifying..."
sleep 5
echo -n "  Site:     "; curl -s -o /dev/null -w "HTTP %{http_code}" --max-time 10 https://gild3d.com/; echo
echo -n "  Admin:    "; curl -s -o /dev/null -w "HTTP %{http_code}" --max-time 10 https://gild3d.com/admin; echo
echo -n "  Admin API:"; curl -s -o /dev/null -w "HTTP %{http_code}" --max-time 10 https://gild3d.com/api/admin/dashboard; echo " (401 = correct)"

echo ""
echo "========================================"
echo "  DONE! Changes deployed:"
echo "  - Home page: hides login buttons when logged in"
echo "  - Navbar: Admin link for super admin"
echo "  - Admin Dashboard: /admin (6 tabs)"
echo "  - Booking: auto-selects available type"
echo "  - DB: all companions now have inCall=true"
echo "========================================"