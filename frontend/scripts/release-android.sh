#!/usr/bin/env bash
#
# release-android.sh — One-shot Android release build for DealGapIQ.
#
# What it does:
#   1. Validates keystore.properties and the RevenueCat env vars
#   2. Bumps versionCode (auto +1) and versionName (you provide)
#   3. Runs the existing Capacitor build (Next static export + cap sync)
#   4. Builds a signed release AAB via Gradle
#   5. Copies the AAB to ~/Desktop with a versioned filename
#   6. Reveals it in Finder for drag-drop into Play Console
#
# Usage:
#   bash frontend/scripts/release-android.sh 3.3.0
#   bash frontend/scripts/release-android.sh 3.3.0 --yes        # skip confirm
#   bash frontend/scripts/release-android.sh 3.3.0 --dry-run    # show plan only
#
# Required env vars (export before running):
#   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY   — RevenueCat → API keys
#   NEXT_PUBLIC_REVENUECAT_IOS_KEY       — same; cap sync touches iOS too
#

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$FRONTEND_DIR/android"
GRADLE_FILE="$ANDROID_DIR/app/build.gradle"
KEYSTORE_PROPS="$ANDROID_DIR/keystore.properties"
AAB_OUTPUT="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"

NEW_VERSION_NAME=""
DRY_RUN=false
ASSUME_YES=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --yes|-y) ASSUME_YES=true ;;
    --help|-h)
      grep -E '^#( |$)' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    -*)
      echo "Unknown flag: $arg" >&2
      exit 1
      ;;
    *)
      if [[ -z "$NEW_VERSION_NAME" ]]; then
        NEW_VERSION_NAME="$arg"
      fi
      ;;
  esac
done

log_info()    { printf "${BLUE}▸${NC} %s\n" "$*"; }
log_success() { printf "${GREEN}✓${NC} %s\n" "$*"; }
log_warn()    { printf "${YELLOW}⚠${NC} %s\n" "$*"; }
log_error()   { printf "${RED}✗${NC} %s\n" "$*" >&2; }
log_section() { printf "\n${BOLD}━━━ %s ━━━${NC}\n" "$*"; }

# ── Pre-flight checks ──────────────────────────────────────────────────────
log_section "Pre-flight checks"

if [[ ! -f "$GRADLE_FILE" ]]; then
  log_error "build.gradle not found at $GRADLE_FILE"
  exit 1
fi

if [[ ! -f "$KEYSTORE_PROPS" ]]; then
  log_error "keystore.properties not found at $KEYSTORE_PROPS"
  log_error "Required for signed release builds. Create it with:"
  cat >&2 <<'EOF'

  storeFile=dealgapiq-release.keystore
  storePassword=YOUR_STORE_PASSWORD
  keyAlias=dealgapiq
  keyPassword=YOUR_KEY_PASSWORD

EOF
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_REVENUECAT_ANDROID_KEY:-}" ]]; then
  log_error "NEXT_PUBLIC_REVENUECAT_ANDROID_KEY not set."
  log_error "Without it, the IAP modal renders an empty price + disabled button"
  log_error "— exact failure mode that blocked the iOS submission in April 2026."
  log_error ""
  log_error "Get the Android API key from: RevenueCat → Apps & providers → API keys"
  log_error "Then: export NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx"
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_REVENUECAT_IOS_KEY:-}" ]]; then
  log_warn "NEXT_PUBLIC_REVENUECAT_IOS_KEY not set (cap sync touches iOS too — fine for Android-only release)."
fi

log_success "build.gradle, keystore.properties, RevenueCat key all present"

# ── Determine versions ─────────────────────────────────────────────────────
log_section "Version bump"

CURRENT_VERSION_CODE=$(grep -E 'versionCode +[0-9]+' "$GRADLE_FILE" | grep -oE '[0-9]+' | head -1)
CURRENT_VERSION_NAME=$(grep -E 'versionName +"[^"]+"' "$GRADLE_FILE" | grep -oE '"[^"]+"' | tr -d '"' | head -1)

if [[ -z "$CURRENT_VERSION_CODE" || -z "$CURRENT_VERSION_NAME" ]]; then
  log_error "Could not parse current versionCode / versionName from $GRADLE_FILE"
  exit 1
fi

