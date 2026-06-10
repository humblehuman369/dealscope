# DealGapIQ — Technical Audit Report

**Date:** June 10, 2026
**Scope:** Full repository (`backend/` FastAPI + `frontend/` Next.js 16 + infrastructure)
**Method:** Static code audit (read-only), file-level line counts, dependency review, and pattern analysis across ~664 frontend TS/TSX files (~158k LOC) and 94 backend service modules.

---

## 1. Architecture Summary

```
                       ┌──────────────────────────────────────────────┐
                       │  Vercel (dealgapiq.com)                      │
                       │  Next.js 16 App Router · React 19 · RQ v5    │
                       │  + Capacitor WKWebView (iOS/Android)         │
                       └──────────────────┬───────────────────────────┘
                                          │  /api/v1/*
                       ┌──────────────────▼───────────────────────────┐
                       │  Railway (api.dealgapiq.com)                 │
                       │  FastAPI · async SQLAlchemy · Arq workers    │
                       ├──────────────┬───────────────┬───────────────┤
                       │ Postgres 15  │  Redis 7      │  Stripe / RC  │
                       └──────────────┴───────────────┴───────────────┘
   External data: RentCast · AXESSO (Zillow) · Redfin · Realtor · Mashvisor (disabled)
```

**What is structurally sound:**

- Single active `DataNormalizer` (`backend/app/services/api_clients.py`) with declarative `FIELD_MAPPING`, conflict detection, and a null-safe IQ Estimate computation (median ±20% outlier rule).
- Session-backed JWT auth with httpOnly cookies, refresh rotation with `SELECT FOR UPDATE` replay protection, bcrypt-12, TOTP MFA with Fernet-encrypted secrets, account lockout.
- 32 Alembic migrations as schema authority; explicit-commit DB session policy.
- Shared frontend property cache (`usePropertyData` + `validatePropertyResponse` + `finiteOrNull`) — zero direct `/properties/search` bypasses found.
- Backend-owned worksheet math for all six strategies (`backend/app/services/calculators/`).

---

## 2. Findings by Severity

### 2.1 CRITICAL — act this week

| # | Finding | Evidence | Impact |
|---|---------|----------|--------|
| C1 | **Live production session tokens committed to git.** `backend/cookies.txt` is git-tracked and contains active `refresh_token`, `session_token`, and `csrf_token` cookies for `api.dealgapiq.com`. | `backend/cookies.txt` L5–L7; confirmed via `git ls-files` | Active credential leak. Anyone with repo access can hijack the session. Revoke affected sessions, delete the file, add to `.gitignore`, scrub history (`git filter-repo`). |
| C2 | **Subscription limits are client-honor-system.** `/api/v1/properties/search` uses `OptionalUser` and never calls `record_analysis()` / `can_search()`. Metering depends on the frontend voluntarily POSTing `/usage/record-analysis` (errors swallowed with `.catch(() => {})`). | `backend/app/routers/property.py:88`; `frontend/src/app/discovery/page.tsx:344` | The core monetization gate (3 analyses/month) is bypassable by anyone calling the API directly — direct revenue leakage and paid-API cost exposure. |
| C3 | **Unauthenticated endpoints proxy paid third-party APIs.** `/properties/export-report`, photos, market-data, similar-rent/sold, RentCast comps, verdict, all 6 worksheet calculators, and rehab cost-context require no auth. | `property.py:203–596`, `analytics.py:35+`, `worksheet.py:189+`, `rehab.py:35` | Quota/cost abuse vector against RentCast/AXESSO/Redfin budgets; undermines the Pro paywall (map search is marketed as Pro but the API is open). |
| C4 | **Billing writes may not persist.** `record_analysis()` and several Stripe webhook handlers use `async with db.begin(): pass` instead of `await db.commit()`, against the repo's explicit-commit session policy. RevenueCat handler commits correctly. | `billing_service.py:353–369`; webhook handlers vs `billing.py:720` | Usage counters and subscription state transitions can silently fail to persist — billing correctness risk. |
| C5 | **Fabricated property taxes.** `_estimate_taxes()` falls back to `avm × 0.012` or a hardcoded **$4,500** — a direct violation of the platform's "never fabricate" data rule (insurance correctly returns `null`). | `property_service.py:1362–1368` | Users see plausible-but-invented tax figures inside cash-flow math. This corrodes the product's core trust proposition ("accurate analytics"). |
| C6 | **No CI/CD.** `.github/` contains only a PR template. `docs/operations/DEPLOYMENT.md` claims "CI runs automatically (lint, test, security scan)" — it does not. 458 backend + ~183 frontend tests exist but never run automatically. | `.github/`, `docs/operations/DEPLOYMENT.md:132–133` | Every deploy ships unverified. The existing test suite delivers no regression protection. |

### 2.2 HIGH — address within 30 days

