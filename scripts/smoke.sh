#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-smoke-test@example.com}"
TEST_TZ="${TEST_TZ:-Asia/Kolkata}"

echo "== Meetscheduling smoke test =="
echo "APP_URL: ${APP_URL}"

echo
echo "1) Health check"
curl -fsS "${APP_URL}/api/health" >/tmp/ms_health.json
cat /tmp/ms_health.json

echo
echo "2) Dev login"
LOGIN_JSON="$(curl -fsS -X POST "${APP_URL}/api/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"timezone\":\"${TEST_TZ}\"}")"
echo "${LOGIN_JSON}" >/tmp/ms_login.json
echo "${LOGIN_JSON}"

TOKEN="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync("/tmp/ms_login.json","utf8"));process.stdout.write((x&&x.token)||"")')"
if [[ -z "${TOKEN}" ]]; then
  echo "Token missing from /api/auth/dev-login"
  exit 1
fi

echo
echo "3) Auth me"
curl -fsS "${APP_URL}/api/auth/me" -H "Authorization: Bearer ${TOKEN}" >/tmp/ms_me.json
cat /tmp/ms_me.json

echo
echo "4) Event types"
curl -fsS "${APP_URL}/api/event-types" -H "Authorization: Bearer ${TOKEN}" >/tmp/ms_event_types.json
cat /tmp/ms_event_types.json

echo
echo "5) Bookings upcoming"
curl -fsS "${APP_URL}/api/dashboard/bookings/upcoming?limit=5&timezone=${TEST_TZ}" \
  -H "Authorization: Bearer ${TOKEN}" >/tmp/ms_upcoming.json
cat /tmp/ms_upcoming.json

echo
echo "6) Frontend routes"
for route in "/" "/dashboard" "/login" "/signup" "/forgot-password"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}${route}")"
  echo "${route} -> ${code}"
  if [[ "${code}" != "200" ]]; then
    echo "Route check failed for ${route}"
    exit 1
  fi
done

echo
echo "Smoke test passed."

