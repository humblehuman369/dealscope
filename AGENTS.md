---
description: 
alwaysApply: true
---

# DealGapIQ Frontend — Agent & Maintainer Guide

This document is the single source of truth for frontend architecture, state ownership, and production practices. All contributors must follow the patterns described here.

---

## 1. Architecture Overview

**Stack**
- Next.js 16 (App Router) + React 19
- TypeScript (strict)
- React Query v5 (server data + caching)
- Zustand (client-side mutable state)
- React Hook Form + Zod (forms)
- Tailwind + CSS variables (theming)
- Capacitor (iOS/Android wrappers)

**Key Principle**
> Data flows through `usePropertyData` and the focused Deal Maker hooks. Never call `/api/v1/properties/search` directly.

---

## 2. State Ownership (Single Source of Truth)

### Property Data
- **Hook**: `usePropertyData()` (`frontend/src/hooks/usePropertyData.ts`)
- **Cache**: React Query (`['property-search', canonicalAddress]`)
- **Validation**: `validatePropertyResponse()` + `finiteOrNull()` on all numeric fields
- **Usage**: Every page that needs valuations, rent, or market data must use this hook.

### Deal Maker / Worksheet State

**`stores/dealMakerStore.ts` owns the live read/write path.** `DealMakerScreen`,
`discovery/page.tsx` and `AnalysisIQScreen` all read and edit through it. Edits
go through `updateField` / `updateMultipleFields`, which update `record`
optimistically and schedule a debounced PATCH.

| Hook / Store                  | Responsibility                              | Persistence          | Used By |
|-------------------------------|---------------------------------------------|----------------------|---------|
| `useDealMakerStore()`         | Record load + user edits + debounced save   | Zustand + debounced PATCH | DealMaker, Discovery, AnalysisIQ |
| `useDealSnapshot(propertyId)` | Immutable record loaded from backend        | React Query          | Worksheets |
| `useCalculatedMetrics(...)`   | Derived financial metrics                   | React Query          | Metric cards, graphs |

