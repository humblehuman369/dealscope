# DealGapIQ — LinkedIn Brand & Style Guide

> **Purpose:** A self-contained brand kit for building the DealGapIQ **company LinkedIn page** (logo, banner, About copy, color, type, voice, and post templates).
> **Audience:** Manus (or any designer/agent) with no access to our codebase.
> **Source of truth:** Derived from the live product (`globals.css`, brand guide, positioning doc). When in doubt, the hex values below win.
> **Last updated:** June 2026 · Owner: Brad Geisen (brad@geisen.cc)

---

## 0. TL;DR — what to build

| LinkedIn asset | Spec | What to use |
|---|---|---|
| **Profile logo** | 300 × 300 px PNG (displays in a circle/rounded square) | The **profile-head + house icon** in cyan `#0FA4E9` on a **true-black `#000000`** square, OR the full-bleed app icon. Keep the mark centered with ~12% padding. |
| **Page banner / cover** | 1128 × 191 px PNG | Black `#000000` background, left-aligned **DealGapIQ wordmark (white "DealGap" + cyan "IQ")**, tagline to the right. See §6. |
| **Tagline (under name)** | ≤ 120 chars | *Turn any address into a 15-second verdict, four ways to structure the deal, and the script to close it.* |
| **About section** | paste-ready | See §7. |
| **Brand colors** | — | Cyan `#0FA4E9`, Brand Blue `#0465F2`, Black `#000000`, Slate text `#F1F5F9`. See §3. |
| **Font (for graphics)** | — | **Inter** (Bold 700 headlines, Regular 400 body). See §4. |

---

## 1. Brand essence

**Product:** DealGapIQ — a real-estate investment platform that turns any US property address into a 15-second verdict, four pre-built ways to structure the deal, and the negotiation script for each.

**One-liner:**
> The price tag isn't the deal. The structure is.

**Positioning (for the page):**
Listing sites end at price. Investor calculators end at cash flow. **DealGapIQ keeps going** — it's the synthesis layer that turns a marginal listing into a credible, structured offer.

**Personality:** Confident but not cold. Data-rich but plain-spoken — like a senior investor whiteboarding a deal at a meetup. Trust-first: every number shows its source; nothing is fabricated.

**Voice in three words:** Direct · Specific · Credible.

---

## 2. Logo

DealGapIQ has two locked-up assets:

1. **Wordmark** — "DealGap" + "IQ", where **"IQ" is always cyan `#0FA4E9`** and "DealGap" flips with the background:
   - On **dark/black** → "DealGap" is **white** (`#FFFFFF`).
   - On **light/white** → "DealGap" is **near-black navy** (`#0A0E1A` / `#0F172A`).
   - A short **cyan underline bar** sits beneath the wordmark — keep it; it's part of the mark.
2. **App icon** — a single-line illustration of a **human head profile with a house inside it** (intelligence + real estate), drawn in cyan `#0FA4E9`. Used as the square/avatar mark.

### Logo rules
- **Clear space:** keep padding around the mark equal to the height of the "I" in "IQ" (roughly 12% of the logo height).
- **Minimum size:** wordmark no smaller than 120 px wide; icon no smaller than 32 px.
- **Preferred background:** the brand is **dark-first** — default to the wordmark/icon on **black `#000000`**.
- **Never:** recolor "IQ" to anything but cyan, stretch/skew, add drop shadows or outlines, place the wordmark on a busy photo without a solid scrim, or recreate the letterforms in a different font.

> **For LinkedIn profile logo:** use the **app icon (head + house, cyan on black)** — icons read better than wordmarks in the small circular avatar slot.

---

## 3. Color palette

### Primary
| Role | Hex | Use |
|---|---|---|
| **Cyan (signature accent)** | `#0FA4E9` | The "IQ", CTAs, links, the head/house icon, key highlights. This is *the* DealGapIQ color. |
| **Brand Blue** | `#0465F2` | Gradient origin, deep button states, secondary accent. |
| **Sky Light** | `#38BDF8` | Gradient end, subtle glows, hover highlights. |
| **Black (base)** | `#000000` | Page/banner backgrounds, the brand canvas. Dark-first. |

