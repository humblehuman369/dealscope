# Production-readiness remediation plan

**Status:** Stage 1 in repo — device OAuth verify still open  
**Date:** 2026-09-06  
**Source:** production audit register (R-01–R-28)  
**Goal:** web launch is safe to take paying traffic; iOS/Android store binaries can complete auth

---

## 0. Read first

**Stage 1 code is in the tree** (A1 OAuth exchange client, A2 Android `dealgapiq://`
intent-filters, B1 null occupancy). Stage 1 is not *done* until Google sign-in
is confirmed on an iOS device and an Android device/emulator.

This is an execution plan, not a rewrite. Every item maps to a verified finding.
Do not expand scope into “while we’re here” refactors.

**Two tracks must start in parallel on day 0:**

| Track | IDs | Why it cannot wait |
|-------|-----|--------------------|
| Mobile auth | R-01, R-02 | Store login is broken at the API contract and on Android’s manifest |
| STR integrity | R-03 | Verdict/STR numbers are invented while Mashvisor/AirROI are off |

Web can ship after Stage 1 + Stage 2. Store submission additionally needs Stage 1
mobile items plus R-13 (Stage 3). FastAPI/Stripe majors (R-26) wait until Stage 3
is merged.

**Invariants — do not break these while remediating**

- Property data still flows through `usePropertyData` / `PropertyService`. No
  second search client.
- `dealMakerStore` remains the only writer for Deal Maker records.
- `0` on financial inputs is preserved (`??`, never `||`).
- Missing STR/insurance/rent sources stay `null` and render Unavailable.
- Capacitor remains a WebView over `https://dealgapiq.com`. Do not create
  `mobile/`.
- Cron/job endpoints stay 404-on-bad-token (no enumeration).

---

## 1. Shape

Four stages. One PR per ticket unless the table says “same PR”.
Each ticket has an exit test so the stage gate is binary.

```
Stage 1 ──┬── Track A: R-01 → R-02 ───────────────┐
          └── Track B: R-03 ──────────────────────┤
                                                  ▼
Stage 2 ──── R-04, R-06, R-07, R-08, R-11 ───────► Web go/no-go
                                                  │
Stage 3 ──── R-05, R-09, R-10, R-12, R-13 ───────► Store go/no-go
                                                  │
Stage 4 ──── R-14 … R-28 (cheap first) ──────────► hardening
```

R-26 (FastAPI / Stripe / Sentry majors) is last inside Stage 4 and must not
share a PR with behavioural fixes.

---

## 2. Stage 0 — prep (half day)

1. Branch from `main`: `fix/prod-readiness-stage-1`.
2. Record baselines: `cd frontend && npm run test:run`; `make test-backend`
   (after `make test-db-up`).
3. Confirm GitHub branch protection on `main` — if CI is not a required check,
   that is ticket R-11 (Stage 2), not a Stage 0 blocker.
4. Device access: one iOS Simulator/device and one Android emulator/device for
   R-01/R-02. Without devices, Track A stops at unit tests and is not “done”.

---

## 3. Stage 1 — launch blockers (days 0–2)

**Gate:** device Google sign-in works on iOS and Android. STR column is
Unavailable when both STR providers are off. No invented `0.75` occupancy.

### Ticket A1 — R-01 Mobile OAuth code exchange

| | |
|--|--|
| Files | `frontend/src/hooks/useCapacitorDeepLinks.ts`, `frontend/src/lib/api-client.ts` (add `exchangeMobileOauthCode` if missing), `frontend/src/__tests__/` for the hook or api-client |
| Backend | Already done: `POST /api/v1/auth/oauth/mobile/exchange`, redirect `?code=` (`auth.py` ~455–502, 627–633). Do not change the contract. |
| Work | Read `code` from `dealgapiq://auth/callback`. POST exchange. `setMemoryToken` from the JSON body. Drop `access_token` / `refresh_token` query handling. Keep `error=` handling. |
| Tests | Unit: given `?code=abc`, client POSTs `/oauth/mobile/exchange` and stores tokens. Given missing/expired code, route to `/login?error=`. |
| Verify | iOS device: Google sign-in from login screen → lands signed in on `/search`. |

### Ticket A2 — R-02 Android deep links (after A1, same track)

| | |
|--|--|
| Files | `frontend/android/app/src/main/AndroidManifest.xml`, `frontend/android/app/src/main/res/values/strings.xml` |
| Work | `custom_url_scheme` = `dealgapiq`. Add `VIEW` + `BROWSABLE` intent-filters for `dealgapiq://auth/callback`, `dealgapiq://auth/magic`, and (if ready) `https://dealgapiq.com/auth/*`. Keep `singleTask`. |
| Tests | Manual on emulator: `adb shell am start -a android.intent.action.VIEW -d "dealgapiq://auth/callback?code=test"`. App opens; JS handler runs. |
| Verify | Android Google sign-in + magic-link from email. |

### Ticket B1 — R-03 Null occupancy (parallel with A1)

