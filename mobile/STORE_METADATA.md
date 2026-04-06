# DealGapIQ — Store Metadata

Copy/paste into App Store Connect and Google Play Console.

---

## App Name

DealGapIQ

## Subtitle (iOS, 30 chars)

Instant Property Analysis

## Short Description (Google Play, 80 chars)

Analyze any property in seconds. See the Deal Gap before you make an offer.

## Full Description

DealGapIQ gives real estate investors instant investment analysis on any property.

Enter an address and get:

- The DealGap — how far the asking price is from the income-supported value
- Target Buy Price — the price you should aim to pay for positive cash flow
- Income Value — the break-even price where rent covers all costs
- IQ Estimates — property value and rent averaged from Zillow, RentCast, Redfin, and Realtor.com
- 6 Strategy Rankings — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale
- Key Metrics — Cap Rate, Cash-on-Cash Return, DSCR, monthly cash flow
- DealMaker — adjust purchase price, financing, and expenses with live metric updates

Save properties to your Deal Vault, track your pipeline, and revisit analyses anytime.

Built for investors who want data-driven decisions without the spreadsheets.

## Keywords (iOS, 100 chars)

real estate,investment,property,analysis,rental,deal gap,valuation,BRRRR,flip,wholesale,cash flow

## Category

Finance

## Privacy Policy URL

https://dealgapiq.com/privacy

## Support URL

https://dealgapiq.com/help

## What's New (Release Notes)

Rebuilt from the ground up. The Verdict page now features the DealGap — showing you the gap between asking price and income-supported value. New Investment Overview, price scale visualization, and Key Insights. Six strategy rankings with full metric breakdowns. Faster analysis, cleaner interface.

---

## Screenshots

### Automated Screenshot Capture

Screenshots are generated via Playwright at exact App Store pixel dimensions.

**Quick start:**
```bash
npm run screenshots        # Capture raw screenshots (iPhone 6.7")
npm run screenshots:frame  # Add marketing headlines + device frame
npm run screenshots:all    # Both steps
```

**Options:**
```bash
npx tsx scripts/screenshots/capture.ts --device iphone-6.5   # iPhone 6.5"
npx tsx scripts/screenshots/capture.ts --device ipad          # iPad Pro 12.9"
npx tsx scripts/screenshots/capture.ts --device android       # Android phone
npx tsx scripts/screenshots/capture.ts --headed               # Watch the browser
npx tsx scripts/screenshots/capture.ts --base-url http://localhost:3000
```

**Output locations:**
- Raw: `scripts/screenshots/output/iphone-6.7/`
- Framed: `scripts/screenshots/output/iphone-6.7-framed/`

### Prerequisites for auth-gated screens (Verdict, Strategy, Deal Vault)

1. Create the demo account in production: `review@dealgapiq.com` / `Review$1234`
2. Set `subscription_tier: 'pro'` via admin panel
3. Log in and save 3-5 properties to the Deal Vault
4. Re-run `npm run screenshots:all`

### Screenshot Plan

| # | Screen | Marketing Headline | Subline | Output |
|---|--------|-------------------|---------|--------|
| 1 | Login / Landing | Know Before You Buy | Real estate investment analysis in seconds | `01_login_framed.png` |
| 2 | Search (address entered) | Search Any Property | Enter an address. Get an instant verdict. | `02_search_framed.png` |
| 3 | Verdict (top: overview + price bar) | See the Deal Gap | Target Buy, Income Value, and Market Price — instantly | `03_verdict_framed.png` |
| 4 | Verdict (scrolled: DealGap + insights) | Know What It Takes | Key insights and probability of landing the deal | `04_verdict_insights_framed.png` |
| 5 | Strategy (selector + rankings) | 6 Strategies Ranked | See which approach works best for every property | `05_strategy_framed.png` |
| 6 | Strategy (detail breakdown) | See the Numbers | Cash flow, cap rate, DSCR — every metric that matters | `06_strategy_detail_framed.png` |
| 7 | DealMaker (interactive sliders) | Make It Your Deal | Adjust any assumption. Watch the score update live. | `07_deal_maker_framed.png` |
| 8 | Deal Vault | Save & Track Deals | Build your pipeline. Revisit analyses anytime. | `08_deal_vault_framed.png` |
| 9 | Search history / recent | Your Pipeline | Every property you've analyzed, one tap away. | `09_search_history_framed.png` |
| 10 | Profile / subscription | Pro Investor Tools | Unlimited analyses, full breakdowns, saved deals. | `10_profile_framed.png` |

### Required Dimensions (App Store Connect)

