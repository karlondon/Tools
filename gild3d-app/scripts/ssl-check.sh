#!/bin/bash
# =============================================================================
# Gild3d SSL Certificate Check & Renewal
# Cron: 0 23 * * *   (daily at 23:00)
# Renews certificate when <= 5 days from expiry.
# =============================================================================
set -euo pipefail
source "$(dirname "$0")/utils.sh"

DAYS_THRESHOLD=5

log "=== SSL certificate check started ==="

# ---------------------------------------------------------------------------
# Read cert expiry via nginx container (has access to the letsencrypt volume)
# ---------------------------------------------------------------------------
EXPIRY_RAW=$(docker exec gild3d-nginx openssl x509 -enddate -noout \
  -in /etc/letsencrypt/live/gild3d.com/fullchain.pem 2>/dev/null | cut -d= -f2)

if [ -z "$EXPIRY_RAW" ]; then
  log_err "Could not read SSL certificate — file missing or unreadable"
  banner_on "⚠ SSL certificate check failed. Admins have been notified." "error"
  send_alert "SSL Certificate Unreadable" \
    "Could not read /etc/letsencrypt/live/gild3d.com/fullchain.pem via gild3d-nginx container.
Manual check required.

Commands to investigate:
  docker exec gild3d-nginx ls -la /etc/letsencrypt/live/gild3d.com/
  docker exec gild3d-certbot certbot certificates"
  exit 1
fi

EXPIRY_EPOCH=$(date -d "$EXPIRY_RAW" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
EXPIRY_DATE=$(date -d "$EXPIRY_RAW" '+%d %B %Y at %H:%M UTC')

log "Certificate expires: $EXPIRY_DATE ($DAYS_LEFT days remaining)"

# ---------------------------------------------------------------------------
# Only act if within the 5-day threshold
# ---------------------------------------------------------------------------
if [ "$DAYS_LEFT" -gt "$DAYS_THRESHOLD" ]; then
  log "Certificate is healthy — no action needed"
  log "=== SSL check complete ==="
  exit 0
fi

# ---------------------------------------------------------------------------
# Renewal required
# ---------------------------------------------------------------------------
log "Certificate expires in $DAYS_LEFT days — initiating renewal"

ENDS_AT=$(date -u -d "+30 minutes" '+%Y-%m-%dT%H:%M:%SZ')
banner_on \
  "🔒 SSL certificate renewal in progress. A brief interruption of up to 60 seconds is possible. We apologise for any inconvenience." \
  "warning" \
  "$ENDS_AT"

# Force renewal via certbot container
log "Running certbot renew..."
if docker exec gild3d-certbot certbot renew --non-interactive --force-renewal --quiet; then
  log "Certbot renewal succeeded"

  # Reload nginx to pick up the new certificate
  log "Reloading Nginx..."
  if docker exec gild3d-nginx nginx -t 2>&1 | tee -a "$LOG_DIR/maintenance.log" \
     && docker exec gild3d-nginx nginx -s reload; then
    log "Nginx reloaded successfully — new certificate is live"

    NEW_EXPIRY=$(docker exec gild3d-nginx openssl x509 -enddate -noout \
      -in /etc/letsencrypt/live/gild3d.com/fullchain.pem | cut -d= -f2)
    NEW_DATE=$(date -d "$NEW_EXPIRY" '+%d %B %Y' 2>/dev/null || echo "$NEW_EXPIRY")

    banner_off
    send_alert "SSL Certificate Renewed Successfully" \
      "The SSL certificate for gild3d.com was renewed at $(date '+%Y-%m-%d %H:%M UTC').
New expiry: $NEW_DATE
Action taken: certbot renew → nginx reload
No further action required."
  else
    log_err "Nginx reload failed after certificate renewal"
    banner_on \
      "⚠ Site maintenance: SSL renewal completed but a service restart is needed. Admins have been notified and are resolving this urgently." \
      "error"
    send_alert "SSL Renewal: Nginx Reload Failed" \
      "Certbot renewed the certificate but nginx reload failed.
Manual action required on gild3d.com.

To fix:
  ssh ubuntu@<server-ip>
  docker exec gild3d-nginx nginx -t
  docker exec gild3d-nginx nginx -s reload

If reload fails: docker compose restart nginx"
  fi
else
  log_err "Certbot renewal failed (exit code $?)"
  banner_on \
    "⚠ SSL certificate renewal encountered an issue. Admins have been notified. We are working to resolve this." \
    "error"
  send_alert "SSL Certificate Renewal FAILED" \
    "Certbot renewal FAILED for gild3d.com.
Certificate expires in $DAYS_LEFT days ($EXPIRY_DATE).
Immediate action required.

To retry manually:
  ssh ubuntu@<server-ip>
  docker exec gild3d-certbot certbot renew --force-renewal
  docker exec gild3d-nginx nginx -s reload

Certbot logs:
  docker logs gild3d-certbot"
  exit 1
fi

log "=== SSL check complete ==="
