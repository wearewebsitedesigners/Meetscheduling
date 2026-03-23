#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${APP_DIR:-/home/meetscheduling/htdocs/www.meetscheduling.com}"
PM2_APP_NAME="${PM2_APP_NAME:-meetscheduling}"
BRANCH="${BRANCH:-main}"
DEPLOY_ENV="${DEPLOY_ENV:-}"
ECOSYSTEM_FILE="${ECOSYSTEM_FILE:-ecosystem.config.js}"
PORT="${PORT:-8080}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:${PORT}/api/health}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

on_error() {
  local line_no="$1"
  local exit_code="$2"
  printf '[deploy] ERROR: command failed at line %s (exit %s)\n' "$line_no" "$exit_code" >&2
  exit "$exit_code"
}

trap 'on_error "$LINENO" "$?"' ERR

[ "$DEPLOY_ENV" = "production" ] || fail "DEPLOY_ENV must be set to production"
[ -d "$APP_DIR" ] || fail "App directory does not exist: $APP_DIR"

cd "$APP_DIR"
[ -d .git ] || fail "App directory is not a git repository: $APP_DIR"
[ -f "$ECOSYSTEM_FILE" ] || fail "PM2 ecosystem config not found: $ECOSYSTEM_FILE"
command -v npm >/dev/null 2>&1 || fail "npm is not installed"
command -v pm2 >/dev/null 2>&1 || fail "pm2 is not installed"

log "Deploying $PM2_APP_NAME from origin/$BRANCH"
git config --global --add safe.directory "$APP_DIR" >/dev/null 2>&1 || true
git fetch --prune origin
git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1 || fail "Remote branch origin/$BRANCH not found"
git reset --hard "origin/$BRANCH"

log "Installing dependencies"
npm ci --omit=dev

if [ -f .env ]; then
  chmod 600 .env
fi

if [[ "$RUN_MIGRATIONS" =~ ^(1|true|yes)$ ]]; then
  if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.migrate ? 0 : 1)"; then
    log "Running database migrations"
    npm run migrate
  else
    fail "RUN_MIGRATIONS was requested but no migrate script exists"
  fi
fi

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts.build ? 0 : 1)"; then
  log "Running build"
  npm run build
else
  log "No build script found, skipping build"
fi

mkdir -p logs/pm2
chmod 700 logs logs/pm2

if node -e "const pkg=require('./package.json'); process.exit(pkg.scripts && pkg.scripts['check-env'] ? 0 : 1)"; then
  log "Validating production environment"
  npm run check-env -- --production
else
  log "No check-env script found, skipping environment validation"
fi

app_exists="$(
  pm2 jlist 2>/dev/null | node -e '
    const fs = require("fs");
    const name = process.argv[1];
    const input = fs.readFileSync(0, "utf8").trim();
    if (!input) process.exit(1);
    const apps = JSON.parse(input);
    process.exit(apps.some((entry) => entry.name === name) ? 0 : 1);
  ' "$PM2_APP_NAME"
  echo $?
)"

if [ "$app_exists" = "0" ]; then
  log "Restarting PM2 app"
  pm2 restart "$PM2_APP_NAME" --update-env
else
  log "PM2 app not found, starting from ecosystem config"
  pm2 start "$ECOSYSTEM_FILE" --only "$PM2_APP_NAME" --env production
fi

pm2 save

if command -v curl >/dev/null 2>&1; then
  log "Running post-deploy health check"
  healthy=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error "$HEALTHCHECK_URL" >/dev/null; then
      healthy=1
      break
    fi
    sleep 3
  done
  [ "$healthy" -eq 1 ] || fail "Health check failed: $HEALTHCHECK_URL"
else
  log "curl not found, skipping health check"
fi

log "Deploy completed successfully"
