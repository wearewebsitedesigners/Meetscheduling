#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-http://localhost:8080}"
TEST_TZ="${TEST_TZ:-Asia/Kolkata}"
TEST_EMAIL="${TEST_EMAIL:-smoke-$(date +%s)@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Passw0rd!234}"
RUN_ID="${RUN_ID:-$(date +%s)}"

TMP_DIR="/tmp/meetscheduling-smoke"
mkdir -p "${TMP_DIR}"

echo "== Meetscheduling phase smoke test =="
echo "APP_URL: ${APP_URL}"

echo
echo "1) Health check"
curl -fsS "${APP_URL}/api/health" >"${TMP_DIR}/health.json"
cat "${TMP_DIR}/health.json"

echo
echo "2) Signup"
SIGNUP_JSON="$(curl -fsS -X POST "${APP_URL}/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\",\"timezone\":\"${TEST_TZ}\"}")"
echo "${SIGNUP_JSON}" >"${TMP_DIR}/signup.json"
cat "${TMP_DIR}/signup.json"

TOKEN="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write((x&&x.token)||"")' "${TMP_DIR}/signup.json")"
if [[ -z "${TOKEN}" ]]; then
  echo "Token missing from /api/auth/signup"
  exit 1
fi

USERNAME="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.user&&x.user.username)||""))' "${TMP_DIR}/signup.json")"
if [[ -z "${USERNAME}" ]]; then
  echo "Username missing from /api/auth/signup"
  exit 1
fi

echo
echo "3) Auth me"
curl -fsS "${APP_URL}/api/auth/me" -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/me.json"
cat "${TMP_DIR}/me.json"

echo
echo "4) Workspace role"
curl -fsS "${APP_URL}/api/workspace/roles/me" -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/workspace-role.json"
cat "${TMP_DIR}/workspace-role.json"

echo
echo "5) Dashboard overview"
curl -fsS "${APP_URL}/api/dashboard/overview" -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/overview.json"
cat "${TMP_DIR}/overview.json"

echo
echo "6) Dashboard bookings"
curl -fsS "${APP_URL}/api/dashboard/bookings?status=all" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/bookings.json"
cat "${TMP_DIR}/bookings.json"

echo
echo "6b) Event type + public booking + contact sync"
EVENT_TYPE_JSON="$(curl -fsS -X POST "${APP_URL}/api/event-types" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke 30 min\",\"description\":\"Smoke event type\",\"durationMinutes\":30,\"slug\":\"smoke-30min-${RUN_ID}\",\"locationType\":\"google_meet\",\"bufferBeforeMin\":0,\"bufferAfterMin\":0,\"maxBookingsPerDay\":5,\"noticeMinimumHours\":0,\"color\":\"#2563eb\"}")"
echo "${EVENT_TYPE_JSON}" >"${TMP_DIR}/event-type.json"
cat "${TMP_DIR}/event-type.json"

EVENT_SLUG="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.eventType&&x.eventType.slug)||""))' "${TMP_DIR}/event-type.json")"
if [[ -z "${EVENT_SLUG}" ]]; then
  echo "Event slug missing"
  exit 1
fi

curl -fsS "${APP_URL}/api/public/${USERNAME}/${EVENT_SLUG}?timezone=${TEST_TZ}" >"${TMP_DIR}/public-event.json"
cat "${TMP_DIR}/public-event.json"

SLOT_TOKEN=""
BOOKING_DATE=""
for DATE in $(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));for (const item of ((x&&x.dates)||[]).slice(0,14)) console.log(item);' "${TMP_DIR}/public-event.json"); do
  SLOT_JSON="$(curl -fsS "${APP_URL}/api/public/${USERNAME}/${EVENT_SLUG}/slots?date=${DATE}&timezone=${TEST_TZ}")"
  echo "${SLOT_JSON}" >"${TMP_DIR}/slots-${DATE}.json"
  SLOT_TOKEN="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write((((x&&x.slots)||[])[0]?.token||""))' "${TMP_DIR}/slots-${DATE}.json")"
  if [[ -n "${SLOT_TOKEN}" ]]; then
    BOOKING_DATE="${DATE}"
    break
  fi
done

if [[ -z "${SLOT_TOKEN}" || -z "${BOOKING_DATE}" ]]; then
  echo "No public booking slot available for smoke event"
  exit 1
fi

BOOKING_EMAIL="smoke.booking.${RUN_ID}@example.com"
BOOKING_JSON="$(curl -fsS -X POST "${APP_URL}/api/public/${USERNAME}/${EVENT_SLUG}/bookings" \
  -H "Content-Type: application/json" \
  -d "{\"visitorDate\":\"${BOOKING_DATE}\",\"slotToken\":\"${SLOT_TOKEN}\",\"name\":\"Smoke Booker\",\"email\":\"${BOOKING_EMAIL}\",\"phone\":\"+1555000${RUN_ID}\",\"company\":\"Smoke Booking Co\",\"notes\":\"Smoke booking path\",\"source\":\"booking_link\",\"timezone\":\"${TEST_TZ}\"}")"
