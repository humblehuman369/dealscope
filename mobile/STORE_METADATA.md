# DealGapIQ — Store Metadata

Copy/paste into App Store Connect and Google Play Console.

---

## App Name

DealGapIQ

## Subtitle (iOS, 30 chars)

Instant Property Analysis

## Short Description (Google Play, 80 chars)

Analyze any property in seconds. Get valuations, rental estimates, and deal scores.

## Full Description

DealGapIQ gives real estate investors instant investment analysis on any property.

Enter an address and get:

- IQ Value Estimate — averaged from Zillow, RentCast, and Redfin
- IQ Rent Estimate — averaged rental projections from multiple sources
- Deal Score — 0 to 100 investment rating with AI-generated verdict
- 6 Strategy Rankings — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale scored and ranked
- Key Metrics — Cap Rate, Cash-on-Cash Return, DSCR, monthly cash flow
- Deal Gap Analysis — how far the asking price is from the income-supported value

Save properties to your Deal Vault, track your pipeline, and revisit analyses anytime.

Built for investors who want data-driven decisions without the spreadsheets.

## Keywords (iOS, 100 chars)

real estate,investment,property,analysis,rental,deal,score,valuation,BRRRR,flip,wholesale,cash flow

## Category

Finance

## Privacy Policy URL

https://dealgapiq.com/privacy

## Support URL

https://dealgapiq.com/help

## What's New (Release Notes)

Rebuilt from the ground up. New architecture, faster analysis, and a cleaner interface. Search any property, get an instant verdict, and save to your Deal Vault.

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

1. Create the demo account in production: `review@dealgapiq.com` / `Review$123`
2. Set `subscription_tier: 'pro'` via admin panel
3. Log in and save 3-5 properties to the Deal Vault
4. Re-run `npm run screenshots:all`

### Screenshot Plan

| # | Screen | Marketing Headline | Subline | Output |
|---|--------|-------------------|---------|--------|
| 1 | Login | Know Before You Buy | Real estate investment analysis in seconds | `01_login_framed.png` |
| 2 | Search (address entered) | Search Any Property | Enter an address. Get an instant verdict. | `02_search_framed.png` |
| 3 | Verdict (deal score) | Instant Deal Score | AI-powered analysis across 6 strategies | `03_verdict_framed.png` |
| 4 | Strategy detail | See the Numbers | Cash flow, cap rate, DSCR — every metric that matters | `04_strategy_framed.png` |
| 5 | Deal Vault | Save & Track Deals | Build your pipeline. Revisit analyses anytime. | `05_deal_vault_framed.png` |

### Required Dimensions (App Store Connect)

| Device | Pixels | CSS Viewport | DPR |
|--------|--------|-------------|-----|
| iPhone 6.7" (required) | 1290 × 2796 | 430 × 932 | 3x |
| iPhone 6.5" | 1242 × 2688 | 414 × 896 | 3x |
| iPad Pro 12.9" | 2048 × 2732 | 1024 × 1366 | 2x |
| Android phone | 1236 × 2745 | 412 × 915 | 3x |
