#!/usr/bin/env bash
# Clear Wellington property cache via admin API (all variants from diagnostic plan).
# Usage:
#   export API_BASE_URL="https://dealscope-production.up.railway.app"  # or your API host
#   export ADMIN_BEARER_TOKEN="eyJhbG..."
#   ./scripts/diagnostics/flush_wellington_admin_curl.sh
set -euo pipefail
: "${API_BASE_URL:?Set API_BASE_URL to FastAPI base (no trailing slash)}"
: "${ADMIN_BEARER_TOKEN:?Set ADMIN_BEARER_TOKEN to an admin JWT}"

ADDRS=(
  "3783 Moon Bay Circle, Wellington, FL 33414"
  "3783 Moon Bay Cir, Wellington, FL 33414"
  "3783 Moon Bay Circle, Wellington, FL 33414, USA"
)

for addr in "${ADDRS[@]}"; do
  enc="$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$addr")"
  url="${API_BASE_URL}/api/v1/admin/cache/property?address=${enc}"
  echo "DELETE $url"
  code="$(curl -sS -o /tmp/flush_wellington_body.json -w '%{http_code}' -X DELETE \
    -H "Authorization: Bearer ${ADMIN_BEARER_TOKEN}" \
    -H "Accept: application/json" \
    "$url")" || true
  echo "HTTP $code"
  cat /tmp/flush_wellington_body.json
  echo
done