**Signature gradient:** `linear-gradient(135deg, #0465F2 0%, #0FA4E9 100%)` — use for CTA buttons and accent bars.

### Neutrals (text on dark)
| Role | Hex | Use |
|---|---|---|
| Heading | `#F1F5F9` | Near-white headlines on black. |
| Body | `#CBD5E1` | Paragraph text on black. |
| Secondary | `#94A3B8` | Captions, metadata. |

### On light backgrounds
| Role | Hex |
|---|---|
| Accent (cyan→blue) | `#0465F2` |
| Heading | `#0F172A` |
| Body | `#1E293B` |
| Page base | `#FFFFFF` / `#EAEEF3` |

### Status colors (use only to convey financial meaning — never decoration)
| Status | Hex | Meaning |
|---|---|---|
| Positive | `#34D399` | Profit, cash flow, "Deal" |
| Warning | `#FBBF24` | Caution, "Maybe", moderate risk |
| Negative | `#F87171` | Loss, high risk, "Pass" |

> **Accessibility:** maintain ≥ 4.5:1 contrast. White/slate text on black passes; never put cyan text on white at small sizes (use brand blue `#0465F2` instead).

---

## 4. Typography

**Primary typeface: Inter** (variable, weights 100–900). System fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

LinkedIn renders its own UI font for posts/About — so Inter matters most for **graphics, banners, and image cards** you create.

| Use | Weight | Notes |
|---|---|---|
| Headlines / wordmark | **700 Bold** | Tight, confident. |
| Subheads / emphasis | 600 Semibold | |
| Body | 400 Regular | Line-height ~1.6. |
| Labels / tags | 600, UPPERCASE, +0.04em tracking | |
| **Financial numbers** | 600, **tabular figures** | Always use tabular/monospaced numerals so dollar figures align. |

Type personality: **size and weight carry hierarchy, not color.** Keep headlines short (5–7 words for the manifesto lines).

---

## 5. Imagery & visual style

**Do:**
- **Product screenshots first** — the verdict cards, the four-path comparison, the strategy worksheet, the negotiation script. Real receipts, not vibes.
- Tight crops that read at thumbnail / mobile size.
- Charts, numbers, and dollar figures over lifestyle imagery.
- Dark-first compositions: cyan accents glowing on black.
- Real people only (real users, the founder) — never stock.

**Don't:**
- ❌ Stock photos of "investors at laptops."
- ❌ Red X's in comparison tables (use `—` or "partial").
- ❌ Influencer-style clickbait arrows / circles.
- ❌ Decorative motion or gradients that obscure data.
- ❌ Magic-wand claims ("every property is a deal").

---

## 6. LinkedIn banner (cover) layout — 1128 × 191 px

**Recommended composition:**
- **Background:** solid black `#000000` (optionally a subtle radial cyan glow at 5% opacity, center-top — never a flat busy image).
- **Left third:** the **DealGapIQ wordmark** (white "DealGap" + cyan "IQ" + cyan underline bar).
- **Center / right:** one-line value prop in Inter 600, white:
  > *15-second verdict. Four ways to structure the deal. The script to close it.*
- Optional far-right: a faint cropped product screenshot (verdict card) bleeding off the edge at low opacity.
- Keep all text within the **safe zone** (LinkedIn crops top/bottom and overlays the logo at bottom-left on some layouts — keep critical content vertically centered and away from the lower-left corner).

**Alt banner (light):** white `#FFFFFF` background, navy "DealGap" + brand-blue "IQ", same tagline in `#0F172A`.

---

## 7. Copy blocks (paste-ready)

### Tagline (under company name, ≤120 chars)
> Turn any address into a 15-second verdict, four ways to structure the deal, and the script to close it.

