# Google Analytics 4 — setup and operation

GA4 is the acquisition referee for dealgapiq.com: which source / medium /
campaign brought the visitor who later signed up, started a trial, or paid.
PostHog keeps the identity-stitched product funnel; Vercel keeps page views;
Meta Pixel feeds paid-social. All four are consent-gated and mount only after
the user accepts analytics cookies (`cookie_consent === 'all'`).

## Wiring

| Piece | Where |
|---|---|
| Loader + event mapping | `frontend/src/lib/googleAnalytics.ts` |
| Fan-out from `trackEvent()` | `frontend/src/lib/eventTracking.ts` |
| Init, SPA page views, `user_id` | `frontend/src/components/AnalyticsProvider.tsx` |
| Env var | `NEXT_PUBLIC_GA_MEASUREMENT_ID` (Vercel: Production + Preview) |
| CSP | `frontend/next.config.js` — `www.googletagmanager.com`, `*.google-analytics.com`, `*.analytics.google.com` |
| Tests | `frontend/src/__tests__/lib/googleAnalytics.test.ts` |

gtag is configured with `send_page_view: false`; `AnalyticsProvider` fires
`page_view` on every App Router pathname change so the initial load is not
double-counted.

## Event names

Every `trackEvent()` call is forwarded. These are renamed to GA4 recommended
names so they land in the built-in conversion and monetization reports:

| App event | GA4 event | Notes |
|---|---|---|
| `signup_completed` | `sign_up` | |
| `checkout_started` | `begin_checkout` | This is the trial-start event; `plan` = monthly \| yearly |
| `checkout_completed` | `purchase` | `currency=USD`, `value` from plan price, `transaction_id` = Stripe session id |
| `verdict_viewed` | `analysis_run` | |
| everything else | same name | `proforma_download`, `activated`, `property_searched`, … |

## GA4 admin checklist (one time)

1. Admin → Data streams → Web → copy the `G-` measurement ID into Vercel.
2. Admin → Events → mark as key events: `purchase`, `begin_checkout`,
   `sign_up`, `proforma_download`, `activated`.
3. Admin → Product links → Search Console → link `sc-domain:dealgapiq.com`.
4. Admin → Data settings → Data retention → 14 months.
5. Later, when Google Ads exists: Admin → Product links → Google Ads, then
   import `begin_checkout` (primary until purchases exceed ~30/month) and
   `purchase` as conversions.

## Verify after deploy

Accept analytics cookies on the site, then open GA4 → Reports → Realtime and
confirm `page_view` appears with your path. Run one analysis and confirm
`analysis_run`. The `Network` tab should show requests to
`google-analytics.com/g/collect`.

## Known gaps

Ad blockers and iOS privacy features hide a share of visitors; ad-platform
counts will always run higher than GA4. App Store / Google Play purchases
(RevenueCat) do not pass through `/checkout/success` and are not attributed
here — judge mobile by store listing data plus RevenueCat.
