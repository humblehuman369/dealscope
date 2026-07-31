# R4 — Collapse Discovery + Strategy into One Progressive Page

**Status:** Stage 1 complete (July 2026) — `<StrategyWorkbench>` extracted to `frontend/src/features/strategy-workbench/`, `/strategy` is a thin shell. Stages 2–4 not started.
**Author:** UX audit roadmap item R4, drafted July 2026
**Prerequisite reading:** none — this document is self-contained.

---

## 1. Problem

The core analysis flow is split across two routes that answer the same user
question ("is this a deal, and at what price?") at different depths:

| Route | Size | What it does |
|---|---|---|
| `/discovery` | ~2,550 lines | Headline Deal Gap verdict, ranked strategy list, seller-motivation insights, deal-structure narrative (Four Paths), Sweet Spot zone, photos, save/share |
| `/strategy` | ~3,880 lines | Per-strategy deep dive: strategy picker, key metrics bar, DealMaker slider worksheet, deal-structure scenarios, Pro gating |

The cost of the split, observed in the audit:

- **A hard context switch at the moment of highest engagement.** The user gets
  the verdict, wants to test an assumption, and is thrown onto a different page
  with a different layout, losing scroll position and visual anchor.
- **A fragile URL handoff.** `navigateToStrategy()` in `discovery/page.tsx`
  reconstructs the full address from parts, carries `condition` / `location` /
  `section` params, and scenario payloads travel as an encoded query param
  (`buildStrategyUrlWithScenario`). Every param is a seam that can (and has)
  drifted.
- **Two navigation models.** `NavTabs` offers Discovery | Details | Comps —
  Strategy isn't even a tab; it's reachable only through CTAs, so users who
  land on `/strategy` directly have no obvious way "up" to the verdict.
- **Duplicated shell.** Both pages independently load the same property
  (shared `usePropertyData` cache), render their own header/metrics, and read
  and write the same `dealMakerStore` record.

## 2. Goal

One page that **progressively discloses depth** instead of navigating away:

```
Level 1 — VERDICT        Deal Gap % headline, target buy, guidance
                          (always visible; what /discovery leads with today)
Level 2 — STRATEGIES     Ranked strategy cards w/ key numbers per strategy
                          (compare at a glance; "Your strategy" persona badges)
Level 3 — WORKBENCH      Full worksheet for the selected strategy: metrics
                          bar, DealMaker sliders, deal structures, scenarios
                          (what /strategy is today — expands in place)
```

The user never leaves the page; the page gets deeper as they commit. Deal Gap
stays the single headline verdict (R2), and every level reads/writes the same
`dealMakerStore` record so numbers can never disagree between levels.

## 3. Approaches considered

### A. True merge (move strategy JSX into discovery)
Move `/strategy`'s ~3,900 lines into `discovery/page.tsx`.
**Rejected.** A ~6,400-line page component with ~80 combined hooks is
unmaintainable, blows the 250 KB entrypoint budget, and makes the diff
unreviewable. Highest regression risk for zero architectural gain.

### B. Extract, then compose (recommended)
First refactor the strategy page's body into a self-contained
`<StrategyWorkbench>` feature component with a narrow prop contract. The
`/strategy` route becomes a thin shell around it (zero visual change,
shippable on its own). Then embed the *same component* in Discovery behind
progressive disclosure, lazy-loaded. Finally redirect `/strategy` →
`/discovery?view=workbench&...` once parity is proven.

**Chosen.** Each stage is independently shippable and revertable; the risky
part (extraction) changes no pixels, and the visible part (embedding) reuses
a component that production traffic has already exercised.

### C. Visual-only unification (shared header/tabs, keep two routes)
Fastest, but keeps the navigation seam and the URL handoff — it restyles the
problem instead of fixing it. **Rejected** as the end state, though Stage 2's
tab treatment borrows from it.

## 4. Design specification (Approach B)

### 4.1 Page anatomy — `/discovery` after the merge

