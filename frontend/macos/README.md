# DealGapIQ — Native macOS App (Phase 2)

Thin **WKWebView** shell for the Mac App Store. Loads `https://dealgapiq.com`
with desktop window chrome and **RevenueCat / StoreKit** IAP.

| | |
|---|---|
| Bundle ID | `com.dealgapiq.mac` |
| Version | `1.0.0` (build `1`) |
| Min macOS | 13.3 |
| IAP products | `com.monthly.dealgapiq` / `com.yearly.dealgapiq` |

> **Phase 1 is already live** without this project: the iOS/iPad Capacitor app
> appears on the Mac App Store as “Designed for iPad” (Apple Silicon).
> Shipping this native binary is the upgrade path for a true Mac desktop app.
> Note: releasing a native macOS binary replaces the “iOS app on Mac” listing
> for new downloads of that platform.

## Open & run

```bash
cd frontend
npm run mac:open
# Xcode → Run (My Mac)
```

Local web against the shell:

```bash
DEALGAPIQ_URL=http://localhost:3000 open frontend/macos/DealGapIQ.xcodeproj
# then Run in Xcode
```

## App Store assets

| Asset | Path |
|-------|------|
| Screenshots (2880×1800) | `frontend/public/app-store/connect/screenshots-mac/` |
| Promotional Text | `…/copy/macos/promotional-text.md` |
| Description + What’s New | `…/copy/macos/description.md` |

Regenerate screenshots:

```bash
cd frontend/public/app-store/connect
python3 apply_mac_screenshot_brand.py
```

## Before Mac App Store submission

1. **App Store Connect** → DealGapIQ → add **macOS** platform (if not already).
2. **RevenueCat** → ensure the Mac App Store app / products are linked
   (`com.monthly.dealgapiq`, `com.yearly.dealgapiq`). Public SDK key:
   `NEXT_PUBLIC_REVENUECAT_IOS_KEY` (or `NEXT_PUBLIC_REVENUECAT_MAC_KEY`).
3. **Deploy** the web app so `USE_NATIVE_IAP` / `macIap` paths are live on
   `dealgapiq.com` before reviewers open the shell.
4. **Archive + upload** (on a Mac):

```bash
cd frontend/macos
bash scripts/archive-and-upload.sh
```

5. In Connect: attach build, paste promo + description, upload `screenshots-mac/`
   in order `01`–`08`, submit.

## Detection in the web app

The shell injects:

```js
window.__DEALGAPIQ_MAC__ = true
window.DealGapIQMac.iap = { configure, logIn, getOfferings, purchase, restore }
```

Frontend: `IS_MAC_NATIVE` / `USE_NATIVE_IAP` in `src/lib/env.ts`, bridge in
`src/lib/macIap.ts`, purchases via `useRevenueCat`.
