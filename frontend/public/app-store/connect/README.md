# DealGapIQ — App Store Connect Asset Pack

Production-ready visual and copy assets for the **iOS App Store** (App Store Connect). Designed to maximize install conversion at every above-the-fold touchpoint: search results thumbnail, search snippet, listing hero.

> **Status:** Ready to upload. All assets at native Apple-spec resolution.
>
> **Companion folder:** `../play-store/` for the Google Play Store equivalents.

---

## TL;DR — What to upload tonight

| App Store Connect field | File | Path inside Connect |
|---|---|---|
| App Icon (1024×1024) | `icon-1024x1024-v2-fullbleed.png` | App Information → App Icon |
| Screenshots ×8 | `screenshots/01-08-*.png` | iOS App → 6.9" Display Screenshots |
| Subtitle | _see `copy/subtitle.md`_ | App Information → Subtitle |
| Promotional Text | _see `copy/promotional-text.md`_ | iOS App → Promotional Text |
| App Preview Video | _produce per `copy/app-preview-video-brief.md`_ | iOS App → App Previews |

Drag-drop the screenshots into the 6.9" Display slot in the order numbered (`01-`, `02-`, …, `08-`). Apple will use the same set, scaled, for older iPhone sizes — no separate uploads needed unless you want to art-direct each form factor.

---

## Critical finding: the existing app icon will hurt conversion

The current iOS app icon (`frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`) is a **thin cyan outline of a brain+house silhouette on solid black**. At the 60×60 thumbnail size shown in App Store search results, the outline strokes nearly disappear against the black background — the icon reads as a black square.

Apple's Human Interface Guidelines explicitly recommend **filled iconography over outlines** for exactly this reason: outlines collapse at small sizes, and the App Store is optimized around browse-and-tap behavior where icons must compete for the eye in a dense grid.

### What's in this pack

- **`icon-1024x1024-v2-fullbleed.png`** — Filled cyan brain+head silhouette with white house, on a deep navy radial gradient, with a thin Deal Gap accent bar (cyan → yellow → red) at the bottom. Full-bleed: every edge pixel is part of the design, ready for iOS to apply its own rounded-corner mask. **Upload this to App Store Connect.**

### You also need to replace the in-app icon

The icon uploaded to App Store Connect is the **listing icon only**. The icon shown on the home screen, in the App Switcher, and in Spotlight comes from the `AppIcon.appiconset` inside the iOS Xcode project. After you ship this asset pack:

