# App Store Review Notes

## Demo Account

Use the following credentials to test the app with full Pro access:

- **Email:** `review@dealgapiq.com`
- **Password:** `Review$1234`

> **Important:** This account has Pro tier access. Create this account in the
> production backend before submission and set `subscription_tier: 'pro'` via
> the admin panel.

## Primary User Flow

1. **Sign in** with the demo credentials above
2. **Search** — Enter a US property address (e.g., "123 Main St, Austin, TX 78701")
3. **Analyzing** — The app fetches property data and runs analysis (~2-3 seconds)
4. **IQ Verdict** — Shows the Investment Overview (Target Buy, Income Value, Market Price), price scale bar, DealGap percentage and tier, and Key Insights
5. **StrategyIQ** — Tap the StrategyIQ tab to see 6 strategies ranked with full metric breakdowns (cash flow, cap rate, DSCR)
6. **DealMaker** — Tap the DealMaker tab to adjust purchase price, financing, and expenses via sliders with live metric updates
7. **Deal Vault** — Save analyzed properties to your vault for later review

## Key Features to Test

- **Search:** Enter any US residential address
- **DealGap Analysis:** Gap between asking price and income-supported value, with tier (Strong Buy, Buy, Hold, etc.)
- **Investment Overview:** Target Buy price, Income Value, and Market Price comparison
- **Price Scale Bar:** Visual gradient showing where Target, Income, and Market prices fall relative to each other
- **Key Insights:** Numbered insights with expandable details explaining deal dynamics
- **6 Strategies:** Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, Wholesale — ranked by score
- **DealMaker:** Interactive sliders to adjust purchase price, down payment, interest rate, etc.
- **Deal Vault:** Saved properties list (Profile > Saved Properties)
- **Search History:** Recent searches (Profile > Search History)
- **Billing:** Subscription status and usage tracking (Profile > Billing)

## Subscription Information

- **Free tier:** 3 property analyses per month
- **Pro tier:** Unlimited analyses, full strategy breakdowns, DealMaker, saved properties
- Subscriptions are managed via Apple's In-App Purchase system (RevenueCat)
- Auto-renewable subscriptions: Monthly ($39/mo) and Annual ($29/mo billed annually)

## Network Requirements

- The app requires an internet connection to fetch property data and run analyses
- An offline banner appears when connectivity is lost

## Notes

- The app is focused on the US residential real estate market
- Property data is sourced from multiple third-party providers and cross-referenced
- No user-generated content or social features
- No AR/VR, gambling, or age-restricted content
- Category: Finance
