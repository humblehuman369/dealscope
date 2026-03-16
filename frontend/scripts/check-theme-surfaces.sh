#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# check-theme-surfaces.sh
#
# Enforce the DealGapIQ theme surface contract:
#   - No hardcoded dark hex backgrounds in component code
#   - Page shells use --surface-base, not --surface-card
#
# Exit 0 = clean, Exit 1 = violations found
#
# Usage:
#   bash scripts/check-theme-surfaces.sh          # normal mode
#   bash scripts/check-theme-surfaces.sh --strict  # CI mode (zero tolerance)
# ──────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$ROOT/src"

STRICT=false
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=true
fi

ALLOWLIST_PATTERN="globals\.css|semantic-tokens\.ts|verdict-design-tokens\.ts|api/report/route\.ts|capacitor\.config\.ts|theme-surfaces\.test\.ts"

VIOLATIONS=0
VIOLATION_FILES=""

report() {
  local label="$1"
  local pattern="$2"
  local include1="$3"
  local include2="${4:-}"

  local matches
  if [[ -n "$include2" ]]; then
    matches=$(grep -rn -E "$pattern" "$SRC" --include="$include1" --include="$include2" 2>/dev/null | grep -v -E "$ALLOWLIST_PATTERN" || true)
  else
    matches=$(grep -rn -E "$pattern" "$SRC" --include="$include1" 2>/dev/null | grep -v -E "$ALLOWLIST_PATTERN" || true)
  fi

  if [[ -n "$matches" ]]; then
    echo ""
    echo "  ✖ $label"
    echo "  ──────────────────────────────────────"
    echo "$matches" | head -40
    local count
    count=$(echo "$matches" | wc -l | tr -d ' ')
    if (( count > 40 )); then
      echo "  ... and $((count - 40)) more"
    fi
    VIOLATIONS=$((VIOLATIONS + count))
    VIOLATION_FILES="$VIOLATION_FILES"$'\n'"$(echo "$matches" | cut -d: -f1 | sort -u)"
  fi
}

echo "═══════════════════════════════════════════"
echo "  DealGapIQ Theme Surface Check"
echo "═══════════════════════════════════════════"

# ── 1. Hardcoded dark hex backgrounds in inline styles ──
report \
  "Inline background with hardcoded dark hex (use var(--surface-base) or var(--surface-card))" \
  "background(Color)?:[[:space:]]*['\"]#(000000|000|0[Cc]1220|0[Aa]1628|0d1424|0d1e38|0b1426|0b2236|060d17)['\"]" \
  "*.ts" "*.tsx"

# ── 2. Tailwind arbitrary dark hex backgrounds ──
report \
  "Tailwind bg-[#hex] with dark color (use bg-[var(--surface-base)] or bg-[var(--surface-card)])" \
  "bg-\[#(000000|000|0[Cc]1220|0[Aa]1628|0d1424|0d1e38|0b1426|0b2236|060d17)\]" \
  "*.ts" "*.tsx"

# ── 3. dark: variant with arbitrary hex backgrounds ──
report \
  "dark:bg-[#hex] override (use semantic token instead)" \
  "dark:bg-\[#[0-9a-fA-F]{3,8}\]" \
  "*.ts" "*.tsx"

# ── 4. bg-black Tailwind class ──
report \
  "Tailwind bg-black class (use bg-[var(--surface-base)])" \
  "(^|[[:space:]\"'])bg-black([[:space:]\"']|$)" \
  "*.ts" "*.tsx"

# ── 5. Hardcoded dark hex in CSS files (outside globals.css) ──
report \
  "CSS background with hardcoded dark hex" \
  "background(-color)?:[[:space:]]*#(000000|0[Cc]1220|0[Aa]1628|0d1424|0d1e38)" \
  "*.css"

echo ""
echo "═══════════════════════════════════════════"

if (( VIOLATIONS > 0 )); then
  UNIQUE_FILES=$(echo "$VIOLATION_FILES" | sort -u | grep -v '^$' | wc -l | tr -d ' ')
  echo "  RESULT: $VIOLATIONS violation(s) in $UNIQUE_FILES file(s)"
  echo ""
  echo "  Fix: Replace hardcoded colors with semantic tokens:"
  echo "    Page shells  → var(--surface-base)"
  echo "    Cards/panels → var(--surface-card)"
  echo "    Nested/elevated → var(--surface-elevated)"
  echo ""
  echo "  If intentional, add to frontend/docs/theme-surface-exceptions.md"
  echo "═══════════════════════════════════════════"

  if $STRICT; then
    exit 1
  else
    echo "  (non-strict mode — exiting 0, run with --strict to fail)"
    exit 0
  fi
else
  echo "  RESULT: Clean — no hardcoded dark backgrounds found"
  echo "═══════════════════════════════════════════"
  exit 0
fi
