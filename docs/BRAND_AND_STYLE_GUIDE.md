# DealGapIQ Brand and Style Guide

> **Version:** Current as of April 2026
> **Source of truth:** This guide is derived from the live production codebase.
> CSS custom properties in `globals.css` are canonical for color values.

---

## 1. Brand Identity

**Product Name:** DealGapIQ

**Personality:**
Confident but not cold, data-rich but not overwhelming — like a financial
advisor who explains things in plain English.

**Design Philosophy:**
Size and weight carry hierarchy, not visibility.
Color carries meaning, not decoration.
Every accent maps to a concept so the investor's eye learns the system
within seconds.

**Theme:** Dark-first, dual-theme (dark + light). True black base with deep
navy elevated surfaces. Subtle radial gradients for depth, never flat
backgrounds. Borders at 7% white opacity in dark mode.

---

## 2. Color System

### 2.1 Brand Colors

| Role | Dark Mode | Light Mode | CSS Variable |
|------|-----------|------------|--------------|
| **Primary Accent (Sky)** | `#0EA5E9` | `#0284C7` | `--accent-sky` |
| **Accent Highlight** | `#38bdf8` | `#0EA5E9` | `--accent-sky-light` |
| **Brand Blue** | `#0465f2` | `#0052CC` | `--accent-brand-blue` |
| **Gradient Start** | `#0465f2` | `#0052CC` | `--accent-gradient-from` |
| **Gradient End** | `#0EA5E9` | `#0284C7` | `--accent-gradient-to` |

The primary accent (`#0EA5E9`) is the signature DealGapIQ color. It appears on
CTAs, links, interactive elements, focus rings, and the "IQ" portion of the logo.
Brand Blue (`#0465f2`) is used for gradient origins and deeper button states.

### 2.2 Surface Hierarchy

| Surface | Dark Mode | Light Mode | CSS Variable | Usage |
|---------|-----------|------------|--------------|-------|
| **Base** | `#000000` | `#EAEEF3` | `--surface-base` | Page shell, outermost containers |
| **Section** | `#060B14` | `#F1F4F8` | `--surface-section` | Alternating section backgrounds |
| **Card** | `#000000` | `#FFFFFF` | `--surface-card` | Cards, panels, modals |
| **Card Hover** | `#0C1220` | `#F5F7FA` | `--surface-card-hover` | Card hover state |
| **Elevated** | `#0C1220` | `#F8FAFC` | `--surface-elevated` | Tooltips, dropdowns, nested panels |
| **Input** | `#0C1220` | `#FFFFFF` | `--surface-input` | Form inputs |
| **Overlay** | `rgba(0,0,0,0.8)` | `rgba(0,0,0,0.5)` | `--surface-overlay` | Modal backdrops |

**Surface Contract:**
- Page-level shells and outermost wrappers use `var(--surface-base)`
- Cards and panels inside shells use `var(--surface-card)`
- Nested content inside cards uses `var(--surface-elevated)`

Never hardcode hex backgrounds in components. Use CSS variables.

### 2.3 Text Hierarchy (Four-Tier Slate)

| Tier | Dark Mode | Light Mode | CSS Variable | Usage |
|------|-----------|------------|--------------|-------|
| **Heading** | `#F1F5F9` | `#000000` | `--text-heading` | Page titles, section headers |
| **Body** | `#CBD5E1` | `#1E293B` | `--text-body` | Paragraphs, descriptions |
| **Secondary** | `#94A3B8` | `#334155` | `--text-secondary` | Supporting text, metadata |
| **Label** | `#7C8CA0` | `#475569` | `--text-label` | Field labels, captions |
| **Muted** | `#64748B` | `#64748B` | `--text-muted` | Disabled, timestamps |
| **Inverse** | `#000000` | `#FFFFFF` | `--text-inverse` | Text on accent backgrounds |
| **Link** | `#0EA5E9` | `#0284C7` | `--text-link` | Hyperlinks, interactive text |

All tiers maintain WCAG AA contrast (4.5:1 minimum) against their
expected surface backgrounds.

### 2.4 Status Colors

Status colors convey financial meaning. They are reserved exclusively for
data state — never for decoration or strategy identification.

