# DealGapIQ — Brand, Color & Assets Guide for Instructional Video

This guide is for creating **instructional videos** (tutorials, demos, marketing clips) that stay on-brand. Use it when recording screen captures, designing lower thirds, intro/outro cards, and thumbnails.

---

## 1. Brand Overview

| Item | Value |
|------|--------|
| **Product name** | DealGapIQ |
| **Tagline / positioning** | Real estate investment analytics across 6 strategies |
| **Voice** | Confident but approachable; data-rich, plain-English; like a financial advisor who explains clearly |
| **Logo treatment** | "DealGap" (white or dark) + "IQ" (accent teal/sky) |

**Core idea:** When viewers see **teal/sky blue**, they should associate it with DealGapIQ — our voice, guidance, and primary actions.

---

## 2. Color Palette

### 2.1 Primary brand colors (use in every video)

| Name | Hex | RGB | Use in video |
|------|-----|-----|--------------|
| **Brand blue** | `#0465f2` | 4, 101, 242 | Primary CTAs, key data, links |
| **Sky / Teal (accent)** | `#0EA5E9` | 14, 165, 233 | IQ voice, tips, highlights, logo "IQ", borders |
| **Deep sky** | `#38bdf8` | 56, 189, 248 | Lighter accent, hover states, subtle highlights |
| **Navy (dark)** | `#07172e` | 7, 23, 46 | Dark backgrounds, text on light |
| **True black** | `#000000` | 0, 0, 0 | App dark theme base, full-screen B-roll |

### 2.2 Backgrounds (for lower thirds, cards, full-screen)

| Name | Hex | Use |
|------|-----|-----|
| **Card / panel** | `#0C1220` | Cards, panels, overlays |
| **Elevated panel** | `#101828` | Buttons, selected states |
| **Page section** | `#060B14` | Section backgrounds in dark theme |
| **Light surface** | `#F8FAFC` | Light-mode B-roll or contrast cards |

### 2.3 Text hierarchy (for titles and captions)

| Tier | Hex | Use |
|------|-----|-----|
| **Headings** | `#F1F5F9` | Titles, section headers |
| **Body** | `#CBD5E1` | Body copy, descriptions |
| **Secondary** | `#94A3B8` | Supporting text |
| **Labels** | `#7C8CA0` | Small labels, captions |

### 2.4 Semantic / status colors (use sparingly, for meaning)

| Meaning | Name | Hex |
|---------|------|-----|
| **Positive / success** | Green | `#34d399` |
| **Warning / caution** | Gold | `#fbbf24` |
| **Negative / loss** | Red | `#f87171` |
| **Info / neutral accent** | Sky | `#38bdf8` |

### 2.5 Strategy colors (only when showing strategy-specific content)

| Strategy | Hex | Use only when |
|----------|-----|----------------|
| Long-Term Rental | `#0465f2` | Showing LTR metrics or UI |
| Short-Term Rental | `#8b5cf6` | Showing STR metrics or UI |
| BRRRR | `#f97316` | Showing BRRRR metrics or UI |
| Fix & Flip | `#ec4899` | Showing flip metrics or UI |
| House Hack | `#0EA5E9` | Showing house hack metrics or UI |
| Wholesale | `#84cc16` | Showing wholesale metrics or UI |

---

## 3. Typography for video

Use these in editing software (lower thirds, titles, captions):

| Role | Font | Weight | Notes |
|------|------|--------|--------|
| **Headlines / titles** | Inter or DM Sans | 700 (Bold) | Clear, modern |
| **Body / captions** | Inter or Source Sans 3 | 400 (Regular) | Readable at small sizes |
| **Numbers / metrics** | Inter or Space Mono | 600–700 | Tabular figures for alignment |
| **Labels / uppercase** | Inter | 700 | Letter-spacing ~0.12em for labels |

**Sizes (for 1920×1080):**
- **Hero title:** 48–56 px  
- **Section title:** 28–36 px  
- **Body / caption:** 18–24 px  
- **Small label:** 12–14 px, uppercase  

---

## 4. Logo & assets

### 4.1 Where to find assets

| Asset | Path (relative to repo) |
|-------|--------------------------|
| **IQ logo (SVG)** | `frontend/public/images/IQ-Logo.svg` |
| **IQ logo icon (PNG)** | `frontend/public/images/iq-logo-icon.png` |
| **DealGapIQ icon** | `frontend/public/images/dealgapiq-icon.png` |
| **IQ icon (blue)** | `frontend/public/images/iq-icon-blue.png` |
| **Favicon** | `frontend/public/favicon.png` (referenced in app) |

### 4.2 Logo usage in video

