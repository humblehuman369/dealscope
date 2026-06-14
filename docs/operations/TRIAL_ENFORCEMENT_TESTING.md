# Trial Enforcement Sandbox Test Plan

**Goal:** Validate that the 7-day free trial code path actually works
end-to-end on web (Stripe) and mobile (Apple/Google + RevenueCat)
before any paying customer touches it.

**Context:** The trial enforcement audit identified 3 risks (#1 ProGate
gating, #2 RevenueCat trial date sync, #3 webhook failure fallback).
All three were fixed in commits `8dbe1e05`, `4beabda8`, and `1a4aea70`.
This plan validates those fixes work in real payment environments.

---

## Phase 0: Pre-flight checklist

You need access to the following before starting. None of this costs
real money.

### Stripe (web testing)
- [ ] Stripe Dashboard with **Test mode** toggle (top-right corner)
- [ ] Stripe Test API keys (from Dashboard → Developers → API keys, with
      the Test/Live toggle set to **Test**)
- [ ] **Two test products** in Test mode that mirror production:
      `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_PRO_YEARLY`
- [ ] Stripe CLI installed locally for webhook forwarding
      (`brew install stripe/stripe-cli/stripe` on macOS)
- [ ] Local backend able to run with test env vars

### Apple (iOS testing)
- [ ] App Store Connect access
- [ ] **Sandbox tester account** created in App Store Connect
      (Users and Access → Sandbox → Testers → New Tester)
- [ ] Use a **fresh email** for the sandbox tester (Apple requires it
      to be unused as an Apple ID anywhere)
- [ ] iPhone available for testing (Sandbox does NOT work in Xcode
      Simulator — must be a real device)
- [ ] DealGapIQ build available via TestFlight or Xcode

### Google (Android testing)
- [ ] Google Play Console access
- [ ] **Internal testing track** set up with the latest APK uploaded
- [ ] **License tester accounts** added in Setup → License testing
- [ ] Test Android device or emulator with Google Play Services

### Backend access
- [ ] Ability to read backend logs (Railway dashboard, etc.)
- [ ] Ability to query the production DB (or a staging DB with test
      data) for verification

---

## Phase 1: Stripe (web) — 30 min

Most important phase. This is where most of your trial signups will
happen, and the Stripe path was already in better shape than mobile.

### 1.1 Setup local backend with Stripe test keys

In your deployed Railway/Vercel/etc. environment OR in a local
`.env` file, set:

```
STRIPE_SECRET_KEY=sk_test_...                  # from Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...                 # from `stripe listen` (step 1.2)
STRIPE_PRICE_PRO_MONTHLY=price_...              # test-mode price ID
STRIPE_PRICE_PRO_YEARLY=price_...               # test-mode price ID
```

Restart the backend.

### 1.2 Forward Stripe webhooks to your local backend

In a separate terminal:

```bash
stripe listen --forward-to http://localhost:8000/api/v1/billing/webhook
```

This prints a webhook signing secret like `whsec_xxxx`. Copy it into
`STRIPE_WEBHOOK_SECRET` from step 1.1 and restart the backend. Leave
this terminal running for the entire test phase.

### 1.3 Test 1A — Happy path (trial start → unlock features)

| Step | Action | Expected |
|---|---|---|
| 1 | Open the homepage in incognito, click `Start 7-Day Free Trial` (Monthly) | Redirects to Stripe Checkout |
| 2 | Use test card `4242 4242 4242 4242`, any future expiry, any CVC, any zip | Checkout completes, redirects to `/checkout/success` |
| 3 | Check backend logs | Should see `RevenueCat:` ... wait, this is Stripe. Should see Stripe webhook handlers firing for `checkout.session.completed`, `customer.subscription.created`. No errors. |
| 4 | Query DB | `SELECT tier, status, trial_start, trial_end FROM subscriptions WHERE user_id = ...` — expect `tier=pro`, `status=trialing`, `trial_end ≈ now + 7d` |
| 5 | Open the app and try a Pro-only feature (e.g., Excel proforma download or DealMaker) | **Should NOT be locked.** No "Upgrade to Pro" button. ProGate honors `isTrialing`. (← this validates Risk #1 fix) |

If step 5 fails, you'll see an "Upgrade to Pro" button — that means the
ProGate fix didn't deploy. Verify `frontend/src/components/ProGate.tsx`
on the deployed branch contains `if (isPro || isTrialing)`.

### 1.4 Test 1B — Cancel during trial

| Step | Action | Expected |
|---|---|---|
| 1 | Continuing from 1A, navigate to `/billing` | Subscription summary visible |
| 2 | Click `Cancel Subscription` and confirm | Modal closes, success toast |
| 3 | Query DB | `cancel_at_period_end = true`, `tier` still `pro`, `status` still `trialing` |
| 4 | Try the same Pro feature | **Should still be unlocked** — access continues until day 7 |

### 1.5 Test 1C — Fast-forward to trial end (Stripe Test Clock)

Stripe lets you simulate time passage in test mode. This validates
the day-7 transition without waiting a week.

| Step | Action | Expected |
|---|---|---|
| 1 | In Stripe Dashboard (Test mode) → Developers → Test clocks → New test clock | Test clock created |
| 2 | Attach the customer to the test clock (Stripe CLI: `stripe customers retrieve cus_...` to find the customer ID) | |
| 3 | Advance the clock 8 days forward | Stripe processes the trial-end transition |
| 4 | Watch backend logs | Should see `invoice.created`, `invoice.paid` (because the test card succeeds) |
| 5 | Query DB | `tier=pro`, `status=active`, `trial_end` is in the past, no canceled state (because cancel-at-period-end was set in 1B but we just walked past period end) |
| 6 | Try Pro feature | Still unlocked (now via `isPro`, not `isTrialing`) |

**Variant — declined card at trial end:**
- In Stripe Dashboard, update the customer's card to `4000 0000 0000 0341` (charges trial succeed but renewal fails)
- Advance clock again past next billing → expect `invoice.payment_failed` → status becomes `past_due`

### 1.6 Test 1D — Sweeper validates Risk #3 fix

Manually create a stale trial in the test DB and verify the sweeper
catches it:

```sql
-- Run against test DB
UPDATE subscriptions
SET status = 'trialing',
    trial_end = NOW() - INTERVAL '8 hours',
    updated_at = NOW() - INTERVAL '2 hours'
WHERE user_id = '<your-test-user-id>';
```

Then trigger the sweeper:

```bash
curl -X POST http://localhost:8000/api/v1/billing/admin/sweep-expired-subscriptions \
  -H "Authorization: Bearer <admin-token>"
```

Expected response:

```json
{ "trials_swept": 1, "paid_swept": 0, "errors": 0 }
```

Re-query DB: `tier=free`, `status=canceled`, `canceled_at` populated.

---

## Phase 2: Apple Sandbox (iOS) — 30 min

Critical phase. This validates the Risk #2 fix — that RevenueCat
webhook now correctly populates `trial_start` / `trial_end` for iOS
trials.

### 2.1 Sign in with sandbox tester on iPhone

1. **Sign out of your real Apple ID** for purchases:
   Settings → App Store → tap your name at the top → Sign Out
   (Don't sign out of iCloud — just App Store)
2. **Do NOT sign in with sandbox tester yet.** When you make a purchase,
   iOS will prompt you to sign in — use your sandbox tester credentials
   then.

### 2.2 Install latest DealGapIQ build via TestFlight

Use TestFlight to install the latest build with your trial-enforcement
fixes deployed.

### 2.3 Subscribe in the app

| Step | Action | Expected |
|---|---|---|
| 1 | Open DealGapIQ on iPhone, sign in (or create account) | Logged in |
| 2 | Navigate to pricing / upgrade | Sees Apple's StoreKit purchase sheet |
| 3 | Tap `Subscribe` (Monthly $34.99) | Sandbox prompts for sandbox tester credentials |
| 4 | Enter sandbox tester email + password | Purchase completes (Sandbox always succeeds with test cards) |
| 5 | Check **backend logs** for the RevenueCat webhook | Should see: `RevenueCat: upgraded user X to Pro (TRIALING, period_type=TRIAL)` ← **This is the line that validates Risk #2.** If you see `period_type=NORMAL` or `period_type=unknown` instead, the fix didn't deploy correctly. |
| 6 | Query DB | `tier=pro`, `status=trialing`, `trial_start` and `trial_end` are BOTH populated (not null) |
| 7 | Try a Pro feature in the app | Should be unlocked |

### 2.4 Apple's accelerated trial in sandbox

In sandbox, a **7-day trial completes in ~5 minutes**. Set a timer
and watch:

| Sandbox time | Real time | What should happen |
|---|---|---|
| Day 0 | 0 min | Trial starts |
| Day 7 | ~5 min | Apple charges sandbox card, renews subscription |
| Day 14 | ~10 min | Renews again |

After ~5 minutes, check:
- Backend logs for `RevenueCat: upgraded user X to Pro (ACTIVE, period_type=NORMAL)` — this is the renewal event
- DB: `status=active` (no longer `trialing`)

### 2.5 Test cancellation

Two ways to cancel iOS subscriptions:
1. **In-app:** if you have a self-service cancel UI in the app
2. **Settings:** Settings → tap name → Subscriptions → DealGapIQ → Cancel Subscription

After canceling:
- Backend should receive `CANCELLATION` event
- DB: `cancel_at_period_end=true`, `status` unchanged (still `trialing` or `active`)
- User keeps access until period end (next ~5 minutes in sandbox)

After period end:
- Backend should receive `EXPIRATION` event
- DB: `tier=free`, `status=canceled`
- App's Pro features re-lock

### 2.6 Common Apple Sandbox gotchas

- **Sandbox tester emails must be NEW** — never used as a real Apple ID. If you used your sandbox tester for a real iCloud account, you'll get cryptic errors. Create a new email.
- **Sandbox tester accounts get reset** — Apple periodically wipes sandbox state. If your tester stops working, create a new one.
- **First purchase prompt is jankier than production** — sandbox sometimes asks for tester credentials twice. This is normal.
- **You may need to delete + reinstall the app** between test runs to clear cached entitlements.
- **Family Sharing** — sandbox doesn't reliably support Family Sharing scenarios. Test with a non-family-shared sandbox tester.
- **Region** — sandbox tester region affects which products are available. Make sure your tester is in a region where DealGapIQ is published.

---

## Phase 3: Google Play (Android) — 30 min

Same conceptual flow as iOS. Google's sandbox is generally more
predictable than Apple's.

### 3.1 Setup license tester

In Google Play Console:
- Setup → License testing → add the Google account that will test
- Apps you publish → Internal testing → ensure latest APK with
  trial-enforcement fixes is published to internal track
- Click `Manage testers` → either set up a list of testers or use a
  link

### 3.2 Install on Android device

- Android device signed in with the license-tester Google account
- Open the internal testing link (from Play Console → Internal testing)
- Install DealGapIQ from the Play Store as a license tester

### 3.3 Subscribe

| Step | Action | Expected |
|---|---|---|
| 1 | Open DealGapIQ, sign in | Logged in |
| 2 | Navigate to pricing / upgrade | Google Play Billing sheet appears |
| 3 | Tap `Subscribe` (Monthly) | Confirmation shows "TEST" or "Sandbox" |
| 4 | Confirm purchase | Purchase completes — no real charge |
| 5 | Check backend logs | `RevenueCat: upgraded user X to Pro (TRIALING, period_type=TRIAL)` |
| 6 | Query DB | Same as iOS — trial_start, trial_end populated |
| 7 | Try Pro feature | Unlocked |

### 3.4 Google Play test trial duration

Test purchases on Google Play go through their normal billing cycle by
default. To test trial expiration faster:

- Use the **license tester sandbox** which Google sometimes offers with
  accelerated cycles (~5 min/period like Apple Sandbox), but this
  varies by region and product config.
- OR cancel manually after a few minutes, observe the cancellation
  webhook flow, and verify state transitions.

---

## Phase 4: Cross-platform consistency check (10 min)

After running Phase 1, 2, or 3, verify cross-platform sync:

| Test | Action | Expected |
|---|---|---|
| Web → iOS | Sign up for trial on web (Phase 1). Then log into the iOS app with same user. | iOS app shows Pro features unlocked. Backend `/api/v1/billing/subscription` returns `tier=pro, status=trialing`. |
| iOS → Web | Sign up for trial on iOS (Phase 2). Then log into the web app with same user. | Web shows Pro features unlocked. ProGate respects trial. |

**Known gap:** if a user signs up for trial on web (Stripe) AND also
on iOS (RevenueCat) using the same account, you'll have two active
trial subscriptions. This isn't currently prevented and is worth
considering as a future enhancement (the audit flagged it as a known
loophole).

---

## Phase 5: Final smoke test on production (OPTIONAL, 5 min)

Once Phases 1–3 pass, you can do one real signup as belt-and-suspenders.
Use **Monthly** tier (not Annual) so worst-case exposure is $34.

| Step | Action |
|---|---|
| 1 | Use a fresh email (not your primary account) |
| 2 | Sign up via DealGapIQ.com → Pricing → Start 7-Day Free Trial Monthly |
| 3 | Use a real card |
| 4 | **Immediately cancel** in your account settings |
| 5 | Set a calendar reminder for **day 6** to verify cancellation took effect |
| 6 | On day 7, verify no charge appeared on your card |

If charge appears: something broke. Refund yourself via Stripe Dashboard
and dig into logs.

---

## Pass/fail summary

| Test | Risk validated | Pass criteria |
|---|---|---|
| 1.3 (Web happy path) | Risk #1 | Pro features unlocked during trial without "Upgrade" button |
| 1.4 (Web cancel) | Stripe path | Access continues to day 7 after cancel |
| 1.5 (Web fast-forward) | Trial → Active transition | Status correctly transitions, no manual cleanup needed |
| 1.6 (Sweeper) | Risk #3 | Sweeper downgrades stale TRIALING subscriptions |
| 2.3 (iOS subscribe) | Risk #2 | Backend logs show `period_type=TRIAL` and DB has `trial_start`/`trial_end` populated |
| 2.4 (iOS auto-renew) | Trial → Active mobile | After 5 sandbox minutes, status transitions to active |
| 2.5 (iOS cancel) | RevenueCat cancel path | Cancel-then-expire flow works |
| 3.3 (Android subscribe) | Risk #2 (Android) | Same as 2.3 but Google |
| Phase 4 | Cross-platform | Trial state visible from both web and mobile |
| Phase 5 (optional) | Production stack | Real signup + cancel works without surprises |

---

## When to launch the trial publicly

After Phase 1 + Phase 2 (or Phase 3) pass, you can be confident the
trial works end-to-end. Phase 4 is recommended but not blocking.
Phase 5 is purely optional.

If any test fails: stop, fix, re-run that test before the next.

If you don't have time for full sandbox setup but want to ship: at
minimum, run Phase 1 (Stripe test mode is easy and high-fidelity) and
Phase 5 (one real signup with immediate cancel). That covers ~80% of
your trial signups (web is dominant for SaaS) and validates the
production stack.
