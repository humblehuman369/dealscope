<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into DealGapIQ's FastAPI backend. A new `posthog_client` singleton module was created and wired into the FastAPI lifespan for startup initialization and graceful shutdown. User identification (via `posthog_client.set()`) fires at every login and registration event, linking the user's UUID as the distinct ID and recording email/name as person properties. Twelve event captures were added across six router files, covering the full user journey from signup through core product usage to subscription conversion and churn.

| Event | Description | File |
|---|---|---|
| `user_registered` | New user completes registration via email, Google OAuth, or Apple Sign In | `backend/app/routers/auth.py` |
| `user_logged_in` | User successfully authenticates (password, Google, or Apple) | `backend/app/routers/auth.py` |
| `property_searched` | User runs a property analysis search — the core top-of-funnel action | `backend/app/routers/property.py` |
| `analysis_limit_reached` | User's search is blocked due to exhausted monthly analysis quota | `backend/app/routers/property.py` |
| `property_saved` | User saves a property to their portfolio | `backend/app/routers/saved_properties.py` |
| `deal_maker_updated` | User adjusts Deal Maker assumptions on a saved property | `backend/app/routers/saved_properties.py` |
| `worksheet_calculated` | User runs a strategy worksheet calculation (LTR, STR, BRRRR, Flip, House Hack, Wholesale) | `backend/app/routers/worksheet.py` |
| `proforma_exported` | User downloads a proforma Excel or PDF for a property | `backend/app/routers/proforma.py` |
| `loi_generated` | User generates a Letter of Intent document for a wholesale deal | `backend/app/routers/loi.py` |
| `subscription_checkout_started` | User initiates Stripe checkout to upgrade to Pro | `backend/app/routers/billing.py` |
| `subscription_trial_started` | User successfully starts a Pro subscription (including 7-day trial) | `backend/app/routers/billing.py` |
| `subscription_canceled` | User cancels their Pro subscription | `backend/app/routers/billing.py` |

**Files modified:**
- `backend/app/core/config.py` — added `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, `POSTHOG_DISABLED` settings
- `backend/app/core/posthog_client.py` — new file: PostHog singleton client with fault-tolerant import
- `backend/app/main.py` — initialize PostHog in lifespan startup, flush on shutdown
- `backend/app/routers/auth.py` — user identification + `user_registered` + `user_logged_in`
- `backend/app/routers/property.py` — `property_searched` + `analysis_limit_reached`
- `backend/app/routers/saved_properties.py` — `property_saved` + `deal_maker_updated`
- `backend/app/routers/billing.py` — `subscription_checkout_started` + `subscription_trial_started` + `subscription_canceled`
- `backend/app/routers/proforma.py` — `proforma_exported` (Excel and PDF paths)
- `backend/app/routers/loi.py` — `loi_generated`
- `backend/app/routers/worksheet.py` — `worksheet_calculated` (all 6 strategies)
- `backend/requirements.txt` — added `posthog>=3.0.0`
- `backend/.env` — added `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST`, `POSTHOG_DISABLED`

## Next steps

We've built a dashboard and five insights to monitor user behavior from day one:

- **Dashboard**: [Analytics basics (wizard)](https://us.posthog.com/project/463676/dashboard/1709764)
  - [New Signups & Logins](https://us.posthog.com/project/463676/insights/VWneIGBm) — daily registrations vs logins trend
  - [Property Search Activity](https://us.posthog.com/project/463676/insights/HPMZpKc9) — total searches and unique searchers per day
  - [Subscription Conversion Funnel](https://us.posthog.com/project/463676/insights/qmdTessw) — registration → checkout → trial start conversion
  - [Feature Usage Trends](https://us.posthog.com/project/463676/insights/bEhqbFnH) — worksheet calculations, proforma exports, LOI generation
  - [Subscription Health: Trials vs Cancellations](https://us.posthog.com/project/463676/insights/OsmyEeLh) — weekly new trials vs cancellations for churn monitoring

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