| Status | Dark Mode | Light Mode | CSS Variable | Meaning |
|--------|-----------|------------|--------------|---------|
| **Positive** | `#34d399` | `#059669` | `--status-positive` | Profit, cash flow, success |
| **Warning** | `#fbbf24` | `#D97706` | `--status-warning` | Caution, moderate risk, scores |
| **Negative** | `#f87171` | `#DC2626` | `--status-negative` | Loss, high risk, failure |
| **Info** | `#38bdf8` | `#0284C7` | `--status-info` | Neutral data, informational |
| **Income Value** | `#FACC15` | `#A16207` | `--status-income-value` | Revenue, income highlights |

### 2.5 Strategy Colors

Each investment strategy has a unique hue intentionally distinct from status
colors to prevent confusion between "what strategy" and "how it performed."

| Strategy | Dark Mode | Light Mode | CSS Variable | Icon |
|----------|-----------|------------|--------------|------|
| **Long-Term Rental** | `#0465f2` | `#0344A6` | `--strategy-ltr` | :house: |
| **Short-Term Rental** | `#8b5cf6` | `#6D28D9` | `--strategy-str` | :hotel: |
| **BRRRR** | `#f97316` | `#C2410C` | `--strategy-brrrr` | :arrows_counterclockwise: |
| **Fix & Flip** | `#ec4899` | `#BE185D` | `--strategy-flip` | :hammer: |
| **House Hack** | `#0EA5E9` | `#0369A1` | `--strategy-house-hack` | :house_with_garden: |
| **Wholesale** | `#84cc16` | `#4D7C0F` | `--strategy-wholesale` | :clipboard: |

### 2.6 Border System

| Level | Dark Mode | Light Mode | CSS Variable | Usage |
|-------|-----------|------------|--------------|-------|
| **Subtle** | `rgba(14,165,233,0.25)` | `#D5DBE4` | `--border-subtle` | Decorative separators |
| **Default** | `#334155` | `#B8C4CE` | `--border-default` | Card borders, dividers |
| **Strong** | `#475569` | `#8896A6` | `--border-strong` | Active state borders |
| **Focus** | `#0EA5E9` | `#0284C7` | `--border-focus` | Focus rings, selected state |

---

## 3. Typography

### 3.1 Font Stack

| Font | CSS Variable | Role | Weights |
|------|-------------|------|---------|
| **Inter** | `--font-inter` | Primary UI — headings, body, financial data | 100–900 (variable) |
| **Source Sans 3** | `--font-source-sans` | Logo wordmark only | 400, 600, 700 |
| **DM Sans** | `--font-dm-sans` | Landing page sections | 400, 500, 600, 700 |
| **Space Mono** | `--font-space-mono` | Monospace accent — code, data labels | 400, 700 |

All fonts are self-hosted via `next/font` in `layout.tsx` (no external
`@import` requests). This eliminates render-blocking font loads.

**Tailwind mappings:**
- `font-sans` / `font-display` → Inter
- `font-logo` → Source Sans 3

### 3.2 Type Scale

**Display sizes (Tailwind `text-display-*`):**

| Token | Size | Line Height | Letter Spacing | Weight |
|-------|------|-------------|----------------|--------|
| `display-xl` | 4.5rem (72px) | 1.1 | -0.02em | 700 |
| `display-lg` | 3.75rem (60px) | 1.1 | -0.02em | 700 |
| `display-md` | 3rem (48px) | 1.2 | -0.01em | 700 |
| `display-sm` | 2.25rem (36px) | 1.2 | -0.01em | 700 |

**Component-level type scale (VerdictIQ tokens):**

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Score Display | 56px | 700 | `tabular-nums` for alignment |
| Heading | 22px | 700 | Section titles |
| Body | 16px | 400 | Default reading text |
| Body Small | 15px | 400 | Dense layouts |
| Financial | 16px | 600 | `tabular-nums`, numeric data |
| Financial Large | 24px | 700 | `tabular-nums`, key metrics |
| Label | 13px | 600 | Uppercase, 0.04em spacing |
| Caption | 12px | 400 | Footnotes, disclaimers |

### 3.3 Weight Conventions

- **700** — Headlines, section titles, CTAs
- **600** — Financial numbers, emphasis, subheadings
- **500** — Labels, UI controls
- **400** — Body text, descriptions

