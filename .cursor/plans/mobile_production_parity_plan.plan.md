---
name: Mobile Production Parity Plan
overview: "Step-by-step phased plan to bring the DealGapIQ mobile module (Expo/React Native) to production parity with the frontend. Reflects actual infrastructure: Railway (backend), Vercel (frontend), EAS Build (mobile)."
todos:
  - id: phase0-validate-builds
    content: "Phase 0.1: Validate EAS builds — run expo start, confirm fonts render, test development profile on simulator"
    status: pending
  - id: phase0-fix-endpoints
    content: "Phase 0.2: Fix endpoint mismatches — photos, comps, address validation use wrong URLs vs Railway backend"
    status: pending
  - id: phase0-worksheet-hook
    content: "Phase 0.3: Replace client-side worksheet calculations with backend API calls to Railway"
    status: pending
  - id: phase1-search-flow
    content: "Phase 1.1: Property search — remove fake address validation, use direct search against Railway backend"
    status: pending
  - id: phase1-analyzing-verdict
    content: "Phase 1.2: Analyzing + Verdict — test full flow against Railway staging, verify data renders correctly"
    status: pending
  - id: phase1-strategy
    content: "Phase 1.3: Strategy screen — wire to backend worksheet endpoints on Railway, remove local calculations"
    status: pending
  - id: phase2-details-photos-comps
    content: "Phase 2.1: Property details, photos (GET /api/v1/photos), comps (GET /api/v1/similar-sold + similar-rent) — fix to use correct Railway endpoints"
    status: pending
  - id: phase2-usage-recording
    content: "Phase 2.2: Usage recording — call POST /api/v1/billing/usage/record-analysis on verdict load, show UsageBar"
    status: pending
  - id: phase2-excel-export
    content: "Phase 2.3: Excel proforma export — download from Railway GET /api/v1/proforma/property/{id}/excel, native share"
    status: pending
  - id: phase3-revenuecat
    content: "Phase 3.1: RevenueCat — configure products, paywall, restore; requires App Store Connect + Play Console setup"
    status: pending
  - id: phase3-backend-webhook
    content: "Phase 3.2: Railway backend — add POST /api/v1/billing/revenuecat-webhook for subscription sync"
    status: pending
  - id: phase3-biometric
    content: "Phase 3.3: Biometric auth — integrate into login flow with secure token storage"
    status: pending
  - id: phase4-about-pricing
    content: "Phase 4.1: About and Pricing screens — content parity with Vercel frontend"
    status: pending
  - id: phase4-offline-errors
    content: "Phase 4.2: Offline handling, error boundaries, OfflineBanner health check against Railway"
    status: pending
  - id: phase5-sentry-ship
    content: "Phase 5: Sentry (separate DSN from frontend), regression, store compliance, EAS Submit, OTA"
    status: pending
isProject: true
---

# DealGapIQ Mobile — Production Parity Plan

## Infrastructure Map

| Layer | Service | Production URL | Staging URL |
|-------|---------|---------------|-------------|
| Backend API | **Railway** | `https://api.dealgapiq.com` | `https://api-staging.dealgapiq.com` |
| Frontend (web) | **Vercel** | `https://dealgapiq.com` | `https://dealgapiq-*.vercel.app` |
| Mobile builds | **EAS Build** | App Store / Google Play | TestFlight / Internal |
| Mobile OTA | **EAS Update** | Production channel | Preview channel |
| Payments (web) | **Stripe** via Railway | Railway webhook | — |
| Payments (mobile) | **RevenueCat** | Railway webhook (TBD) | — |
| Error monitoring | **Sentry** | Separate mobile DSN | — |
| Push notifications | **Expo Push** | Via Railway `/api/v1/devices` | — |

### Key Architectural Rule

The mobile app talks **only to Railway**. It never calls Vercel API routes.
The Vercel frontend has Next.js API routes (e.g. `/api/validate-address`) that
use server-side API keys — the mobile app cannot access these. Any feature that
the frontend implements via a Vercel API route must either:
1. Already exist as a Railway backend endpoint, or
2. Be added as a new Railway backend endpoint, or
3. Be implemented client-side in the mobile app with appropriate API keys.

---

## Current State: Endpoint Audit

Before any feature work, these endpoint mismatches must be fixed.
The mobile currently calls URLs that **do not exist** on the Railway backend.