| | |
|--|--|
| Files | `backend/app/services/property_service.py` (~835, ~1551, ~2315), `backend/app/routers/comparison.py`, `backend/app/services/iq_verdict_service.py`, any frontend STR tile that assumes a number |
| Work | `occupancy_rate = normalized.get("occupancy_rate")` — no `or 0.75`. ADR helper returns `None` when occupancy is missing (already claims this; the `or 0.65` path must die). Comparison/IQ verdict must not substitute `$200` / `$2100` / `0.75` when the source is null. |
| Tests | Fixture: both STR flags false, no occupancy on the normalized dict → `rentals.occupancy_rate is None`, STR metrics null/omitted, UI “Unavailable”. Existing calculator tests that *pass an explicit occupancy* stay green. |
| Verify | Discovery verdict on a property with no Mashvisor/AirROI: STR column Unavailable, LTR/IQ value path unchanged. |

**Stage 1 merge:** one PR for A1+A2 if they land together; B1 is a separate PR so
data-integrity review is not mixed with native XML.

---

## 4. Stage 2 — web hardening (days 2–5)

**Gate:** `pip-audit` clean on `python-multipart`. XFF spoof does not bypass
quotas. Cross-site `/plans/claim` does not set cookies. `main` cannot merge red
CI (or the gap is documented as an ops ticket with an owner).

### Ticket C1 — R-04 multipart pin

- `backend/requirements.txt`: `python-multipart>=0.0.31,<1.0` (or exact latest
  0.0.x that pip-audit accepts).
- Re-run document-upload tests.
- Same PR only if a test fails on the bump — do not fold in FastAPI.

### Ticket C2 — R-06 XFF trust

- One helper, e.g. `app/core/client_ip.py`, used by `middleware.py`, `jobs.py`,
  `property.py`, `plans.py`.
- Trust `request.client.host` after `ProxyHeadersMiddleware` with a configured
  hop count, **or** take the rightmost untrusted hop. Never `split(",")[0]`.
- Unit tests: `X-Forwarded-For: 1.1.1.1, 2.2.2.2` with one trusted proxy → key
  is not `1.1.1.1`.

### Ticket C3 — R-07 Plan-claim CSRF

- Keep the exchange working for Capacitor.
- Require `Origin`/`Referer` on the allowlist before setting cookies.
- Do not set cookies when the request is cross-site.
- Test: CSRF-less cross-origin POST does not `Set-Cookie`.

### Ticket C4 — R-08 Token transport

- Login/register JSON: omit `refresh_token` on the web cookie path (Capacitor
  still needs tokens from exchange / login body — gate on `CLIENT_TYPE_MOBILE`
  or missing cookie client).
- Capacitor: Preferences or Keychain plugin, not `localStorage` for
  `dgiq_access_token` / `dgiq_refresh_token`.
- `android:allowBackup="false"` (or `fullBackupContent` exclude WebView).
- Do this **after** A1 so OAuth and storage changes are not debugged at once.

### Ticket C5 — R-11 CI / lockfile / branch protection

- `.github/workflows/ci.yml`: `cache-dependency-path: package-lock.json` (repo
  root) and install from the workspace root, **or** add a real
  `frontend/package-lock.json` — pick one model and stick to it.
- Align `frontend/Dockerfile` `npm ci` with that model.
- Turn `audit` into a failing gate for high+, **or** rename the job and remove
  “security scan must pass” from `docs/operations/DEPLOYMENT.md`.
- Ops: require the CI workflow on `main`. This is a GitHub setting, not only a
  YAML change.

**Stage 2 merge:** C1 and C2 can ship independently. C3+C4 together if they
touch auth cookies. C5 is its own PR.

**Web go/no-go** is here: Stage 1 B1 + Stage 2 C1–C3 + C5. C4 can slip one
sprint if Capacitor is not in the web launch path.

---

## 5. Stage 3 — correctness, cost, store links (week 2)

**Gate:** user-entered `0` survives Deal Maker payloads. `/photos` is metered.
Deploys do not SCAN-delete `property:*`. HTTPS magic-link opens the app (or
well-known files are removed). Playwright smoke exists on PRs.

### Ticket D1 — R-05 `/photos` meter

- `property.py` `GET /photos`: `CurrentUser` **or** the same anonymous daily
  quota as `/properties/search`. Add `/photos` to `route_limits`.
- Reject `url=` if product does not need arbitrary Zillow URLs.

### Ticket D2 — R-09 `??` in Deal Maker calc

- `frontend/src/hooks/useDealMakerBackendCalc.ts`: `||` → `??` on every
  numeric field. Defaults apply only when the value is `null`/`undefined`.
- Test: `annualPropertyTax: 0`, `rehabBudget: 0`, `cleaningCostPerTurn: 0`
  appear as `0` in the payload.

### Ticket D3 — R-10 Versioned cache flush

- `main.py` lifespan: stop `scan_iter(match="property:*")` delete-all.
- Flush only when `valuation_formula_version` (or equivalent) bumps, or
  namespace keys as `property:vN:`.
