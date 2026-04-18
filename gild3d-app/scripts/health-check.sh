#!/bin/bash
# =============================================================================
# Gild3d Container Health Monitor & Auto-Recovery
# Cron: */5 * * * *   (every 5 minutes)
# Restarts dead containers and alerts if recovery fails.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

ALERT_FLAG="$FLAG_DIR/health_alert_sent"

log "=== Health check started ==="

DEAD=$(containers_healthy)

if [ -z "$DEAD" ]; then
  log "All containers healthy"
  # Clear any previous alert flag so future incidents send fresh alerts
  rm -f "$ALERT_FLAG"
  log "=== Health check complete ==="
  exit 0
fi

log_err "Unhealthy containers: $DEAD"

# ---------------------------------------------------------------------------
# Attempt recovery — bring up any stopped containers
# ---------------------------------------------------------------------------
log "Attempting recovery: docker compose up -d"
cd "$APP_DIR"
docker compose up -d >> "$LOG_DIR/maintenance.log" 2>&1 || true
sleep 20

STILL_DEAD=$(containers_healthy)

if [ -z "$STILL_DEAD" ]; then
  log "Recovery succeeded — all containers running"
  # Clear alert flag on recovery so next incident notifies again
  rm -f "$ALERT_FLAG"
  # Clear any error banner that may have been set
  banner_off 2>/dev/null || true
  log "=== Health check complete (recovered) ==="
  exit 0
fi

log_err "Recovery failed — still down: $STILL_DEAD"

# ---------------------------------------------------------------------------
# Alert (rate-limit: one alert per 30-minute window)
# ---------------------------------------------------------------------------
if [ -f "$ALERT_FLAG" ]; then
  LAST=$(cat "$ALERT_FLAG")
  NOW=$(date +%s)
  DIFF=$(( NOW - LAST ))
  if [ "$DIFF" -lt 1800 ]; then
    log "Alert suppressed (sent ${DIFF}s ago)"
    log "=== Health check complete (alert suppressed) ==="
    exit 1
  fi
fi

date +%s > "$ALERT_FLAG"

banner_on \
  "⚠ Service disruption detected. Our team has been alerted and is working to restore full service." \
  "error"

send_alert "CRITICAL: Containers Down — Auto-Recovery Failed" \
  "The following containers are NOT running and could not be auto-recovered:
  $STILL_DEAD

Detected at: $(date '+%Y-%m-%d %H:%M UTC')

Immediate action required:
  ssh ubuntu@<server-ip>
  cd /home/ubuntu/gild3d-app
  docker compose ps
  docker compose up -d
  docker compose logs --tail=50

Health checks will continue every 5 minutes.
The maintenance banner will persist until containers recover."

log "=== Health check complete (alert sent) ==="
exit 1
