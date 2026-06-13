# PostHog — North-Star Funnel & Activation Dashboard

**Owner:** Growth / Analytics
**North-star metric:** Free → Paid conversion
**Purpose:** Make the wedge funnel measurable so pricing, free-tier, and onboarding changes can be attributed. Capture a baseline *before* shipping billing changes (#3 free tier, #4 reprice).

This spec is paste-ready for the PostHog console. All event names below already fire in the codebase (see `frontend/src/lib/eventTracking.ts` and the call sites listed per event).

---

## 1. Canonical funnel events

| Step | Event | Fires from | Key properties |
|---|---|---|---|
| 1 | `signup_completed` | `app/register/RegistrationContent.tsx`, `components/auth/RegisterForm.tsx` | `method`, `requires_verification` |
| 2 | `verdict_viewed` | `app/discovery/page.tsx` | (analysis context) |
| 3 | `activated` | `components/iq-verdict/FourPathsPanel.tsx`, `components/buyer-directory/BuyerDirectory.tsx`, `components/lender-directory/HardMoneyDirectory.tsx` | `source` = `four_paths` \| `buyer_directory` \| `lender_directory` |
| 4 | `checkout_started` | `components/billing/UpgradeModal.tsx` | `source`, `plan` (`monthly`\|`yearly`), `platform`, `paid_only_feature` |
| 5 | `checkout_completed` | `app/checkout/success/page.tsx` | (plan/amount context) |

> Identity stitching: anonymous pre-signup events are linked to the account via `identifyPostHog()` on login/session (`lib/posthog.ts`). This is why `verdict_viewed` / `activated` that occur *before* signup still attach to the converting user.

---

## 2. Primary funnel (the north-star)

**Create → Product Analytics → Funnels → New funnel.**

- **Name:** `North-Star — Free → Paid`
- **Steps (ordered):**
  1. `signup_completed`
  2. `verdict_viewed`
  3. `activated`
  4. `checkout_started`
  5. `checkout_completed`
- **Conversion window:** `14 days` (matches the 7-day trial + buffer; the assessment notes Day-7 is decisive).
- **Order:** Sequential.
- **Breakdowns to add (clone the funnel per breakdown, or use the breakdown control):**
  - by `activated.source` — which "aha" (Four Paths vs directories) best predicts conversion.
  - by `checkout_started.plan` — annual vs monthly mix.
  - by device / `$os` — mobile (Capacitor) vs web.

**What to read:** the step-3 → step-5 conversion is the activation→paid rate; the overall step-1 → step-5 is the headline north-star number. Record both as the baseline.

---

## 3. Secondary funnel — first-touch activation (pre-signup allowed)

Many users run a discovery before creating an account (no login required for first discovery). Track top-of-funnel health separately.

- **Name:** `Activation — First Touch`
- **Steps:**
  1. `property_searched`
  2. `verdict_viewed`
  3. `activated`
- **Conversion window:** `1 day`.
- **Read:** time-to-first-value and the share of analyzers who reach the "aha." This is the lever for first-week activation work.

---

## 4. Dashboard tiles

**Create → Dashboards → New → `DealGapIQ — North Star`.** Add these insights:

| Tile | Type | Definition |
|---|---|---|
| **Free → Paid conversion %** | Funnel (trend) | The §2 funnel, displayed as conversion-rate-over-time (weekly). The headline number. |
| **Activation rate** | Funnel | `verdict_viewed` → `activated`, weekly. |
| **Activation source mix** | Trends (bar) | `activated` broken down by `source`. |
| **Time to activate** | Funnel (time-to-convert) | Median time `verdict_viewed` → `activated`. Minimize. |
| **Checkout drop-off** | Funnel | `checkout_started` → `checkout_completed`. Surfaces payment-step friction. |
| **Free-tier wall friction** | Trends | `analysis_limit_reached` (count), broken down by `kind` (`free_monthly` \| `anonymous_daily`). Watch this before/after the #3 free-tier change. |
| **Plan mix** | Trends | `checkout_completed` (or `checkout_started`) broken down by `plan`. Validates the annual-lead strategy. |
| **Signups** | Trends | `signup_completed` weekly. Watch vs activation when free tier changes. |

---

## 5. Retention proxy (for Phase 2 / first-renewal work)

Until a dedicated `subscription_renewed` event exists, approximate retention with a **Retention insight**:

- **Type:** Retention
- **Cohortizing event:** `checkout_completed` (first paid)
- **Returning event:** `verdict_viewed` (any active product use)
- **Period:** Weekly, 8+ weeks
- **Read:** weeks-2-to-4 retention is the leading indicator for first-renewal survival, the dominant LTV lever in the assessment.

> Backlog: add an explicit `subscription_renewed` event (fired from the Stripe/RevenueCat renewal webhook handlers in `backend/app/routers/billing.py`) to measure true first-renewal rate.

---

## 6. Setup checklist

1. Confirm `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST`) are set in the production environment.
2. Build the two funnels (§2, §3) and the dashboard (§4).
3. Add the retention insight (§5).
4. Set the dashboard refresh to daily; pin it for weekly review (per the implementation plan's cadence).

---

## 7. Validation — confirm `activated` fires

Do this once, in production or preview, with analytics consent accepted:

1. Accept the analytics cookie banner (the event no-ops without consent — by design).
2. Run a discovery on any address → open a result so the **Four Paths** panel renders.
3. In PostHog → **Activity / Live events**, confirm an `activated` event with `source: "four_paths"`.
4. In the browser console: `localStorage.getItem('dgiq_activated_v1')` should return `"1"`.
5. Re-trigger Four Paths or open a directory → confirm **no duplicate** `activated` (per-device dedup).
6. Edge case: in a fresh private window, **decline** consent, run a discovery (no `activated`), then accept consent and re-run → `activated` should now fire exactly once. (Regression guard for the consent-gating fix.)

---

## 8. Decision gate

Record the baseline **Free → Paid %** and **activation rate** from §2/§4 *before* shipping #3 (free-tier breadth) and #4 (reprice). Per the implementation plan, no paid-acquisition spend is authorized until the organic funnel clears **LTV/CAC ≥ 3** and **payback ≤ 12 months** — which requires this instrumentation to be live and trusted first.
