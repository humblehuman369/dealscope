#!/usr/bin/env bash
#
# parity-check.sh — Cross-Platform Type & Constant Parity Check
#
# Compares key type definitions and constants between frontend and mobile
# to catch drift before deployment.
#
# Usage:
#   ./scripts/parity-check.sh
#
# Exit codes:
#   0 = All checks passed
#   1 = Parity violations detected
#
# Run in CI:
#   - name: Parity Check
#     run: bash scripts/parity-check.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VIOLATIONS=0
WARNINGS=0

log_pass() { echo -e "${GREEN}✓${NC} $1"; }
log_fail() { echo -e "${RED}✗${NC} $1"; VIOLATIONS=$((VIOLATIONS + 1)); }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

echo "═══════════════════════════════════════════════════════════"
echo "  DealScope Parity Check — Frontend ↔ Mobile"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. StrategyId type parity ──────────────────────────────────────────────
echo "── Strategy Types ──"

# Normalize: strip trailing semicolons and whitespace for comparison
normalize() { echo "$1" | sed 's/;*$//' | sed 's/[[:space:]]*$//'; }

FRONTEND_STRATEGY=$(grep -h "export type StrategyId" frontend/src/components/analytics/types.ts frontend/src/types/analytics.ts 2>/dev/null | head -1 || echo "NOT FOUND")
MOBILE_STRATEGY=$(grep -h "export type StrategyId" mobile/types/analytics.ts 2>/dev/null | head -1 || echo "NOT FOUND")
SHARED_STRATEGY=$(grep -h "export type StrategyId" shared/src/types/strategy.ts 2>/dev/null | head -1 || echo "NOT FOUND")

if [ "$(normalize "$FRONTEND_STRATEGY")" = "$(normalize "$MOBILE_STRATEGY")" ] && [ "$FRONTEND_STRATEGY" != "NOT FOUND" ]; then
  log_pass "StrategyId type matches across codebases"
else
  log_fail "StrategyId type mismatch"
  echo "  Frontend: $FRONTEND_STRATEGY"
  echo "  Mobile:   $MOBILE_STRATEGY"
  echo "  Shared:   $SHARED_STRATEGY"
fi

# ── 2. OpportunityGrade type parity ────────────────────────────────────────
echo ""
echo "── Scoring Types ──"

FE_GRADE=$(grep -rh "export type OpportunityGrade" frontend/src/ 2>/dev/null | head -1 || echo "NOT FOUND")
MB_GRADE=$(grep -rh "export type OpportunityGrade" mobile/ 2>/dev/null | head -1 || echo "NOT FOUND")

if [ "$FE_GRADE" = "$MB_GRADE" ] && [ "$FE_GRADE" != "NOT FOUND" ]; then
  log_pass "OpportunityGrade type matches"
else
  log_fail "OpportunityGrade type mismatch"
  echo "  Frontend: $FE_GRADE"
  echo "  Mobile:   $MB_GRADE"
fi

# ── 3. AmortizationRow interface field count ───────────────────────────────
echo ""
echo "── Analytics Types ──"

FE_AMORT_FIELDS=$(grep -A 20 "export interface AmortizationRow" frontend/src/types/analytics.ts 2>/dev/null | grep ":" | wc -l || echo 0)
MB_AMORT_FIELDS=$(grep -A 20 "export interface AmortizationRow" mobile/components/analytics/types.ts 2>/dev/null | grep ":" | wc -l || echo 0)

if [ "$FE_AMORT_FIELDS" -eq "$MB_AMORT_FIELDS" ] 2>/dev/null; then
  log_pass "AmortizationRow field count matches ($FE_AMORT_FIELDS fields)"
else
  log_warn "AmortizationRow field count differs (frontend: $FE_AMORT_FIELDS, mobile: $MB_AMORT_FIELDS)"
fi

# ── 4. Design Token Alignment ──────────────────────────────────────────────
echo ""
echo "── Design Tokens ──"

# Check navy.900 alignment
# Use the CSS custom property as the canonical frontend navy value
FE_NAVY=$(grep "\-\-color-navy:" frontend/src/app/globals.css 2>/dev/null | grep -o '#[0-9A-Fa-f]*' | head -1 || echo "NOT FOUND")
MB_NAVY=$(grep "900.*Primary dark navy" mobile/theme/colors.ts 2>/dev/null | grep -o "'#[0-9A-Fa-f]*'" | tr -d "'" | head -1 || echo "NOT FOUND")

if [ "$FE_NAVY" = "$MB_NAVY" ]; then
  log_pass "Navy.900 color matches ($FE_NAVY)"
else
  log_fail "Navy.900 color mismatch (frontend: $FE_NAVY, mobile: $MB_NAVY)"
fi

# Check gradient endpoint alignment
FE_GRADIENT=$(grep "gradient-brand" frontend/tailwind.config.js 2>/dev/null | grep -o '#[0-9A-Fa-f]*' | tail -1 || echo "NOT FOUND")
MB_GRADIENT=$(grep "brandDark" mobile/theme/colors.ts 2>/dev/null | grep -o "'#[0-9A-Fa-f]*'" | tail -1 | tr -d "'" || echo "NOT FOUND")

if [ "$FE_GRADIENT" = "$MB_GRADIENT" ]; then
  log_pass "Brand gradient endpoint matches ($FE_GRADIENT)"
