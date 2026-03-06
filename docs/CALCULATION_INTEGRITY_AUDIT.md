# Calculation Integrity Audit — DealGapIQ

**Objective:** Single source of truth — all calculations in the backend; frontend and mobile only consume and render API values.

**Audit date:** 2026-03-06

---

## A. Formula Registry

| Formula Name | Category | Location (file:line) | Formula | Inputs | Output | Status |
|--------------|----------|----------------------|---------|--------|--------|--------|
| **Income Value** | Core Proprietary | `backend/app/core/formulas.py:49` | `income_value = NOI / (LTV × mortgage_constant)`; NOI = EGI − op_ex; 100% cash: `noi / 0.05` | monthly_rent, property_taxes, insurance, down_payment_pct, interest_rate, loan_term_years, vacancy_rate, maintenance_pct, management_pct, capex_pct, utilities_annual, other_annual_expenses | income_value (round) | correct |
| **Target Buy (Target Price)** | Core Proprietary | `backend/app/core/formulas.py:129` | `buy_price = min(income_value × (1 - buy_discount_pct), market_price)` | market_price, monthly_rent, property_taxes, insurance, buy_discount_pct, + same as estimate_income_value | buy_price | correct |
| **Market Price (off-market)** | Comps & Valuation | `backend/app/core/formulas.py:25` | Listed: list_price. Off-market: zestimate → current_value_avm → tax_assessed_value/0.75 | is_listed, list_price, zestimate, current_value_avm, tax_assessed_value | market_price | correct |
| **Deal Gap % (user-facing)** | Core Proprietary | `backend/app/services/iq_verdict_service.py:906-907` | `deal_gap_pct = (list_price - buy_price) / list_price × 100` | list_price, buy_price (target) | deal_gap_percent | correct |
| **Income Gap %** | Core Proprietary | `backend/app/services/iq_verdict_service.py:689,904` | `income_gap_pct = (list_price - income_value) / list_price × 100` | list_price, income_value | income_gap_percent, pricing_quality_tier | correct |
| **IQ Verdict Score** | Core Proprietary | `backend/app/services/iq_verdict_service.py:531,489` | Bracket interpolation: INVESTOR_DISCOUNT_BRACKETS (≤5%→95–88, ≤10%→88–75, …); score = max(5, min(95, interpolate(deal_gap_pct))) | deal_gap_pct | deal_score | correct |
| **Cap Rate** | Cash Flow & Returns | `backend/app/services/calculators/common.py:105` | `noi / property_value` | noi, property_value | cap_rate (decimal) | correct |
| **Cash-on-Cash** | Cash Flow & Returns | `backend/app/services/calculators/common.py:112` | `annual_cash_flow / total_cash_invested` | annual_cash_flow, total_cash_invested | coc (decimal) | correct |
| **DSCR** | Debt & Financing | `backend/app/services/calculators/common.py:119` | `noi / annual_debt_service` | noi, annual_debt_service | dscr | correct |
| **GRM** | Rental Analysis | `backend/app/services/calculators/common.py:126` | `property_price / annual_gross_rent` | property_price, annual_gross_rent | grm | correct |
| **Monthly Mortgage (P&I)** | Debt & Financing | `backend/app/services/calculators/common.py:87` | `principal × (r(1+r)^n) / ((1+r)^n - 1)`; r = annual_rate/12, n = years×12 | principal, annual_rate, years | monthly_payment | correct |
| **NOI** | Cash Flow & Returns | `backend/app/services/calculators/common.py:100` | `gross_income - operating_expenses` | gross_income, operating_expenses | noi | correct |
| **LTR (full)** | Strategy | `backend/app/services/calculators/ltr.py:20` | NOI, debt service, cap rate, CoC, DSCR, GRM, 10-year projection | purchase_price, monthly_rent, taxes, financing, operating params | dict (noi, cap_rate, cash_on_cash_return, dscr, grm, …) | correct |
| **LTR Breakeven** | Strategy | `backend/app/services/calculators/ltr.py:164` | Same math as Income Value (NOI / (LTV × mortgage_constant)) | same as estimate_income_value | breakeven price | correct (duplicate of formulas.estimate_income_value) |
| **STR (full)** | Strategy | `backend/app/services/calculators/str_calc.py:36` | Revenue, platform/management fees, NOI, cap rate, CoC, DSCR, break_even_occupancy, seasonality | purchase_price, adr, occupancy, taxes, financing, STR params | dict | correct |
| **BRRRR (full)** | Strategy | `backend/app/services/calculators/brrrr.py:12` | Buy→Rehab→Rent→Refi; capital_recycled_pct, cash_left_in_deal, post_refi_cash_on_cash | market_value, arv, rent, rehab, refi params | dict | correct |
| **Flip (full)** | Strategy | `backend/app/services/calculators/flip.py:12` | 70% rule, holding costs, net_profit_before_tax, roi, annualized_roi, profit_margin | market_value, arv, discount, hard_money, rehab, holding, selling_costs_pct, capital_gains_rate | dict | correct |
| **House Hack** | Strategy | `backend/app/services/calculators/house_hack.py:12` | housing_cost_offset_pct, net_housing_cost, savings_vs_renting, roi_on_savings | purchase_price, rent_per_room, rooms_rented, taxes, financing, FHA MIP, etc. | dict | correct |
| **Wholesale** | Strategy | `backend/app/services/calculators/wholesale.py:12` | `seventy_pct_max_offer = arv×(1 - arv_discount_pct) - estimated_rehab`; roi, annualized_roi | arv, estimated_rehab, assignment_fee, marketing, emd, arv_discount_pct, days_to_close | dict | correct |
| **Deal Gap Score (worksheet)** | Scoring | `backend/app/services/calculators/scoring.py:196` | `gap_percent = max(0, (list_price - income_value)/list_price×100)`; score = 100 - (gap_percent×100/45) | income_value, list_price | gap_amount, gap_percent, score | correct |
| **Deal Opportunity Score (worksheet)** | Scoring | `backend/app/services/calculators/scoring.py:224` | Weighted: deal_gap 50%, availability 30%, DOM 20%; IQ score from achievable discount vs required gap | income_value, list_price, listing_status, DOM, market_temperature, etc. | score, grade, label, deal_gap_percent, motivation | correct |
| **Verdict LTR strategy** | Strategy | `backend/app/services/iq_verdict_service.py:71` | Inline: NOI, CoC, cap rate, DSCR; score = 50 + coc_pct×5 | price, monthly_rent, taxes, insurance, AllAssumptions | strategy dict | correct |
| **Verdict STR/BRRRR/Flip/HH/Wholesale** | Strategy | `iq_verdict_service.py:146,226,316,370,439` | Same formulas as calculators; score from metric (e.g. CoC×3.33, cash_recovery×1, roi×2.5) | price, strategy inputs, AllAssumptions | strategy dict | correct |
| **Wholesale MAO (verdict)** | Rehab & Value-Add | `iq_verdict_service._calculate_wholesale_strategy` | mao = (arv×0.70) - rehab_cost - wholesale_fee (fee = price×0.007) | price, arv, rehab_cost | wholesale_mao in response | correct |
| **STR worksheet income_value** | Strategy-Specific | `backend/app/routers/worksheet.py:342` | `income_value = purchase_price × (annual_debt_service / noi)` when noi > 0 | purchase_price, noi, annual_debt_service | income_value (STR context) | intentional (STR breakeven price) |
| **STR worksheet deal_score** | Strategy-Specific | `backend/app/routers/worksheet.py:361-374` | deal_score = 50 + cap/coc/DSCR/break_even bonuses (different from scoring.calculate_deal_opportunity_score) | cap_rate_pct, coc_pct, dscr, break_even_occupancy | deal_score | duplicate logic (worksheet-only) |
| **BRRRR worksheet deal_score** | Strategy-Specific | `backend/app/routers/worksheet.py:502-512` | deal_score = 50 + cash_left/flow/all_in_pct_arv bonuses | cash_left_in_deal, annual_cash_flow, all_in_pct_arv | deal_score | worksheet-specific |
| **Comps: similarity / adjustments / hybrid value** | Comps & Valuation | `backend/app/services/comps_calculator.py:98,162,211,355` | Similarity score, adjustments (size, bed, bath, age, lot), weighted hybrid value, rent value | subject, comp dicts | similarity, adjustments, weighted value, rent value | correct |
| **Proforma: depreciation, amortization, IRR, sensitivity** | Strategy-Specific | `backend/app/services/proforma_generator.py:171,209,282,438,512,542,602,685,736` | Depreciation, amortization schedule, annual projection, exit analysis, IRR, sensitivity | cash flows, assumptions | various | correct |
| **Rehab holding costs** | Rehab & Value-Add | `backend/app/services/rehab_intelligence.py:917` | _calculate_holding_costs | — | holding cost estimate | correct |
| **DealMaker cached metrics** | Cash Flow & Returns | `backend/app/services/deal_maker_service.py:122` | NOI, cap_rate, cash_on_cash, dscr, grm, income_value via estimate_income_value, deal_gap_pct | DealMakerRecord | CachedMetrics | correct (uses formulas + common calculators) |

