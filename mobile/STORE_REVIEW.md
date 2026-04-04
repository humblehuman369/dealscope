# App Store Review Notes

## Demo Account

Use the following credentials to test the app with full Pro access:

- **Email:** `review@dealgapiq.com`
- **Password:** `AppReview2026!`

> **Important:** This account has Pro tier access. Create this account in the
> production backend before submission and set `subscription_tier: 'pro'` via
> the admin panel.

## Primary User Flow

1. **Sign in** with the demo credentials above
2. **Search** — Enter a US property address (e.g., "123 Main St, Austin, TX 78701")
3. **Analyzing** — The app fetches property data and runs analysis (~2-3 seconds)
4. **IQ Verdict** — Shows the deal score (0-100), price targets, and deal signals
5. **StrategyIQ** — Tap "Show Me the Numbers" to see strategy breakdowns (LTR, STR, BRRRR, etc.)
6. **DealMaker** — Tap "Change Terms" to adjust assumptions via sliders and see live metric updates
7. **Saved Properties** — Long-press any analyzed property in the verdict view to bookmark it

## Key Features to Test

- **Search:** Enter any US residential address
- **Verdict Score:** Composite 0-100 score with deal gap analysis
- **6 Strategies:** Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, Wholesale
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