| Mobile Calls | Railway Backend Has | Fix Required |
|-------------|-------------------|-------------|
| `POST /api/v1/address/validate` | Nothing (Vercel-only route) | Remove; search directly via `/api/v1/properties/search` |
| `GET /api/v1/properties/{zpid}/photos` | `GET /api/v1/photos?zpid={zpid}` | Fix URL + query param format |
| `GET /api/v1/properties/{zpid}/comps/sale` | `GET /api/v1/similar-sold?zpid={zpid}` | Fix URL + query param format |
| `GET /api/v1/properties/{zpid}/comps/rent` | `GET /api/v1/similar-rent?zpid={zpid}` | Fix URL + query param format |
| Client-side worksheet math in `useWorksheet.ts` | `POST /api/v1/worksheet/{strategy}/calculate` | Replace local math with API call |

### Endpoints That Already Work Correctly

| Mobile Calls | Railway Backend | Status |
|-------------|----------------|--------|
| `POST /api/v1/properties/search` | Property search | OK |
| `POST /api/v1/analysis/verdict` | IQ Verdict | OK |
| `GET /api/v1/billing/usage` | Usage stats | OK |
| `POST /api/v1/billing/usage/record-analysis` | Record analysis | OK |
| `GET /api/v1/proforma/property/{id}/excel` | Excel download | OK |
| `POST /api/v1/auth/login` | Auth login | OK |
| `POST /api/v1/auth/register` | Auth register | OK |
| `POST /api/v1/auth/refresh` | Token refresh | OK |
| `GET /api/v1/auth/me` | Current user | OK |
| `GET /api/v1/search-history/recent` | Search history | OK |
| `GET /api/v1/properties/saved` | Saved properties | OK |
| `POST /api/v1/devices/register` | Push tokens | OK |

### CORS Status

Railway backend already allows Expo dev ports (`8081`, `19000`, `19006`) in
`CORS_ORIGINS_STR`. Native mobile requests bypass browser CORS enforcement,
so production mobile will work without CORS changes.

---

## Phase 0: Foundation & Fix (Week 1)

**Goal:** App runs on simulator, all API calls hit Railway correctly, TypeScript clean.

### 0.1 — Validate Builds and Fonts

- [ ] Run `npx expo start` and confirm the app loads on iOS Simulator and/or Android Emulator
- [ ] Verify custom fonts (DM Sans, Space Mono, Source Sans 3) actually render — variable `.ttf` files may need Expo font plugin config
- [ ] Run `eas build --profile development --platform ios` to confirm EAS builds succeed
- [ ] Confirm `EXPO_PUBLIC_API_URL` resolves to Railway in each EAS profile

**Depends on:** Nothing (first step)
**Railway changes:** None
**Vercel changes:** None

### 0.2 — Fix Endpoint Mismatches

Fix the three mobile files that call non-existent Railway URLs:

**`app/photos.tsx`** — Change:
```
GET /api/v1/properties/${zpid}/photos
```
To:
```
GET /api/v1/photos?zpid=${zpid}
```

**`app/comps.tsx`** — Change sale comps:
```
GET /api/v1/properties/${zpid}/comps/sale
```
To:
```
GET /api/v1/similar-sold?zpid=${zpid}
```
And rent comps:
```
GET /api/v1/properties/${zpid}/comps/rent
```
To:
```
GET /api/v1/similar-rent?zpid=${zpid}
```

**`hooks/useAddressValidation.ts`** — The Railway backend has no address
validation endpoint. The Vercel frontend uses a Next.js API route with a
server-side Google Maps API key. Options:
1. **(Recommended)** Remove the validation hook entirely. The mobile search
   already calls `POST /api/v1/properties/search` on Railway which handles
   address resolution. If the address is bad, the backend returns an error.
2. (Future) Add `POST /api/v1/address/validate` to Railway backend.
3. (Future) Use Google Places Autocomplete SDK client-side with a mobile-restricted API key.

**Depends on:** 0.1
**Railway changes:** None
**Vercel changes:** None

### 0.3 — Replace Client-Side Worksheet Calculations

`hooks/useWorksheet.ts` currently duplicates mortgage, NOI, cap rate, and cash
flow calculations client-side with hardcoded assumptions. This violates the
project rule: "metric calculations live in the backend; mobile only consumes
API responses."

Replace with calls to the Railway backend's worksheet endpoints:
- `POST /api/v1/worksheet/ltr/calculate`
- `POST /api/v1/worksheet/str/calculate`
- `POST /api/v1/worksheet/brrrr/calculate`
- `POST /api/v1/worksheet/flip/calculate`
- `POST /api/v1/worksheet/househack/calculate`
- `POST /api/v1/worksheet/wholesale/calculate`

