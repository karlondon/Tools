#!/bin/bash
# =============================================================================
# Gild3d Clear Maintenance Banner
# Cron: 0 1 * * 1   (Monday 01:00) — clears the weekly maintenance banner
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

UPDATE_FLAG="$FLAG_DIR/weekly_update_status"

log "=== Clear maintenance banner started ==="

# Only clear if the weekly update reported success
if [ -f "$UPDATE_FLAG" ]; then
  STATUS=$(cat "$UPDATE_FLAG")
  if [ "$STATUS" = "error" ]; then
    log "Weekly update flagged an error — leaving banner active for manual review"
    log "=== Banner clear skipped (error state) ==="
    exit 0
  fi
fi

banner_off
log "Maintenance banner cleared"

# Remove flag file so next week starts clean
rm -f "$UPDATE_FLAG"

log "=== Banner clear complete ==="
