# DealGapIQ — Decisional Analytics Models: Inventory & Validation

**Date:** June 10, 2026
**Purpose:** Document each decisional model as implemented, assess validity for investor decision-making, and define the validation work needed to make claims defensible.

---

## 1. Model Inventory (as implemented in code)

### M1 — IQ Estimate (value & rent)

```
value_iq_estimate  = avg(in-range of [rentcast_avm, zestimate, redfin_estimate, realtor_estimate])
rental_iq_estimate = avg(in-range of [rentcast_rent, rentZestimate, redfin_rent, mashvisor_rent])
in-range rule      : with ≥3 sources, drop values outside median ± 20%;
                     if filtering leaves <2, average all; single source passes through;
                     null when no sources.
```

**Implementation:** `backend/app/services/api_clients.py::_compute_iq_estimates` (~L2192)
**Validity assessment:** Methodologically sound ensemble approach; transparent source switching in UI is a genuine trust feature. Null-when-missing behavior verified correct.
**Validation required:**
- Backtest IQ Estimate vs. subsequent sale prices on a sample of sold properties (RentCast sale records make this feasible) → publish MAE / median absolute % error on the methodology page. DealCheck/Zillow publish nothing comparable at the multi-source level; a published error rate is a marketing asset.
- Sensitivity check on the ±20% band: verify the fallback ("if <2 survive, average all") doesn't reintroduce the outlier it just removed — current code averages *all* values in that case, which can be worse than the unfiltered median. Recommend falling back to **median** rather than mean.

### M2 — Income Value → Target Buy → Deal Gap (the core decisional chain)

```
NOI            = effective income − operating expenses   (vacancy, mgmt, maintenance, capex, taxes, insurance, HOA)
Income Value   = NOI / (LTV × mortgage_constant)         (pure cash: NOI / 0.05)
Target Buy     = Income Value × (1 − buy_discount_pct)   (default 5%, capped at list)
Deal Gap %     = (List − Target Buy) / List × 100
```

**Implementation:** `backend/app/core/valuation/income_value.py`, `iq_verdict_service.py`
**Validity assessment:** The breakeven-debt-service framing is sound and differentiated — it answers "what price makes this property pay for itself at current financing terms," which is the correct investor question. The 5% cash-on-cash floor for all-cash (NOI/0.05) is a defensible but arbitrary constant.
**Validation required:**
- **Garbage-in exposure (blocking):** NOI consumes property taxes and, for STR, ADR/occupancy. Taxes are currently fabricated ($4,500 / 1.2% AVM fallback) and STR ADR defaults to $200 @ 75% occupancy. **Every downstream number — including the headline verdict — inherits these fabrications.** Fixing this (technical audit C5/H2) is a precondition for any accuracy claim.
- Document and expose the all-cash 5% constant as a user-adjustable assumption (it already lives near admin defaults; surface it).

### M3 — IQ Verdict Score (achievability)

```
base   = interpolation over investor-discount brackets:
         gap ≤0% → 95 · 0–5% → 95→88 · 6–10% → 88→75 · 11–20% → 75→60
         21–30% → 60→40 · 31–40% → 40→22 · 41%+ → 22→5
score  = clamp(base + motivation_modifier(±10) + market_modifier(±5), 5, 95)
labels : Achievable ≥88 · Negotiable ≥75 · Challenging ≥60 · More Challenging ≥40 · Very Challenging ≥22
```

**Implementation:** `iq_verdict_service.py` (`INVESTOR_DISCOUNT_BRACKETS` L564–573); regional cohorts in `REGIONAL_COHORT_PERCENTAGES` (national, sun_belt, midwest_affordability, coastal_northeast)
**Validity assessment:** Anchoring achievability to empirical investor-discount distributions is the platform's most defensible scoring idea, and the `ScoreMethodologySheet` explainability surface is strong. Weaknesses: (a) bracket data provenance must stay current (cited as "U.S. 2025"); (b) the ±10 motivation and ±5 market modifiers are heuristic, not fitted.
**Validation required:**
- Annual refresh process for the discount brackets with a documented source.
- Begin collecting first-party outcomes (pipeline stages already capture closed deals → closed price vs. list is computable). Within 2–3 quarters this yields a calibration set: *of deals we scored ≥88, what % closed at target?* This converts the score from "literature-based" to "validated on our own data" — an uncopyable moat.

