# DealGapIQ — Brand Color & Style Guide

> **Visual identity reference only.** Colors, typography, spacing, surfaces, and
> component styling. No marketing copy, voice, or positioning — for those, see the
> marketing library.
>
> **Theme:** Dark-first, dual-theme (dark + light). True-black base with deep-navy
> elevated surfaces; sky-blue glow for elevation in dark mode, soft drop shadows in
> light mode.
>
> **Design principles:** Size and weight carry hierarchy, not visibility. Color
> carries meaning, not decoration.
>
> **Last updated:** June 2026 · **Status:** v1

---

## 1. Logo

The DealGapIQ identity has two locked assets.

**Wordmark — "DealGap" + "IQ":**
- **"IQ" is always cyan `#0FA4E9`.** Never recolor it.
- **"DealGap"** flips with the background:
  - On dark/black → **white `#FFFFFF`**
  - On light/white → **near-black navy `#0F172A`**
- A short **cyan underline bar** sits beneath the wordmark — it is part of the mark.

**Icon (app/avatar mark):** a single-line illustration of a **human head profile with a house inside it**, drawn in cyan `#0FA4E9`. Use where a square/compact mark is needed.

**Logo font:** Source Sans 3 (the wordmark only — distinct from the UI font).

**Rules:**
- Clear space ≥ the height of the "I" in "IQ" (~12% of logo height) on all sides.
- Minimum size: wordmark ≥ 120 px wide; icon ≥ 32 px.
- Default to the mark on **black `#000000`** (dark-first).
- Never: recolor "IQ", stretch/skew, add outlines or drop shadows, recreate the letterforms in another font, or place the wordmark on a busy image without a solid scrim.

---

## 2. Color System

All colors below list **Dark / Light** values. Dark mode is the default theme.

### 2.1 Brand / accent
| Role | Dark | Light | Notes |
|---|---|---|---|
| **Sky (primary accent)** | `#0FA4E9` | `#0465F2` | The signature color — CTAs, links, focus, the "IQ", icon. |
| **Sky Light** | `#38BDF8` | `#0354D1` | Highlights, hover, gradient end. |
| **Brand Blue** | `#0465F2` | `#0465F2` | Gradient origin, deep button states. |

### 2.2 Surfaces (background hierarchy)
| Surface | Dark | Light | Usage |
|---|---|---|---|
| **Base** | `#000000` | `#EAEEF3` | Page shell, outermost containers |
| **Section** | `#060B14` | `#F1F4F8` | Alternating section backgrounds |
| **Card** | `#000000` | `#FFFFFF` | Cards, panels, modals |
| **Card Hover** | `#0C1220` | `#F5F7FA` | Card hover state |
| **Elevated** | `#0C1220` | `#F1F4F8` | Tooltips, dropdowns, nested panels |
| **Input** | `#0C1220` | `#FFFFFF` | Form fields |
| **Overlay** | `rgba(0,0,0,0.8)` | `rgba(0,0,0,0.5)` | Modal backdrops |

**Surface contract:** page shells → **Base**. Cards/panels inside shells → **Card**. Content nested inside cards → **Elevated**. Never hardcode hex backgrounds in product code — use the surface tokens.

### 2.3 Text (four-tier slate hierarchy)
| Tier | Dark | Light | Usage |
|---|---|---|---|
| **Heading** | `#F1F5F9` | `#0F172A` | Titles, section headers |
| **Body** | `#CBD5E1` | `#1E293B` | Paragraphs |
| **Secondary** | `#94A3B8` | `#475569` | Supporting text, metadata |
| **Label** | `#7C8CA0` | `#64748B` | Field labels, captions |
| **Muted** | `#64748B` | `#94A3B8` | Disabled, timestamps |
| **Inverse** | `#000000` | `#FFFFFF` | Text on accent backgrounds |
| **Link** | `#0FA4E9` | `#0465F2` | Hyperlinks, interactive text |

### 2.4 Status colors
Reserved for data state — never decoration.
| Status | Dark | Light | Meaning |
|---|---|---|---|
| **Positive** | `#34D399` | `#15803D` | Profit, cash flow, success |
| **Warning** | `#FBBF24` | `#B7791F` | Caution, moderate, scores |
| **Negative** | `#F87171` | `#B42318` | Loss, high risk, failure |
| **Info** | `#38BDF8` | `#0465F2` | Neutral / informational |
| **Income** | `#FACC15` | `#B7791F` | Revenue, income highlights |

### 2.5 Strategy colors
Intentionally distinct from status colors so "which strategy" never reads as "how it performed."
| Strategy | Dark | Light |
|---|---|---|
| Long-Term Rental | `#0465F2` | `#0344A6` |
| Short-Term Rental | `#8B5CF6` | `#6D28D9` |
| BRRRR | `#F97316` | `#C2410C` |
| Fix & Flip | `#EC4899` | `#BE185D` |
| House Hack | `#0FA4E9` | `#0369A1` |
| Wholesale | `#84CC16` | `#4D7C0F` |

