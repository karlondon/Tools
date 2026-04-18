#!/bin/bash
# Run from PS-Scripts directory:
#   bash gild3d-app/deploy.sh
set -e

PEM="gild3d-app/gild3d-production.pem"
HOST="ubuntu@3.93.100.110"
SSH="ssh -i $PEM -o StrictHostKeyChecking=no"
SCP="scp -i $PEM -o StrictHostKeyChecking=no"

echo "========================================"
echo "  Gild3d Deploy"
echo "========================================"

echo ""
echo "[1/6] Uploading environment config..."
$SCP gild3d-app/.env $HOST:/home/ubuntu/gild3d-app/.env
$SCP gild3d-app/docker-compose.yml $HOST:/home/ubuntu/gild3d-app/docker-compose.yml
echo "  .env + docker-compose.yml uploaded"

echo ""
echo "[2/6] Uploading backend files..."
$SCP gild3d-app/backend/package.json \
  $HOST:/home/ubuntu/gild3d-app/backend/package.json
$SCP gild3d-app/backend/src/index.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/index.ts
$SCP gild3d-app/backend/src/controllers/profileController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/profileController.ts
$SCP gild3d-app/backend/src/controllers/bookingController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/bookingController.ts
$SCP gild3d-app/backend/src/controllers/paymentController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/paymentController.ts
$SCP gild3d-app/backend/src/controllers/authController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/authController.ts
$SCP gild3d-app/backend/src/controllers/adminController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/adminController.ts
$SCP gild3d-app/backend/src/controllers/maintenanceController.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/controllers/maintenanceController.ts
$SCP gild3d-app/backend/src/routes/auth.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/auth.ts
$SCP gild3d-app/backend/src/routes/admin.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/admin.ts
$SCP gild3d-app/backend/src/routes/bookings.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/bookings.ts
$SCP gild3d-app/backend/src/routes/profiles.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/profiles.ts
$SCP gild3d-app/backend/src/routes/maintenance.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/routes/maintenance.ts
$SCP gild3d-app/backend/src/middleware/upload.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/middleware/upload.ts
$SCP gild3d-app/backend/src/middleware/auth.ts \
  $HOST:/home/ubuntu/gild3d-app/backend/src/middleware/auth.ts
echo "  Backend files uploaded"

echo ""
echo "[3/6] Uploading frontend + nginx files..."
$SCP "gild3d-app/frontend/app/profile/[id]/page.tsx" \
  "$HOST:/home/ubuntu/gild3d-app/frontend/app/profile/[id]/page.tsx"
$SCP "gild3d-app/frontend/app/bookings/page.tsx" \
  "$HOST:/home/ubuntu/gild3d-app/frontend/app/bookings/page.tsx"
$SCP "gild3d-app/frontend/app/admin/page.tsx" \
  "$HOST:/home/ubuntu/gild3d-app/frontend/app/admin/page.tsx"
$SCP gild3d-app/frontend/components/Navbar.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/components/Navbar.tsx
$SCP gild3d-app/frontend/components/MaintenanceBanner.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/components/MaintenanceBanner.tsx
$SCP gild3d-app/frontend/app/browse/page.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/app/browse/page.tsx
$SCP gild3d-app/frontend/app/layout.tsx \
  $HOST:/home/ubuntu/gild3d-app/frontend/app/layout.tsx
$SCP gild3d-app/nginx/nginx.conf \
  $HOST:/home/ubuntu/gild3d-app/nginx/nginx.conf
echo "  Frontend + nginx files uploaded"

echo ""
echo "[2b/6] Uploading maintenance scripts..."
$SSH $HOST "mkdir -p /home/ubuntu/gild3d-app/scripts"
$SCP gild3d-app/scripts/utils.sh            $HOST:/home/ubuntu/gild3d-app/scripts/utils.sh
$SCP gild3d-app/scripts/ssl-check.sh        $HOST:/home/ubuntu/gild3d-app/scripts/ssl-check.sh
$SCP gild3d-app/scripts/weekly-update.sh    $HOST:/home/ubuntu/gild3d-app/scripts/weekly-update.sh
$SCP gild3d-app/scripts/clear-maintenance-banner.sh \
  $HOST:/home/ubuntu/gild3d-app/scripts/clear-maintenance-banner.sh
