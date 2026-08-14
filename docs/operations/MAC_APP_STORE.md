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

**Phase 1 is already live.** The public listing shows Mac compatibility
(`macOS 12+`, Apple Silicon) for DealGapIQ (`id6759636866`). Compatible iOS/iPad
apps are on the Mac App Store by default unless you opt out.

To confirm or change:

1. [App Store Connect](https://appstoreconnect.apple.com) → **DealGapIQ**
2. **Pricing and Availability**
3. **iPhone and iPad Apps on Apple Silicon Mac** → **Make this app available**
4. Optional: **Verify Compatibility** so the listing shows a verified Mac badge
5. Optional: add Mac screenshots (iPad 12.9" set is acceptable initially)

No separate Mac binary is required for Phase 1. The public ASC API no longer
exposes the Mac opt-in attribute; use the UI above (or Apple’s internal web API).

## Verify locally

On an Apple Silicon Mac:

```bash
cd frontend
npm run cap:open:ios
# Xcode → run on iPad simulator, or install TestFlight iOS build on Mac
```

Or install the App Store / TestFlight iOS app on Mac (Apple Silicon) and confirm
it launches with desktop layouts (`capacitor-mac` class on `<html>`).

## Phase 2 — native Mac shell + RevenueCat IAP

Lives at **`frontend/macos/`** — bundle ID `com.dealgapiq.mobile` (shared with iOS).

```bash
cd frontend && npm run mac:open
```

**IAP is wired:** RevenueCat Swift SDK ↔ `window.DealGapIQMac.iap` ↔
`useRevenueCat` / `UpgradeModal` (no Stripe in the Mac shell).

Local test against a Vercel preview / localhost (until web changes are deployed):

```bash
DEALGAPIQ_URL=http://localhost:3000 open frontend/macos/DealGapIQ.xcodeproj
# then Run in Xcode (Scheme env can also set DEALGAPIQ_URL)
```

See `frontend/macos/README.md` for RevenueCat dashboard checklist + archive steps.

## Windows (after Mac)

Package the same web shell pattern (Tauri/Electron or WebView2) for Microsoft
Store after Mac IAP is solid — do not invent a third product stack.