### 2.6 Borders
| Level | Dark | Light | Usage |
|---|---|---|---|
| **Subtle** | `rgba(14,165,233,0.25)` | `#D5DBE4` | Decorative separators |
| **Default** | `#334155` | `#B8C4CE` | Card borders, dividers |
| **Strong** | `#475569` | `#8896A6` | Emphasis borders |
| **Focus** | `#0FA4E9` | `#0465F2` | Focus rings, selected state |

In dark mode, hairline borders are often `rgba(255,255,255,0.07)` (default) and `rgba(255,255,255,0.12)` (stronger).

---

## 3. Typography

### 3.1 Font families
| Font | Role | Weights |
|---|---|---|
| **Poppins** | **Primary UI** — headings, body, controls (`font-sans`) | 400, 500, 600, 700 |
| **Inter** | Secondary / fallback in the sans stack; financial data | 100–900 (variable) |
| **Source Sans 3** | **Logo wordmark only** (`font-logo`) | 400, 600, 700 |
| **DM Sans** | Landing-page section accents | 400, 500, 600, 700 |
| **Space Mono** | Monospace accent (code, data labels) | 400, 700 |

**Stack:** `font-sans` = Poppins → Inter → `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`. All fonts are self-hosted (no external requests).

### 3.2 Display scale
| Token | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| `display-xl` | 4.5rem (72px) | 1.1 | -0.02em | 700 |
| `display-lg` | 3.75rem (60px) | 1.1 | -0.02em | 700 |
| `display-md` | 3rem (48px) | 1.2 | -0.01em | 700 |
| `display-sm` | 2.25rem (36px) | 1.2 | -0.01em | 700 |

### 3.3 Component scale
| Role | Size | Weight | Notes |
|---|---|---|---|
| Score / hero number | 56px | 700 | tabular figures |
| Heading | 22px | 700 | section titles |
| Body | 16px | 400 | line-height ~1.65 |
| Body Small | 15px | 400 | dense layouts |
| Financial | 16px | 600 | tabular figures |
| Financial Large | 24px | 700 | tabular figures |
| Label | 12–13px | 600–700 | UPPERCASE, +0.04–0.12em tracking |
| Caption | 12–13px | 500 | footnotes, helpers |

### 3.4 Weight conventions
- **700** — headlines, section titles, CTAs
- **600** — financial numbers, subheadings, emphasis
- **500** — labels, UI controls
- **400** — body text

Financial numbers always use `font-variant-numeric: tabular-nums` for column alignment.

---

## 4. Spacing

8px base scale.
| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Tight gaps, icon padding |
| `sm` | 8px | Inline spacing |
| `md` | 16px | Default component padding |
| `lg` | 24px | Section padding |
| `xl` | 32px | Large section gaps |
| `2xl` | 48px | Page-level spacing |

**Container padding:** 16px mobile · 24px desktop.

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `xl` | 16px (1rem) | Standard cards |
| `2xl` | 20px (1.25rem) | Large cards |
| `3xl` | 24px (1.5rem) | Hero sections, modals |
| `4xl` | 32px (2rem) | Feature cards |
| `pill` | 40px | Buttons, tags, badges |

Cards commonly use 14–16px radius. Progress bars / small chips use 4px.

---

## 6. Elevation & Shadows

**Dark mode** uses sky-blue glow for elevation. **Light mode** uses soft neutral drop shadows.

### 6.1 Semantic
| Token | Dark | Light |
|---|---|---|
| Card | `0 0 20px rgba(14,165,233,0.15)` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| Card hover | `0 0 30px rgba(14,165,233,0.25)` | `0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` |
| Dropdown | `0 4px 12px rgba(0,0,0,0.5)` | `0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)` |

### 6.2 Utility shadows
| Class | Value |
|---|---|
| `shadow-brand` | `0 4px 14px rgba(4,101,242,0.25)` |
| `shadow-brand-lg` | `0 10px 40px rgba(4,101,242,0.3)` |
| `shadow-glow-sky` | `0 0 24px rgba(56,189,248,0.2)` |
| `shadow-glow-sky-lg` | `0 0 36px rgba(56,189,248,0.35)` |
| `shadow-glow-teal` | `0 0 20px rgba(15,164,233,0.3)` |
| `shadow-glow-cyan` | `0 0 20px rgba(15,164,233,0.5)` |
| `shadow-glow-blue` | `0 0 20px rgba(4,101,242,0.5)` |

### 6.3 Card glow system (dark)
Persistent teal illumination on key cards:
```
background:  #000000
border:      1px solid rgba(15,164,233,0.25)
box-shadow:  0 0 30px rgba(15,164,233,0.08), 0 0 60px rgba(15,164,233,0.04)
hover →      border rgba(15,164,233,0.55); shadow 0 0 50px rgba(15,164,233,0.15)
active →     2px solid rgba(15,164,233,0.5); brighter glow
```

---

## 7. Gradients