---

## B. Violation Report — Frontend

Every instance where the frontend performs analytical calculations instead of consuming API values.

| File | Line(s) | What it calculates | Formula / logic | Duplicates/conflicts with backend |
|------|--------|--------------------|----------------|-----------------------------------|
| `frontend/src/components/iq-verdict/VerdictIQPageNew.tsx` | 106-195 | **pricing** object: buyPrice, NOI, mortgage, capRate, cashOnCash, dscr, grm, incomeValue (fallback), targetBuyPrice (fallback), wholesalePrice, dealGap | NOI = effectiveIncome - totalExpenses; capRate = noi/buyPrice×100; cashOnCash = annualCashFlow/cashNeeded×100; dscr = noi/annualDebtService; grm = buyPrice/(monthlyRent×12); incomeValueLocal = noi/mortgageConstant; targetBuyPrice = incomeValue×0.95; wholesalePrice = incomeValue×0.70; dealGap = (marketValue - incomeValue)/marketValue×100 | **Violation.** Backend provides income_value, purchase_price, deal_gap_percent, wholesale_mao. Frontend should display only API values; fallbacks duplicate formulas and can diverge (e.g. different defaults). Deal gap here uses (marketValue - incomeValue) but backend user-facing Deal Gap is (list_price - target_price). |
| `frontend/src/components/iq-verdict/VerdictIQPageNew.tsx` | 199-202 | **dealGap** | `(marketValue - pricing.incomeValue) / marketValue * 100` | Duplicates backend deal_gap_percent; backend uses list_price - target_price, not income_value. |
| `frontend/src/hooks/useDealGap.ts` | 69-78 | **dealGapPercent, dealScore, dealGrade** when API not provided | dealGapPercent = (listPrice - buyPrice)/listPrice×100; dealGrade from thresholds (≥20%→A+, …); dealScore = dealGapPercent×4 (clamped 0–100) | **Violation.** Backend deal score uses bracket interpolation (INVESTOR_DISCOUNT_BRACKETS), not linear dealGapPercent×4. Grade thresholds differ. When dealScoreFromApi/dealGradeFromApi are provided, hook correctly uses them. |
| `frontend/src/hooks/useDealGap.ts` | 50-56 | **getDealGrade** | dealGapPercent ≥20→A+, ≥15→A, ≥10→B, ≥5→C, ≥0→D, else F | Different thresholds than backend _score_to_grade_label (score 88→A+, 75→A, …). |
| `frontend/src/lib/iqTarget.ts` | 616-650 | **calculateDealGapScore** | gapAmount = listPrice - incomeValue; gapPercent = max(0, gapAmount/listPrice×100); score = 100 - (gapPercent×100/45) | Duplicates backend scoring.calculate_deal_gap_score. Used for worksheet/deal-gap page; backend already returns deal_gap from verdict/deal-score. |
| `frontend/src/lib/iqTarget.ts` | 652+ | **calculateDealOpportunityScore** (if present) | Weighted deal gap + availability + DOM | Duplicates backend calculate_deal_opportunity_score. |
| `frontend/src/components/deal-maker/DealMakerPage.tsx` | 42-121 | **calculateDealMakerMetrics** | NOI, annualCashFlow, capRate, cocReturn, dealGap, dealScore, dealGrade, profitQuality | **Violation.** Full LTR-style math (NOI, cap rate, CoC) and dealScore/dealGrade computed client-side. Backend DealMakerService.calculate_metrics and verdict provide these. Frontend should call backend or display only API metrics. |
| `frontend/src/components/deal-maker/DealMakerPage.tsx` | 36-40 | **calculateMortgagePayment** | Standard P&I formula | Duplicates backend calculate_monthly_mortgage. |
| `frontend/src/components/deal-maker/DealMakerPage.tsx` | 123-147 | **calculateDealScore, getDealGrade** | CoC/cap/cash flow thresholds (e.g. CoC≥15→+40, cap≥10→+30); grade from score (≥85 A+, …) | Different formula than backend verdict score and worksheet deal_score. |
| `frontend/src/utils/appraisalCalculations.ts` | 46-133+ | **ARV / market value from comps** | Similarity, adjustments (size 0.08×ppsft, bed 10k, bath 5k), weighted hybrid, marketValue, arv, rent estimates | **Potential duplication.** Backend has CompsCalculator (calculate_weighted_hybrid_value, calculate_rent_value, calculate_adjustments). If frontend comps UI uses this for displayed ARV/market value instead of backend comps API, it duplicates logic and can diverge. |
| `frontend/src/utils/comps-calculations.ts` | 46-60+ | **calculateARVEstimate** | avgPricePerSqft; adjustedPrices = comp.salePrice + sizeAdj + bedAdj + bathAdj (size 0.08×ppsft, bed 10k, bath 5k) | Same concern: comp-based ARV on frontend; backend has comps logic. Prefer backend endpoint for comp-derived ARV. |
| `frontend/src/lib/dynamicMetrics.ts` | (whole file) | Legacy dynamic metrics calculator | Deprecated per file comment; only used by VerdictIQCombined (deprecated). | Dead code; remove or ensure no imports. |
| `frontend/src/hooks/useDealGap.ts` | 116-152 | **calculateSuggestedBuyPrice, buyPriceFromSliderPosition, sliderPositionFromBuyPrice** | suggested = incomeValue×(1 - targetDiscountPercent/100); slider↔price mapping ±20% of income value | Display/UX helpers; not analytical metrics. **OK** if used only for slider UX; ensure displayed buy price ultimately comes from API. |

