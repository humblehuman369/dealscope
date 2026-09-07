# Google Analytics account — current status

**Verdict: Google Analytics 4 is not set up for DealGapIQ.**

Audited from the repo and env contracts on 2026-09-06. This is not a login to
`analytics.google.com` — if a GA4 property exists in a Google account that was
never wired into the site, this audit would not see it. Nothing in the product
sends hits to Google Analytics.

---

## Google Analytics 4 / Tag Manager

| Item | Status |
|------|--------|
| GA4 measurement ID (`G-XXXXXXXX`) | Not present |
| Universal Analytics (`UA-XXXX`) | Not present |
| Google Tag Manager container (`GTM-XXXX`) | Not present |
| `gtag.js` / `@next/third-parties/google` | Not installed |
| `NEXT_PUBLIC_GA_*` (or any GA env var) | Not defined in `frontend/.env.example` or code |
| Events forwarded to `gtag` | No — `trackEvent()` fans out to Vercel + PostHog + Meta only |
| CSP allowlist for `googletagmanager.com` / `google-analytics.com` | Not in `script-src` |
| Privacy policy lists Google Analytics | No |
| Cookie banner mentions Google Analytics | No (generic “optional analytics”) |

**Planned, not shipped.** `docs/marketing/LAUNCH_MARKETING_PLAN.md` lists
“Google Analytics 4 on dealgapiq.com” under Analytics Setup. The LinkedIn
blueprint refers to “GA4 or analytics platform” as a metric source. Neither
was implemented.

---

## Nearby Google properties (not Analytics)

These are live or contracted. They are easy to confuse with a GA account.

| Product | Role | Status |
|---------|------|--------|
| **Google Search Console** | Indexing + query/click reports | **In use.** Site verification via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`. Daily pull via `GSC_SERVICE_ACCOUNT_JSON` + `GSC_SITE_URL` (`sc-domain:dealgapiq.com`). Ops: `docs/seo-operations.md`. |
| **Google Maps / Places / Address Validation** | Maps, autocomplete, geocoding | **In use.** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (client) and `GOOGLE_MAPS_API_KEY` (server). Listed in the privacy policy. |
| **Google Sign-In** | OAuth login | **In use.** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. |
| **Google Ads API** | Paid-search spend into `/admin/marketing` | **Not built.** Schema enum `google_ads_api` exists; pull is specified in `docs/marketing/bots/OFFICIAL_APIS.md` and is still a Phase 4 checklist. Scorecard channel `google_ads` is filled by Analyst bot capture today, not an Ads API. |

GSC and Google Ads are **not** a substitute for GA4. GSC has no on-site
funnel, no session identity, and no conversion events from the app.

---

## What *is* the live analytics stack

Consent-gated: `AnalyticsAndConsent` mounts `AnalyticsProvider` only when the
user accepts analytics cookies (`cookie_consent === 'all'`).

| Tool | What it covers | Gate |
|------|----------------|------|
| **Vercel Analytics** | Page views + custom events via `@vercel/analytics` | Consent |
| **PostHog** | Identity-stitched funnels (`signup_completed` → `verdict_viewed` → `activated` → checkout). Project 463676 per `docs/marketing/DIRECT_RESPONSE_PLAYBOOK.md`. | Consent + `NEXT_PUBLIC_POSTHOG_KEY` |
| **Meta Pixel** | Four standard events for paid social (Lead, CompleteRegistration, StartTrial, Subscribe) | Consent + `NEXT_PUBLIC_META_PIXEL_ID` |

Call site: `frontend/src/lib/eventTracking.ts` → `vercelTrack` / `capturePostHog` / `captureMetaPixel`. There is no Google destination.

Traffic and conversion ops currently point at Vercel Analytics + PostHog + GSC
(`docs/seo-operations.md`), not GA4.

---

## What a “fully set up” GA4 account would still need

If a GA4 property is created in Google (or already exists unused):

1. Measurement ID in Vercel as `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
2. Consent-gated snippet (same `consent === 'all'` mount as PostHog).
3. CSP `script-src` (and connect) for `www.googletagmanager.com` / `*.google-analytics.com`.
4. Funnel events forwarded from `trackEvent()` (or Enhanced Measurement only, if pageviews are enough).
5. Privacy policy + cookie copy naming Google Analytics.
6. Optional: link the existing Search Console property and (later) Google Ads for conversion import.

Until those exist, treat the Google Analytics account as **not connected to dealgapiq.com**.
