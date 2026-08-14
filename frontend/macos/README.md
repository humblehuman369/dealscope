# DealGapIQ — Native macOS App (Phase 2)

Thin **WKWebView** shell for the Mac App Store. Loads `https://dealgapiq.com`
with desktop window chrome. Bundle ID: `com.dealgapiq.mobile` (same as iOS — universal purchase / shared IAP).

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

## In-app purchases (wired)

Native shell embeds **RevenueCat** (StoreKit) and exposes:

```js
window.DealGapIQMac.iap.configure(apiKey)
window.DealGapIQMac.iap.getOfferings()
window.DealGapIQMac.iap.purchasePackage(packageId)
window.DealGapIQMac.iap.restorePurchases()
```

The web app (`useRevenueCat` + `UpgradeModal`) uses this when
`window.__DEALGAPIQ_MAC__` is set — **Stripe is never used** in the Mac shell.

Product IDs (same as iOS): `com.monthly.dealgapiq`, `com.yearly.dealgapiq`.

### RevenueCat dashboard checklist

1. Ensure the Apple app for bundle `com.dealgapiq.mobile` includes **macOS**
   (or add a Mac app sharing the same App Store Connect record / products).
2. Attach monthly/yearly products to the same offering the iOS app uses.
3. `NEXT_PUBLIC_REVENUECAT_IOS_KEY` must be present in the Vercel/web build
   the Mac shell loads (production `dealgapiq.com`).

## Before Mac App Store submission

1. App Store Connect → DealGapIQ → add **macOS** platform (same bundle ID).
   Releasing a native macOS binary replaces the “iOS app on Mac” listing for new downloads.
2. Archive in Xcode → Distribute → App Store Connect.
3. Sandbox-test purchase + restore on a Mac signed into a Sandbox Apple ID.

## Detection in the web app

The shell injects:

```js
window.__DEALGAPIQ_MAC__ = true
```

Frontend reads this via `IS_MAC_NATIVE` / `IS_MAC_DESKTOP` in `src/lib/env.ts`.
