# Official ad APIs — replacing bot capture (Phase 4)

**Goal:** `meta_ads` and `google_ads` rows in `marketing_metrics_daily` come
from the platforms' APIs instead of a bot reading Ads Manager in a browser.
The schema does not change. Only `source` does: `bot_capture` → `meta_api` /
`google_ads_api`.

## How the swap is safe (already built)

`build_scorecard` drops a `bot_capture` row for any **day** on which an API
source reported the same `(channel, metric)`. So the API pull can start while
the Analyst is still capturing; nothing double counts, and the day the bot
stops, the API rows are the only ones left. The scorecard's source badge shows
which is which the whole time.

Once an API pull runs for a channel, remove that dashboard from the Analyst's
§2 sequence in `METRICS_ANALYST.md` (a bot capture beside an API value is
noise the operator does not need), and drop the login from the bot computer.

## Meta Marketing API — `ads_read`

What you need: a Meta app in *Business* type, **Business verification** for
the DealGapIQ Business Manager, and App Review approval for `ads_read`.
Advanced access to `ads_read` is what lets a system user read insights for
the ad account without a person logging in.

1. developers.facebook.com → *Create app* → type **Business**. Attach it to
   the DealGapIQ Business Manager.
2. Business settings → *Security Center* → **Start verification** (legal
   entity documents; typically days to two weeks).
3. App → *App Review* → *Permissions and features* → request **Advanced
   access** for `ads_read`. The review asks for a screencast showing the use
   case: "server-side daily pull of campaign spend, impressions, clicks and
   leads into an internal dashboard; no user-facing Facebook login". Record
   `/admin/marketing` with the scorecard visible.
4. On approval: Business settings → *System users* → add an **Admin system
   user**, assign the ad account with *View performance* only, and *Generate
   new token* with the `ads_read` scope. System-user tokens do not expire.
5. Railway: `META_ADS_ACCESS_TOKEN=<token>`, `META_AD_ACCOUNT_ID=act_...`.

Endpoint the pull uses (Graph API v21+):
`GET /{ad_account_id}/insights?level=account&time_range={since,until}&fields=spend,impressions,clicks,actions`
with `actions` filtered to `lead` / `offsite_conversion.fb_pixel_lead`.
Maps to `meta_ads` metrics `spend`, `impressions`, `clicks`, `leads`,
`source=meta_api`. The Meta Pixel ID must be set on the site first or `leads`
stays empty (still never fabricated).

## Google Ads API — developer token

What you need: a **Google Ads manager account (MCC)**, a developer token
promoted from *Test* to **Basic access**, and an OAuth client or service
account that can read the customer.

1. Create a manager account at ads.google.com/home/tools/manager-accounts/
   and link the DealGapIQ customer under it.
2. Manager account → *Tools* → *API Center* → apply for a developer token.
   It starts at *Test access* (test accounts only). Apply for **Basic access**
   from the same page: describe the tool as an internal reporting dashboard
   pulling daily account-level cost, impressions, clicks and conversions;
   attach a screenshot of `/admin/marketing`. Basic access review is usually a
   few business days; they email questions.
3. Google Cloud → OAuth client (Desktop) → run the one-time consent to obtain
   a refresh token for a read-only user on the manager account, **or** enable
   domain-wide delegation for a service account if the Ads account is under
   Workspace.
4. Railway: `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`,
   `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`,
   `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (manager), `GOOGLE_ADS_CUSTOMER_ID`.

Query the pull uses (GAQL, `SearchStream`):

```
SELECT segments.date, metrics.cost_micros, metrics.impressions,
       metrics.clicks, metrics.conversions
FROM customer
WHERE segments.date BETWEEN '<yesterday>' AND '<yesterday>'
```

Maps to `google_ads` metrics `spend` (`cost_micros / 1e6`), `impressions`,
`clicks`, `leads` (`conversions`), `source=google_ads_api`.

## Implementation checklist (when either approval lands)

- Add the pull to `backend/app/services/marketing_metrics_jobs.py` beside
  PostHog and GSC: same "unset credentials → `skipped`, never fabricated"
  contract, same `upsert_metrics(..., source=MetricSource.META_API)` write.
  Both enum values already exist in `app/models/marketing.py`.
- Wire it into the existing `marketing-metrics` cron; no new schedule.
- Add a `*_configured` flag to `MarketingHealth` and a `Flag` in
  `BotsHealth.tsx` so the operator can see it is live.
- Tests: mapping from API rows to snapshots, skipped when unconfigured, and
  the scorecard precedence test in `tests/test_marketing_ops_jobs.py`
  already covers the overlap.
- Then edit `METRICS_ANALYST.md` §2 to remove that dashboard and revoke the
  bot computer's login for it.

## LinkedIn (same pattern, later)

Founder-profile analytics need the Community Management API (application at
linkedin.com/developers, *Community Management API* product). Company page
analytics are available once the app has `r_organization_social`. On
approval the pull writes `linkedin` metrics with `source=linkedin_api`, and
the same precedence rule retires the bot's LinkedIn capture.
