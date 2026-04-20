# DealGapIQ — Unified Brand Pack

A single marketing message — **"Discover Deals — Like an Investor"** — applied across every consumer-facing surface, generated programmatically from one Python script (`apply_brand_pack.py` + `connect/apply_screenshot_brand.py`) so every asset stays pixel-consistent and trivially regenerable.

> Use this folder when you need any DealGapIQ marketing image. Every surface uses the same dark navy + cyan glow + DM Sans + real-screenshot-inside-phone visual system.

---

## The unified message

Used in some form on every asset:

| Element | Copy |
|---|---|
| Headline | **Discover Deals · Like an Investor** |
| Subhead 1 | Every US Listing Analyzed for Profit |
| Subhead 2 | MLS · Foreclosures · Auctions · Pre-Foreclosures |
| Wordmark | DealGapIQ (DM Sans 800, white + cyan "IQ") |

The headline carries the brand stance ("see properties the way investors do, not the way Zillow does"). Subhead 1 is the value claim. Subhead 2 is the differentiating coverage (the "moat" — most apps stop at MLS).

---

## Asset surfaces (five total)

| Surface | File | Native size | Aspect | Where it ships |
|---|---|---|---|---|
| **App Store hero** | `connect/screenshots/01-hero-investors-lens.png` | 1290 × 2796 | 1:2.17 portrait | App Store Connect → Screenshots → 6.9" Display → slot #1 |
| **Play Store feature graphic** | `play-store/feature-graphic-1024x500-v5-discover-deals.png` | 1024 × 500 | 2:1 landscape | Google Play Console → Store listing → Feature graphic |
| **IAP Pro Monthly** | `iap-promo/dealgapiq-iap-pro-monthly-v2-1024x1024.png` | 1024 × 1024 | 1:1 square | App Store Connect → Subscriptions → Pro Monthly → Promotional Image |
| **IAP Pro Annual** | `iap-promo/dealgapiq-iap-pro-annual-v2-1024x1024.png` | 1024 × 1024 | 1:1 square | App Store Connect → Subscriptions → Pro Annual → Promotional Image |
| **Open Graph / social share** | `social/og-discover-deals-1200x630.png` | 1200 × 630 | 1.9:1 landscape | Add to your Next.js layout: `<meta property="og:image" content="/app-store/social/og-discover-deals-1200x630.png">` |

App Store Connect screenshots #2-#8 (also in `connect/screenshots/`) use feature-specific headlines rather than the unified message — that's intentional, see [Note on screenshot variation](#note-on-screenshot-variation) below.

---

## Visual system (every asset)

| Element | Spec |
|---|---|
| Background | Vertical navy gradient `#0A1428` → `#04081A` |
| Accent glow | Soft radial cyan `#22D3EE` at 22-30% intensity, behind the phone or focal element |
| Headline | DM Sans 800, -0.02em tracking, white `#FFFFFF` |
| Subhead 1 (primary value) | DM Sans 500, -0.01em tracking, light cyan-blue `#AAC3E6` |
| Subhead 2 (coverage) | DM Sans 500, -0.01em tracking, dimmer cyan-blue `#8CA5C8` |
| Pro label (IAP only) | DM Sans 600, +0.02em tracking, cyan `#22D3EE` |
| Savings badge (Annual only) | Filled amber pill `#FACC15`, DM Sans 700 ink text inside |
| Wordmark | Official DealGapIQ wordmark PNG (`play-store/assets/dealgapiq-wordmark-darkmode.png`), black background converted to alpha so it sits cleanly on the navy |
| Phone mockup | Programmatically built rounded-rect bezel `#14161C`, ~10% corner radius, dynamic island pill at top, real Strategy-tab screenshot (Target Buy / Income Value / Market Price / DEAL GAP -29.1%) inside |

---

## How to regenerate everything

```bash
# Brand pack: Play Store, IAP promos, OG image
cd frontend/public/app-store
python3 apply_brand_pack.py

# App Store screenshots (8 portrait, including hero)
cd connect
python3 apply_screenshot_brand.py
```

Both scripts are deterministic — same inputs always produce the same outputs, and they overwrite in place. To change copy on any asset, edit the relevant builder function and re-run.

### Required inputs (already in the repo)

