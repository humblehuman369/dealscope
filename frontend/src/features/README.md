# Features Architecture

This directory contains feature-specific modules that follow a strict boundary.

## Principles

- Each feature owns its own components, hooks, types, and stores.
- Shared primitives live in `src/components/ui/` and `src/hooks/`.
- Cross-feature imports are allowed only through the public API of each feature (index.ts).
- No direct imports from `components/deal-maker/` or `components/worksheet/` outside their feature.

## Current Features

- `deal-maker/` — Deal Maker editing, assumptions, persistence
- `worksheet/` — Strategy worksheets and financial inputs

## Recommended Import Pattern

```ts
// Good
import { DealMakerScreen } from '@/features/deal-maker/components'
import { useDealSnapshot } from '@/hooks/useDealSnapshot'

// Avoid
import DealMaker from '@/components/deal-maker/DealMaker'
```

## Migration Status (Phase 2 — settled July 2026)

The store decomposition was resolved rather than completed: `dealMakerStore`
is the single owner of the live read/write path (record load, optimistic
edits, debounced PATCH, rollback + retry). The read-side hooks that came out
of Phase 2 — `useDealSnapshot` and `useCalculatedMetrics` in `src/hooks/` —
are in production and tested. The write-side `useAssumptions` hook duplicated
`dealMakerStore` verbatim, never gained a consumer, and was deleted to keep a
single writer per record.

- [x] Read-side hooks extracted and tested (`useDealSnapshot`, `useCalculatedMetrics`)
- [x] Write path settled on `dealMakerStore` (`useAssumptions` retired)
- [ ] Move existing deal-maker components into `features/deal-maker/components`
- [ ] Move worksheet components into `features/worksheet/components`
- [ ] Add ESLint boundaries (import/no-restricted-paths or dependency-cruiser)