| # | Finding | Evidence |
|---|---------|----------|
| H1 | **Monolith concentration.** Backend: `property_service.py` (2,932), `api_clients.py` (2,429), `map_search_service.py` (2,252), 14 more files >900 LOC. Frontend: 37 files ≥800 lines; `strategy/page.tsx` (3,812), `DealMakerWorksheet.tsx` (2,967), `discovery/page.tsx` (2,354). Phase 2 decomposition (`property/orchestrator.py`, `useAssumptions`, `useDealSnapshot`, `useCalculatedMetrics`) is **built but has zero production consumers**. | Line counts verified; `features/README.md` migration checklist incomplete |
| H2 | **STR fabrications.** ADR defaults to hardcoded **$200** and occupancy to **0.75** when Mashvisor/LTR signal is absent — and Mashvisor is **disabled by default** (`MASHVISOR_STR_ENABLED=False`), so most STR analyses run on invented inputs. | `property_service.py:671, 1340–1360`; `config.py` |
| H3 | **Email verification configured but not enforced.** `FEATURE_EMAIL_VERIFICATION_REQUIRED=True`, yet `VerifiedUser` dependency is unused on any route. | `config.py:287`; `deps.py:156–166` |
| H4 | **Sessions live ~100 years.** `SESSION_DEFAULT_DAYS=36500`. Combined with C1, stolen cookies never expire. | `config.py:129–130` |
| H5 | **Webhook idempotency partial.** Only `invoice.paid` is deduped; `checkout.session.completed` and subscription updates can double-process; RevenueCat has no `event_id` dedup. | `billing_service.py:905–916`; `billing.py:524–609` |
| H6 | **Numeric `\|\|`-vs-`??` defects in Deal Maker payloads.** `useDealMakerBackendCalc` builds payloads with `\|\|` on fields where 0 is intentional user input (`rehab_costs`, `otherIncome`), violating the data-consistency rule and silently corrupting edge-case analyses. | `frontend/src/hooks/useDealMakerBackendCalc.ts` |
| H7 | **Sync PDF/Excel generation blocks the async event loop.** WeasyPrint `write_pdf()` and openpyxl run inline in async routes (email is correctly offloaded via `asyncio.to_thread`). | `property_report_pdf.py:131`; `report_service.py` |
| H8 | **Operational attack surface exposed:** `/docs`, `/redoc`, `/metrics`, `/health/deep` (provider status, feature flags, DEBUG mode) all unauthenticated; debug endpoints gated by `SECRET_KEY[:8]`. | `main.py:223–249`; `health.py:84–344` |
| H9 | **Test coverage gaps on financial paths.** Zero tests for `usePropertyData` validation, `useAssumptions` optimistic rollback, worksheet calculator hooks, billing persistence, or webhook idempotency. AGENTS.md's ≥80% financial-path target is unmet. | `frontend/src/__tests__/` (30 files), `backend/tests/` (50 files) |
| H10 | **Login returns refresh token in JSON body** in addition to httpOnly cookies, widening XSS/log exposure. Register endpoint enables email enumeration (409). | `auth.py:877–883`; `auth_service.py:107–109` |

### 2.3 MEDIUM

| # | Finding | Evidence |
|---|---------|----------|
| M1 | Two parallel resilience systems (per-client circuit breaker in `BaseAPIClient` + global `resilience.py`) and two Zillow client stacks (`AXESSOClient` + `ZillowClient`); secondary API key fallback exists only in one. | `api_clients.py`, `zillow_client.py` |
| M2 | Deploy-time full Redis flush of all `property:*` keys → thundering herd + paid-API cost spike after every deploy. Version-keyed invalidation already partially exists (`valuation_formula_version=9`). | `main.py:167–186` |
| M3 | New `httpx.AsyncClient` created per external request — no connection pooling. | `api_clients.py:206` |
| M4 | Repository layer covers auth only; domain services issue raw `select()` directly. | `app/repositories/` (6 files) vs 94 services |
| M5 | `useAssumptionsStore` naming collision: per-property overrides (`hooks/useAssumptions.ts`) vs global persisted defaults (`stores/index.ts`). | Both export same symbol |
| M6 | `exceljs` statically imported into Deal Maker bundle (937-line export module); only 6 `next/dynamic` usages overall; 250 kB bundle budget enforced as warning only. | `exportExcel.ts`; `next.config.js` |
| M7 | ~58 `as any` casts concentrated in Deal Maker/strategy paths; ESLint `no-explicit-any` set to warn. | `InlineDealMakerPanel.tsx` (16), `UnifiedDealMaker.tsx` (15) |
| M8 | CSV report export lacks ownership check on cached `property_id` (IDOR). | `reports.py:339–352` |
| M9 | Outdated backend pins: `fastapi 0.109.0`, `python-multipart 0.0.6` (CVE history), `stripe 7.0.0`, `sentry-sdk 1.40.0`, `pydantic 2.5.3`; `httpx` pinned twice. No Dependabot/`pip-audit`. | `backend/requirements.txt` |
| M10 | CORS allows any `*.vercel.app` preview origin with `allow_credentials=True`. | `main.py:232` |
| M11 | Theme-token violations in ~17 files (auth, checkout, PriceChecker) despite the surface contract and `theme:check` tooling. | `__tests__/theme-surfaces.test.ts` scan |
| M12 | `test_billing.py` asserts obsolete `STARTER`/`ENTERPRISE` tiers; production model has only `FREE`/`PRO`. | `tests/test_billing.py:36–66` |

