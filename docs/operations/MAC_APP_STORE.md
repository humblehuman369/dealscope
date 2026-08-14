# DealGapIQ — Mac App Store

## Status

| Phase | What | Status |
|-------|------|--------|
| **1** | iPad Capacitor binary as “Designed for iPad” on Apple Silicon | **Live** |
| **2** | Native Mac WKWebView shell (`frontend/macos/`, `com.dealgapiq.mobile`) | **Ready to archive** on a Mac |

The Mac shell shares the iOS bundle ID on purpose. macOS is a platform on app
record `6759636866`, and a universal purchase requires an identical bundle ID
across platforms — see `frontend/macos/README.md` for why a distinct ID would
cost you the shared subscription.

## Why not Mac Catalyst?

Capacitor 8 SPM XCFrameworks have no `macabi` slices. Do not set
`SUPPORTS_MACCATALYST = YES`.

## Phase 2 — native Mac binary

Scaffold + IAP live at **`frontend/macos/`**.

```bash
cd frontend && npm run mac:open
# Archive + upload (macOS + Xcode required):
cd macos && bash scripts/archive-and-upload.sh
```

### Listing assets (this PR)

| Field | Location |
|-------|----------|
| Screenshots 2880×1800 | `frontend/public/app-store/connect/screenshots-mac/` |
| Promotional Text | `…/copy/macos/promotional-text.md` |
| Description / What’s New | `…/copy/macos/description.md` |
| Regenerator | `python3 apply_mac_screenshot_brand.py` |

### IAP

- Bridge: `RevenueCatBridge.swift` → `window.DealGapIQMac.iap`
- Web: `USE_NATIVE_IAP`, `macIap.ts`, `useRevenueCat`
- Products: `com.monthly.dealgapiq` / `com.yearly.dealgapiq` — literally the same
  products, in subscription group `22024739` "DealGapIQ Pro". Shared because the
  group belongs to the app record, so an iOS subscriber needs no second purchase.
- RevenueCat needs no Mac-specific app or key; it keys on bundle ID.
- Deploy frontend before reviewers hit production shell

### ASC checklist

1. macOS platform already exists on app `6759636866` with a `1.0` version record
2. Upload screenshots `01`–`10` from `screenshots-mac/`
3. Paste promotional text + description
4. Attach archived build `1.0 (1)`
5. Submit for review

**Note:** Shipping the native macOS binary replaces the “iOS app on Mac”
Designed-for-iPad listing for new Mac downloads of that platform.

## Phase 1 (already live)

`SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES` on the iOS project. Public listing
shows Mac compatibility. No separate Mac binary required for Phase 1.

## Windows (after Mac)

Same web-shell pattern (Tauri/Electron or WebView2) after Mac IAP is solid.
