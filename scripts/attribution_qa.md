# Attribution QA (manual)

Four cases. Run against a staging or local stack with Pixel + CAPI configured
or with both mocked. Record pass/fail in the table at the bottom.

## Case 1 — paid land, verdict, signup

1. Fresh browser. Open `/for/wholesalers?utm_campaign=wholesalers&fbclid=x`.
2. Run an address. Open the verdict.
3. Sign up.

**Pass:** `users.first_touch` has `utm_campaign=wholesalers` and `fbclid=x`.
Pixel `Lead` and CAPI `Lead` share one `event_id` on `verdict_viewed`.
Pixel `CompleteRegistration` and CAPI share the register `event_id`.

## Case 2 — localStorage cleared, UTMs still on the signup URL

1. Same as case 1 through the verdict.
2. Clear localStorage. Keep the signup URL with
   `?utm_campaign=wholesalers&fbclid=x`.
3. Sign up.

**Pass:** user record still has `utm_campaign=wholesalers` and `fbclid=x`
(live URL fills gaps; first-touch cookie also survives Safari's 7-day
localStorage cap).

## Case 3 — decline analytics consent

1. Decline analytics cookies.
2. Run an address. Verdict renders.
3. Confirm no PostHog / Vercel events fire.
4. With `META_CAPI_CONSENT_MODE=strict` (default), CAPI sends nothing with
   PII (event is dropped when `analytics_consent=false`).

**Pass:** verdict still renders. No PostHog events. No hashed email on CAPI.

## Case 4 — accept consent, matching event ids

1. Accept analytics.
2. Run an address.
3. In Meta Test Events, browser `Lead` and server `Lead` share `event_id`.
4. Sign up. Browser `CompleteRegistration` and server event share the
   `event_id` returned from `useRegister`.

**Pass:** both pairs match.

---

| Case | Date | Result | Notes |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