### 2.4 LOW

- `is_superuser` legacy RBAC bypass still active (deprecated warnings only).
- LOI router has 4 TODOs — no DB persistence (`loi.py:250–302`).
- JWT lifetime comment ("5-minute") contradicts config (30 min).
- `property/orchestrator.py` is a 41-line stub; stale `data_normalizer.py` reference in `metrics_glossary.json`.
- CSP includes `unsafe-inline`/`unsafe-eval` (`vercel.json:22`).
- `zxcvbn` installed but unused (regex-only password policy).
- Cookie consent stored in localStorage only (no server-side audit trail).
- Document upload limit hardcoded 10 MB vs configured 50 MB.

---

## 3. Data Pipeline & Analytics Accuracy Assessment

The IQ Estimate pipeline is the platform's strongest asset and is **mostly** faithful to its own integrity rules:

| Field | Behavior when sources missing | Verdict |
|-------|------------------------------|---------|
| `value_iq_estimate` / `rental_iq_estimate` | `null` — never fabricated; median ±20% outlier filter with ≥3 sources | ✅ Correct |
| `insurance_annual` | `null`; otherwise `value × 1%` (documented formula) | ✅ Correct |
| **Property taxes** | **Fabricated**: `avm × 1.2%` or hardcoded **$4,500** | ❌ C5 |
| **STR ADR** | **Fabricated**: hardcoded **$200** | ❌ H2 |
| **STR occupancy** | **Fabricated**: defaults to 0.75 | ❌ H2 |

Because taxes, ADR, and occupancy feed directly into NOI → Income Value → Target Buy → Deal Gap → Verdict score, **fabricated inputs propagate into the headline metric users pay for**. This is the single highest-leverage accuracy fix in the codebase.

**Source-redundancy risk:** With Mashvisor disabled, the rent IQ Estimate rests on RentCast + Zillow rentZestimate (+ Redfin when available). The STR strategy column has effectively **no real data source** in production today.

---

## 4. Performance Assessment

| Bottleneck | Severity | Detail |
|------------|----------|--------|
| Event-loop blocking on PDF/Excel | High | WeasyPrint/openpyxl run synchronously in async workers (H7) |
| Post-deploy cache stampede | Medium | Full `property:*` flush per deploy (M2) |
| No HTTP connection reuse to providers | Medium | Per-request `AsyncClient` (M3) |
| Frontend monolith re-renders | Medium | 3,812-line strategy page; React Compiler rules downgraded to warnings |
| `useCalculatedMetrics` keyed on full `pendingUpdates` object | Medium | Potential refetch per slider tick |
| Redis fallback to per-worker memory dict | Medium | On any Redis error, cache silently degrades to per-process memory → cross-worker inconsistency |

Mitigations already in place: parallel provider fetch via `asyncio.gather`, 24h Redis property cache, React Query 5-minute property cache with deduped `ensureQueryData`, custom SVG charts (no heavy chart library).

---

## 5. Test & Quality Posture

| Metric | Backend | Frontend |
|--------|---------|----------|
| Test files | 50 | 30 |
| Test cases | 458 | ~183 |
| Coverage enforcement | None (no threshold in `pytest.ini`) | None |
| CI execution | **None** | **None** |
| Highest-risk untested paths | billing persistence, webhook idempotency, search gating | financial hooks, optimistic rollback, worksheet calculators |

---

## 6. Remediation Sequence (engineering view)

1. **Day 0–2 (security incident):** Revoke sessions from C1, scrub `cookies.txt` from history, cap session lifetime (H4), disable `/docs` + protect `/health/deep` and `/metrics` in prod (H8).
2. **Week 1–2 (revenue + trust):** Enforce `record_analysis`/auth server-side on all paid-API endpoints (C2/C3); fix `db.begin(): pass` commits (C4); replace tax/ADR/occupancy fabrication with `null` + "Unavailable" UI (C5/H2).
3. **Week 2–3 (safety net):** GitHub Actions running `pytest`, `ruff`, `typecheck`, `test:run`, `lint`, `theme:check`, `pip-audit`/`npm audit` (C6); fix the obsolete billing tier tests (M12); add webhook idempotency (H5).
4. **Month 2 (debt paydown):** Complete the Phase 2 decomposition that is already designed — wire `useDealSnapshot`/`useAssumptions` into Deal Maker, finish `property/orchestrator.py`, split the two largest pages (H1); fix `\|\|`→`??` payload defects (H6); offload PDF/Excel to Arq (H7).
5. **Month 2–3 (hardening):** Dependency upgrades + Dependabot (M9), consolidate Zillow clients and circuit breakers (M1), versioned cache invalidation instead of deploy flush (M2), shared `httpx` client pool (M3).