Financial numbers always use `font-variant-numeric: tabular-nums` for
column alignment.

---

## 4. Surfaces, Borders, and Shadows

### 4.1 Shadow System

**Dark mode** uses sky-blue glows for elevation. **Light mode** uses
traditional drop shadows.

**Semantic shadows (CSS variables):**

| Token | Dark Mode | Light Mode |
|-------|-----------|------------|
| `--shadow-card` | `0 0 20px rgba(14,165,233,0.15)` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-card-hover` | `0 0 30px rgba(14,165,233,0.25)` | `0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` |
| `--shadow-dropdown` | `0 4px 12px rgba(0,0,0,0.5)` | `0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)` |

**Tailwind shadow utilities:**

| Class | Value | Usage |
|-------|-------|-------|
| `shadow-brand` | `0 4px 14px rgba(4,101,242,0.25)` | Brand-colored buttons |
| `shadow-brand-lg` | `0 10px 40px rgba(4,101,242,0.3)` | Hero CTAs |
| `shadow-glow-sky` | `0 0 24px rgba(56,189,248,0.2)` | Sky accent glow |
| `shadow-glow-sky-lg` | `0 0 36px rgba(56,189,248,0.35)` | Prominent sky glow |
| `shadow-glow-teal` | `0 0 20px rgba(14,165,233,0.3)` | Teal accent glow |
| `shadow-glow-cyan` | `0 0 20px rgba(14,165,233,0.5)` | Intense cyan glow |
| `shadow-glow-blue` | `0 0 20px rgba(4,101,242,0.5)` | Brand blue glow |

### 4.2 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-xl` | 12px | Standard cards |
| `rounded-2xl` | 16px | Large cards, modals |
| `rounded-3xl` | 1.5rem (24px) | Hero sections |
| `rounded-4xl` | 2rem (32px) | Feature cards |
| `rounded-pill` | 40px | Buttons, tags, badges |

### 4.3 Spacing Scale (8px base)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps, icon padding |
| `sm` | 8px | Inline spacing |
| `md` | 16px | Default component padding |
| `lg` | 24px | Section padding |
| `xl` | 32px | Large section gaps |
| `2xl` | 48px | Page-level spacing |

---

## 5. Gradients

| Name | CSS | Usage |
|------|-----|-------|
| **Brand** | `linear-gradient(135deg, #0465f2 0%, #38bdf8 100%)` | CTA buttons, hero elements |
| **Brand Vertical** | `linear-gradient(180deg, #0465f2 0%, #38bdf8 100%)` | Vertical accent bars |
| **Hero** | `radial-gradient(ellipse 80% 60% at 50% 30%, rgba(12,18,32,0.6) 0%, #000 100%)` | Hero section background |
| **Dark** | `linear-gradient(135deg, #07172e 0%, #1f2937 100%)` | Dark section backgrounds |
| **Teal** | `linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)` | Teal accent elements |
| **Sky** | `linear-gradient(135deg, #38bdf8 0%, #0EA5E9 100%)` | Sky accent elements |

Tailwind classes: `bg-gradient-brand`, `bg-gradient-hero`, `bg-gradient-dark`,
`bg-gradient-teal`, `bg-gradient-sky`.

---

## 6. Strategy Color System

Strategy colors are intentionally distinct from status colors. This prevents
the common mistake of conflating "which strategy" with "how it performed."

**Design principle:** An investor scanning a multi-strategy comparison should
instantly identify each strategy by its color while still reading green/red
performance indicators without ambiguity.

| Strategy | Color | Shifted From | Why |
|----------|-------|-------------|-----|
| Long-Term Rental | Blue `#0465f2` | — | Brand primary, most common strategy |
| Short-Term Rental | Violet `#8b5cf6` | — | Distinct from blue, premium connotation |
| BRRRR | Orange `#f97316` | Amber | Avoids overlap with warning/caution status |
| Fix & Flip | Pink `#ec4899` | Red | Avoids overlap with negative/loss status |
| House Hack | Sky `#0EA5E9` | — | Matches primary accent, beginner-friendly |
| Wholesale | Lime `#84cc16` | Green | Avoids overlap with positive/profit status |

---

## 7. Component Patterns

### 7.1 Buttons