| Name | Value |
|---|---|
| Brand | `linear-gradient(135deg, #0465F2 0%, #38BDF8 100%)` |
| Brand (3-stop) | `linear-gradient(135deg, #0465F2 0%, #0FA4E9 58%, #38BDF8 100%)` |
| Brand vertical | `linear-gradient(180deg, #0465F2 0%, #38BDF8 100%)` |
| Brand radial | `radial-gradient(circle at 20% 20%, rgba(56,189,248,0.24), transparent 32%), radial-gradient(circle at 85% 12%, rgba(4,101,242,0.18), transparent 28%)` |
| Hero | `radial-gradient(ellipse 80% 60% at 50% 30%, rgba(12,18,32,0.6) 0%, #000 100%)` |
| Dark | `linear-gradient(135deg, #07172E 0%, #1F2937 100%)` |
| Teal | `linear-gradient(135deg, #0FA4E9 0%, #0284C7 100%)` |
| Sky | `linear-gradient(135deg, #38BDF8 0%, #0FA4E9 100%)` |

Use gradients for CTAs, hero backgrounds, and accent bars — never for large flat content areas.

---

## 8. Layout & Page Styles

### 8.1 Breakpoints
| Token | Range |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |

Mobile-first. Compose layouts upward from the smallest viewport.

### 8.2 Page structure
- **Page shell:** full height, `--surface-base` background.
- **Sections:** alternate `--surface-base` / `--surface-section` for rhythm; never flat-on-flat.
- **Cards:** `--surface-card` with a `--border-default` hairline and the card shadow/glow.
- **Nested panels:** `--surface-elevated`.
- Depth comes from subtle radial gradients and glow, not heavy borders.

---

## 9. Component Styles

Visual specs only.

### 9.1 Buttons
| Variant | Style |
|---|---|
| **Primary** | Sky background (or brand gradient), inverse text, `pill` radius (40px), weight 700, `shadow-brand`. Height ~52px. |
| **Secondary / outline** | Transparent background, sky text + 1px sky border, `pill` radius. Height ~40px. |
| **Ghost / text** | Transparent, link-colored text, no border. |

### 9.2 Cards
```
background:    var(--surface-card)
border:        1px solid var(--border-default)
border-radius: 14–16px
box-shadow:    card shadow (glow in dark / drop shadow in light)
hover:         surface-card-hover + card-hover shadow
```

### 9.3 Inputs
- Background `--surface-input`, 1px `--border-default`, focus ring `--border-focus` (sky).
- Radius matches cards; comfortable touch target height (≥ 40px).

### 9.4 Badges / tags / pills
- `pill` radius, 10–12px UPPERCASE label text, weight 700.
- Tinted background using the relevant accent at ~10% opacity (e.g., `sky.dim`, `green.dim`, `gold.dim`), text in the full accent color.

### 9.5 Dividers / progress
- Divider: 1px, `--border-subtle` / 7% white in dark.
- Progress bar: 7px tall, 4px radius, track at ~5% white opacity, fill in the relevant accent.

---

## 10. Motion

Subtle, purposeful micro-interactions.
| Class | Duration | Easing | Behavior |
|---|---|---|---|
| `fade-in` | 0.5s | ease-out | Opacity 0 → 1 |
| `slide-up` | 0.5s | ease-out | TranslateY 20px → 0 + fade |
| `slide-in-right` | 0.3s | ease-out | TranslateX 20px → 0 + fade |
| `float-slow / medium / fast` | 6s / 5s / 4s | ease-in-out | Gentle vertical float (infinite) |
| `pulse-soft` | 2s | ease-in-out | Subtle opacity pulse |
| `score-fill` | 1s | ease-out | SVG stroke fill |
| `expand-collapse` | 0.3s | ease-in-out | Max-height + fade |

**Always respect `prefers-reduced-motion`** — collapse animations to ~0.01ms when the user opts out.

---

## 11. Accessibility

- Maintain **WCAG AA contrast** (≥ 4.5:1 for text) against the expected surface. The four-tier slate text scale is tuned to pass on its intended backgrounds.
- Don't put cyan text on white at small sizes — use brand blue `#0465F2` instead.
- Color is never the sole signal; pair status colors with labels/icons.
- All interactive elements have a visible focus state using `--border-focus`.
- Honor `prefers-reduced-motion` and `prefers-color-scheme`.

---

## Appendix — quick reference

```
SKY (primary)   #0FA4E9 (dark) / #0465F2 (light)
SKY LIGHT       #38BDF8 (dark) / #0354D1 (light)
BRAND BLUE      #0465F2
BLACK BASE      #000000 (dark) / #EAEEF3 (light)
HEADING TEXT    #F1F5F9 (dark) / #0F172A (light)
BODY TEXT       #CBD5E1 (dark) / #1E293B (light)
GRADIENT        linear-gradient(135deg, #0465F2 0%, #38BDF8 100%)

FONT (UI)       Poppins → Inter → system   ·   LOGO: Source Sans 3
WEIGHTS         700 head / 600 numbers / 500 labels / 400 body

STATUS          Positive #34D399 · Warning #FBBF24 · Negative #F87171 · Info #38BDF8

RADIUS          card 14–16px · pill 40px
SPACING         4 · 8 · 16 · 24 · 32 · 48  (8px base)
```