echo "${BOOKING_JSON}" >"${TMP_DIR}/public-booking.json"
cat "${TMP_DIR}/public-booking.json"

curl -fsS "${APP_URL}/api/contacts?search=${BOOKING_EMAIL}" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/contacts-booking-sync.json"
cat "${TMP_DIR}/contacts-booking-sync.json"

BOOKING_CONTACT_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const list=(x&&x.contacts)||[];const found=list.find((item)=>String(item.email||"").toLowerCase()===String(process.argv[2]).toLowerCase());process.stdout.write((found&&found.id)||"");' "${TMP_DIR}/contacts-booking-sync.json" "${BOOKING_EMAIL}")"
if [[ -z "${BOOKING_CONTACT_ID}" ]]; then
  echo "Booked contact was not synced into contacts"
  exit 1
fi

echo
echo "7) Integrations"
curl -fsS "${APP_URL}/api/integrations" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/integrations.json"
cat "${TMP_DIR}/integrations.json"

echo
echo "8) Contacts CRUD"
CONTACT_JSON="$(curl -fsS -X POST "${APP_URL}/api/contacts" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Contact\",\"email\":\"smoke.contact.${RUN_ID}@example.com\",\"company\":\"Smoke Inc\",\"type\":\"Lead\"}")"
echo "${CONTACT_JSON}" >"${TMP_DIR}/contact-create.json"
cat "${TMP_DIR}/contact-create.json"

CONTACT_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.contact&&x.contact.id)||""))' "${TMP_DIR}/contact-create.json")"
if [[ -z "${CONTACT_ID}" ]]; then
  echo "Contact id missing"
  exit 1
fi

curl -fsS -X PATCH "${APP_URL}/api/contacts/${CONTACT_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"Customer","tags":["VIP"]}' >"${TMP_DIR}/contact-update.json"
cat "${TMP_DIR}/contact-update.json"

curl -fsS "${APP_URL}/api/contacts?filter=all" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/contacts-list.json"
cat "${TMP_DIR}/contacts-list.json"

echo
echo "9) Workflows"
curl -fsS "${APP_URL}/api/workflows/templates" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/workflow-templates.json"
cat "${TMP_DIR}/workflow-templates.json"

curl -fsS "${APP_URL}/api/workflows?filter=all" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/workflows-list.json"
cat "${TMP_DIR}/workflows-list.json"

echo
echo "10) Routing forms + leads"
ROUTING_FORM="$(curl -fsS -X POST "${APP_URL}/api/routing/forms" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke routing form","destination":"Sales Team","priority":"normal","active":true}')"
echo "${ROUTING_FORM}" >"${TMP_DIR}/routing-form.json"
cat "${TMP_DIR}/routing-form.json"

FORM_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.form&&x.form.id)||""))' "${TMP_DIR}/routing-form.json")"
if [[ -z "${FORM_ID}" ]]; then
  echo "Routing form id missing"
  exit 1
fi

curl -fsS -X POST "${APP_URL}/api/routing/leads" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"formId\":\"${FORM_ID}\",\"name\":\"Smoke Lead\",\"email\":\"smoke.lead.${RUN_ID}@example.com\",\"status\":\"New\"}" \
  >"${TMP_DIR}/routing-lead.json"
cat "${TMP_DIR}/routing-lead.json"

curl -fsS "${APP_URL}/api/routing" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/routing-list.json"
cat "${TMP_DIR}/routing-list.json"

echo
echo "11) Chat conversation + message"
CHAT_CONVO="$(curl -fsS -X POST "${APP_URL}/api/chat/conversations" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Smoke conversation","channel":"chat"}')"
echo "${CHAT_CONVO}" >"${TMP_DIR}/chat-conversation.json"
cat "${TMP_DIR}/chat-conversation.json"

CONVERSATION_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.conversation&&x.conversation.id)||""))' "${TMP_DIR}/chat-conversation.json")"
if [[ -z "${CONVERSATION_ID}" ]]; then
  echo "Conversation id missing"
  exit 1
fi

curl -fsS -X POST "${APP_URL}/api/chat/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"body":"Smoke message"}' >"${TMP_DIR}/chat-message.json"
cat "${TMP_DIR}/chat-message.json"

echo
echo "12) Inbox threads/campaigns read"
curl -fsS "${APP_URL}/api/inbox/threads?limit=20" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/inbox-threads.json"
cat "${TMP_DIR}/inbox-threads.json"

curl -fsS "${APP_URL}/api/inbox/campaigns?limit=20" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/inbox-campaigns.json"
cat "${TMP_DIR}/inbox-campaigns.json"