Each takes property data + assumptions and returns calculated metrics.
The `strategy.tsx` screen should call the appropriate endpoint based on
`strategyId`.

**Depends on:** 0.2
**Railway changes:** None (endpoints already exist)
**Vercel changes:** None

---

## Phase 1: Core Experience (Weeks 2–3)

**Goal:** End-to-end flow works: search → analyzing → verdict → strategy.
All data comes from Railway. Visuals match frontend.

### 1.1 — Property Search Flow

- [ ] Remove `useAddressValidation` hook from search flow (or make it a no-op that passes through)
- [ ] Confirm search submits to `POST /api/v1/properties/search` on Railway
- [ ] Navigate to `/analyzing` screen on submit, then to `/verdict` after minimum display time
- [ ] Handle Railway error responses (invalid address, rate limit, server error) with user-friendly messages
- [ ] Test against Railway staging with real addresses

**Depends on:** Phase 0 complete
**Railway changes:** None

### 1.2 — Analyzing + Verdict Flow

- [ ] Confirm `analyzing.tsx` progress ring animation works on device (not just simulator)
- [ ] Confirm `verdict.tsx` receives full verdict response from Railway's `POST /api/v1/analysis/verdict`
- [ ] Verify AI narrative (`deal_narrative`) from backend renders in the narrative box
- [ ] Verify Price Comparison Bar shows correct data (Income Value, Wholesale MAO, list price)
- [ ] Verify strategy rankings render with correct scores and colors
- [ ] Verify valuations and rental estimates display correctly
- [ ] Test the save-to-vault flow (`POST /api/v1/properties/saved`)

**Depends on:** 1.1
**Railway changes:** None

### 1.3 — Strategy Worksheets (Backend-Driven)

- [ ] Wire `strategy.tsx` to call the correct Railway worksheet endpoint based on `strategyId`
- [ ] Map the backend response fields to the UI (acquisition, income/expenses, key metrics)
- [ ] Each of the 6 strategies should display strategy-specific metrics:
  - LTR: cash flow, cap rate, CoC, DSCR
  - STR: RevPAR, occupancy, gross revenue
  - BRRRR: cash recoup, equity created, post-refi cash flow
  - Flip: net profit, ROI, annualized ROI
  - House Hack: personal savings, net housing cost
  - Wholesale: assignment fee, ROI on EMD
- [ ] Strategy picker (horizontal scroll) should switch between strategies
- [ ] Test each strategy against Railway staging

**Depends on:** 1.2, 0.3
**Railway changes:** None (worksheet endpoints already exist)

---

## Phase 2: Data Screens & Monetization Hooks (Week 4)

**Goal:** All supporting data screens work. Usage tracking active.

### 2.1 — Property Details, Photos, Comps

**Property Details** (`property-details.tsx`):
- [ ] Already uses `usePropertySearch` which calls Railway — verify it displays all fields correctly

**Photos** (`photos.tsx`):
- [ ] Fix endpoint to `GET /api/v1/photos?zpid=${zpid}` (Railway)
- [ ] Parse response correctly (backend returns `{ photos: [...] }` or similar)
- [ ] Implement retry with exponential backoff (AXESSO photos endpoint is unreliable)
- [ ] Test with properties that have photos and those that don't

**Sale Comps** (`comps.tsx` — sale tab):
- [ ] Fix endpoint to `GET /api/v1/similar-sold?zpid=${zpid}` (Railway)
- [ ] Parse response format from backend (may differ from current `{ comps: [...] }` assumption)

**Rent Comps** (`comps.tsx` — rent tab):
- [ ] Fix endpoint to `GET /api/v1/similar-rent?zpid=${zpid}` (Railway)
- [ ] Implement fallback: if Zillow rent comps fail, try `GET /api/v1/rentcast/rental-comps?zpid=${zpid}`
- [ ] Show "Rent comps temporarily unavailable" rather than error when both fail (known reliability issue)

**Depends on:** 0.2 (endpoint fixes)
**Railway changes:** None (endpoints exist)

### 2.2 — Usage Recording & Gating

- [ ] On verdict screen load (for Starter users), call `POST /api/v1/billing/usage/record-analysis` on Railway
- [ ] Only record once per verdict load (use a ref flag, matching frontend pattern)
- [ ] Fetch usage via `GET /api/v1/billing/usage` on Railway
- [ ] Display `UsageBar` component on search tab and profile
- [ ] When `searches_remaining <= 0`, show upgrade prompt and block new analyses
- [ ] Pro users bypass recording (unlimited)