```
┌──────────────────────────────────────────────────────┐
│ Property header (photos · address · save · share)    │  unchanged
├──────────────────────────────────────────────────────┤
│ LEVEL 1 · Verdict                                    │  unchanged
│   Deal Gap % · Target Buy · Sweet Spot · Guidance    │
│   FinancingProvenanceNote (R5)                       │
├──────────────────────────────────────────────────────┤
│ LEVEL 2 · Strategy comparison                        │  exists today as
│   Ranked cards; persona badges (R7); each card has   │  ranked list — add
│   "Open workbench →"                                 │  the inline CTA
├──────────────────────────────────────────────────────┤
│ LEVEL 3 · Workbench  (collapsed by default)          │  ← the strategy page
│   <StrategyWorkbench strategy={selected} …/>         │    body, embedded &
│   metrics bar · sliders · structures · scenarios     │    lazy-loaded
├──────────────────────────────────────────────────────┤
│ Seller insights · Four Paths narrative               │  unchanged
└──────────────────────────────────────────────────────┘
```

Interaction rules:

- Selecting a strategy card (or the persona default for novices) sets
  `?strategy=` and expands Level 3 in place, scrolling its top edge into view.
  Collapsing restores the Level 2 scroll position.
- Level 3 state lives in the URL (`view=workbench`, `strategy=`, `section=`,
  scenario payload) so today's deep links keep working — including the
  Four-Paths "open in Strategy" flow, which becomes an in-page expand.
- Pro gating: the workbench section renders inside the existing `ProGate`
  section mode for free users — a locked preview that *sells* (R6) instead of
  a dead-end navigation.
- Mobile: Level 3 opens full-width below Level 2 (no modal/sheet); the sticky
  metrics bar from `/strategy` is preserved inside the workbench.

### 4.2 The `<StrategyWorkbench>` contract

New home: `features/strategy-workbench/` (public API barrel per the features
convention; `components/`, `hooks/` inside).

```tsx
interface StrategyWorkbenchProps {
  address: string                  // canonical full address
  strategyId: string               // 'long-term-rental' | ... (validated)
  initialSection?: StrategyWorksheetSection
  scenario?: EncodedScenario | null   // Four Paths / creative-finance payload
  embedded?: boolean               // true on /discovery: suppress page chrome
}
```

Everything else it needs it already gets from shared state — `usePropertyData`
(React Query, same cache key), `dealMakerStore` (single writer, per AGENTS.md),
`useDefaults`, `useSession`/`useSubscription`. **No new props for data.** The
component must not fetch the property itself when a cache entry exists.

What stays behind in the `/strategy` route shell (Stage 1): URL parsing,
auth-redirect construction, `ScreenErrorBoundary`, page chrome (back link,
`LoadingProperty`/`ErrorProperty` states).

### 4.3 What is *not* changing

- The Deal Gap calculation, worksheet math, and `dealMakerStore` write path —
  untouched. This is a composition refactor, not a financial-logic change.
- `/deal-maker` remains its own surface (it serves saved-property editing from
  the dashboard, a different entry intent).
- Details and Comps tabs stay separate routes; `NavTabs` gains no new tabs.

## 5. Implementation stages

Each stage is a separate PR, shippable and revertable on its own.

### Stage 1 — Extract `<StrategyWorkbench>` (no visual change)
- Carve the strategy page body out of `app/strategy/page.tsx` into
  `features/strategy-workbench/`, splitting internal pieces (metrics bar,
  strategy picker, worksheet sections, structures panel) into files ≤ ~400
  lines each.
- `/strategy` becomes a ~150-line shell rendering the component.
- **Verify:** `npm run typecheck`, `test:run`, `theme:check`; pixel-compare
  `/strategy` before/after (Playwright screenshot diff); confirm the
  entrypoint size for `/strategy` did not grow.

### Stage 2 — Embed in Discovery behind a flag
- Add Level 3 section to `/discovery`, rendered via
  `next/dynamic(() => import('@/features/strategy-workbench'), { loading: skeleton })`
  so Discovery's initial bundle doesn't pay for it (250 KB budget).
