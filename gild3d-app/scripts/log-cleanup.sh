#!/bin/bash
# =============================================================================
# Gild3d Log & Docker Cleanup
# Cron: 0 3 * * 0   (Sunday 03:00 — runs after weekly update completes)
# Rotates maintenance logs; prunes Docker build cache and dangling images.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

LOG_RETAIN_DAYS=30
APT_LOG_RETAIN_DAYS=14

log "=== Log cleanup started ==="

# ---------------------------------------------------------------------------
# Rotate maintenance.log if it exceeds 10 MB
# ---------------------------------------------------------------------------
MLOG="$LOG_DIR/maintenance.log"
if [ -f "$MLOG" ]; then
  SIZE=$(du -m "$MLOG" | cut -f1)
  if [ "$SIZE" -ge 10 ]; then
    ARCHIVE="$LOG_DIR/maintenance_$(date '+%Y%m%d').log.gz"
    gzip -c "$MLOG" > "$ARCHIVE"
    truncate -s 0 "$MLOG"
    log "Rotated maintenance.log (was ${SIZE}MB) → $ARCHIVE"
  fi
fi

# Prune archived maintenance logs older than LOG_RETAIN_DAYS
find "$LOG_DIR" -name "maintenance_*.log.gz" -mtime "+${LOG_RETAIN_DAYS}" -delete
log "Pruned maintenance log archives older than ${LOG_RETAIN_DAYS} days"

# Prune apt-update.log if large
APT_LOG="$LOG_DIR/apt-update.log"
if [ -f "$APT_LOG" ] && [ "$(du -m "$APT_LOG" | cut -f1)" -ge 5 ]; then
  gzip -c "$APT_LOG" > "$LOG_DIR/apt-update_$(date '+%Y%m%d').log.gz"
  truncate -s 0 "$APT_LOG"
  find "$LOG_DIR" -name "apt-update_*.log.gz" -mtime "+${APT_LOG_RETAIN_DAYS}" -delete
  log "Rotated apt-update.log"
fi

# ---------------------------------------------------------------------------
# Docker cleanup — dangling images, stopped containers, unused build cache
# ---------------------------------------------------------------------------
log "Pruning Docker dangling images..."
docker image prune -f >> "$LOG_DIR/maintenance.log" 2>&1 || true

log "Pruning Docker build cache (keep last 1 GB)..."
docker builder prune --keep-storage 1GB -f >> "$LOG_DIR/maintenance.log" 2>&1 || true

# Prune stopped containers (should be none in production but catches leftover debug runs)
docker container prune -f >> "$LOG_DIR/maintenance.log" 2>&1 || true

# ---------------------------------------------------------------------------
# Docker container log truncation (JSON logs can grow unbounded)
# ---------------------------------------------------------------------------
log "Truncating Docker container JSON logs > 50 MB..."
for LOG_FILE in /var/lib/docker/containers/*/*-json.log; do
  [ -f "$LOG_FILE" ] || continue
  FILE_SIZE=$(du -m "$LOG_FILE" | cut -f1)
  if [ "$FILE_SIZE" -ge 50 ]; then
    truncate -s 0 "$LOG_FILE"
    log "Truncated container log: $LOG_FILE (was ${FILE_SIZE}MB)"
  fi
done

# ---------------------------------------------------------------------------
# Flag file cleanup — remove stale flags older than 8 days
# ---------------------------------------------------------------------------
find "$FLAG_DIR" -type f -mtime +8 -delete 2>/dev/null || true
log "Stale flag files pruned"

log "=== Log cleanup complete ==="