- Test or operator note: restart with unchanged version leaves keys in Redis.

### Ticket D4 — R-13 Universal / App Links (after A2)

- Replace `TEAM_ID` in `frontend/public/.well-known/apple-app-site-association`.
- Add `associated-domains` to `App.entitlements`.
- Android: HTTPS intent-filters matching `assetlinks.json`.
- If Team ID / Play SHA256 are not available this week: **delete or noindex
  the well-known files** so we do not advertise broken links. Do not leave
  placeholders in production.

### Ticket D5 — R-12 Playwright smoke

- Five flows: anonymous search, signup, paid/search gate, Deal Maker save,
  checkout redirect (web Stripe; mock IAP).
- CI job on PRs to `main`. Not a Capacitor device farm.
- Prefer adding this after A1 so a later flow can cover magic-link consume.

**Store go/no-go** is Stage 1 A1+A2 + Stage 3 D4. D5 is a quality gate, not a
store blocker.

---

## 6. Stage 4 — hardening (month 1)

Order cheap, high-leverage items first. One PR per row unless noted.

| Order | ID | Work | Effort |
|------:|----|------|--------|
| 1 | R-24 | `secrets.compare_digest` on cron, monitoring, RevenueCat | 1h |
| 2 | R-27 | Billing payments `limit` `Query(ge=1, le=50)` | 1h |
| 3 | R-17 | Generic 500s on analytics, LOI, map, photos, demo | 2–4h |
| 4 | R-19 | Auth logs: `user_id` / hash, not email | 2h |
| 5 | R-18 | Production CORS: `dealgapiq.com` + `www` only | 2h |
| 6 | R-16 | `_user_has_cached_property_access` on CSV + analytics | 4h |
| 7 | R-28 | Align JWT lifetime comments with `ACCESS_TOKEN_EXPIRE_MINUTES` | 30m |
| 8 | R-21 | Case-fold `theme:check`; login/register → `--surface-base` | 2–4h |
| 9 | R-22 | `UpgradeModal` through shared `Modal` / `useFocusTrap` | 4h |
| 10 | R-14 | PyJWT only; drop `python-jose` | 4–8h |
| 11 | R-15 | Anon/auth meter on map search + `/proforma/generate` | 1–2d |
| 12 | R-20 | Session indicator without roles/`is_superuser` | 4–8h |
| 13 | R-23 | Remove `is_superuser` RBAC bypass | 4–8h |
| 14 | R-25 | Rewrite checklist vs `ci.yml`; fix AGENTS.md count; dead `FOUR_PATHS` link; implement or delete `FEATURE_AUTH_REQUIRED` | 1d |
| 15 | R-26 | Dependabot. FastAPI+pydantic+multipart together, then Stripe, then Sentry. Never with behaviour PRs. | 1–2 weeks staged |

---

## 7. Staffing and calendar

Assume one full-stack engineer plus one person who can run Xcode / Android
Studio. If that is the same person, Track A and Track B still alternate by
half-day, not by week.

| Window | Owner focus | Tickets |
|--------|-------------|---------|
| Mon–Tue | Native + hooks | A1, A2 |
| Mon–Wed | Backend data | B1 (overlap) |
| Thu | Security | C1, C2, C3 |
| Fri | Auth storage + CI | C4, C5 |
| Week 2 | Product + cost | D1–D5 |
| Weeks 3–5 | Hardening | Stage 4 table order |

If mobile store is not in the next release, **still do A1** (the JS contract is
wrong for any future Capacitor build) but A2/D4 can slip behind web go.

---

## 8. Test and review bar

Every Stage 1–3 PR:

- Backend tickets: `make test-backend` (DB up).
- Frontend tickets: `npm run typecheck && npm run test:run && npm run theme:check`.
- Auth/mobile: device note in the PR (simulator OK for A2 intent-filter; real
  Google OAuth needs a device or a recorded `adb`/`xcrun` session).
- No `--no-verify`. No mixing R-26 upgrades with behaviour.

Do not claim coverage % in the PR unless you ran `pytest --cov` /
`npm run test:coverage`. The current CI does not publish coverage.

---

## 9. Out of scope

- Rewriting FastAPI routers or splitting `property_service.py` further.
- Enabling Mashvisor/AirROI (product/cost decision). Stage 1 only stops
  fabricating occupancy; it does not buy a provider.
- A second mobile codebase.
- Penetration testing, load testing, or a live Snyk org scan — those are
  follow-on evidence, not this plan.

---

## 10. Decision log

| Decision | Choice | Why |
|----------|--------|-----|
| Stage 1 split | A1+A2 vs B1 as two PRs | Native review ≠ financial-integrity review |
| Web go | After Stage 2, C4 optional | Web does not use Capacitor `localStorage` |
| Store go | After A1+A2+D4 | Links and scheme must work or be unpublished |
| R-26 last | Dedicated upgrade PRs | Compatibility noise hides auth/data bugs |
| Placeholders | Remove AASA if Team ID unknown | Broken Universal Links are worse than none |
