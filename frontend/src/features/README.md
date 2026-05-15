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
import { DealMakerEditor } from '@/features/deal-maker/components/DealMakerEditor'
import { useAssumptions } from '@/features/deal-maker/hooks/useAssumptions'

// Avoid
import DealMaker from '@/components/deal-maker/DealMaker'
```

## Migration Status (Phase 2)

- [x] Split monolithic `dealMakerStore` into focused hooks:
  - `useDealSnapshot`
  - `useAssumptions`
  - `useCalculatedMetrics`
- [ ] Move existing deal-maker components into `features/deal-maker/components`
- [ ] Move worksheet components into `features/worksheet/components`
- [ ] Add ESLint boundaries (import/no-restricted-paths or dependency-cruiser)
