#!/bin/bash
set -e

#
# Capacitor Local Dev — runs the Next.js dev server and points
# the iOS/Android WebView at it for live development.
#
# Usage:
#   npm run cap:dev          # auto-detect IP, sync iOS, open Xcode
#   npm run cap:dev:android  # same but for Android
#
# This is the ONLY mobile dev workflow. The mobile/ directory is
# deprecated. All mobile work happens here in frontend/.
#

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
PLATFORM="${1:-ios}"

# ── Get the local network IP ──
get_local_ip() {
  # macOS: grab the first non-loopback IPv4 address from the active interface
  local ip
  ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  if [ -z "$ip" ]; then
    ip=$(ifconfig | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')
  fi
  echo "$ip"
}

LOCAL_IP=$(get_local_ip)
if [ -z "$LOCAL_IP" ]; then
  echo "ERROR: Could not detect local network IP."
  echo "Make sure you're connected to Wi-Fi or Ethernet."
  exit 1
fi

DEV_URL="http://${LOCAL_IP}:3000"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║         DealGapIQ — Capacitor Local Dev              ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║  Platform:   ${PLATFORM}                                    ║"
echo "║  Dev server: ${DEV_URL}               ║"
echo "║  Directory:  frontend/  (NOT mobile/)                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# ── Sync Capacitor with the local dev URL ──
echo "[1/3] Syncing Capacitor → ${DEV_URL} ..."
cd "$FRONTEND_DIR"
CAPACITOR_SERVER_URL="$DEV_URL" npx cap sync "$PLATFORM" 2>&1

# ── Start Next.js dev server (bound to 0.0.0.0 so the device can reach it) ──
echo ""
echo "[2/3] Starting Next.js dev server on 0.0.0.0:3000 ..."
echo "      (accessible at ${DEV_URL} from the simulator/device)"
echo ""

# Run dev server in the background
NEXT_PUBLIC_API_URL=https://dealscope-production.up.railway.app \
NEXT_PUBLIC_USE_DIRECT_API=true \
  npx next dev --hostname 0.0.0.0 --port 3000 &
DEV_PID=$!

# Wait for the dev server to be ready
echo "      Waiting for dev server..."
for i in $(seq 1 30); do
  if curl -s "http://localhost:3000" > /dev/null 2>&1; then
    echo "      Dev server ready."
    break
  fi
  sleep 1
done

# ── Open in Xcode / Android Studio ──
echo ""
echo "[3/3] Opening ${PLATFORM} project ..."
npx cap open "$PLATFORM" 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dev server running at ${DEV_URL}"
echo "  Build & Run the app in Xcode to see changes live."
echo "  Press Ctrl+C to stop the dev server."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the script alive so the dev server stays running
cleanup() {
  echo ""
  echo "Stopping dev server (PID ${DEV_PID})..."
  kill $DEV_PID 2>/dev/null
  echo ""
  echo "Restoring production config..."
  cd "$FRONTEND_DIR"
  npx cap sync "$PLATFORM" 2>&1 | tail -1
  echo "Done. Capacitor config restored to https://dealgapiq.com"
}
trap cleanup EXIT INT TERM

wait $DEV_PID
