#!/bin/bash
# =============================================================================
# Gild3d Weekly System Update
# Cron schedule:
#   45 22 * * 0   — Sunday 22:45: start banner and wait for 23:00
#   0  1  * * 1   — Monday 01:00: clear banner (via clear-maintenance-banner.sh)
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

UPDATE_FLAG="$FLAG_DIR/weekly_update_status"

log "=== Weekly system update started ==="

# ---------------------------------------------------------------------------
# Step 1 — Show maintenance banner at 22:45 and wait until 23:00
# ---------------------------------------------------------------------------
WINDOW_END=$(date -u -d "today 23:00" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u '+%Y-%m-%dT23:00:00Z')

banner_on \
  "🔧 Scheduled weekly maintenance: 23:00 – 01:00. The platform will remain accessible. You may experience brief interruptions during this window." \
  "warning" \
  "$(date -u -d 'tomorrow 01:00' '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null)"

log "Banner live — sleeping until 23:00 ($(( 3600 - $(date +%M) * 60 - $(date +%S) )) seconds)..."

# Sleep until the top of the next hour (23:00)
NOW_SEC=$(date +%s)
TARGET_SEC=$(date -d "today 23:00" +%s 2>/dev/null || echo $((NOW_SEC + 900)))
SLEEP_SEC=$(( TARGET_SEC - NOW_SEC ))
[ "$SLEEP_SEC" -gt 0 ] && sleep "$SLEEP_SEC"

# ---------------------------------------------------------------------------
# Step 2 — Run system updates at 23:00
# ---------------------------------------------------------------------------
log "Running apt update..."
export DEBIAN_FRONTEND=noninteractive

if ! apt-get update -qq >> "$LOG_DIR/apt-update.log" 2>&1; then
  log_err "apt-get update failed"
  echo "error" > "$UPDATE_FLAG"
  send_alert "Weekly Update: apt-get update Failed" \
    "apt-get update failed during the Sunday maintenance window.
No packages were installed.

Manual action recommended:
  ssh ubuntu@<server-ip>
  sudo apt-get update
  sudo apt-get upgrade -y

Check $LOG_DIR/apt-update.log for details."
  exit 1
fi

# Check if any upgrades are available
UPGRADABLE=$(apt-get --just-print upgrade 2>/dev/null | grep "^Inst " | wc -l)
log "$UPGRADABLE package(s) available for upgrade"

if [ "$UPGRADABLE" -eq 0 ]; then
  log "System is up to date — no packages to install"
  echo "success" > "$UPDATE_FLAG"
  log "=== Weekly update complete (no packages installed) ==="
  exit 0
fi

# Install updates
log "Installing $UPGRADABLE upgrade(s)..."
if ! apt-get upgrade -y -qq \
     -o Dpkg::Options::="--force-confdef" \
     -o Dpkg::Options::="--force-confold" \
     >> "$LOG_DIR/apt-update.log" 2>&1; then
  log_err "apt-get upgrade failed"
  echo "error" > "$UPDATE_FLAG"
  send_alert "Weekly Update: Package Upgrade Failed" \
    "apt-get upgrade failed during the Sunday maintenance window.
Some packages may be in a broken state.

Manual action required:
  ssh ubuntu@<server-ip>
  sudo dpkg --configure -a
  sudo apt-get install -f

Check $LOG_DIR/apt-update.log for details."
  exit 1
fi

log "Packages upgraded successfully"

# Clean up
apt-get autoremove -y -qq >> "$LOG_DIR/apt-update.log" 2>&1 || true
apt-get clean -qq >> "$LOG_DIR/apt-update.log" 2>&1 || true

# ---------------------------------------------------------------------------
# Step 3 — Restart Docker containers to pick up any system-level changes
# ---------------------------------------------------------------------------
log "Restarting Docker containers..."
cd "$APP_DIR"

if ! docker compose restart >> "$LOG_DIR/maintenance.log" 2>&1; then
  log_err "docker compose restart failed"
  echo "error" > "$UPDATE_FLAG"
  send_alert "Weekly Update: Container Restart Failed" \
    "apt-get upgrade succeeded but docker compose restart failed.
The site may be down.

Manual action required:
  ssh ubuntu@<server-ip>
  cd /home/ubuntu/gild3d-app
  docker compose ps
  docker compose up -d"
  exit 1
fi

# ---------------------------------------------------------------------------
# Step 4 — Verify all containers are healthy
# ---------------------------------------------------------------------------
log "Waiting for containers to come healthy..."
sleep 30

DEAD=$(containers_healthy)
if [ -n "$DEAD" ]; then
  log_err "Containers not running after restart: $DEAD"
  echo "error" > "$UPDATE_FLAG"

  # Try once more
  log "Attempting recovery restart for: $DEAD"
  docker compose up -d >> "$LOG_DIR/maintenance.log" 2>&1 || true
  sleep 20
  DEAD=$(containers_healthy)

  if [ -n "$DEAD" ]; then
    banner_on \
      "⚠ Post-maintenance issue detected. Some services may be unavailable. Our team has been alerted and is resolving this." \
      "error"
    send_alert "Weekly Update: Containers Down After Restart" \
      "The following containers are NOT running after the weekly update:
  $DEAD

The site may be partially or fully unavailable.

Immediate action required:
  ssh ubuntu@<server-ip>
  cd /home/ubuntu/gild3d-app
  docker compose ps
  docker compose up -d
  docker compose logs --tail=50

The maintenance banner will remain until manually cleared."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# Step 5 — Verify API health
# ---------------------------------------------------------------------------
if ! wait_for_backend 60; then
  log_err "Backend health check failed after restart"
  echo "error" > "$UPDATE_FLAG"
  banner_on "⚠ Service restart issue detected. Admin team has been notified." "error"
  send_alert "Weekly Update: Backend Health Check Failed" \
    "All containers are running but the backend API is not responding to health checks.

Check:
  docker exec gild3d-nginx curl http://backend:4000/api/health
  docker logs gild3d-backend --tail=50"
  exit 1
fi

log "All containers healthy — update successful"
echo "success" > "$UPDATE_FLAG"

# Banner will be cleared at 01:00 Monday by clear-maintenance-banner.sh cron
log "=== Weekly update complete — banner will clear at 01:00 ==="