**Primary CTA:**
```css
background: var(--accent-sky);        /* or gradient-brand */
color: white;
border-radius: 40px;                  /* pill */
font-weight: 700;
box-shadow: shadow-brand;
```

**Secondary / Outline:**
```css
background: transparent;
color: var(--accent-sky);
border: 1px solid var(--accent-sky);
border-radius: 40px;
```

**Text Button:**
```css
background: transparent;
color: var(--text-link);
border: none;
```

### 7.2 Cards

```css
background: var(--surface-card);
border: 1px solid var(--border-default);
border-radius: 12px;                  /* rounded-xl */
box-shadow: var(--shadow-card);
```

Hover state:
```css
background: var(--surface-card-hover);
box-shadow: var(--shadow-card-hover);
```

### 7.3 Correct vs Forbidden Patterns

**Correct:**
```tsx
<div style={{ background: 'var(--surface-base)' }}>     {/* page shell */}
  <div style={{ background: 'var(--surface-card)' }}>    {/* card */}
    <div style={{ background: 'var(--surface-elevated)' }}> {/* nested */}
```

**Forbidden:**
```tsx
background: '#000000'     // use var(--surface-base)
background: '#0C1220'     // use var(--surface-card) or var(--surface-elevated)
className="bg-black"      // use bg-[var(--surface-base)]
className="bg-[#0C1220]"  // use bg-[var(--surface-card)]
```

**Allowed exceptions:**
- `rgba(0,0,0,0.x)` overlays for modal backdrops and image fades
- `linear-gradient(...)` for visual effects (hero fades, card shines)
- Token definition files (`globals.css`, `semantic-tokens.ts`, `verdict-design-tokens.ts`)
- PDF/report generation with fixed server-side colors
- Third-party overrides (`.pac-container` for Google Places)

See `frontend/docs/theme-surface-exceptions.md` for the full exception registry.

---

## 8. Source of Truth Reference

This guide is derived from the following implementation files. When values
conflict between this document and the code, the code wins.

| File | What It Defines |
|------|----------------|
| `frontend/src/app/globals.css` | CSS custom properties — canonical color values for both themes |
| `frontend/src/theme/semantic-tokens.ts` | TypeScript mirror of semantic tokens (dark/light) |
| `frontend/tailwind.config.js` | Tailwind palette, typography, spacing, shadows, gradients |
| `frontend/src/constants/colors.ts` | Color constants, strategy palette, gradient definitions |
| `frontend/src/app/layout.tsx` | Font loading via `next/font` (Inter, Source Sans 3, DM Sans, Space Mono) |
| `frontend/src/components/iq-verdict/verdict-design-tokens.ts` | VerdictIQ component-level spacing, typography, and color tokens |

**Active Cursor rule:** `.cursor/rules/theme-surface-contract.mdc` enforces
the surface contract at development time (base/card/elevated hierarchy).

### Known Token Drift

`semantic-tokens.ts` and `globals.css` have minor dark-mode value mismatches
for some surface tokens (e.g., `surface.card` is `#0C1220` in TypeScript
vs `#000000` in CSS). The CSS values are canonical because CSS is what the
browser paints. The TypeScript file should be reconciled to match.

---

## Appendix: Animation Library

Tailwind animation utilities available for micro-interactions:

| Class | Duration | Easing | Behavior |
|-------|----------|--------|----------|
| `animate-fade-in` | 0.5s | ease-out | Opacity 0 → 1 |
| `animate-slide-up` | 0.5s | ease-out | Translate Y 20px → 0 + fade |
| `animate-slide-in-right` | 0.3s | ease-out | Translate X 20px → 0 + fade |
| `animate-float-slow` | 6s | ease-in-out | Gentle vertical float (infinite) |
| `animate-float-medium` | 5s | ease-in-out | Medium vertical float (infinite) |
| `animate-float-fast` | 4s | ease-in-out | Fast vertical float (infinite) |
| `animate-pulse-soft` | 2s | ease-in-out | Subtle opacity pulse (infinite) |
| `animate-score-fill` | 1s | ease-out | SVG stroke fill (forwards) |
| `animate-expand-collapse` | 0.3s | ease-in-out | Max-height 0 → 2000px + fade |

Respect `prefers-reduced-motion`: all animations collapse to 0.01ms duration
when the user has enabled reduced motion at the OS level.
