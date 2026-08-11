# DealGapIQ — Mac App Store (Phase 1)

## Status

**Phase 1 (now):** Offer the existing Capacitor **iPad** build on the Mac App Store
as **Designed for iPad** (Apple Silicon Macs). Same binary, desktop layouts already
exist in the web UI.

**Phase 2 (later):** True native Mac desktop (WKWebView or Tauri/Electron) when you
want Mac-native window chrome and Windows. Capacitor 8 SPM **cannot** build
Mac Catalyst — Ionic’s XCFrameworks have no `macabi` slices.

## Why not Mac Catalyst?

```
While building for Mac Catalyst, no library for this platform was found in
Capacitor.xcframework
```

Capacitor tracks Catalyst as unsupported. Do not set `SUPPORTS_MACCATALYST = YES`
until Capacitor ships Catalyst slices.

## What’s already in the repo

| Change | Purpose |
|--------|---------|
| `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES` | Allow Mac App Store “Designed for iPad” |
| `preferredContentMode: 'recommended'` | Desktop-width content on iPad/Mac |
| `IS_MAC_DESKTOP` in `src/lib/env.ts` | Skip phone-only chrome (status bar) |
| Removed `armv7` device requirement | Avoid blocking Mac destinations |

## Enable in App Store Connect

1. [App Store Connect](https://appstoreconnect.apple.com) → **DealGapIQ**
2. **Pricing and Availability** (or **App Information** → platform availability)
3. Under **iPhone and iPad Apps on Apple Silicon Macs**, ensure the app is
   **available on the Mac App Store**
4. Optionally add **Mac screenshots** (can reuse iPad 12.9" set initially)
5. Ship the next iOS/iPad version as usual — Mac picks up the same build

No separate Mac binary or Mac version string is required for Phase 1.

## Verify locally

On an Apple Silicon Mac:

```bash
cd frontend
npm run cap:open:ios
# Xcode → run on iPad simulator, or install TestFlight iOS build on Mac
```

Or install the App Store / TestFlight iOS app on Mac (Apple Silicon) and confirm
it launches with desktop layouts (`capacitor-mac` class on `<html>`).

## Phase 2 options (when you want real desktop)

1. **Thin native macOS WKWebView** app (`frontend/macos/`) loading `https://dealgapiq.com`
   + RevenueCat macOS / StoreKit 2 — best Mac App Store fit next to Capacitor
2. **Tauri / Electron** — same idea, also unlocks Windows Store later
3. Wait for Capacitor Catalyst XCFrameworks (no ETA)

## Windows (after Mac)

Defer until Phase 2 shell exists; package that shell for Microsoft Store
rather than inventing a third stack.