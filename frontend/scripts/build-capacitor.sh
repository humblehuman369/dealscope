#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$FRONTEND_DIR/src/app/api"
BACKUP_DIR="$FRONTEND_DIR/.api-routes-backup"

echo "=== DealGapIQ Capacitor Build ==="
echo "Frontend dir: $FRONTEND_DIR"

# Move API routes out (static export can't include server-side routes)
if [ -d "$API_DIR" ]; then
  echo "Moving API routes out of build..."
  mkdir -p "$BACKUP_DIR"
  mv "$API_DIR" "$BACKUP_DIR/api"
fi

# Ensure routes are restored on exit (even on failure)
restore_routes() {
  if [ -d "$BACKUP_DIR/api" ]; then
    echo "Restoring API routes..."
    mv "$BACKUP_DIR/api" "$API_DIR"
    rmdir "$BACKUP_DIR" 2>/dev/null || true
  fi
}
trap restore_routes EXIT

# Build static export
# NOTE: NEXT_PUBLIC_REVENUECAT_IOS_KEY and NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
# MUST be inherited from the calling shell (export them before running this
# script or set them in CI). Without these, the in-app purchase sheet will
# render empty prices and a disabled button — the exact failure mode that
# caused Apple App Store rejection 2.1(b) in April 2026.
echo "Building static export..."
cd "$FRONTEND_DIR"

if [ -z "${NEXT_PUBLIC_REVENUECAT_IOS_KEY:-}" ]; then
  echo "WARNING: NEXT_PUBLIC_REVENUECAT_IOS_KEY is not set. iOS in-app purchases will not load." >&2
fi
if [ -z "${NEXT_PUBLIC_REVENUECAT_ANDROID_KEY:-}" ]; then
  echo "WARNING: NEXT_PUBLIC_REVENUECAT_ANDROID_KEY is not set. Android in-app purchases will not load." >&2
fi

BUILD_TARGET=capacitor \
  NEXT_PUBLIC_API_URL=https://api.dealgapiq.com \
  NEXT_PUBLIC_APP_URL=https://dealgapiq.com \
  NEXT_PUBLIC_REVENUECAT_IOS_KEY="${NEXT_PUBLIC_REVENUECAT_IOS_KEY:-}" \
  NEXT_PUBLIC_REVENUECAT_ANDROID_KEY="${NEXT_PUBLIC_REVENUECAT_ANDROID_KEY:-}" \
  npx next build

echo "Static export complete: $FRONTEND_DIR/out/"

# Sync with Capacitor
if command -v npx &>/dev/null && [ -f "$FRONTEND_DIR/capacitor.config.ts" ]; then
  echo "Syncing with Capacitor..."
  npx cap sync
  echo "Capacitor sync complete."
fi

echo "=== Build finished ==="
