# DealGapIQ — Native macOS App (Phase 2)

Thin **WKWebView** shell for the Mac App Store. Loads `https://dealgapiq.com`
with desktop window chrome. Bundle ID: `com.dealgapiq.mac`.

> **Phase 1 is already live** without this project: the iOS/iPad Capacitor app
> appears on the Mac App Store as “Designed for iPad” (Apple Silicon).
> This native shell is the upgrade path for a true Mac desktop binary
> (and later Windows via the same web shell pattern).

## Open & run

```bash
cd frontend/macos
open DealGapIQ.xcodeproj
# Xcode → Run (My Mac)
```

Or:

```bash
xcodebuild -project DealGapIQ.xcodeproj -scheme DealGapIQ \
  -configuration Debug -destination 'platform=macOS' build
```

## Before Mac App Store submission

1. **In-app purchases** — Mac App Store forbids Stripe for digital unlocks.
   Wire StoreKit 2 / RevenueCat **macOS** (same product IDs as iOS:
   `com.monthly.dealgapiq`, `com.yearly.dealgapiq`) and teach the web app
   to use IAP when `window.__DEALGAPIQ_MAC__` is set.
2. **App Store Connect** → DealGapIQ → add **macOS** platform (or ship as a
   separate Mac app). Note: releasing a native macOS binary replaces the
   “iOS app on Mac” listing for new downloads.
3. **Icons** — drop a 1024×1024 into `AppIcon.appiconset` (see Contents.json).
4. **Archive** → Distribute → App Store Connect.

## Detection in the web app

The shell injects:

```js
window.__DEALGAPIQ_MAC__ = true
```

Frontend reads this via `IS_MAC_NATIVE` / `IS_MAC_DESKTOP` in `src/lib/env.ts`.
