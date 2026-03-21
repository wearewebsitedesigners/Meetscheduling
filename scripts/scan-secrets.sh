#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for secret scanning." >&2
  exit 1
fi

failures=0

report_failure() {
  local label="$1"
  local matches="$2"
  if [[ -n "$matches" ]]; then
    failures=1
    echo "" >&2
    echo "[secret-scan] $label" >&2
    echo "$matches" >&2
  fi
}

scan_tracked_files() {
  local label="$1"
  local pattern="$2"
  local matches
  matches="$(git ls-files -z | xargs -0 rg -n -H --pcre2 --color=never --no-messages "$pattern" 2>/dev/null || true)"
  report_failure "$label" "$matches"
}

tracked_secret_files="$(
  git ls-files \
    | rg -n --color=never '(^|/)\.env($|\.local$|\.development$|\.production$|\.test$|\.[^.]+\.local$)|\.(pem|key|crt|p12|pfx)$' \
    || true
)"
report_failure "Tracked secret-bearing files detected" "$tracked_secret_files"

scan_tracked_files \
  "Private key material detected in tracked files" \
  'BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY'

scan_tracked_files \
  "Known live-token signature detected in tracked files" \
  'AIza[0-9A-Za-z\-_]{20,}|sk_(live|test)_[A-Za-z0-9]+|pk_(live|test)_[A-Za-z0-9]+|ghp_[A-Za-z0-9]+|xox[baprs]-[A-Za-z0-9-]+|SG\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'

scan_tracked_files \
  "Credentialed service URL detected in tracked files" \
  '(postgres(ql)?|mongodb(\+srv)?|mysql|redis)://(?!<)[^:/\s]+:[^@\s]+@'

browser_files=()
while IFS= read -r file; do
  browser_files+=("$file")
done < <(
  git ls-files -- '*.js' '*.jsx' '*.html' '*.ts' '*.tsx' \
    | rg -v --color=never '^(src/|scripts/|check-env\.js$|ecosystem\.config\.js$)'
)

browser_secret_refs=""
if [[ "${#browser_files[@]}" -gt 0 ]]; then
  browser_secret_refs="$(
    rg -n -H --color=never --no-messages \
      'process\.env\.|import\.meta\.env|NEXT_PUBLIC_|REACT_APP_|VITE_|DATABASE_URL|JWT_SECRET|PUBLIC_BOOKING_SIGNING_SECRET|INTEGRATION_TOKEN_SECRET|GOOGLE_CLIENT_SECRET|PAYPAL_SECRET|SMTP_PASS|MICROSOFT_CLIENT_SECRET' \
      "${browser_files[@]}" \
      || true
  )"
fi
report_failure "Potential server-secret reference in browser-facing code" "$browser_secret_refs"

if [[ "$failures" -ne 0 ]]; then
  echo "" >&2
  echo "[secret-scan] failed" >&2
  exit 1
fi

echo "[secret-scan] no committed secrets or browser-side secret references found"