---

## B. Violation Report — Mobile

| File | Line(s) | What it does | Verdict |
|------|--------|--------------|--------|
| `mobile/app/verdict.tsx` | — | Displays verdict from `useVerdict(property.data)` | **No violation.** Renders API data only. |
| `mobile/app/strategy.tsx` | 53, 124-147 | Uses `verdict.data.purchase_price`, `income_value`, `deal_gap_percent`, `deal_gap_amount`, `wholesale_mao` | **No violation.** All values from `POST /api/v1/analysis/verdict`. |
| `mobile/hooks/useVerdict.ts` | 73-77 | Calls `POST /api/v1/analysis/verdict` | Same API as frontend. **No local calculations.** |

**Mobile summary:** Mobile uses the same verdict API and displays only API fields. No analytical calculations found in mobile codebase.

---

## C. Phase 2: Consistency & Correctness

### Formula correctness (standard RE formulas)

- **Cap Rate = NOI / Purchase Price** — Implemented as `noi / property_value` in `common.calculate_cap_rate`. Correct (no financing).
- **Cash-on-Cash = Annual Cash Flow / Total Cash Invested** — Implemented in `common.calculate_cash_on_cash`. Correct.
- **DSCR = NOI / Annual Debt Service** — Implemented in `common.calculate_dscr`. Correct.
- **GRM = Purchase Price / Gross Annual Rent** — Implemented in `common.calculate_grm`. Correct.
- **NOI = Gross Income − Operating Expenses** (no debt service) — Used consistently in LTR, STR, BRRRR, verdict. Correct.
- **Monthly mortgage** — Standard amortization in `common.calculate_monthly_mortgage`. Correct.
- **Deal Gap (user-facing)** — Documented as (List Price − Target Price) / List Price × 100. Implemented in iq_verdict_service (deal_gap_amount = list_price - buy_price; deal_gap_pct = deal_gap_amount/list_price×100). Correct.
- **Income Value** — NOI / (LTV × mortgage_constant); 100% cash fallback noi/0.05. Correct.

