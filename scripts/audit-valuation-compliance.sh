#!/usr/bin/env bash
# Fail CI when production paths import deprecated client valuation math.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAIL=0

check_rg() {
  local label="$1"
  local pattern="$2"
  local path="$3"
  if rg -q "$pattern" "$path" 2>/dev/null; then
    echo "FAIL: $label"
    rg -n "$pattern" "$path" || true
    FAIL=1
  fi
}

check_rg "estimateIncomeValue in app/features/components" \
  "estimateIncomeValue|computeDealGapIncomeValue" \
  "frontend/src/app frontend/src/features frontend/src/components"

check_rg "required_equity_yield (removed)" \
  "required_equity_yield|requiredEquityYield|DEFAULT_REQUIRED_EQUITY_YIELD" \
  "backend/app frontend/src"

if [ "$FAIL" -ne 0 ]; then
  echo "Valuation compliance audit failed."
  exit 1
fi

echo "Valuation compliance audit passed."