1. Take `icon-1024x1024-v2-fullbleed.png`
2. Generate the full set of icon sizes (29×29 through 1024×1024) using a tool like **[appicon.co](https://appicon.co/)** or `xcrun actool` — Apple's spec requires 14 size variants
3. Replace `frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` and the other size variants
4. Sync via `npx cap sync ios` and rebuild

Otherwise, the App Store listing will show the new icon while users' home screens will show the old one — disorienting.

---

## Asset inventory

```
connect/
├── README.md                                  ← this file
├── apply_screenshot_brand.py                  ← Python script that builds the 8 screenshots from raw AI visuals
├── icon-1024x1024-v2-fullbleed.png            ← App icon (upload to App Store Connect)
│
├── screenshots/
│   ├── 01-hero-investors-lens.png             ← THE most important screenshot — first impression
│   ├── 02-search-color-coded.png              ← Color-coded map markers
│   ├── 03-verdict-three-cards.png             ← Target Buy / Income Value / Market Price
│   ├── 04-pills-deal-maybe-pass.png           ← DEAL / MAYBE / PASS verdict pills
│   ├── 05-coverage-beyond-mls.png             ← Off-MLS coverage (Foreclosure / Pre-Foreclosure / Auction)
│   ├── 06-comps-no-spreadsheet.png            ← Comparable property analysis
│   ├── 07-dealmaker-scenarios.png             ← Live scenario modeling
│   └── 08-neighborhoods-heatmap.png           ← Neighborhood deal-density heatmap
│
└── copy/
    ├── subtitle.md                            ← 30-char subtitle (with primary + 4 alternates + A/B plan)
    ├── promotional-text.md                    ← 170-char promo text (with primary + 3 alternates)
    └── app-preview-video-brief.md             ← 30-second App Preview shot list, voiceover script, production guide
```

All screenshots are **1290 × 2796 pixels** (iPhone 6.9" Display, the size Apple ranks first for search). Apple auto-scales these for the 6.7" / 6.5" / 5.5" iPhone slots — you do not need to upload smaller variants. iPad screenshots are optional; if you skip them, Apple will use the iPhone screenshots and a small "iPhone screenshots displayed" disclaimer will show on iPad.

---

## Screenshot order — strategy and rationale

Apple displays screenshots in the order you upload them. Users typically only see screenshots 1-3 in search results (the rest require a tap into the listing). **Order is a conversion lever, not a presentation choice.**

### Recommended order (matches the file numbering)

| # | Filename | Purpose | What stops the scroll |
|---|---|---|---|
| 1 | `01-hero-investors-lens.png` | **The pitch.** Establishes the brand metaphor and value prop in one image. | Bold headline + lens visual |
| 2 | `02-search-color-coded.png` | **The Aha.** Shows that every property is pre-graded — answers "what does this app actually do?" | Dense color-coded map pins |
| 3 | `03-verdict-three-cards.png` | **The depth.** Proves there's real financial analysis, not just a sticker. | Three-card verdict + Deal Gap bar |
| 4 | `04-pills-deal-maybe-pass.png` | **The mechanic.** Names the verdict framework users will live in. | DEAL / MAYBE / PASS pills |
| 5 | `05-coverage-beyond-mls.png` | **The differentiator.** Off-MLS coverage is the moat — most apps stop at MLS. | Four source category cards |
| 6 | `06-comps-no-spreadsheet.png` | **The save-time pitch.** Comps without manual spreadsheet work. | Subject + comps grid + map |
| 7 | `07-dealmaker-scenarios.png` | **The power-user pitch.** Real-time scenario modeling. | Sliders + live profit number |
| 8 | `08-neighborhoods-heatmap.png` | **The discovery pitch.** Find hot zones, not just hot listings. | Striking heatmap visual |

### Why this order beats "feature checklist" order

The first three screenshots have to do three jobs in sequence:

1. **Earn attention** (hero — tells you what the brand stands for)
2. **Earn comprehension** (search map — shows what the product looks like in use)
3. **Earn trust** (verdict screen — proves the analysis is substantive, not gimmicky)

Screenshots 4-8 deepen the pitch for users who are scrolling because they want to be convinced. They escalate from "the basic mechanic" to "the moat" to "the power features."

### Alternates worth A/B testing

- **Swap #4 and #5.** If the App Store data shows users dropping off at #4, the off-MLS coverage might be a stronger third-tap hook than the verdict pills.
- **Promote #5 to position #2.** If "off-MLS coverage" is the single most-asked-about feature in your first 30 days of reviews, lead with it earlier.
- **Replace #8 with a video poster frame.** Once the App Preview video is live, you may not need a heatmap screenshot — Apple will use the video as slot #1.

---

## Subtitle — recommended

> **Every US deal, pre-scored.** _(26 chars / 30 max)_

Full options and A/B test plan: see `copy/subtitle.md`.

---

## Promotional Text — recommended

> **See every US listing through an investor's lens. Pre-scored DEAL, MAYBE, or PASS. MLS + foreclosure + pre-foreclosure + auction. Verdict in seconds.** _(154 chars / 170 max)_

Full options and rotation strategy: see `copy/promotional-text.md`.

---

## App Preview Video

App Store Connect lets you upload one 15-30 second video per device size. Apple uses it as the **first slot in the screenshot carousel** and autoplays it (silently) in search results — meaningfully higher impact than any single screenshot.

Videos must be **screen recordings of your actual app** (Apple rejects marketing animations and lifestyle b-roll). Full shot list, voiceover script, music direction, and production options: see `copy/app-preview-video-brief.md`.

---

## Technical specs (for compliance reviewers)

| Asset | Format | Size | Color | File constraint |
|---|---|---|---|---|
| App Icon | PNG (no alpha) | 1024 × 1024 | sRGB or P3 | < 1 MB (current: ~1 MB ✓) |
| iPhone 6.9" Screenshot | PNG or JPEG | 1290 × 2796 portrait | sRGB or P3 | < 8 MB each |
| Subtitle | Plain text | 30 chars max | n/a | n/a |
| Promotional Text | Plain text | 170 chars max | n/a | n/a |
| App Preview Video | MP4 (H.264, AAC) | 1080 × 1920 portrait | Rec 709 | ≤ 500 MB, 15-30 seconds |

iPad screenshot sizes (optional): 2064 × 2752 (iPad 13") or 2048 × 2732 (iPad 12.9"). Skipping these is acceptable for a v1 launch.

---

## How to regenerate or iterate

### To re-render all screenshots (e.g., after copy tweaks)

The 8 screenshots are built deterministically by `apply_screenshot_brand.py` from raw AI-generated phone visuals (stored at `~/.cursor/projects/Users-bradgeisen-IQ-Data-dealscope/assets/screenshot-NN-*-raw.png`).

```bash
cd frontend/public/app-store/connect
python3 apply_screenshot_brand.py
```

To change a headline, subhead, or layout for a specific screenshot, edit the corresponding entry in the `SCREENSHOT_CONFIGS` list at the bottom of `apply_screenshot_brand.py` and re-run.

To regenerate a raw AI visual, use the same prompt structure as the existing ones (see prior agent transcripts) and save to the assets folder with the matching filename.

### To regenerate the icon

Use the prompt in the agent transcript or replace with a hand-crafted asset. The script does not currently auto-build the icon — it was generated and cropped manually because icon design needs more art direction than a programmatic template can provide.

### Required font

`apply_screenshot_brand.py` expects DM Sans Variable at:

```
/tmp/dm-sans-fonts/DMSans-Variable.ttf
```

If the file is missing, download from [Google Fonts](https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf):

```bash
mkdir -p /tmp/dm-sans-fonts
curl -L -o /tmp/dm-sans-fonts/DMSans-Variable.ttf \
  "https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf"
```

---

## Brand specifications used in this pack

Reused from `../play-store/README.md` for consistency:

| Element | Spec |
|---|---|
| Wordmark | DM Sans 800, -0.02em tracking, "DealGap" in white + "IQ" in cyan #22D3EE |
| Headlines (screenshots) | DM Sans 800, -0.02em tracking, white #FFFFFF, 120-160pt depending on length |
| Subhead | DM Sans 500, -0.01em tracking, light cyan-blue #AAC3E6, 46pt |
| Off-MLS badge | White rounded chip, DM Sans 600, -0.01em tracking, ink #1B2141 + blue #0465F2 separators |
| Background | Vertical navy gradient #0A1428 → #04081A |
| Phone glow | Radial cyan #22D3EE at 22% intensity centered behind the phone |

---

## Known caveats

- **Icon variants need ALL the iOS sizes generated** before shipping the next app build. The 1024×1024 alone is for App Store Connect; the home-screen icon needs 14 size variants. Use [appicon.co](https://appicon.co/) or the `Assets.xcassets` editor in Xcode.
- **Splash screen is currently pure black** with no branding (`frontend/ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png`). Not addressed in this pack but worth a future pass — even a centered wordmark would be an improvement.
- **App Preview video is not produced** — only the brief is. Producing the video requires recording from the running app (Xcode simulator or device) which is not in scope for this asset pack. See `copy/app-preview-video-brief.md` for the production options.
- **iPad screenshots are not produced.** If the iOS app supports iPad, Apple will display the iPhone screenshots with a small "iPhone screenshots shown" notice. Acceptable for launch; consider native iPad screenshots once the app has revenue to justify the design effort.
- **The verdict screen mockup (#3)** says "Verdict" on the green pill rather than a property-specific verdict like "DEAL". This was an AI rendering choice and reads cleanly in context — no fix needed unless you specifically want "DEAL" to appear.

---

## Suggested next steps after upload

1. **Upload assets and submit for review** if not already in review
2. **Generate the in-app icon size variants** from the new 1024×1024 and replace in the Xcode project
3. **Record the App Preview video** following the brief, even a DIY 4-hour cut will beat no preview
4. **Set up App Store Connect Analytics** to track conversion rate baseline before and after these assets go live
5. **Plan first A/B test** — rotate subtitle between PRIMARY and one alternate after 30 days of baseline data
6. **Update the splash screen** to a branded version (low priority, but high "cleanliness" win)