else
  log_fail "Brand gradient endpoint mismatch (frontend: $FE_GRADIENT, mobile: $MB_GRADIENT)"
fi

# Check label text color alignment
FE_LABEL=$(grep "text-label" frontend/src/app/globals.css 2>/dev/null | grep -o '#[0-9A-Fa-f]*' | head -1 || echo "NOT FOUND")
MB_LABEL=$(grep "textLabel" mobile/theme/colors.ts 2>/dev/null | grep -o "'#[0-9A-Fa-f]*'" | head -1 | tr -d "'" || echo "NOT FOUND")

if [ "$FE_LABEL" = "$MB_LABEL" ]; then
  log_pass "Label text color matches ($FE_LABEL)"
else
  log_warn "Label text color differs (frontend: $FE_LABEL, mobile: $MB_LABEL)"
fi

# ── 5. Shared Package Existence ────────────────────────────────────────────
echo ""
echo "── Shared Package ──"

if [ -f "shared/src/index.ts" ]; then
  log_pass "Shared package exists"
  SHARED_TYPES=$(find shared/src/types -name "*.ts" 2>/dev/null | wc -l)
  SHARED_CONSTANTS=$(find shared/src/constants -name "*.ts" 2>/dev/null | wc -l)
  echo "  Types: $SHARED_TYPES files, Constants: $SHARED_CONSTANTS files"
else
  log_warn "Shared package not found (shared/src/index.ts missing)"
fi

if [ -f "shared/test-fixtures/mortgage-calculations.json" ]; then
  log_pass "Test fixtures present"
else
  log_warn "Test fixtures missing"
fi

# ── 6. Score Grading Alignment ──────────────────────────────────────────
echo ""
echo "── Score Grading ──"

# Count grade thresholds in usePropertyAnalysis scoreToGrade (should be 6-grade: A+, A, B, C, D, F)
MB_GRADE_COUNT=$(grep -A 8 "function scoreToGrade" mobile/hooks/usePropertyAnalysis.ts 2>/dev/null | grep "return '" | wc -l || echo 0)

if [ "$MB_GRADE_COUNT" -le 6 ] && [ "$MB_GRADE_COUNT" -gt 0 ] 2>/dev/null; then
  log_pass "Score grading uses 6-grade system (${MB_GRADE_COUNT} grades)"
else
  log_fail "Score grading may still use 11-grade system ($MB_GRADE_COUNT return statements)"
fi

# ── 7. Dynamic Metrics Engine ──────────────────────────────────────────
echo ""
echo "── Engine Parity ──"

if [ -f "mobile/lib/dynamicMetrics.ts" ]; then
  log_pass "Dynamic metrics engine ported to mobile"
else
  log_fail "Dynamic metrics engine missing on mobile (mobile/lib/dynamicMetrics.ts)"
fi

if [ -f "mobile/config/strategyMetrics.ts" ]; then
  log_pass "Strategy metrics config ported to mobile"
else
  log_fail "Strategy metrics config missing on mobile (mobile/config/strategyMetrics.ts)"
fi

if [ -f "mobile/lib/projections.ts" ]; then
  log_pass "10-year projections engine ported to mobile"
else
  log_fail "Projections engine missing on mobile (mobile/lib/projections.ts)"
fi

# ── 8. Debounce Timing Alignment ──────────────────────────────────────────
echo ""
echo "── Behavior Alignment ──"

FE_DEBOUNCE=$(grep -rh "DEBOUNCE_MS\s*=" frontend/src/hooks/useIQAnalysis.ts 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "NOT FOUND")
MB_DEBOUNCE=$(grep -h "CALC_DEBOUNCE_MS\s*=" mobile/stores/worksheetStore.ts 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "NOT FOUND")

if [ "$FE_DEBOUNCE" = "$MB_DEBOUNCE" ] && [ "$FE_DEBOUNCE" != "NOT FOUND" ]; then
  log_pass "Calculation debounce timing matches (${FE_DEBOUNCE}ms)"
elif [ "$FE_DEBOUNCE" != "NOT FOUND" ] && [ "$MB_DEBOUNCE" != "NOT FOUND" ]; then
  log_warn "Calculation debounce differs (frontend: ${FE_DEBOUNCE}ms, mobile: ${MB_DEBOUNCE}ms)"
fi

# Check AbortController in mobile usePropertyAnalysis
MB_ABORT=$(grep -c "AbortController" mobile/hooks/usePropertyAnalysis.ts 2>/dev/null || echo 0)
if [ "$MB_ABORT" -gt 0 ]; then
  log_pass "AbortController present in usePropertyAnalysis"
else
  log_fail "AbortController missing in usePropertyAnalysis"
fi

# Check parallel worksheet fetches in mobile usePropertyAnalysis
MB_WORKSHEET=$(grep -c "WORKSHEET_ENDPOINTS" mobile/hooks/usePropertyAnalysis.ts 2>/dev/null || echo 0)
if [ "$MB_WORKSHEET" -gt 0 ]; then
  log_pass "Parallel worksheet fetches in usePropertyAnalysis"
else
  log_fail "Parallel worksheet fetches missing in usePropertyAnalysis"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $VIOLATIONS -eq 0 ]; then
  echo -e "${GREEN}All parity checks passed!${NC} ($WARNINGS warnings)"
  exit 0
else
  echo -e "${RED}$VIOLATIONS violations found${NC} ($WARNINGS warnings)"
  echo "Fix violations before merging to main."
  exit 1
fi