### About section
> **Listing sites end at price. Investor calculators end at cash flow. DealGapIQ keeps going.**
>
> DealGapIQ is a real-estate investment platform that turns any US property address into a 15-second verdict — backed by a multi-source valuation (IQ Estimate, Zillow, RentCast, Redfin, and public records).
>
> Then it does what no other tool does: it shows you the **four ways the deal could actually close** — a price cut, a capital adjustment, a financing structure (Subject-To, seller carry, 0% 2nds, rate buydowns), an income re-verification, or a blended plan that combines smaller asks. For each path, you get a ready-to-use **negotiation script**: who to call, the frame, the opener, the ask, and what's in it for the seller.
>
> Built for active investors analyzing 20–100 properties to close 1–3 a year — and for anyone tired of rebuilding the same spreadsheet for every listing.
>
> Trust-first by design: every metric shows its data source. Switch the source, watch the math change. Nothing is fabricated — missing data shows as "Unavailable."
>
> **We analyze. You decide.**
>
> ▶ Run a free verdict at dealgapiq.com

### Specialties (LinkedIn "Specialties" / keywords)
Real estate investing · Creative finance · Subject-To · Seller financing · BRRRR · Fix & Flip · House hacking · Wholesale · Deal analysis · Property valuation · PropTech · Negotiation

### Suggested page metadata
- **Industry:** Software Development (or Real Estate / PropTech)
- **Website:** https://dealgapiq.com
- **Tagline / overview:** see above
- **Specialties:** see above

---

## 8. Post style & voice

**Recurring formats (turn into branded image templates):**
- **Four Paths Friday** — one property, four structures, which one closes.
- **Script of the Week** — one annotated pitch script.
- **Glossary Drop** — one creative-finance term, one diagram, one example.
- **Deal Teardown** — a real listing → verdict → four paths → the path that closes.

**Repeating motifs (rotate, ≥ once each per month):**
- *Stop scrolling listings. Start hunting real deals.*
- *That's where most tools stop. DealGapIQ keeps going.*
- *The price tag isn't the deal. The structure is.*

**Voice rules:**
- Investors **hunt** properties, **close** deals, **make** offers, **structure** terms.
- Specificity beats abstraction: *"$2,719 seller-carry 2nd at 0%"* > *"flexible structure."*
- The investor is the hero; DealGapIQ is the partner.
- Never give financial/legal/investment advice — always frame as analysis.
- Avoid guru-course energy and CRM-marketing tone.

**Default CTAs:** *Run a Free Verdict* (primary) · *See the Four Paths* (secondary).

---

## 9. Quick reference card

```
PRIMARY CYAN     #0FA4E9   ← "IQ", icon, CTAs, links
BRAND BLUE       #0465F2   ← gradient start, deep buttons
SKY LIGHT        #38BDF8   ← gradient end, glows
BLACK BASE       #000000   ← backgrounds (dark-first)
HEADING TEXT     #F1F5F9   (on dark)  /  #0F172A (on light)
BODY TEXT        #CBD5E1   (on dark)  /  #1E293B (on light)
GRADIENT         linear-gradient(135deg, #0465F2 0%, #0FA4E9 100%)

FONT             Inter — 700 headlines / 400 body / 600 numbers (tabular)

LOGO             "DealGap" (white on dark / navy on light) + "IQ" (cyan) + cyan underline
ICON             head profile + house, cyan line on black

VERDICT COLORS   Deal #34D399 · Maybe #FBBF24 · Pass #F87171
```

---

## Appendix — source asset files (for handoff)

These live in the product repo under `frontend/public/` — export/hand these to Manus:

| File | Use |
|---|---|
| `DealGapIQ_Logo_Dark.png` | Wordmark for **dark** backgrounds (white DealGap + cyan IQ) |
| `DealGapIQ_Logo_Dark_Header.png` | Same, header-cropped |
| `DealGapIQ_Logo_Light.png` | Wordmark for **light** backgrounds (navy DealGap + blue IQ) |
| `DealGapIQ_Icon_Transparent_1024.png` | Head + house icon, transparent (profile avatar) |
| `app-store/connect/icon-1024x1024-v2-fullbleed.png` | Full-bleed app icon (square avatar) |
| `images/verdict-preview.png`, `blog/verdict-lake-worth.png` | Hero product screenshots for banner/posts |
| `brad-geisen.png` / `images/brad-geisen-headshot.png` | Founder headshot (founder-led content) |
