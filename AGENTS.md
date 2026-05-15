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

### Deal Maker / Worksheet State (Post-Phase 2)
The original monolithic `dealMakerStore` has been decomposed:

| Hook / Store                  | Responsibility                              | Persistence          | Used By |
|-------------------------------|---------------------------------------------|----------------------|---------|
| `useDealSnapshot(propertyId)` | Immutable record loaded from backend        | React Query          | DealMaker, Worksheets |
| `useAssumptions(propertyId)`  | User-editable overrides + optimistic updates| Zustand + debounced PATCH | DealMaker sliders, forms |
| `useCalculatedMetrics(...)`   | Derived financial metrics                   | React Query          | Metric cards, graphs |

**Optimistic Update Contract (useAssumptions)**
- Every `updateField` / `updateMultipleFields` captures `lastGoodState`.
- On save failure → automatic rollback + Sonner toast with "Retry" action.
- `retryLastSave()` and `revertToLastGood()` are exposed for recovery UI.

### Session / Auth
- `useSession()` — React Query + localStorage indicator (8h TTL).
- Tokens are HTTP-only cookies (web) or memory (Capacitor).

---

## 3. Component Boundaries & Import Rules

**Allowed**
```ts
import { DealMakerScreen } from '@/features/deal-maker/components'
import { useAssumptions } from '@/hooks/useAssumptions'
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

Current baseline (as of May 2026):
- 153 tests passing
- Strong coverage on `lib/*`, `utils/*`, services
- New hooks (`useAssumptions`, `useDealSnapshot`, `usePropertyData`) need dedicated tests to reach ≥80% on financial paths.

**Required before Phase 5 sign-off**
- Add unit tests for optimistic rollback behavior
- Add integration test for `usePropertyData` + `useAssumptions` interaction

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

---

**Maintained by**: Frontend Platform Team  
**Last Updated**: Phase 5 — May 14, 2026 (Post-Full Audit)

> If you are an AI agent or new engineer, start here before touching any financial or stateful component.