#!/bin/bash
# =============================================================================
# Gild3d Maintenance Utilities — sourced by all maintenance scripts
# =============================================================================

APP_DIR="/home/ubuntu/gild3d-app"
LOG_DIR="/home/ubuntu/gild3d-logs"
FLAG_DIR="/home/ubuntu/gild3d-flags"

mkdir -p "$LOG_DIR" "$FLAG_DIR"

# ---------------------------------------------------------------------------
# Read a value from the .env file (handles quoted and unquoted values)
# Usage: env_val KEY
# ---------------------------------------------------------------------------
env_val() {
  local key="$1"
  grep -m1 "^${key}=" "$APP_DIR/.env" 2>/dev/null \
    | cut -d'=' -f2- \
    | sed "s/^['\"]//;s/['\"]$//" \
    | tr -d '\r'
}

MAINTENANCE_SECRET=$(env_val MAINTENANCE_SECRET)
ADMIN_EMAIL=$(env_val ADMIN_EMAIL)
ALERT_EMAIL="wordpress.myblognow.uk@gmail.com"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "$LOG_DIR/maintenance.log"
}

log_err() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
  echo "$msg" >&2
  echo "$msg" >> "$LOG_DIR/maintenance.log"
}

# ---------------------------------------------------------------------------
# Call backend API through the Docker internal network (nginx → backend)
# Usage: backend_api METHOD /path '{"json":"body"}'
# Returns: HTTP response body
# ---------------------------------------------------------------------------
backend_api() {
  local method="$1" uri="$2" data="${3:-}"
  local cmd=(docker exec gild3d-nginx curl -s -X "$method"
    "http://backend:4000${uri}"
    -H "Content-Type: application/json"
    -H "X-Maintenance-Key: ${MAINTENANCE_SECRET}")
  [ -n "$data" ] && cmd+=(-d "$data")
  "${cmd[@]}"
}

# ---------------------------------------------------------------------------
# Maintenance banner controls
# Usage:
#   banner_on "Message text" [info|warning|error] ["2026-04-19T01:00:00Z"]
#   banner_off
# ---------------------------------------------------------------------------
banner_on() {
  local message="$1"
  local type="${2:-warning}"
  local ends_at="${3:-null}"
  local ends_json
  [ "$ends_at" = "null" ] && ends_json="null" || ends_json="\"$ends_at\""
  log "Banner ON [$type]: $message"
  backend_api POST /api/maintenance/status \
    "{\"active\":true,\"message\":\"${message//\"/\\\"}\",\"type\":\"$type\",\"endsAt\":$ends_json}" \
    > /dev/null
}

banner_off() {
  log "Banner OFF"
  backend_api POST /api/maintenance/status \
    '{"active":false,"message":"","type":"info","endsAt":null}' \
    > /dev/null
}

# ---------------------------------------------------------------------------
# Send alert email via the backend nodemailer endpoint
# Usage: send_alert "Subject" "Multi-line message body"
# ---------------------------------------------------------------------------
send_alert() {
  local subject="$1"
  local message="$2"
  log "Alert email: $subject"
  # Escape special chars for JSON
  local safe_msg
  safe_msg=$(printf '%s' "$message" | python3 -c \
    'import sys,json; print(json.dumps(sys.stdin.read()))[1:-1]' 2>/dev/null \
    || echo "$message" | sed 's/\\/\\\\/g;s/"/\\"/g;s/$/\\n/g' | tr -d '\n')
  backend_api POST /api/maintenance/alert \
    "{\"subject\":\"${subject//\"/\\\"}\",\"message\":\"$safe_msg\"}" \
    > /dev/null
}

# ---------------------------------------------------------------------------
# Check whether all core containers are running
# Returns: list of unhealthy container names (empty = all good)
# ---------------------------------------------------------------------------
containers_healthy() {
  local containers=("gild3d-postgres" "gild3d-backend" "gild3d-frontend" "gild3d-nginx")
  local dead=()
  for c in "${containers[@]}"; do
    if ! docker ps --filter "name=^/${c}$" --filter "status=running" -q | grep -q .; then
      dead+=("$c")
    fi
  done
  echo "${dead[*]}"
}

# ---------------------------------------------------------------------------
# Wait for backend to become healthy after a restart
# Usage: wait_for_backend [max_seconds]
# Returns 0 if healthy, 1 if timed out
# ---------------------------------------------------------------------------
wait_for_backend() {
  local max="${1:-120}"
  local elapsed=0
  while [ "$elapsed" -lt "$max" ]; do
    local status
    status=$(docker exec gild3d-nginx curl -s -o /dev/null -w "%{http_code}" \
      http://backend:4000/api/health 2>/dev/null)
    [ "$status" = "200" ] && return 0
    sleep 5; elapsed=$((elapsed + 5))
  done
  return 1
}
