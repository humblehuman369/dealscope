# Backend Formula Inventory

Single source of truth for all user-facing financial metrics. All calculations MUST be performed in the backend; frontend and mobile MUST display only API response values.

**Last updated:** 2026-02-19

---

## Core price and verdict metrics

| Metric | Backend location | Formula (summary) | API / response field |
|--------|------------------|------------------|----------------------|
| **Income Value** | `backend/app/core/defaults.estimate_income_value` | `income_value = NOI / (LTV × mortgage_constant)`; NOI = EGI − operating_expenses; 100% cash: `noi / 0.05` | `POST /api/v1/analysis/verdict` → `income_value`; `POST /api/v1/worksheet/deal-score` → `income_value`; Deal Maker, STR/Flip/House Hack worksheets |
| **Target Buy (Target Price)** | `backend/app/core/defaults.calculate_buy_price` | `buy_price = income_value × (1 - buy_discount_pct)`, capped at `list_price`; default `buy_discount_pct = 0.05` | Verdict → `target_price` / `purchase_price`; Deal Score → `purchase_price` |
| **IQ Verdict composite score** | `backend/app/services/iq_verdict_service._calculate_composite_verdict_score` | `composite = deal_gap×0.35 + return_quality×0.30 + market_alignment×0.20 + deal_probability×0.15` clamped to 5–95 | `POST /api/v1/analysis/verdict` → `dealScore`, `dealGapScore`, `returnQualityScore`, `marketAlignmentScore`, `dealProbabilityScore` |
| **Deal Opportunity Score (worksheet)** | `backend/app/services/calculators.calculate_deal_opportunity_score`, `iq_verdict_service._calculate_opportunity_score` | Worksheet: weighted (deal_gap 50%, availability 30%, DOM 20%). Simple: `score = 100 - discount_pct×2` | `POST /api/v1/worksheet/deal-score` → `deal_score`, `discount_percent`, `deal_verdict` |
| **Pricing quality tier** | `backend/app/services/iq_verdict_service._assess_pricing_quality` | `income_gap_pct = (list_price - income_value)/list_price×100`; tiers: ≤0%, 0–5%, 5–10%, 10–20%, 20–30%, 30%+ | Verdict → `pricing_quality_tier`, verdict description text |
| **Market Price (off-market)** | `backend/app/core/defaults.compute_market_price` | Listed: Market Price = List Price. Off-market: Zestimate (primary, no blending); fallback to AVM, then tax_assessed/0.75 when unavailable. | Property API `valuations.market_price`; Verdict `list_price` when off-market (client sends `is_listed`, `zestimate`, `current_value_avm`, `tax_assessed_value`) |

---

## Wholesale

| Metric | Backend location | Formula (summary) | API / response field |
|--------|------------------|-------------------|----------------------|
| **Wholesale MAO (Verdict strategy)** | `backend/app/services/iq_verdict_service._calculate_wholesale_strategy` | `wholesale_fee = price×0.007`; `mao = (arv×0.70) - rehab_cost - wholesale_fee` | Verdict → `strategies[]` where `id === "wholesale"` (metric, annual_cash_flow as assignment) |
| **Wholesale 70% rule (worksheet/calculator)** | `backend/app/services/calculators.calculate_wholesale` | `seventy_pct_max_offer = arv×(1 - arv_discount_pct) - estimated_rehab_costs`; default `arv_discount_pct = 0.30` | `POST /api/v1/worksheet/wholesale/calculate`, Analytics, Verdict strategy data |
| **Wholesale price target (30% net discount)** | Same as MAO; label "30% net discount" refers to target discount from ARV (70% rule) | Displayed as wholesale price on Verdict price ladder; value comes from wholesale strategy or MAO from backend | Verdict response wholesale strategy; no separate "wholesale price" field—use strategy or worksheet MAO |

---

## Strategy performance (LTR, STR, BRRRR, Flip, House Hack, Wholesale)

| Strategy | Backend location | Score formula | API |
|----------|------------------|---------------|-----|
| LTR | `iq_verdict_service._calculate_ltr_strategy` | `score = 50 + (coc_pct × 5)` clamped 0–100 | Verdict `strategies[]`, `POST /api/v1/worksheet/ltr/calculate` |
| STR | `_calculate_str_strategy` | `score = 50 + (coc_pct × 3.33)` | Verdict, `POST /api/v1/worksheet/str/calculate` |
| BRRRR | `_calculate_brrrr_strategy` | `score = 50 + (cash_recovery_pct × 1)` | Verdict, `POST /api/v1/worksheet/brrrr/calculate` |
| Flip | `_calculate_flip_strategy` | `score = 50 + (roi_pct × 2.5)` | Verdict, `POST /api/v1/worksheet/flip/calculate` |
| House Hack | `_calculate_house_hack_strategy` | `score = 50 + (housing_offset_pct × 1)` | Verdict, `POST /api/v1/worksheet/househack/calculate` |
| Wholesale | `_calculate_wholesale_strategy` | `score = 50 + (roi_on_emd_pct × 0.5)` | Verdict `strategies[]` |

Cash flow, NOI, cap rate, CoC, DSCR, GRM: computed in `backend/app/services/calculators` (`calculate_ltr`, `calculate_str`, etc.) and in `iq_verdict_service` for Verdict; exposed via same endpoints.

---

## Deal gap and verdict components

| Component | Backend location | Formula |
|-----------|------------------|---------|
| Deal gap (component) | `iq_verdict_service._calculate_deal_gap_component` | `gap_pct = (list_price - target_price)/list_price×100`; score 0–90 from bands (≤−10%, ≤0%, ≤10%, ≤25%, ≤40%, else) |
| Return quality | `_calculate_return_quality_component` | `min(90, top_strategy_score × 0.9)` |
| Market alignment | In `_calculate_composite_verdict_score` | `min(90, motivation_score)` |
| Deal probability | `_calculate_deal_probability_component` | Function of `deal_gap_pct` and `motivation_score`; max_discount = motivation/100×0.25; ratio = gap/max_discount → score 5–90 |

---

## Constants (defaults)

Defined in `backend/app/core/defaults.py`:

- `DEFAULT_BUY_DISCOUNT_PCT = 0.05`
- `FINANCING`: down_payment_pct 0.20, interest_rate 0.06, loan_term_years 30, closing_costs_pct 0.03
- `OPERATING`: vacancy_rate 0.01, maintenance_pct 0.05, property_management_pct 0.00, etc.
- `WHOLESALE`: target_purchase_discount_pct 0.30 (70% rule), assignment_fee 15000, etc.

Exposed via `GET /api/v1/defaults`.

---

## Validation

- Unit tests: `backend/tests/test_defaults.py` (income value, target buy), `backend/tests/test_iq_verdict.py` (composite verdict, wholesale strategy), `backend/tests/test_calculators.py` (wholesale 70% rule). Extend as needed for new formulas.
- Golden fixtures (optional): snapshot verdict + deal-score for a known property; regression test with tolerance for rounding.

## Client fallback policy

- When backend data is available (verdict, deal-score, or worksheet API): frontend and mobile MUST display only API values for income value, target buy, deal score, grade, and verdict text. No client-side formula for those metrics.
- Loading/error: show skeleton or "—"; avoid synthetic numbers. If product approves a minimal fallback (e.g. deal-gap page while loading), keep it clearly labeled and remove once API responds.
- Wholesale price on the Verdict price ladder: backend does not yet return a dedicated wholesale/MAO field; frontend/mobile may use a display-only fallback (e.g. income value × 0.70) until the API provides it.
