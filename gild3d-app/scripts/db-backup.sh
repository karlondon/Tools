#!/bin/bash
# =============================================================================
# Gild3d Daily Database Backup
# Cron: 0 2 * * *   (daily at 02:00)
# Keeps 14 days of backups; alerts on failure.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

BACKUP_DIR="/home/ubuntu/gild3d-backups"
RETAIN_DAYS=14
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/gild3d_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

log "=== Daily database backup started ==="

# Read DB credentials from .env
DB_NAME=$(env_val DATABASE_URL | sed 's|.*\/||;s|?.*||')
DB_USER=$(env_val DATABASE_URL | sed 's|.*://||;s|:.*||')
DB_PASS=$(env_val DATABASE_URL | sed 's|.*://[^:]*:||;s|@.*||')
DB_HOST="postgres"  # Docker service name

# ---------------------------------------------------------------------------
# Dump via postgres container (avoids exposing DB port to host)
# ---------------------------------------------------------------------------
log "Dumping database to $BACKUP_FILE..."

if ! docker exec -e PGPASSWORD="$DB_PASS" gild3d-postgres \
     pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_FILE"; then
  log_err "pg_dump failed"
  send_alert "DB Backup FAILED" \
    "Daily database backup failed at $(date '+%Y-%m-%d %H:%M UTC').

No backup was written to $BACKUP_FILE.

Manual action required:
  ssh ubuntu@<server-ip>
  docker exec -e PGPASSWORD=<pass> gild3d-postgres pg_dump -U <user> gild3d | gzip > /home/ubuntu/gild3d-backups/manual_backup.sql.gz

Check $LOG_DIR/maintenance.log for details."
  exit 1
fi

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup complete: $BACKUP_FILE ($SIZE)"

# ---------------------------------------------------------------------------
# Prune backups older than RETAIN_DAYS
# ---------------------------------------------------------------------------
DELETED=$(find "$BACKUP_DIR" -name "gild3d_*.sql.gz" -mtime "+${RETAIN_DAYS}" -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "Pruned $DELETED backup(s) older than ${RETAIN_DAYS} days"

TOTAL=$(find "$BACKUP_DIR" -name "gild3d_*.sql.gz" | wc -l)
log "$TOTAL backup(s) retained"

log "=== Database backup complete ==="