| Device | Pixels | CSS Viewport | DPR |
|--------|--------|-------------|-----|
| iPhone 6.7" (required) | 1290 × 2796 | 430 × 932 | 3x |
| iPhone 6.5" | 1242 × 2688 | 414 × 896 | 3x |
| iPad Pro 12.9" | 2048 × 2732 | 1024 × 1366 | 2x |
| Android phone | 1236 × 2745 | 412 × 915 | 3x |

---

## App Previews (Videos)

Three 15–30 second screen recordings that autoplay on the App Store product page.
Filmed in-app, no external footage or rendered mock-ups.

### Required Dimensions (App Store Connect)

| Device | Resolution | FPS | Duration |
|--------|-----------|-----|----------|
| iPhone 6.7" (required) | 1290 × 2796 | 30 fps | 15–30 s |
| iPhone 6.5" | 1242 × 2688 | 30 fps | 15–30 s |

---

### Preview 1 — "Find Your Deal Gap" (20 s)

**Hook:** The gap between asking price and income-supported value — that's your edge.

| Sec | What's on Screen | Voiceover / Text Overlay |
|-----|-----------------|-------------------------|
| 0–3 | Landing screen with hero house image and "Analyze Any Property" tagline | Text: **"How much should you really pay?"** |
| 3–6 | Tap search bar. Type "742 Evergreen Terrace, Springfield" — autocomplete appears | Text: **"Search any address"** |
| 6–9 | Tap result → analyzing screen with progress ring and rotating tips | Text: **"Instant analysis from 4+ sources"** |
| 9–14 | Verdict loads: Investment Overview card showing Target Buy, Income Value, Market Price. Price scale bar with gradient and markers. | Text: **"Target Buy vs. Market Price — see the gap"** |
| 14–18 | Scroll to DealGap panel: percentage badge, tier pill ("Strong Buy"), probability gauge | Text: **"The DealGap — your competitive edge"** |
| 18–20 | Scroll to Key Insights section, first insight expanded | Text: **"Key insights. One address. Done."** |

---

### Preview 2 — "6 Strategies. Your Best Move." (18 s)

**Hook:** Every property works differently — see which strategy pays you the most.

| Sec | What's on Screen | Voiceover / Text Overlay |
|-----|-----------------|-------------------------|
| 0–3 | Verdict screen → tap "StrategyIQ" tab at bottom | Text: **"Which strategy wins?"** |
| 3–7 | Strategy selector: 6 cards ranked by score (LTR, STR, BRRRR, Flip, House Hack, Wholesale). Top card pulses. | Text: **"6 strategies ranked for every deal"** |
| 7–11 | Tap top-ranked strategy → detail view expands: monthly cash flow, cap rate, cash-on-cash, DSCR, monthly expenses breakdown | Text: **"Monthly cash flow, cap rate, DSCR"** |
| 11–15 | Scroll down on detail: see full expenses table and return projections | Text: **"Every number that matters"** |
| 15–18 | Tap a different strategy (e.g., BRRRR) — numbers update instantly | Text: **"Compare. Decide. Move."** |

---

### Preview 3 — "Make It Your Deal" (20 s)

**Hook:** Adjust the price, financing, and expenses — watch everything recalculate live.

| Sec | What's on Screen | Voiceover / Text Overlay |
|-----|-----------------|-------------------------|
| 0–3 | Strategy detail → tap "DealMaker" tab at bottom | Text: **"What if you could negotiate better?"** |
| 3–7 | DealMaker screen loads: purchase price slider, down payment %, interest rate. Current deal score visible. | Text: **"Adjust purchase price"** |
| 7–11 | Drag purchase price slider down 15% — deal score badge updates from "Marginal" to "Strong Buy", cash flow number jumps | Text: **"Watch the deal improve in real time"** |
| 11–15 | Adjust interest rate down → metrics recalculate. Toggle between LTR and STR strategy. | Text: **"Test any scenario"** |
| 15–18 | Tap "Save to Vault" → animation confirms save. Navigate to Deal Vault tab showing 4 saved properties. | Text: **"Save it. Track it. Close it."** |
| 18–20 | Deal Vault grid with property cards, each showing address and DealGap tier badge | Text: **"DealGapIQ — know before you buy"** |

---

### Recording Notes

- Record with **airplane mode on** (removes carrier bar clutter)
- Use the demo account: `review@dealgapiq.com` / `Review$1234`
- Pre-load 3–5 saved properties in Deal Vault before recording Preview 3
- **No external audio** — App Store allows optional background music or text overlays only
- Export as H.264 MP4, 30 fps, no letterboxing