- Gate with `NEXT_PUBLIC_PROGRESSIVE_DISCOVERY=1` (env flag, not a permanent
  feature-flag system — it gets deleted in Stage 4).
- Rewire in-page CTAs (`navigateToStrategy`, `openThreePathInStrategy`) to
  expand Level 3 with the same params instead of `router.push` when the flag
  is on.
- **Verify:** both flag states build and pass tests; manual pass on desktop +
  mobile viewport + Capacitor build (fixed bottom elements need safe-area
  insets per AGENTS.md §5); Lighthouse on `/discovery` with the workbench
  collapsed ~unchanged.

### Stage 3 — Parity soak, then cut over
- Enable the flag in production. `/strategy` still works (it renders the same
  component), so nothing breaks for existing links while both entries coexist.
- Watch for a week: Sentry errors on the two routes, Vercel Analytics on
  `verdict→workbench` engagement vs the old `discovery→strategy` click-through,
  `path_opened_in_strategy` event volume.
- Cut over: 301 `/strategy?...` → `/discovery?view=workbench&...` in
  `next.config.js` (params mapped 1:1 — `address`, `condition`, `location`,
  `section`, scenario payload).
- **Verify:** redirect preserves every param combination currently emitted
  (grep for `router.push(\`/strategy` across the repo and cover each call
  site in a redirect test); Capacitor deep links resolve.

### Stage 4 — Delete the seam
- Remove the flag, the `/strategy` route shell, `navigateToStrategy`'s
  URL-building, and the "Back to Discovery" cross-links that no longer mean
  anything.
- Update `AGENTS.md` (state-ownership table mentions the pages) and any
  marketing copy naming "Strategy page".

## 6. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hook-order violations when embedding a component with 40+ hooks | The workbench mounts only when expanded (`{open && <StrategyWorkbench/>}`) — mount/unmount, never conditional hooks. React #310 has bitten this page before (see comment at `discovery/page.tsx:1112`); extraction must keep every early return *below* the hooks. |
| Bundle budget (250 KB entrypoint) | `next/dynamic` import for Level 3; verify with `npm run build` output in Stages 1–2. |
| Double data fetch / cache divergence | Both levels already share `usePropertyData` + `dealMakerStore`. Add the integration test AGENTS.md §8 already calls for (`usePropertyData` + `dealMakerStore` interaction) as part of Stage 2. |
| Scroll/anchor jank on expand | Reserve layout with a skeleton of fixed height while the dynamic chunk loads; `scrollIntoView({ block: 'start' })` after mount. |
| Pro-gate regressions | The gate wraps the workbench *section* on Discovery, but the `/strategy` shell keeps its own gate until Stage 4 — no window where deep content is un-gated. |
| SEO / saved links | 301s in Stage 3; `/strategy` never indexed content without an address param anyway. |

## 7. Open product decisions (need your call before Stage 2)

1. **Default expansion for novices:** should `isNovice` (R7 persona) users get
   Level 3 auto-expanded on their preferred strategy, or does everyone start
   collapsed? Recommendation: everyone collapsed; auto-select (not auto-expand)
   the persona strategy in Level 2.
2. **Free-user treatment of Level 3:** locked preview with blurred worksheet
   (stronger sell, heavier page) vs. compact upgrade card (lighter).
   Recommendation: reuse the existing `ProGate` section mode — already built,
   already sells (R6).
3. **Does `/deal-maker` eventually fold in too?** Out of scope here, but Stage 1's
   component boundary should not preclude it — hence `embedded` as a prop
   rather than a fork.

## 8. Estimate

| Stage | Effort | Risk |
|---|---|---|
| 1 — Extraction | 2–3 days (mostly mechanical, review-heavy) | Medium |
| 2 — Embed + flag | 1–2 days | Medium |
| 3 — Soak + redirect | ~1 week elapsed, ~half day work | Low |
| 4 — Cleanup | half day | Low |

Success criteria: verdict→worksheet engagement rate exceeds today's
discovery→strategy click-through; zero new Sentry issues on the merged page;
no financial number differs between Level 1/2/3 for the same record.