### Duplication & conflict detection

- **LTR breakeven:** `calculators/ltr.calculate_ltr_breakeven` and `formulas.estimate_income_value` implement the same breakeven price. **Duplicate** but both correct; consider calling `estimate_income_value` from LTR to avoid drift.
- **Verdict strategy LTR/STR:** `iq_verdict_service._calculate_ltr_strategy` and `_calculate_str_strategy` reimplement logic that exists in `calculators/ltr.calculate_ltr` and `calculators/str_calc.calculate_str`. Results should be kept in sync; ideally verdict could call the same calculator with resolved assumptions.
- **Worksheet deal_score (STR/BRRRR):** Inline scoring in `worksheet.py` (STR lines 361-374, BRRRR 502-512) differs from `calculators/scoring.calculate_deal_opportunity_score`. **Intentional** worksheet-specific scoring; document as such.
- **Deal score on frontend (DealMakerPage):** `calculateDealScore` uses different weights/thresholds than backend. **Conflict** — frontend can show a different grade/score than backend for same inputs.

### Cross-platform consistency

- **Flow:** Frontend/mobile send property + assumptions → `POST /api/v1/analysis/verdict` → backend returns income_value, purchase_price, deal_gap_percent, deal_gap_amount, deal_score, strategies (with cap_rate, cash_on_cash, dscr), wholesale_mao.
- **Mismatch:** VerdictIQPageNew computes and shows capRate, cashOnCash, dscr, grm, incomeValue, targetBuyPrice, wholesalePrice, dealGap locally when it could show verdict + strategy breakdown from API. So frontend and backend can disagree if defaults or rounding differ.
- **Values not from API:** Any UI that shows “Income Value” or “Target Buy” or “Deal Gap” from VerdictIQPageNew’s `pricing` object (when API is present) should use `analysis.incomeValue`, `analysis.purchasePrice`, and `analysis.deal_gap_percent` instead of local math.

