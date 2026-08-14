# DealGapIQ — Native macOS App (Phase 2)

Thin **WKWebView** shell for the Mac App Store. Loads `https://dealgapiq.com`
with desktop window chrome and **RevenueCat / StoreKit** IAP.

| | |
|---|---|
| Bundle ID | `com.dealgapiq.mobile` — **same as iOS, deliberately** |
| App record | `6759636866` (macOS platform on the existing DealGapIQ app) |
| Version | `1.0` (build `1`) |
| Min macOS | 13.3 |
| Subscription group | `22024739` "DealGapIQ Pro" — shared with iOS |
| IAP products | `com.monthly.dealgapiq` / `com.yearly.dealgapiq` — shared with iOS |

### Why the bundle ID matches iOS

This is a **universal purchase**. macOS is a platform on app record `6759636866`,
not a separate app, and Apple requires an identical bundle ID across platforms to
make that work. The payoff is that subscription groups live on the app record, so
the Mac build sells the same two products: an iOS subscriber gets Pro on Mac with
no second purchase, and upgrade/downgrade plus introductory-offer eligibility are
evaluated inside the one group.

Do **not** give this target its own bundle ID. A distinct ID forces a separate app
record, and those two product IDs cannot come with it — App Store Connect enforces
IAP product IDs unique per account and both are already claimed here. You would
need new products, separate billing and trial eligibility, no cross-platform
upgrade path, and a second listing and review.

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

1. **App Store Connect** → the macOS platform already exists on app `6759636866`
   with a `1.0` version record. Match `MARKETING_VERSION` to it or a build cannot
   be attached.
2. **RevenueCat** → nothing to add. The project has one Apple app, "DealGapIQ
   (App Store)", already holding both approved products with entitlements. macOS
   receipts validate against it because the bundle ID and app-specific shared
   secret are the same, so `NEXT_PUBLIC_REVENUECAT_IOS_KEY` is the only Apple key
   needed. Do not add a Mac App Store app or a Mac-specific key.
3. **Deploy** the web app so `USE_NATIVE_IAP` / `macIap` paths are live on
   `dealgapiq.com` before reviewers open the shell.
4. **Archive + upload** (on a Mac):

```bash
cd frontend/macos
bash scripts/archive-and-upload.sh
```

5. In Connect: attach build, paste promo + description, upload `screenshots-mac/`
   in order `01`–`10`, submit.

## Detection in the web app

The shell injects:

```js
window.__DEALGAPIQ_MAC__ = true
window.DealGapIQMac.iap = { configure, logIn, getOfferings, purchase, restore }
```

Frontend: `IS_MAC_NATIVE` / `USE_NATIVE_IAP` in `src/lib/env.ts`, bridge in
`src/lib/macIap.ts`, purchases via `useRevenueCat`.