echo
echo "13) File upload + gallery item"
DATA_URL='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3xJ4QAAAAASUVORK5CYII='
FILE_JSON="$(curl -fsS -X POST "${APP_URL}/api/files/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"fileName\":\"smoke.png\",\"dataUrl\":\"${DATA_URL}\"}")"
echo "${FILE_JSON}" >"${TMP_DIR}/file.json"
cat "${TMP_DIR}/file.json"

FILE_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.file&&x.file.id)||""))' "${TMP_DIR}/file.json")"
if [[ -z "${FILE_ID}" ]]; then
  echo "File id missing"
  exit 1
fi

curl -fsS -X POST "${APP_URL}/api/gallery/items" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke image\",\"fileAssetId\":\"${FILE_ID}\"}" >"${TMP_DIR}/gallery-item.json"
cat "${TMP_DIR}/gallery-item.json"

echo
echo "14) Files/Gallery list"
curl -fsS "${APP_URL}/api/files" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/files-list.json"
cat "${TMP_DIR}/files-list.json"

curl -fsS "${APP_URL}/api/gallery/items?limit=50" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/gallery-list.json"
cat "${TMP_DIR}/gallery-list.json"

echo
echo "15) Posts"
POST_JSON="$(curl -fsS -X POST "${APP_URL}/api/posts" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Post","content":"Smoke content","tags":["Smoke","Test"]}')"
echo "${POST_JSON}" >"${TMP_DIR}/post.json"
cat "${TMP_DIR}/post.json"

POST_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.post&&x.post.id)||""))' "${TMP_DIR}/post.json")"
if [[ -z "${POST_ID}" ]]; then
  echo "Post id missing"
  exit 1
fi

curl -fsS "${APP_URL}/api/posts/${POST_ID}" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/post-detail.json"
cat "${TMP_DIR}/post-detail.json"

echo
echo "16) Invoice template + invoice flow"
TEMPLATE_JSON="$(curl -fsS -X POST "${APP_URL}/api/invoice-templates" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Template","defaultTermsDays":7,"defaultTaxPercent":0}')"
echo "${TEMPLATE_JSON}" >"${TMP_DIR}/invoice-template.json"
cat "${TMP_DIR}/invoice-template.json"

INVOICE_JSON="$(curl -fsS -X POST "${APP_URL}/api/invoices" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Smoke Customer","customerEmail":"customer@example.com","items":[{"description":"Setup","quantity":1,"unitPrice":99,"taxPercent":0}]}')"
echo "${INVOICE_JSON}" >"${TMP_DIR}/invoice.json"
cat "${TMP_DIR}/invoice.json"

INVOICE_ID="$(node -e 'const fs=require("fs");const x=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(((x&&x.invoice&&x.invoice.id)||""))' "${TMP_DIR}/invoice.json")"
if [[ -z "${INVOICE_ID}" ]]; then
  echo "Invoice id missing"
  exit 1
fi

curl -fsS -X POST "${APP_URL}/api/invoices/${INVOICE_ID}/issue" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' >"${TMP_DIR}/invoice-issued.json"
cat "${TMP_DIR}/invoice-issued.json"

curl -fsS -X POST "${APP_URL}/api/invoices/${INVOICE_ID}/mark-paid" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' >"${TMP_DIR}/invoice-paid.json"
cat "${TMP_DIR}/invoice-paid.json"

echo
echo "17) Landing page + leads + workspace members/role"
curl -fsS "${APP_URL}/api/landing-page" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/landing-page.json"
cat "${TMP_DIR}/landing-page.json"

curl -fsS "${APP_URL}/api/landing-page/leads?limit=20" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/landing-leads.json"
cat "${TMP_DIR}/landing-leads.json"

curl -fsS "${APP_URL}/api/workspace/members" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/workspace-members.json"
cat "${TMP_DIR}/workspace-members.json"

curl -fsS "${APP_URL}/api/workspace/roles/me" \
  -H "Authorization: Bearer ${TOKEN}" >"${TMP_DIR}/workspace-role-2.json"
cat "${TMP_DIR}/workspace-role-2.json"

echo
echo "18) Frontend routes"
for route in \
  "/" \
  "/dashboard" \
  "/dashboard/calendar" \
  "/dashboard/projects-board" \
  "/dashboard/contact" \
  "/dashboard/email" \
  "/dashboard/chats" \
  "/dashboard/tasklist" \
  "/dashboard/pipeline" \
  "/dashboard/integrations" \
  "/dashboard/file-manager-list" \
  "/dashboard/gallery" \
  "/dashboard/posts" \
  "/dashboard/invoice-list" \
  "/dashboard/account" \
  "/login" \
  "/signup" \
  "/forgot-password"; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}${route}")"
  echo "${route} -> ${code}"
  if [[ "${code}" != "200" ]]; then
    echo "Route check failed for ${route}"
    exit 1
  fi
done

echo
echo "Smoke test passed."
