#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST}"
: "${DEPLOY_USER:?Set DEPLOY_USER}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/meetscheduling}"
DEPLOY_REF="${DEPLOY_REF:-main}"

ssh -p "$DEPLOY_PORT" "$DEPLOY_USER@$DEPLOY_HOST" \
  "set -euo pipefail; \
  cd '$DEPLOY_PATH'; \
  git fetch --all --prune; \
  git pull --ff-only origin '$DEPLOY_REF'; \
  npm ci --omit=dev; \
  npm run build --if-present; \
  if pm2 describe meetscheduling >/dev/null 2>&1; then \
    pm2 reload meetscheduling --update-env; \
  elif [ -f ecosystem.config.cjs ]; then \
    pm2 start ecosystem.config.cjs --env production; \
  else \
    pm2 start src/server.js --name meetscheduling --time; \
  fi; \
  pm2 save"