---

## D. Phase 3: API Response & Shared Constants

### API response (property analysis / verdict)

- **POST /api/v1/analysis/verdict** (IQVerdictResponse): Includes income_value, purchase_price, list_price, deal_gap_amount, deal_gap_percent, income_gap_amount, income_gap_percent, pricing_quality_tier, deal_score (opportunity.score), opportunity_factors (deal_gap, motivation), strategies (each with cap_rate, cash_on_cash, dscr, annual_cash_flow, monthly_cash_flow), wholesale_mao. All calculated values needed for the verdict view are present; no need for client-side calculation.
- **POST /api/v1/worksheet/deal-score** and strategy worksheets (LTR, STR, BRRRR, Flip, House Hack, Wholesale): Return full metrics (income_value, purchase_price, cap_rate, cash_on_cash_return, dscr, deal_score, etc.). Frontend/mobile should not recompute these.

### Shared constants & assumptions

- **Backend:** `backend/app/core/defaults.py` — FinancingDefaults (down_payment_pct 0.20, interest_rate 0.06, loan_term_years 30, closing_costs_pct 0.03), OperatingDefaults (vacancy_rate 0.01, maintenance_pct 0.05, etc.), STRDefaults, RehabDefaults, BRRRRDefaults, FlipDefaults, WholesaleDefaults. Exposed via **GET /api/v1/defaults**.
- **Frontend:** `frontend/src/hooks/useStrWorksheetCalculator.ts` has FALLBACK_* constants (e.g. 0.20, 0.06, 0.01, 0.05) “Must match backend/app/core/defaults.py”. Risk of drift; prefer fetching defaults from API or a single shared package.
- **useDealGap** and VerdictIQPageNew use local default objects (e.g. 20% down, 6% rate, 5% vacancy) when API/defaults are missing. These should align with backend or be replaced by API-sourced defaults.