**Depends on:** 1.2
**Railway changes:** None (endpoints exist)

### 2.3 — Excel Proforma Export

- [ ] `useExcelExport.ts` downloads from Railway: `GET /api/v1/proforma/property/{id}/excel`
- [ ] Confirm the download works with Bearer token auth against Railway
- [ ] Test the native share sheet (expo-sharing) on iOS and Android
- [ ] Gate behind Pro subscription check (show paywall for Starter users)

**Depends on:** 1.2
**Railway changes:** None (endpoint exists)

---

## Phase 3: Payments & Auth Hardening (Week 5)

**Goal:** RevenueCat integrated. Subscriptions sync between RevenueCat and Railway backend.

### 3.1 — RevenueCat Setup

**Prerequisites (manual, outside of code):**
- [ ] Create RevenueCat account and project
- [ ] Configure products in App Store Connect: `dealgapiq_pro_monthly` ($39/mo), `dealgapiq_pro_annual` ($29/mo billed annually)
- [ ] Configure same products in Google Play Console
- [ ] Set up 7-day free trial on annual plan
- [ ] Add API keys to EAS environment variables: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- [ ] Create `DealGapIQ Pro` entitlement in RevenueCat dashboard (exact string, case-sensitive)

**Code:**
- [ ] Verify `services/purchases.ts` initializes correctly with the real API keys
- [ ] Verify `components/Paywall.tsx` displays offerings from RevenueCat
- [ ] Test purchase flow on TestFlight (iOS) and Internal Testing (Android)
- [ ] Implement restore purchases button and flow
- [ ] Handle purchase errors, cancellation, and edge cases

**Depends on:** App Store Connect and Play Console accounts configured
**Railway changes:** None yet (see 3.2)

### 3.2 — Railway Backend: RevenueCat Webhook

The Railway backend needs a new endpoint to receive subscription status changes
from RevenueCat. This keeps the backend's `subscription` table in sync.

- [ ] Add `POST /api/v1/billing/revenuecat-webhook` to Railway backend
- [ ] Validate webhook signature using RevenueCat shared secret
- [ ] Map RevenueCat events to subscription status updates:
  - `INITIAL_PURCHASE` / `RENEWAL` → set tier to `pro`, status to `active`
  - `CANCELLATION` → set status to `cancelled` (access continues until period end)
  - `EXPIRATION` → set tier to `free`, status to `expired`
  - `BILLING_ISSUE` → set status to `grace_period`
- [ ] Configure webhook URL in RevenueCat dashboard: `https://api.dealgapiq.com/api/v1/billing/revenuecat-webhook`
- [ ] Test with RevenueCat sandbox purchases

**Depends on:** 3.1
**Railway changes:** YES — new endpoint required
**Vercel changes:** None

### 3.3 — Biometric Authentication

- [ ] On app launch (after token hydration), check if biometric is enabled via `services/biometric.ts`
- [ ] If enabled, prompt Face ID / Touch ID before showing main app
- [ ] Fall back to PIN/password entry if biometric fails
- [ ] Add toggle in Settings screen to enable/disable biometric
- [ ] Store biometric preference in Expo SecureStore

**Depends on:** Phase 0
**Railway changes:** None (client-side only)

---

## Phase 4: Polish & Platform (Week 6)

**Goal:** All screens present. Offline handling. Performance optimized.

### 4.1 — About and Pricing Screens

- [ ] `about.tsx` — match Vercel frontend's About page content (metrics explanation, strategies, how it works, founder section)
- [ ] `pricing.tsx` — match Vercel frontend's Pricing page (Free vs Pro comparison, FAQ accordion, monthly/annual toggle)
- [ ] Pricing screen's "Start Free Trial" button should open Paywall component
- [ ] Link from Profile tab to both screens

**Depends on:** Phase 3 (Paywall exists)
**Railway changes:** None
**Vercel changes:** None (content reference only)

### 4.2 — Offline Handling & Error States

- [ ] `OfflineBanner.tsx` health check should ping Railway: `https://api.dealgapiq.com/health`
- [ ] When offline, show cached property data if available (React Query cache)
- [ ] When offline, disable search and show clear messaging
- [ ] Error boundaries on every screen (already scaffolded in `ErrorBoundary.tsx`)
- [ ] Consistent error UI for Railway API errors (401 → re-auth, 429 → rate limit message, 500 → generic retry)

**Depends on:** Phase 1 complete
**Railway changes:** None

### 4.3 — Deep Linking & Performance

