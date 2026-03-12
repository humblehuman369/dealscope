# Light Mode Token Audit (Phase 1)

## Scope

- Audited `frontend/src` for hardcoded color usage (`#hex`, `rgb/rgba`, `hsl/hsla`, and color-tailwind utility classes).
- Source-of-truth cross-check:
  - `frontend/src/constants/colors.ts`
  - `frontend/src/components/iq-verdict/verdict-design-tokens.ts`
  - `frontend/src/app/globals.css`
  - `docs/DESIGN_SYSTEM.md`
  - `frontend/DESIGN_SYSTEM.md`

## Inventory By Category

| Category | Component/File | Current value | Frequency | Matches source-of-truth? | Notes |
|---|---|---|---:|---|---|
| background | `frontend/src/app/globals.css` | `#000000` | 5 | Yes | Dark base tokenized as `--surface-base` |
| background | `frontend/src/components/price-checker/PriceCheckerIQScreen.tsx` | `#0C1220` | 65 | Yes | High-volume hardcoded dark card usage |
| background | `frontend/src/components/iq-verdict/IQVerdictScreen.tsx` | `#0C1220` | 33 | Yes | Needs deeper phase-2 migration |
| background | `frontend/src/components/iq-verdict/verdict-design-tokens.ts` | `#0C1220`, `#101828` | 4, 3 | Yes | Migrated primary Tailwind helpers to vars |
| text | `frontend/src/components/iq-verdict/verdict-design-tokens.ts` | `#F1F5F9`, `#CBD5E1` | 11, 2 | Yes | Converted common text class helpers to vars |
| text | `frontend/src/components/iq-verdict/IQVerdictScreen.tsx` | `#F1F5F9` | 33 | Yes | High-frequency literal text color |
| text | `frontend/src/components/price-checker/PriceCheckerIQScreen.tsx` | `#F1F5F9`, `#CBD5E1`, `#94A3B8` | 65, 16, 16 | Yes | Significant migration candidate |
| border | `frontend/src/components/AppHeader.tsx` | `rgba(14,165,233,0.25)` | 2 | Yes | Replaced with `--border-subtle` |
| border | `frontend/src/components/iq-verdict/PropertyAddressBar.tsx` | `rgba(14,165,233,0.12)` | 1 | Partial | Converted to semantic var |
| border | `frontend/src/components/ui/ConfirmDialog.tsx` | `rgba(148,163,184,0.12)` | 2 | No | Migrated to `--border-subtle` |
| shadow/effects | `frontend/src/components/ui/ConfirmDialog.tsx` | `0 20px 60px rgba(0,0,0,0.5)` | 2 | No | Migrated to `--shadow-dropdown` |
| accent | `frontend/src/constants/colors.ts` | `#0465f2` | 6 | Yes | Brand blue remains canonical |
| accent | `frontend/src/components/AppHeader.tsx` | `#0EA5E9` | many inline | Yes | Migrated inline usage to `--accent-sky` |
| status | `frontend/src/components/ui/DataBoundary.tsx` | `red-400` utilities | multiple | Partial | Migrated to `--status-negative` |
| strategy | `frontend/src/constants/colors.ts` | strategy palette | multiple | Yes | Retained canonical strategy mapping |
| chart/data-viz | `frontend/src/components/worksheet/*` | mixed hex/tailwind | high | Partial | Deferred to later phase-2 waves |

## Top Hotspots (By Per-File Frequency)

1. `frontend/src/components/price-checker/PriceCheckerIQScreen.tsx`
   - `#0C1220`: 65
   - `#F1F5F9`: 65
2. `frontend/src/components/iq-verdict/IQVerdictScreen.tsx`
   - `#0C1220`: 33
   - `#F1F5F9`: 33
3. `frontend/src/components/iq-verdict/verdict-design-tokens.ts`
   - `#F1F5F9`: 11 (partially migrated)
4. `frontend/src/app/globals.css`
   - `#0C1220`: 7 (now normalized through semantic variables)

## One-Off / Inconsistent Values Flagged

- `frontend/src/components/ui/ConfirmDialog.tsx`
  - `#0f172a` and ad-hoc modal shadow values were not sourced from global tokens.
  - Fixed in this phase to use semantic variables.
- `frontend/src/components/AppHeader.tsx`
  - mixed `#FFFFFF` and `#000000` inline values.
  - migrated major primitives to semantic variables.
- `frontend/src/components/iq-verdict/PropertyAddressBar.tsx`
  - repeated hardcoded accent/text colors.
  - migrated to local semantic token map (`barTokens`) backed by CSS vars.

## Phase 2 Migration Progress (This Change Set)

- Completed:
  - shared primitives: `ConfirmDialog`, `DataBoundary`, `Toaster`
  - layout shell: `AppHeader`, `LayoutWrapper`
  - key card/panel component: `PropertyAddressBar`
  - core verdict token helper classes: `verdict-design-tokens.ts`
- Remaining high-volume targets:
  - `PriceCheckerIQScreen`, `IQVerdictScreen`, strategy worksheet/chart components, and marketing CSS bundles.

