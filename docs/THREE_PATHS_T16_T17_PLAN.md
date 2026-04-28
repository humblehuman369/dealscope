# Three Paths — T16 & T17 (Remaining Phase 4 work)

**Purpose:** Single reference for work that is **not** done yet: **T16 (affiliate hooks)** and **T17 (user dismiss / family preferences)**. All other items in the Three Paths plan through **T15** are implemented unless noted in the main [`THREE_PATHS_PLAN.md`](../THREE_PATHS_PLAN.md) (e.g. T8.5 data on hold).

**When is “Phase 4” complete?** (from main plan §10)

- T15 regional calibration — **shipped**
- **T16** — affiliate URLs in place
- **T17** — user-dismiss signal live; `path_family_dismissed` events flowing; selector applies the per-user penalty

This document is the **checklist** for the last two bullets.

---

## Current baseline (so you know what’s already there)

| Item | Status |
|------|--------|
| Attorney disclaimer + `/legal/find-attorney` | **Done** (T13) |
| `path_attorney_link_clicked` (with `structure_id`, `state`) | **Done** (T14) — today goes to **internal** page, not an affiliate |
| `path_family_dismissed` in `eventTracking` comment / T14 list | **Documented only** — **no UI**, **no event fired** until T17 |
| Backend selector penalty for dismissed families | **Not implemented** |
| `userPreferences.ts` / `dismissed_families` in Verdict payload | **Not implemented** |

---

## T16 — Affiliate hooks

### Goal

Turn disclaimer clicks into **tracked outbound referrals** when partners exist — without blocking shipping when they don’t.

### Scope (from main plan)

- **“Find a creative-finance attorney”** → affiliate / referral URL (terms TBD; placeholder until partner signed).
- **“Find a Sub2-friendly lender”** → same pattern (new link surface — page or secondary CTA).

### Acceptance

- Clicks route through a **configurable affiliate/base URL** (env or admin).
- Same **`trackEvent`** pattern as today; distinguish **affiliate outbound** (e.g. extend props `destination: 'affiliate'` vs `internal`) so dashboards stay comparable pre/post partner.

### Prerequisites (“ready when”)

| Gate | Notes |
|------|--------|
| **Legal** | Referral/affiliate disclosure copy where required (footer on `/legal/find-attorney`, Terms link-out behavior). |
| **Commercial** | At least one signed partner **or** explicit decision to use neutral directory URLs as interim. |
| **Technical** | Env vars or CMS-backed URLs: `NEXT_PUBLIC_ATTORNEY_REFERRAL_URL`, optional `NEXT_PUBLIC_SUB2_LENDER_REFERRAL_URL` (names illustrative). |

### Likely implementation sketch

1. Replace or augment static copy on `frontend/src/app/legal/find-attorney/page.tsx` with primary CTA → outbound URL (wrapped in `trackEvent` after consent).
2. Optional second legal page: `frontend/src/app/legal/find-sub2-lender/page.tsx` (or section on same page).
3. Keep **internal** fallback when env unset (current placeholder behavior).

### Not blocking

T16 can ship **after** T17 or **in parallel** — no dependency on dismiss preferences.

---

## T17 — User template-preference / dismiss signal

### Goal

Reduce repeated promotion of **structure families** the user has already rejected; optional personalization without ML.

### Scope — v1 (this ticket)

| Area | Spec |
|------|------|
| **Storage** | `localStorage` via new util `frontend/src/lib/dealStructures/userPreferences.ts`: `dismissFamily(family, durationDays = 30)`, `getDismissedFamilies(): string[]`. |
| **UI** | Small control per Three Paths card: e.g. **“Not interested in this kind of deal”** → dismisses that **`family`** (`price`, `financing`, `income`, etc.). |
| **Payload** | Verdict request includes **`dismissed_families: string[]`** (read from storage where Verdict analysis is built — hook/page assembly). |
| **Backend** | `selector.py`: **−25** (plan default) to `ranking_score` for structures whose `family` is in the dismissed list — strong enough to drop from top 3 when alternatives exist; clamp 0–100. |
| **Telemetry** | **`path_family_dismissed`** with `family`, `dismissed_count` (rolling behavior per plan). Wire through [`eventTracking.ts`](../frontend/src/lib/eventTracking.ts). |
| **Reset** | **“Reset preferences”** clears dismissed keys (settings page or Verdict-only modal — product choice). |
| **TTL** | Preferences expire after **30 days** (plan default). |

### Scope — v2 (deferred)

- Persist dismissed families on **server / User model** for cross-device sync — **separate ticket**.

### Acceptance

- After dismissing **financing**, reload Verdict on another property: financing-heavy paths rank lower or disappear when other families qualify.
- After 30 days (or clock skew test via util), penalty no longer applies unless dismissed again.
- Reset clears storage and restores prior rankings.
- `path_family_dismissed` visible in analytics pipeline (same consent rules as other events).

### Prerequisites (“ready when”)

| Gate | Notes |
|------|--------|
| **Product** | Exact microcopy for dismiss + undo snackbar (optional) + settings placement. |
| **IQVerdictInput** | Add `dismissed_families: list[str]` (or camelCase) + pass into `StructureContext` + selector. |
| **Tests** | Backend: selector tests with dismissed `financing`; frontend: util TTL/reset unit tests if feasible. |

### Files likely touched

| Layer | Path |
|-------|------|
| New util | `frontend/src/lib/dealStructures/userPreferences.ts` |
| Panel | `frontend/src/components/iq-verdict/ThreePathsPanel.tsx` |
| Verdict payload | `frontend/src/utils/verdictPayload.ts`, Verdict page / hook that POSTs analysis |
| Backend input | `backend/app/schemas/analytics.py` (`IQVerdictInput`) |
| Context | `backend/app/services/deal_structures/context.py` |
| Selector | `backend/app/services/deal_structures/selector.py` |
| Optional settings | User settings / account UI for reset |

---

## Suggested order

1. **T17** — improves trust and selector feedback loops; enables **`path_family_dismissed`** for real.
2. **T16** — when partner URLs exist; purely additive monetization.

---

## Quick reference — event names

| Event | T16 | T17 |
|-------|-----|-----|
| `path_attorney_link_clicked` | Extend when outbound affiliate ships | — |
| `path_family_dismissed` | — | Implement with dismiss UI |

---

*Last aligned with [`THREE_PATHS_PLAN.md`](../THREE_PATHS_PLAN.md) Phase 4 §7–§10. Update this file if ticket scope changes.*