- [ ] Deep links go through auth gate before navigating (per production-readiness plan)
- [ ] Validate deep link host is `dealgapiq.com` or `www.dealgapiq.com`
- [ ] Universal links (iOS) and App Links (Android) resolve to verdict/property screens
- [ ] Use FlatList for comps lists (already done)
- [ ] Test startup time, navigation transitions, scroll performance

**Depends on:** Phase 2 complete
**Railway changes:** None

---

## Phase 5: Ship (Week 7)

**Goal:** Production-ready. Submitted to stores.

### 5.1 — Sentry Integration

- [ ] Create a **separate** Sentry project for mobile (not the same as the Vercel frontend's project)
- [ ] Set `EXPO_PUBLIC_SENTRY_DSN` in EAS environment variables
- [ ] Verify `services/sentry.ts` initializes correctly in production builds (not in __DEV__)
- [ ] Test crash reporting with a deliberate error
- [ ] Enable performance monitoring (traces)

**Depends on:** Sentry account setup
**Railway changes:** None
**Vercel changes:** None

### 5.2 — Regression Testing

- [ ] Every screen loads and displays data from Railway staging
- [ ] Full E2E: register → search → analyzing → verdict → strategy → save → deal vault
- [ ] Starter flow: 3 analyses → gate → upgrade prompt
- [ ] Pro flow: purchase → unlimited analyses → Excel export
- [ ] Restore purchases flow
- [ ] Biometric login flow
- [ ] Deep link to verdict with auth
- [ ] Offline → online recovery
- [ ] Both iOS and Android

### 5.3 — Store Compliance

- [ ] iOS: Financial services disclaimer in App Store listing
- [ ] iOS: Restore Purchases button accessible (App Store requirement)
- [ ] iOS: `ITSAppUsesNonExemptEncryption: false` already set
- [ ] iOS: Face ID usage description already set in `app.json`
- [ ] Android: Data safety form in Play Console
- [ ] Both: Privacy policy URL in app and store listings

### 5.4 — EAS Submit & OTA

- [ ] `eas build --profile production --platform all` — clean production builds
- [ ] `eas submit --profile production --platform ios` — submit to App Store
- [ ] `eas submit --profile production --platform android` — submit to Play Store
- [ ] Configure EAS Update for OTA JS bundle updates post-release
- [ ] Test OTA update cycle: push update → app receives it on next launch

**Railway changes:** None
**Vercel changes:** None

---

## Summary: What Requires Railway Backend Changes

Only **one** new endpoint is needed on Railway:

| Change | Endpoint | Phase |
|--------|----------|-------|
| RevenueCat webhook | `POST /api/v1/billing/revenuecat-webhook` | Phase 3.2 |

Optionally, in a future release:

| Change | Endpoint | Phase |
|--------|----------|-------|
| Address validation proxy | `POST /api/v1/address/validate` | Future |

Everything else uses **existing** Railway backend endpoints — the mobile code
just needs to call the correct URLs.

---

## Summary: What Requires No Backend/Frontend Changes (Pure Mobile)

| Task | Phase |
|------|-------|
| Fix endpoint URLs (photos, comps, address) | 0.2 |
| Replace client-side worksheet math with API calls | 0.3 |
| Search → Analyzing → Verdict flow | 1.1–1.2 |
| Strategy worksheets (backend-driven) | 1.3 |
| Usage recording and gating | 2.2 |
| Excel export | 2.3 |
| RevenueCat client-side integration | 3.1 |
| Biometric auth | 3.3 |
| About and Pricing screens | 4.1 |
| Offline handling | 4.2 |
| Deep links and performance | 4.3 |
| Sentry, regression, store submit, OTA | 5.x |

---

## Risk Register

1. **AXESSO reliability** — Photos and rent comps endpoints on Railway proxy to AXESSO which has known reliability issues. Mobile must implement the same non-blocking retry pattern as the frontend.
2. **RevenueCat ↔ Railway sync** — If the webhook fails or is misconfigured, users could have Pro access in the app but not in the backend (or vice versa). Test extensively with sandbox purchases.
3. **App Store rejection** — Missing restore purchases, missing financial disclaimers, or incorrect IAP configuration are common rejection reasons.
4. **Variable fonts on Expo** — The downloaded `.ttf` files are variable fonts. Expo's font system may not support weight variation from a single file — may need individual weight files instead.
5. **EAS Build stability** — Previous audits flagged dependency conflicts and Sentry auth errors. Phase 0.1 validates this before any feature work begins.