if [[ -z "$NEW_VERSION_NAME" ]]; then
  log_error "Usage: bash $(basename "$0") <new-version-name> [--yes] [--dry-run]"
  log_error ""
  log_error "  Current versionName: $CURRENT_VERSION_NAME"
  log_error "  Current versionCode: $CURRENT_VERSION_CODE"
  log_error ""
  log_error "  Example: bash $(basename "$0") 3.3.0"
  exit 1
fi

NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

printf "  versionCode  ${YELLOW}%s${NC}  →  ${GREEN}%s${NC}\n" "$CURRENT_VERSION_CODE" "$NEW_VERSION_CODE"
printf "  versionName  ${YELLOW}%s${NC}  →  ${GREEN}%s${NC}\n" "$CURRENT_VERSION_NAME" "$NEW_VERSION_NAME"

if [[ "$NEW_VERSION_NAME" == "$CURRENT_VERSION_NAME" ]]; then
  log_warn "versionName is unchanged — only versionCode will increment (hotfix style)"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "Dry run — no files will be modified, no build will run."
  exit 0
fi

if [[ "$ASSUME_YES" != "true" ]]; then
  printf "  Proceed? [y/N] "
  read -r REPLY
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Aborted."
    exit 0
  fi
fi

# ── Update build.gradle ────────────────────────────────────────────────────
log_section "Updating build.gradle"

# `sed -i.bak` works on both BSD (macOS) and GNU sed
sed -i.bak \
  -e "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" \
  -e "s/versionName \"$CURRENT_VERSION_NAME\"/versionName \"$NEW_VERSION_NAME\"/" \
  "$GRADLE_FILE"

rm -f "$GRADLE_FILE.bak"

# Verify the rewrite landed
GRADLE_VERSION_CODE=$(grep -E 'versionCode +[0-9]+' "$GRADLE_FILE" | grep -oE '[0-9]+' | head -1)
GRADLE_VERSION_NAME=$(grep -E 'versionName +"[^"]+"' "$GRADLE_FILE" | grep -oE '"[^"]+"' | tr -d '"' | head -1)

if [[ "$GRADLE_VERSION_CODE" != "$NEW_VERSION_CODE" || "$GRADLE_VERSION_NAME" != "$NEW_VERSION_NAME" ]]; then
  log_error "Version rewrite did not land. Found: $GRADLE_VERSION_NAME ($GRADLE_VERSION_CODE)"
  exit 1
fi

log_success "build.gradle updated"

# ── Build static export + cap sync ─────────────────────────────────────────
log_section "Building static export and syncing Capacitor"

# Force production server URL — clear any leftover CAPACITOR_SERVER_URL from
# a previous `cap:dev` session that would otherwise bake localhost into the AAB.
unset CAPACITOR_SERVER_URL

cd "$FRONTEND_DIR"
bash scripts/build-capacitor.sh

# ── Build signed AAB ───────────────────────────────────────────────────────
log_section "Building signed release AAB (gradlew bundleRelease)"

cd "$ANDROID_DIR"
./gradlew bundleRelease

if [[ ! -f "$AAB_OUTPUT" ]]; then
  log_error "AAB not found at expected location: $AAB_OUTPUT"
  log_error "Check the gradlew output above for build errors."
  exit 1
fi

# ── Finalize: copy to Desktop, reveal in Finder ────────────────────────────
log_section "Finalizing"

DESKTOP_AAB="$HOME/Desktop/dealgapiq-${NEW_VERSION_NAME}-${NEW_VERSION_CODE}.aab"
cp "$AAB_OUTPUT" "$DESKTOP_AAB"

AAB_SIZE=$(du -h "$DESKTOP_AAB" | cut -f1)

log_success "AAB built and copied to Desktop"
echo ""
printf "  ${BOLD}File:${NC}     %s\n" "$DESKTOP_AAB"
printf "  ${BOLD}Size:${NC}     %s\n" "$AAB_SIZE"
printf "  ${BOLD}Version:${NC}  %s (versionCode %s)\n" "$NEW_VERSION_NAME" "$NEW_VERSION_CODE"
echo ""

if command -v open &>/dev/null; then
  open -R "$DESKTOP_AAB"
fi

log_section "Next steps"
cat <<EOF
  1. Play Console → DealGapIQ → Test and release → Internal testing
  2. Create new release → upload the AAB above
  3. Smoke test on a real device (subscription flow especially)
  4. Promote Internal → Production when green
  5. Watch the developer email for review status (1–7 days)

EOF
