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
echo "Building static export..."
cd "$FRONTEND_DIR"
BUILD_TARGET=capacitor \
  NEXT_PUBLIC_API_URL=https://api.dealgapiq.com \
  NEXT_PUBLIC_APP_URL=https://dealgapiq.com \
  npx next build

echo "Static export complete: $FRONTEND_DIR/out/"

# Sync with Capacitor
if command -v npx &>/dev/null && [ -f "$FRONTEND_DIR/capacitor.config.ts" ]; then
  echo "Syncing with Capacitor..."
  npx cap sync
  echo "Capacitor sync complete."
fi

echo "=== Build finished ==="