- **Full lockup:** "DealGap" (white or `#F1F5F9`) + "IQ" (accent `#0EA5E9`).
- **Icon only:** Use `iq-logo-icon.png` or `IQ-Logo.svg` for watermarks, end cards, or small bugs.
- **Clear space:** Keep at least one "IQ" height of clear space around the logo.
- **Don’t:** Stretch, rotate, or add effects (drop shadow, glow) that obscure the mark. Use solid backgrounds for contrast.

### 4.3 Safe areas

- **Lower third:** Keep text and logo within the inner 90% of width; avoid critical UI at bottom (e.g. app nav).
- **Bug / watermark:** Typically top-right or bottom-right; small (e.g. 80–120 px wide for 1080p).

---

## 5. Gradients & effects (optional)

Use sparingly so they don’t compete with the app UI:

| Name | Value | Use |
|------|--------|-----|
| **Brand gradient** | `linear-gradient(135deg, #0465f2 0%, #0EA5E9 100%)` | CTA buttons, hero cards |
| **Dark background** | `linear-gradient(135deg, #07172e 0%, #1f2937 100%)` | Intro/outro full-screen |
| **Teal glow** | `0 0 20px rgba(14,165,233,0.15)` | Subtle highlight behind logo or key stat |
| **Card border (teal)** | `1px solid rgba(14,165,233,0.25)` | Panels, quote cards |

---

## 6. Video-specific rules

### 6.1 Lower thirds

- **Background:** `#0C1220` or `#101828` with border `rgba(14,165,233,0.25)`.
- **Title text:** `#F1F5F9`, bold (700).
- **Subtitle:** `#94A3B8` or `#CBD5E1`.
- **Accent line:** 2–4 px bar in `#0EA5E9` (left or bottom).

### 6.2 Intro / outro cards

- **Background:** `#000000` or `#060B14`; optional subtle radial gradient.
- **Logo:** Centered; "DealGap" white, "IQ" `#0EA5E9`.
- **Tagline (optional):** "Real estate investment analytics" in `#94A3B8`.
- **Duration:** Intro ≤ 3 s; outro 5–8 s with CTA (e.g. dealgapiq.com).

### 6.3 Thumbnails

- **Primary accent:** Teal/sky `#0EA5E9` or brand blue `#0465f2`.
- **Contrast:** Use dark background (`#07172e`, `#0C1220`) so text and logo pop.
- **Text:** Short, bold; avoid more than 4–5 words.
- **Logo:** Include small DealGapIQ mark for recognition.

### 6.4 Screen recording

- Prefer the **app’s dark theme** for consistency with this guide.
- Avoid cropping out key UI (e.g. score, strategy selector) unless intentionally focusing on one element.
- If highlighting a button or link, use a subtle teal ring (`#0EA5E9`, 2–3 px) or a soft glow; don’t rely on default OS focus rings only.

### 6.5 "IQ" voice and tips

When the video is explaining a tip or guidance as "IQ":
- Use teal/sky (`#0EA5E9`) for the label (e.g. "IQ's Pro Tip") and any left border or icon.
- Keep strategy-specific results in their strategy colors (see §2.5), not teal.

---

## 7. Export & technical specs (recommended)

| Spec | Recommendation |
|------|-----------------|
| **Resolution** | 1920×1080 (1080p) or 1280×720 (720p) |
| **Frame rate** | 24, 25, or 30 fps (consistent across a series) |
| **Aspect ratio** | 16:9 for YouTube / general; 9:16 for shorts/reels if needed |
| **Color space** | sRGB for web delivery |
| **Captions** | Provide captions; use body text color `#CBD5E1` on dark or `#374151` on light |

---

## 8. Quick reference — hex codes

```
Brand blue:    #0465f2
Teal / Sky:    #0EA5E9
Sky light:     #38bdf8
Navy:          #07172e
Black:         #000000
Card:          #0C1220
Panel:         #101828
Heading:       #F1F5F9
Body:          #CBD5E1
Secondary:     #94A3B8
Success:       #34d399
Warning:       #fbbf24
Negative:      #f87171
```

---

## 9. Source of truth in codebase

- **Colors (frontend):** `frontend/src/constants/colors.ts`
- **Verdict/dark UI tokens:** `frontend/src/components/iq-verdict/verdict-design-tokens.ts`
- **Global CSS variables:** `frontend/src/app/globals.css` (`:root`)
- **Design system (semantics):** `docs/DESIGN_SYSTEM.md`, `frontend/DESIGN_SYSTEM.md`

When in doubt, match the app: use the same hex values and hierarchy so the video feels like a natural extension of the product.
