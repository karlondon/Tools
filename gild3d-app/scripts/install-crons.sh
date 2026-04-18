#!/bin/bash
# =============================================================================
# Gild3d Cron Installer
# Run once on the server to register all maintenance cron jobs for root.
# Usage: sudo bash /home/ubuntu/gild3d-app/scripts/install-crons.sh
# =============================================================================
set -euo pipefail

SCRIPTS_DIR="/home/ubuntu/gild3d-app/scripts"
LOG_DIR="/home/ubuntu/gild3d-logs"

echo "=== Installing Gild3d maintenance crons ==="

# Make all scripts executable
chmod +x "$SCRIPTS_DIR"/*.sh
echo "✓ Scripts marked executable"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# ---------------------------------------------------------------------------
# Build the crontab block (idempotent — safe to re-run)
# ---------------------------------------------------------------------------
MARKER_START="# --- gild3d-maintenance-start ---"
MARKER_END="# --- gild3d-maintenance-end ---"

CRON_BLOCK="$MARKER_START
# SSL certificate check & renewal       (daily 23:00)
0 23 * * * $SCRIPTS_DIR/ssl-check.sh >> $LOG_DIR/ssl-check.log 2>&1

# Weekly server update — show banner     (Sunday 22:45)
45 22 * * 0 $SCRIPTS_DIR/weekly-update.sh >> $LOG_DIR/weekly-update.log 2>&1

# Weekly server update — clear banner    (Monday 01:00)
0 1 * * 1 $SCRIPTS_DIR/clear-maintenance-banner.sh >> $LOG_DIR/weekly-update.log 2>&1

# Daily database backup                  (daily 02:00)
0 2 * * * $SCRIPTS_DIR/db-backup.sh >> $LOG_DIR/db-backup.log 2>&1

# Container health check & auto-recovery (every 5 minutes)
*/5 * * * * $SCRIPTS_DIR/health-check.sh >> $LOG_DIR/health-check.log 2>&1

# Disk space monitor                     (every 6 hours)
0 */6 * * * $SCRIPTS_DIR/disk-monitor.sh >> $LOG_DIR/disk-monitor.log 2>&1

# Log rotation & Docker cleanup          (Sunday 03:00)
0 3 * * 0 $SCRIPTS_DIR/log-cleanup.sh >> $LOG_DIR/log-cleanup.log 2>&1
$MARKER_END"

# Remove existing block (idempotent) then append fresh block
TMPFILE=$(mktemp)
crontab -l 2>/dev/null | sed "/^$MARKER_START$/,/^$MARKER_END$/d" > "$TMPFILE" || true
printf '\n%s\n' "$CRON_BLOCK" >> "$TMPFILE"
crontab "$TMPFILE"
rm -f "$TMPFILE"

echo "✓ Cron jobs installed"
echo ""
echo "Active gild3d cron schedule:"
crontab -l | sed -n "/^$MARKER_START$/,/^$MARKER_END$/p"
echo ""
echo "=== Installation complete ==="
echo ""
echo "Verify with:  crontab -l"
echo "Test a script: sudo bash $SCRIPTS_DIR/health-check.sh"
