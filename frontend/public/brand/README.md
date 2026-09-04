# DealGapIQ Brand Assets

**This folder is the single source of truth for every DealGapIQ icon and logo.**
Do not add logo/icon PNGs anywhere else in the repo. Platform-specific copies
(favicons, iOS/Android/macOS icons, splash screens, store tooling inputs) are
generated from here by `frontend/scripts/derive-brand-assets.py`.

Colors: Black `#000000` · Cyan `#0EA5E9` · White `#FFFFFF`

## Updating the brand

1. Replace the files below with the new export (same names and sizes).
2. `cd frontend && python3 scripts/derive-brand-assets.py` (needs Pillow).
3. Commit everything it touched. `npx cap sync` for a native rebuild.

## Contents

```
AppIcon/
  iOS_AppStore/      1024x1024 — App Store Connect upload (no transparency, no rounded corners)
  iOS_AppIconSet/    20–180 px — full Xcode set (project ships the single 1024 universal icon)
  macOS/             16–1024 px — Mac app icon set
  GooglePlay/        512x512 — Play Console store-listing icon
  Android_Launcher/  ic_launcher mdpi–xxxhdpi (48–192 px)
  Android_Adaptive/  foreground + background layers (432x432, xxxhdpi)
  Web_Favicon/       favicon.ico, PNG favicons 16–512, apple-touch-icon (180)
  Transparent/       DERIVED — head + house mark on transparent, 512x512
                       DealGapIQ_Mark_OnDark_512.png   cyan + white  → dark surfaces
                       DealGapIQ_Mark_OnLight_512.png  cyan + black  → light surfaces

Logo/
  Sizes/             wordmark on black, 300–2400 px wide
  Transparent/       DERIVED — wordmark on transparent, 1200x339, cropped to content
                       DealGapIQ_Logo_OnDark.png   white + cyan  → dark surfaces
                       DealGapIQ_Logo_OnLight.png  black + cyan  → light surfaces
  GooglePlay/        Feature graphic 1024x500
  Social/            Open Graph 1200x630, X header, LinkedIn banner, profile squares, Instagram
  Presentation/      1920x1080 title slide
  iOS_Launch/        launch/splash reference art
```

`Transparent/` files are generated from the pack's own pixels (black lifted to
alpha; white swapped for black in the OnLight variants). Nothing is redrawn.

## Where each asset is used

| Surface | Source | Wired in |
|---|---|---|
| Header + footer wordmark (theme-aware) | `Logo/Transparent/*` | `src/lib/brand.ts` → `AppHeader`, `DealGapIQHomepage` |
| Loading / analyzing / search / map marks | `AppIcon/Transparent/*` | `src/lib/brand.ts` → `IQLoadingLogo`, `IQAnalyzingScreen`, `SearchPropertyModal`, `DealGapIQGateway`, `MapSearchView`, `IQBrainIcon`, `TryItNowModal` |
| Blog OG cards | `Logo/Transparent/DealGapIQ_Logo_OnDark.png` | `src/lib/og/blog-card.tsx` |
| Default OG / Twitter image | `Logo/Social/OpenGraph_Share_1200x630.png` | `BRAND_OG_IMAGE` in `src/lib/brand.ts`, included in every page's `openGraph.images` (Next does not deep-merge `openGraph`) |
| JSON-LD Organization logo / product image | `AppIcon/iOS_AppStore/AppIcon_1024x1024.png` | `SiteJsonLd`, `discovery/layout.tsx`, `pricing/page.tsx` |
| Browser favicon / touch icon | `AppIcon/Web_Favicon/*` | `src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png` (Next.js file conventions) |
| iOS app icon | `AppIcon/iOS_AppStore/AppIcon_1024x1024.png` | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` |
| iOS splash | generated: OnDark wordmark centred on black 2732² | `ios/App/App/Assets.xcassets/Splash.imageset/*` |
| Android launcher / round / adaptive | `AppIcon/Android_Launcher/*`, `AppIcon/Android_Adaptive/*` | `android/app/src/main/res/mipmap-*/` (background color `#000000` in `values/ic_launcher_background.xml`) |
| Android splash | generated: OnDark wordmark centred on black, all densities | `android/app/src/main/res/drawable*/splash.png` |
| macOS app icon | `AppIcon/macOS/*` | `macos/DealGapIQ/Assets.xcassets/AppIcon.appiconset/` |
| Play Console icon | `AppIcon/GooglePlay/PlayStore_Icon_512x512.png` | `public/app-store/play-store/icon-512x512-play.png` |
| Store screenshot compositing wordmark | `Logo/Transparent/DealGapIQ_Logo_OnDark.png` | `public/app-store/play-store/assets/dealgapiq-wordmark-darkmode.png` |
| Demo video | `Logo/Transparent/DealGapIQ_Logo_OnDark.png` | `tools/demo-video/assets/logo.png` |

The splash screens are generated rather than copied from `Logo/iOS_Launch/`
because iOS renders the 2732² square with `scaleAspectFill`; the reference
art's wordmark is wider than the visible band on a phone.