### M4 — Strategy snapshot scores (6 strategies)

```
score = 50 + metric × multiplier
LTR: CoC×5 · STR: CoC×3.33 · BRRRR: cash-recovery×1 · Flip: ROI×2.5 · HouseHack: offset×1 · Wholesale: ROI-on-EMD×0.5
```

**Validity assessment:** Linear transforms with unpublished calibration; weakest link in explainability. The multipliers imply cross-strategy comparability ("LTR 72 vs Flip 68") that has no empirical basis.
**Validation required:** Either (a) document the multipliers on the methodology page as explicit normalization choices, or (b) replace with percentile-vs-benchmark scoring (the national-averages data already in the product provides the benchmarks). Option (b) is both more honest and more marketable ("this flip ROI is in the top 20% vs national average").

### M5 — Seller Motivation Score

Weighted composite (0–100) of DOM, price cuts, listing status, distress signals, absentee ownership, market temperature. **Implementation:** `calculate_seller_motivation`.
**Validity:** Reasonable heuristic; feeds ±10 verdict modifier and the Four Paths selector. Same first-party-outcome calibration path as M3 applies.

### M6 — Four Paths deal-structure engine

Template engine (`deal_structures/`): price negotiation, seller second w/ balloon, rate buydown, Sub2, assumable, larger down, FHA house-hack, blended. Outputs cash-to-close, monthly delta, realism score, narrative + pitch script.
**Validity:** The financial mechanics (blended denominators, combined P&I) are deterministic and testable; the "realism score" is heuristic. **Validation required:** unit-test coverage per template against hand-computed fixtures (current calculator test coverage does not include the structure engine comprehensively), plus legal-disclaimer review for Sub2/Morby content (see compliance).

### M7 — Worksheet Deal Opportunity Score (secondary system)

`Deal Gap 50% + Availability 30% + DOM 20%`, grades A+–F. **Implementation:** `calculators/scoring.py`.
**Issue:** A second scoring system with different semantics from M3 invites user confusion ("why is my verdict 76 but my worksheet grade B−?"). Recommend either unifying or explicitly labeling the two scores' distinct questions in UI.

---

## 2. Cross-Cutting Validation Defects (must fix before accuracy claims)

| # | Defect | Models affected | Fix |
|---|--------|-----------------|-----|
| V1 | Fabricated taxes ($4,500 / 1.2% fallback) | M2, M3, M4, M6, M7 | Null + "Unavailable" + prompt user input |
| V2 | Fabricated STR ADR ($200) & occupancy (0.75) with Mashvisor disabled | M2 (STR), M4 | Real STR source or visible unavailability |
| V3 | Mean-fallback in outlier filter can reintroduce outliers | M1 | Fall back to median |
| V4 | `\|\|` vs `??` in Deal Maker payload builder zeroes intentional user inputs | M2, M4, M6 | `??` per data-consistency rule |
| V5 | No FE/BE parity tests between client-side calc mirrors (`utils/calculations.ts`, `ltrWorksheetMetrics.ts`) and backend calculators | All | Golden-fixture contract tests run in CI |
| V6 | Deprecated composite-score fields returned as 0 "for mobile compatibility" | M3 | Remove or version the API |

---

## 3. Recommended Validation Program

| Quarter | Deliverable |
|---------|-------------|
| Q3 2026 | V1–V4 fixed; golden-fixture parity suite (V5) in CI: ≥1 hand-verified fixture per strategy per structure template |
| Q3 2026 | IQ Estimate backtest vs. sold prices (n ≥ 500); publish error rate on `/methodology` |
| Q4 2026 | Strategy scores re-based on national-average percentiles (M4 option b) |
| Q4 2026+ | First-party outcome capture (closed price vs list vs Target Buy) → annual recalibration of brackets (M3) and motivation weights (M5) |

The end state is a marketing-grade claim no benchmarked competitor can make: *"Our verdict score is calibrated against actual closed-deal outcomes, and our valuation error rate is published."*