- `play-store/assets/dealgapiq-wordmark-darkmode.png` — official brand wordmark
- `connect/assets/hero-screenshot-strategy-tab.png` — the real iPhone capture used inside every phone mockup
- DM Sans Variable font at `/tmp/dm-sans-fonts/DMSans-Variable.ttf` (downloadable from [Google Fonts](https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf))

### Required Python deps

```bash
pip install Pillow
```

That's it. No numpy, no opencv, no fancy dependencies.

---

## Note on screenshot variation

App Store Connect screenshots #2-#8 (`connect/screenshots/02-08-*.png`) use **feature-specific headlines** rather than the unified "Discover Deals" message. This is intentional and aligns with App Store conversion best practice:

- Screenshot #1 (hero) carries the brand pitch
- Screenshots #2-#8 each spotlight a single specific feature (color-coded map, verdict screen, off-MLS coverage, etc.)

If you'd prefer all 8 screenshots to share the same headline for maximum brand-message consistency (e.g., for a coordinated launch campaign), edit the `SCREENSHOT_CONFIGS` list in `connect/apply_screenshot_brand.py` and re-run. The trade-off: less feature differentiation in the screenshot carousel, harder for users to scan-and-understand what each tab does.

---

## What was replaced

The unified pack supersedes earlier asset versions. Old files are kept (not deleted) so you can A/B test if curious:

| New | Replaces |
|---|---|
| `connect/screenshots/01-hero-investors-lens.png` (v2 — bigger phone, tighter layout) | Earlier hero with smaller phone |
| `play-store/feature-graphic-1024x500-v5-discover-deals.png` | `feature-graphic-1024x500-v3-verdict-stream.png`, `-v4-investors-lens.png` |
| `iap-promo/dealgapiq-iap-pro-monthly-v2-1024x1024.png` | `dealgapiq-iap-pro-monthly-1024x1024.png` ("UNLIMITED ANALYSIS" clip-art) |
| `iap-promo/dealgapiq-iap-pro-annual-v2-1024x1024.png` | `dealgapiq-iap-pro-annual-1024x1024.png` ("SAVE $130" bar chart) |
| `social/og-discover-deals-1200x630.png` | (none — first OG image) |

---

## Folder map

```
frontend/public/app-store/
├── README.md                                ← you are here
├── apply_brand_pack.py                      ← builds Play Store, IAP, OG (4 assets)
│
├── connect/                                 ← App Store Connect (iOS)
│   ├── README.md                            ← detailed App Store upload guide + copy
│   ├── apply_screenshot_brand.py            ← builds 8 portrait screenshots
│   ├── icon-1024x1024-v2-fullbleed.png      ← App Store icon
│   ├── assets/
│   │   └── hero-screenshot-strategy-tab.png ← shared real-screenshot input
│   ├── copy/                                ← subtitle, promo text, video brief
│   └── screenshots/
│       ├── 01-hero-investors-lens.png       ← UNIFIED message + real screenshot
│       └── 02-08-*.png                      ← feature-specific
│
├── play-store/                              ← Google Play Console
│   ├── README.md
│   ├── apply_brand.py                       ← legacy script for v3/v4 banners
│   ├── assets/
│   │   └── dealgapiq-wordmark-darkmode.png  ← shared wordmark input
│   ├── feature-graphic-1024x500-v5-discover-deals.png   ← RECOMMENDED (unified)
│   ├── feature-graphic-1024x500-v4-investors-lens.png   ← prior version (kept for A/B)
│   ├── feature-graphic-1024x500-v3-verdict-stream.png   ← prior version
│   └── feature-graphic-1024x500-v1/v2*.png  ← earliest drafts
│
├── iap-promo/                               ← Subscription promo images
│   ├── dealgapiq-iap-pro-monthly-v2-1024x1024.png       ← RECOMMENDED (unified)
│   ├── dealgapiq-iap-pro-annual-v2-1024x1024.png        ← RECOMMENDED (unified)
│   ├── dealgapiq-iap-pro-monthly-1024x1024.png          ← v1 (clip-art, supersede)
│   └── dealgapiq-iap-pro-annual-1024x1024.png           ← v1 (bar chart, supersede)
│
└── social/                                  ← Open Graph / social share
    └── og-discover-deals-1200x630.png       ← for site OG meta tags
```
