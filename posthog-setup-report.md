<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the DealGapIQ FastAPI backend. The `posthog_client.py` singleton and lifespan wiring were already in place from a prior pass; this session supplemented the existing coverage by adding six new business-critical events across four routers, confirmed environment variables are correctly set, and built a new dashboard with five insights covering user growth, conversion, engagement, churn, and feature usage.

| Event | Description | File |
|---|---|---|
| `user_registered` | New user signs up (email, Google, or Apple) | `backend/app/routers/auth.py` |
| `user_logged_in` | User authenticates successfully | `backend/app/routers/auth.py` |
| `user_logged_out` | User explicitly logs out *(added)* | `backend/app/routers/auth.py` |
| `email_verified` | User confirms their email address *(added)* | `backend/app/routers/auth.py` |
| `subscription_checkout_started` | Stripe checkout session initiated | `backend/app/routers/billing.py` |
| `subscription_trial_started` | Pro trial begins via Stripe SetupIntent | `backend/app/routers/billing.py` |
| `subscription_upgraded` | Subscription moves to Pro (Stripe webhook or RevenueCat INITIAL_PURCHASE/RENEWAL) *(added)* | `backend/app/routers/billing.py` |
| `subscription_canceled` | User cancels their subscription | `backend/app/routers/billing.py` |
| `analysis_limit_reached` | Free-tier user hits monthly analysis cap | `backend/app/routers/property.py` |
| `property_searched` | User searches for a property | `backend/app/routers/property.py` |
| `property_saved` | User saves a property to their portfolio | `backend/app/routers/saved_properties.py` |
| `property_status_updated` | User advances a property through the pipeline *(added)* | `backend/app/routers/saved_properties.py` |
| `property_deleted` | User removes a property from their portfolio *(added)* | `backend/app/routers/saved_properties.py` |
| `deal_maker_updated` | User runs a Deal Maker analysis on a saved property | `backend/app/routers/saved_properties.py` |
| `worksheet_calculated` | User calculates a strategy worksheet (ltr/str/brrrr/flip/house_hack/wholesale) | `backend/app/routers/worksheet.py` |
| `loi_generated` | User generates a Letter of Intent | `backend/app/routers/loi.py` |
| `proforma_generated` | User generates a financial proforma via POST *(added)* | `backend/app/routers/proforma.py` |
| `proforma_exported` | User downloads a proforma as Excel or PDF | `backend/app/routers/proforma.py` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/463676/dashboard/1709811)
- [New User Registrations](https://us.posthog.com/project/463676/insights/2tmrkcgo) — daily unique registrations
- [Signup to Pro Conversion Funnel](https://us.posthog.com/project/463676/insights/51pMZs4E) — registration → property searched → saved → Pro upgrade
- [Core Engagement Trends](https://us.posthog.com/project/463676/insights/ZRqVRWFH) — searches, saves, and deal analysis over time
- [Subscription Cancellations](https://us.posthog.com/project/463676/insights/BIWWuVzI) — weekly churn signal
- [Worksheet Usage by Strategy](https://us.posthog.com/project/463676/insights/Gkp469oC) — which investment strategies users run most

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