The Phase 2 decomposition is settled (July 2026): `dealMakerStore` is the
single writer for the record; `useDealSnapshot` and `useCalculatedMetrics`
are the read-side hooks. The orphaned `hooks/useAssumptions.ts` (a verbatim
duplicate of the store's write path with no production consumers) was deleted —
do not reintroduce a second writer for the same record.

**Optimistic Update Contract (`dealMakerStore`)**
- `record` is updated optimistically; `lastGoodRecord` holds the last
  server-confirmed record.
- On save failure → `record` reverts to `lastGoodRecord`, pending updates are
  dropped, and a Sonner toast fires with a "Retry" action.
- `retryLastSave()` resends `failedUpdates`, so a rollback never costs the user
  the edit.
- The invariant under test: after a failed save, what the screen renders equals
  what the Discovery verdict and the embedded Strategy workbench would compute
  from the server record. A divergence there is a wrong number shown confidently.
- Covered by `src/__tests__/stores/dealMakerStore.test.ts`.

### Assumption Defaults (two configurable layers)

Admins set the platform baseline; each user can override it for their own
analyses. One function resolves the whole chain —
`backend/app/services/assumption_resolver.py :: resolve_assumption_layers()`.
Never re-implement this order anywhere else.

| # | Layer | Source | Editable at |
|---|-------|--------|-------------|
| 1 | Schema defaults | `app/core/defaults.py` constants | code only |
| 2 | Admin defaults | `admin_assumption_defaults` table | `/admin` → Assumptions |
| 3 | ZIP market | `MARKET_ADJUSTMENTS` (vacancy, appreciation) | code only |
| 4 | User defaults | `user_profiles.default_assumptions` | `/profile?tab=investor` |
| 5 | Per-request | e.g. a Deal Maker record's own fields | the deal screen |

Higher number wins. A user's explicit choice deliberately outranks the regional
market table — a market average is only a guess at what they want.

**Rules when touching this**
- Pass `user=` to `resolve_assumptions(db, user=...)` on any authenticated path,
  or that user silently gets admin defaults while their sliders show their own.
- `initial_assumptions` on a Deal Maker record is **locked at creation**, so
  `create_record` must receive `resolved=`. Changing your defaults does not
  re-baseline properties you already saved; that keeps past analyses
  reproducible.
- Growth rates (`appreciation_rate`, `rent_growth_rate`, `expense_growth_rate`)
  are **top-level** on `AllAssumptions`. Writing them under a `"growth"` key
  makes them silently vanish.
- `system_defaults` is reported to the frontend as the pre-user baseline that
  drives the "customised by you" indicators, so deep-copy before merging.
- Covered by `backend/tests/test_assumption_resolution_chain.py`.

**Insurance is admin-driven but not per-user.** `market.insurance_annual` is
`property_value × insurance_pct`, where the percentage comes from the admin
dashboard via `PropertyService._resolve_insurance_pct()`. Two constraints to
respect if you touch it:

- **Never pass the percentage in from a caller.** The derived figure is written
  into the address-keyed property cache that every caller shares, so one caller
  omitting it would poison the value for all of them. PropertyService resolves it
  itself, with its own short-lived session.
- **It cannot be per-user** while the property response is cached by address
  alone. `insurance_pct` is deliberately not in the user-editable set.

The figure is recomputed on every cache read rather than trusted from the cache,
so an admin change applies immediately instead of after the 24h TTL. That is also
why a null `insurance_annual` is *not* a cache-staleness trigger any more — a
re-fetch cannot supply what the recompute already can, and for a property with no
value it would invalidate on every request forever.

### Session / Auth
- `useSession()` — React Query + localStorage indicator; session ends on logout/revocation.
- Tokens are HTTP-only cookies (web) or memory (Capacitor).

---

## 3. Component Boundaries & Import Rules

**Allowed**
```ts
import { DealMakerScreen } from '@/features/deal-maker/components'
import { useDealSnapshot } from '@/hooks/useDealSnapshot'
import { LoadingProperty, ErrorProperty } from '@/components/ui/PropertyStates'
```

**Forbidden (enforced by ESLint)**
```ts
import ... from '@/components/deal-maker/...'   // deleted in Phase 2
import ... from '@/components/worksheet/...'    // migrate to features/
```

**Feature Folder Structure**
```
features/
  deal-maker/
    components/
    hooks/
    index.ts          // public API barrel
  worksheet/
    ...
```

---

## 4. Loading / Empty / Error States

All property-dependent screens must use the standardized components:

```tsx
import { LoadingProperty, EmptyProperty, ErrorProperty } from '@/components/ui/PropertyStates'

if (isLoading) return <LoadingProperty message="Loading analysis..." />
if (error || !data) return <ErrorProperty onAction={retry} />
if (!data) return <EmptyProperty onAction={goToSearch} />
```

These components live in `components/ui/PropertyStates.tsx` and respect `--surface-*` tokens.

---

## 5. Mobile / Capacitor

- `IS_CAPACITOR` (from `lib/env.ts`) gates all native-only behavior.
- Bottom sheets and modals must use `useFocusTrap` + `role="dialog" aria-modal`.
- Safe-area insets are required on fixed bottom elements (`pb-safe` or `env(safe-area-inset-bottom)`).

---

## 6. Performance & Bundle Budgets

- `next.config.js` enforces:
  - `maxEntrypointSize: 250000` bytes
  - `maxAssetSize: 250000` bytes
- AuthModal is lazy-loaded via `next/dynamic`.
- Heavy chart/map components should be dynamically imported with `loading` skeletons.

---

## 7. Accessibility (a11y)

- All interactive financial controls (IQEstimateSelector, sliders, tables) must have:
  - `role`, `aria-checked`, `aria-label`, keyboard navigation.
- Use the shared `Modal` primitive for all dialogs (focus trap, escape, return focus).
- Run `axe` or Lighthouse Accessibility audit before every major release.

---

## 8. Testing & Coverage Targets (Phase 5+)

Current baseline (as of July 2026):
- 271 tests passing (`npm run test:run`)
- Strong coverage on `lib/*`, `utils/*`, services
- Optimistic rollback is covered for `dealMakerStore` (the single write path).
- `usePropertyData` + `dealMakerStore` interaction is covered by
  `src/__tests__/hooks/usePropertyData.test.tsx` (shared cache, address
  canonicalization, numeric sanitization, edits surviving property refetches).
- `useDealSnapshot` is covered by `src/__tests__/hooks/useDealSnapshot.test.tsx`
  (shared cache per propertyId, disabled/no-id gating, invalidation refetch,
  error surfacing).

**Phase 5 sign-off requirements: complete** (July 2026). New financial-path
hooks must ship with tests to keep the ≥80% bar.

---

## 9. Production Readiness Checklist

Before every production deployment:

- [ ] `npm run typecheck` — clean
- [ ] `npm run test:run` — all green
- [ ] `npm run theme:check` — no violations
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — no warnings, bundle budget respected
- [ ] Sentry release created (auto via Vercel)
- [ ] Vercel Analytics dashboard reviewed for new regressions
- [ ] axe / Lighthouse scores ≥ targets on critical flows

---

## 10. Quick Reference

| Task                              | Command                              |
|-----------------------------------|--------------------------------------|
| Type check                        | `npm run typecheck`                  |
| Tests                             | `npm run test:run`                   |
| Coverage                          | `npm run test:coverage`              |
| Theme surface audit               | `npm run theme:check`                |
| Strict theme audit                | `npm run theme:check:strict`         |
| Lint                              | `npm run lint`                       |
| Build                             | `npm run build`                      |
| Capacitor iOS dev                 | `npm run cap:dev`                    |
| Capacitor Android dev             | `npm run cap:dev:android`            |
| Backend tests (Python 3.11 + Postgres) | `make test-db-up` then `make test-backend` |

Use `make test-backend` rather than a bare `pytest`: the target supplies
`DATABASE_URL`, and without it 139 DB-backed tests error with a misleading
`ModuleNotFoundError: No module named 'psycopg2'` (psycopg2 is not a dependency —
the unset URL is what selects that driver).

---

## 11. Lender + Cash Buyer Directories

Both directories are one feature served by one backend pipeline. Before touching
`/api/lenders`, `/api/buyers`, `HardMoneyDirectory.tsx` or `BuyerDirectory.tsx`,
read **§0 of `docs/feature-plans/directory-restructure-plan.md`** — it carries the
current state, the architecture diagram, and the invariants that are easy to break
(the `lenders`/`buyers` response keys the frontends depend on, the single
`MAX_PAGE_SIZE`, the lazy teaser count, paid-only access, and the seed ordering in
`railway.toml`).

All five stages are complete. On the frontend that means both components now sit
on `useDirectoryList` (paging + access flags) and the `components/directory/`
primitives (`DirectoryField`, `DirectoryGate`, `DirectoryCardSkeletons`,
`directoryStyles`). Put shared directory behaviour there rather than in either
component.

---

**Maintained by**: Frontend Platform Team  
**Last Updated**: Phase 5 — May 14, 2026 (Post-Full Audit)

> If you are an AI agent or new engineer, start here before touching any financial or stateful component.