$SCP gild3d-app/scripts/db-backup.sh        $HOST:/home/ubuntu/gild3d-app/scripts/db-backup.sh
$SCP gild3d-app/scripts/health-check.sh     $HOST:/home/ubuntu/gild3d-app/scripts/health-check.sh
$SCP gild3d-app/scripts/disk-monitor.sh     $HOST:/home/ubuntu/gild3d-app/scripts/disk-monitor.sh
$SCP gild3d-app/scripts/log-cleanup.sh      $HOST:/home/ubuntu/gild3d-app/scripts/log-cleanup.sh
$SCP gild3d-app/scripts/install-crons.sh    $HOST:/home/ubuntu/gild3d-app/scripts/install-crons.sh
echo "  Maintenance scripts uploaded"

echo ""
echo "[2c/6] Activating cron jobs on server..."
$SSH $HOST "sudo bash /home/ubuntu/gild3d-app/scripts/install-crons.sh"
echo "  Cron jobs installed/updated"

echo ""
echo "[4/6] Rebuilding backend (installs new packages: helmet, express-rate-limit)..."
$SSH $HOST "cd /home/ubuntu/gild3d-app && docker compose build backend 2>&1 | tail -5 && docker compose up -d --force-recreate backend"
echo "  Backend rebuilt and restarted"

echo ""
echo "[5/6] Rebuilding frontend (takes ~3 min)..."
$SSH $HOST "cd /home/ubuntu/gild3d-app && docker compose build frontend 2>&1 | tail -5 && docker compose up -d frontend"
echo "  Frontend rebuilt and restarted"

echo ""
echo "[5b/6] Reloading Nginx with new security config..."
$SSH $HOST "docker exec gild3d-nginx nginx -t && docker exec gild3d-nginx nginx -s reload"
echo "  Nginx reloaded"

echo ""
echo "[6/6] Verifying (waiting 25s for startup)..."
sleep 25
$SSH $HOST "
echo '--- Container status ---'
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo ''
echo '--- API health (direct backend port 4000) ---'
curl -s http://localhost:4000/api/health
echo ''
echo '--- Security headers (HTTPS via Nginx) ---'
curl -sk -I https://localhost/api/health | grep -iE 'x-frame|x-content|strict-transport|referrer|content-security'
echo ''
echo '--- Profiles endpoint (expect 200) ---'
curl -sk -o /dev/null -w 'GET /api/profiles -> HTTP %{http_code}\n' https://localhost/api/profiles
echo ''
echo '--- Auth brute-force limiter (6 rapid login attempts, expect 429 on last) ---'
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w \"Login attempt \$i -> HTTP %{http_code}\n\" -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"wrong\"}' http://localhost:4000/api/auth/login; done
echo ''
echo '--- Webhook no-signature (expect 401) ---'
curl -s -o /dev/null -w 'POST /api/bookings/webhook/nowpayments (no sig) -> HTTP %{http_code}\n' -X POST -H 'Content-Type: application/json' -d '{\"payment_status\":\"finished\"}' http://localhost:4000/api/bookings/webhook/nowpayments
"

echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "  Changes deployed:"
echo "  - .env synced (NOWPAYMENTS_API_KEY + NOWPAYMENTS_IPN_SECRET)"
echo "  - Booking payment: NOWPayments invoice API (BTC/LTC/ETH/USDC/DASH)"
echo "  - Booking webhook: /api/bookings/webhook/nowpayments"
echo "  - IPN signature verification with NOWPAYMENTS_IPN_SECRET"
echo "  - Profile fixes: req.userId, privateMedia, Verified badge"
echo "  - Bookings page: Pay Now redirects to NOWPayments hosted checkout"
echo "  - Admin: Companion CRUD — Add, Edit (with age), Delete with confirmation"
echo "  - Navbar: brand animation (Gilded ↔ Gild3d), auth fix on route change"
echo "  - Admin VIP toggle: one-click VIP button in Companions table (PATCH /admin/companions/:id/vip)"
echo "  - VIP companion gating: isVip flag + PLATINUM membership required"
echo "  - Maintenance banner: polls /api/maintenance/status every 60s"
echo "  - Maintenance API: GET/POST /api/maintenance/status + POST /alert"
echo "  - Cron scripts: ssl-check, weekly-update, db-backup, health-check,"
echo "                  disk-monitor, log-cleanup (install with install-crons.sh)"
echo ""
echo "  POST-DEPLOY (first time only):"
echo "  1. Ensure .env contains MAINTENANCE_SECRET (already set to a generated value)"
echo "  2. Ensure .env contains ADMIN_EMAIL (set to wordpress.myblognow.uk@gmail.com)"
echo "  NOTE: Cron jobs are activated automatically during every deploy."
echo "========================================"
