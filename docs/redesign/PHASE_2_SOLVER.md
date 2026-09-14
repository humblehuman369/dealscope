# Phase 2 solver list

Findings from the Phase 1 Plan / Willow investigation. Do not start these in Phase 1.

## Phase 1 runbook

Options 1, 3, 4, and the blend aim at break-even plus $25 a month by design, so most plans show $25 a month and 0 of 4 on cash flow; a low `deal_started` per `plan_built` may be investors reading that correctly, not a bug.

## What we already know

1. The $25/month figure on Options 1, 3, 4, and the blend is `TARGET_MONTHLY_CASH_FLOW` in `backend/app/services/deal_structures/cashflow.py` (April 2026 Three Paths MVP). Units are dollars per month. $25 × 12 = $300 a year, which is why solved plans print that round number and miss the $300-a-month Plan bar.
2. Option 2 on 1766 Wandering Willow Way matches Target Buy to the dollar ($453,820). It is not Income Value ($477,705).
3. On Sept 13 the solver and the worksheet disagreed ($25 vs $213) because their expense inputs differed, not because Plan failed to read the applied structure.

## Items

1. **One price anchor.** Options 1, 3, 4, and the blend aim at Income Value plus $25; Option 2, the verdict, and the book's definition of a closed gap aim at Target Buy. One anchor for every option is the fix, gated on the ten-property validation. At Target Buy most properties still meet 0 or 1 of the four targets (Willow: $115 a month). That is Brad's product decision, not a solver fix.
2. **Carry the solve inputs.** On Sept 13 the solver and the worksheet disagreed ($25 vs $213) because their expense inputs differed. The plan payload should carry the inputs it was solved with so the worksheet renders the same ones, or the page should show the difference.
