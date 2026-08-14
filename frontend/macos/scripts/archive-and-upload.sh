#!/usr/bin/env bash
# Archive + upload the native Mac App Store binary.
# Shares the iOS bundle ID (com.dealgapiq.mobile) so the build lands on the
# macOS platform of the existing app record as a universal purchase.
# Must run on macOS with Xcode + a valid Apple Distribution identity.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/DealGapIQ.xcodeproj"
SCHEME="DealGapIQ"
ARCHIVE_PATH="${ARCHIVE_PATH:-$ROOT/build/DealGapIQ-1.0.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-$ROOT/build/export-1.0}"
EXPORT_OPTIONS="$ROOT/ExportOptions.plist"
TEAM_ID="${DEVELOPMENT_TEAM:-A2Y6C3NNSY}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "error: this script requires macOS + Xcode (current OS: $(uname -s))" >&2
  exit 1
fi

mkdir -p "$ROOT/build"
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

echo "==> Archiving $SCHEME (Release / macOS)…"
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=macOS' \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$TEAM_ID"

echo "==> Exporting + uploading to App Store Connect…"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo "==> Done. Archive: $ARCHIVE_PATH"
echo "    In App Store Connect → DealGapIQ → macOS → select the new build,"
echo "    paste copy from frontend/public/app-store/connect/copy/macos/,"
echo "    upload screenshots from screenshots-mac/, then Add for Review."