---

## E. Recommendations

1. **VerdictIQPageNew:** Use only `analysis.incomeValue`, `analysis.purchasePrice`, `analysis.deal_gap_percent`, and strategy breakdown (cap_rate, cash_on_cash, dscr) from the verdict response. Remove local calculation of NOI, cap rate, CoC, DSCR, GRM, income value, target buy, wholesale, and deal gap for display when API data exists. Keep local math only for loading/error fallback if product approves, and label it clearly.
2. **useDealGap:** When backend provides dealScoreFromApi and dealGradeFromApi, already correct. When not provided, either hide score/grade or fetch from deal-score/verdict API instead of computing dealScore = dealGapPercent×4 and local getDealGrade.
3. **DealMakerPage / calculateDealMakerMetrics:** Prefer backend for metrics: call Deal Maker backend (or verdict) and display returned cap_rate, cash_on_cash, deal_gap, deal_score, deal_grade. If Deal Maker is intentionally client-only for real-time slider feedback, document it and ensure any persisted or shared “deal score” comes from backend.
4. **iqTarget.calculateDealGapScore / calculateDealOpportunityScore:** Use only for contexts that do not have verdict/deal-score API (e.g. standalone deal-gap tool). Else remove or replace with API response.
5. **Comps/ARV:** Prefer backend comps endpoints for any displayed ARV or comp-based value. If frontend keeps appraisalCalculations/comps-calculations for UX (e.g. instant preview), ensure canonical value is from backend and clearly label any “estimate” from frontend.
6. **Constants:** Centralize default assumptions (e.g. shared package or fetch from GET /api/v1/defaults) so frontend and mobile do not hardcode percentages that can diverge from backend.
7. **LTR breakeven:** Have `calculate_ltr_breakeven` call `estimate_income_value` (or vice versa) so there is a single implementation.
8. **dynamicMetrics.ts:** Remove or gate behind feature flag; ensure no production path uses it for displayed metrics.

---

## Summary Table (Formula Status)

| Category | Count | Status |
|----------|-------|--------|
| Core Proprietary (Income Value, Target Buy, Deal Gap, Verdict Score) | 6 | All correct in backend; frontend violations in VerdictIQPageNew, useDealGap, DealMakerPage |
| Cash Flow & Returns (NOI, cap rate, CoC, etc.) | 4 | Correct in backend; frontend recalculates in VerdictIQPageNew, DealMakerPage |
| Debt & Financing (mortgage, DSCR) | 2 | Correct in backend; frontend mortgage in DealMakerPage, VerdictIQPageNew |
| Rental (GRM) | 1 | Correct in backend; frontend in VerdictIQPageNew |
| Strategy (LTR, STR, BRRRR, Flip, HH, Wholesale) | 6 | Correct in backend; worksheet-specific deal_score logic duplicated in router |
| Comps & Valuation | 4 | Backend correct; frontend appraisalCalculations/comps-calculations may duplicate |
| Scoring (deal gap score, opportunity score) | 2 | Backend correct; frontend iqTarget, useDealGap, DealMakerPage duplicate or conflict |

This audit provides the **Formula Registry** (Section A), **Violation Report** for frontend and mobile (Section B), **Phase 2** consistency and correctness notes (Section C), and **Phase 3** API/constants summary (Section D), with actionable recommendations (Section E).
