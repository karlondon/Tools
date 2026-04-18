#!/bin/bash
# =============================================================================
# Gild3d Disk Space Monitor
# Cron: 0 */6 * * *   (every 6 hours)
# Alerts at 80%; critical alert at 90%.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

WARN_THRESHOLD=80
CRIT_THRESHOLD=90
ALERT_FLAG="$FLAG_DIR/disk_alert_sent"

log "=== Disk monitor started ==="

# Root filesystem usage (integer, e.g. 73)
USAGE=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
AVAIL=$(df -h / | awk 'NR==2 {print $4}')

log "Disk usage: ${USAGE}% (${AVAIL} available)"

if [ "$USAGE" -lt "$WARN_THRESHOLD" ]; then
  log "Disk usage is healthy"
  rm -f "$ALERT_FLAG"
  log "=== Disk monitor complete ==="
  exit 0
fi

# ---------------------------------------------------------------------------
# Rate-limit: don't re-alert within 12 hours for the same severity
# ---------------------------------------------------------------------------
LEVEL="warning"
[ "$USAGE" -ge "$CRIT_THRESHOLD" ] && LEVEL="critical"

if [ -f "$ALERT_FLAG" ]; then
  LAST_LEVEL=$(head -1 "$ALERT_FLAG")
  LAST_TIME=$(tail -1 "$ALERT_FLAG")
  DIFF=$(( $(date +%s) - LAST_TIME ))
  if [ "$LAST_LEVEL" = "$LEVEL" ] && [ "$DIFF" -lt 43200 ]; then
    log "Alert suppressed (${LEVEL} sent ${DIFF}s ago)"
    log "=== Disk monitor complete (alert suppressed) ==="
    exit 0
  fi
fi

printf '%s\n%s\n' "$LEVEL" "$(date +%s)" > "$ALERT_FLAG"

# ---------------------------------------------------------------------------
# Top disk consumers (help the operator know what to clean)
# ---------------------------------------------------------------------------
TOP_DIRS=$(du -sh /home/ubuntu/* /var/lib/docker 2>/dev/null | sort -rh | head -8 || true)
DOCKER_VOLUMES=$(docker system df 2>/dev/null | head -6 || echo "n/a")

if [ "$LEVEL" = "critical" ]; then
  SUBJECT="CRITICAL: Disk at ${USAGE}% — Immediate Action Required"
  BANNER_MSG="⚠ Server storage critically low. Admin team alerted."
  banner_on "$BANNER_MSG" "error"
else
  SUBJECT="WARNING: Disk at ${USAGE}% — Action Recommended"
fi

send_alert "$SUBJECT" \
  "Disk usage on gild3d.com server has reached ${USAGE}% (${AVAIL} remaining).

Detected at: $(date '+%Y-%m-%d %H:%M UTC')
Severity: ${LEVEL^^}

Top disk consumers:
$TOP_DIRS

Docker storage usage:
$DOCKER_VOLUMES

Recommended actions:
  docker system prune -f              # Remove unused images/containers
  docker volume prune -f              # Remove unused volumes
  find /home/ubuntu/gild3d-logs -mtime +30 -delete   # Old logs
  find /home/ubuntu/gild3d-backups -mtime +14 -delete # Old backups

ssh ubuntu@<server-ip> to investigate."

log "Disk alert sent (${LEVEL}, ${USAGE}%)"
log "=== Disk monitor complete ==="
