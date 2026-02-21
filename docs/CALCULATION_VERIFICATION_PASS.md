# Calculation Verification Pass — Backend → API → Frontend → Mobile

For each metric, the chain is traced and any mismatches or unit errors are noted.

**API convention:** Verdict endpoint uses `model_dump(by_alias=True)`, so responses use **camelCase** (e.g. `incomeValue`, `purchasePrice`, `dealGapPercent`). Worksheet endpoints return **snake_case** dicts (e.g. `monthly_cash_flow`, `cap_rate`).

---

## 1. Income Value

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/core/defaults.py` | `estimate_income_value(monthly_rent, property_taxes, insurance, ...)` → NOI = EGI − operating_expenses; Income Value = NOI / (LTV × mortgage_constant); 100% cash: noi/0.05 | Returned as `round(income_value)` |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:448` | `income_value = estimate_income_value(monthly_rent, property_taxes, insurance)` | Passed into `IQVerdictResponse(income_value=...)` |
| **API** | `POST /api/v1/analysis/verdict` | Response model `IQVerdictResponse.income_value` | Serialized as **`incomeValue`** (camelCase) |
| **Frontend** | `frontend/src/hooks/useIQAnalysis.ts:76` | `incomeValue = verdict.income_value ?? verdict.incomeValue ?? verdict.breakeven_price ?? verdict.breakevenPrice ?? 0` | `iqTarget.incomeValue` |
| **Frontend render** | DealScoreDisplay, IQTargetHero, PriceLadder, etc. | Use `iqTarget.incomeValue` or `data.incomeValue` from API-derived data | Same value |
| **Mobile** | `mobile/hooks/usePropertyAnalysis.ts:692` | `incomeValue: data.breakevenPrice` | **Issue:** Backend sends `incomeValue`, not `breakevenPrice`. Mobile type has `breakevenPrice`; response has `incomeValue`. Should be `data.incomeValue ?? data.breakevenPrice` so both keys work. |
| **Mobile render** | `mobile/app/verdict-iq/[address].tsx` | `incomeValue` from `analysisResult` → `buildIQPrices(incomeValue, targetPrice, marketPrice, wholesaleMao)` | Same value if fixed above |

**Verdict:** Chain is correct on backend and frontend. **Mobile:** `convertToComponentData` should set `incomeValue: data.incomeValue ?? data.breakevenPrice` so the value is identical when API sends `incomeValue`.

---

## 2. Target Buy (Target Price / Purchase Price)

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/core/defaults.py:358` | `calculate_buy_price(list_price, monthly_rent, property_taxes, insurance)` → buy_price = income_value × (1 − buy_discount_pct), capped at list_price | `round(income_value * (1 - discount_pct))` then `min(buy_price, list_price)` |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:468` | `buy_price = input_data.purchase_price or calculate_buy_price(list_price, monthly_rent, property_taxes, insurance)` | `IQVerdictResponse(purchase_price=buy_price)` |
| **API** | `POST /api/v1/analysis/verdict` | `IQVerdictResponse.purchase_price` | **`purchasePrice`** (camelCase) |
| **Frontend** | `frontend/src/hooks/useIQAnalysis.ts:75` | `targetPrice = verdict.purchase_price ?? verdict.purchasePrice ?? 0` | `iqTarget.targetPrice` |
| **Frontend render** | StrategyAnalyticsContainer, NegotiationPlan, DealScoreDisplay, etc. | Use `iqTarget.targetPrice` or `verdictDealScore`-derived data | Same value |
| **Mobile** | `mobile/hooks/usePropertyAnalysis.ts:691` | `targetPrice: data.purchasePrice` | `analysisResult.targetPrice` |
| **Mobile render** | verdict-iq, strategy-iq | `targetPrice` from `analysisResult` → buildIQPrices, buildPurchaseGroup, etc. | Same value |

**Verdict:** Chain is identical at every stage; no issues.

---

## 3. Deal Gap

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/iq_verdict_service.py:328,516-559` | deal_gap_pct = (list_price − target_price) / list_price × 100; deal_gap_amount = list_price − target_price | Computed then passed to response |
| **API** | `POST /api/v1/analysis/verdict` | `deal_gap_percent`, `deal_gap_amount`, `opportunity_factors.deal_gap` | **`dealGapPercent`**, **`dealGapAmount`**, **`opportunityFactors.dealGap`** |
| **Frontend** | `frontend/src/hooks/useIQAnalysis.ts` | `verdictDealScore.discountPercent` (from `verdict.discount_percent` / `discountPercent`) — note: verdict uses **income_gap_pct** for discount_percent, not deal_gap_pct | Deal score display uses verdict; deal gap % can also come from `(listPrice - targetPrice)/listPrice*100` from API list/target |
| **Frontend render** | DealScoreDisplay, ScoreTabContent | `verdictDealScore.discountPercent` and/or `dealScoreDataFromApi` (which uses API discount and deal score) | Same value when using API |
| **Mobile** | `mobile/hooks/usePropertyAnalysis.ts` | `discountPercent: data.discountPercent`; component score `dealGapScore` from `raw.componentScores.dealGapScore` | `analysisResult.discountPercent`; Deal Gap **score** (0–90) from `raw.componentScores` |
| **Mobile render** | verdict-iq buildSignalIndicators, strategy-iq | `raw.opportunityFactors.dealGap` (%), `cs?.dealGapScore` (score) | Same value from API |

**Note:** Backend `discount_percent` is **income gap %** (list − income_value), not deal gap % (list − target). Deal gap % is in `deal_gap_percent` and `opportunity_factors.deal_gap`. Frontend deal score uses `discount_percent` (income gap) for verdict label; numeric deal gap is in `dealGapPercent` / `dealGapAmount`.

**Verdict:** Chain is consistent. Clarify in UI/docs whether displayed “discount” is income gap vs deal gap; both are from API.

---

## 4. NOI (Net Operating Income)

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/calculators/common.py:100` | `calculate_noi(gross_income, operating_expenses)` → gross_income − operating_expenses | Decimal (dollars) |
| **Backend (LTR)** | `backend/app/services/calculators/ltr.py:97` | noi = effective_gross_income − total_operating_expenses | In dict as `"noi"` |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:73` | noi = effective_income − op_ex (inside _calculate_ltr_strategy) | **Not** returned in verdict response; only cap_rate, cash_on_cash, dscr, annual_cash_flow, monthly_cash_flow in strategies |
| **API (worksheet)** | `POST /api/v1/worksheet/ltr/calculate` | `result["noi"]` from `calculate_ltr` | **`noi`** (snake_case) |
| **Frontend** | Worksheet flow: `metricsAtTarget` / `metricsAtList` from worksheet API | Read `m.noi` (if present); LTR returns from worksheet | StrategyAnalyticsContainer uses worksheet metrics; **no direct NOI in verdict path**. NOI appears in worksheet-derived metrics. |
| **Frontend render** | Components that show NOI | Must read from **worksheet** result (e.g. `metricsAtTarget.noi`), not verdict | Same value if from worksheet |
| **Mobile** | Worksheet and verdict | Verdict strategies do not include NOI. Worksheet LTR returns `noi`. Mobile worksheet screens use `result.noi`. | `metricsAtTarget.noi` / worksheet result; verdict does not expose NOI |

**Verdict:** NOI is **not** in the verdict response; it is only in **worksheet LTR (and STR, etc.)** responses. Frontend/mobile must use worksheet results for NOI. Chain is identical when using worksheet; verdict-only screens do not show NOI (or would need worksheet call).

---

## 5. Cap Rate

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/calculators/common.py:105` | `calculate_cap_rate(noi, property_value)` → noi / property_value (decimal, e.g. 0.055) | Decimal |
| **Backend (LTR)** | `backend/app/services/calculators/ltr.py:101` | cap_rate = calculate_cap_rate(noi, purchase_price) | Decimal in dict |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:78` | cap_rate = (noi / price * **100**) → stored as **percentage** (e.g. 5.5) | In strategy dict and return_factors |
| **API (verdict)** | Verdict response | strategies[].cap_rate, return_factors.cap_rate | **Percentage** (e.g. 5.5 for 5.5%) |
| **API (worksheet)** | `POST /api/v1/worksheet/ltr/calculate` | `result["cap_rate"] * 100` | **`cap_rate`** as **percentage** (e.g. 5.5) |
| **Frontend (verdict)** | `frontend/src/hooks/useIQAnalysis.ts:97` | `capRate: (strat?.cap_rate ?? strat?.capRate ?? 0) * 100` | **Bug:** Verdict already sends 5.5; ×100 → 550. Frontend should **not** multiply when from verdict. |
| **Frontend (worksheet)** | StrategyAnalyticsContainer | `rentalMetrics.capRate` from `metricsAtTarget` (worksheet returns snake_case `cap_rate`). createLTRReturns(capRate) then ReturnsGrid does `(capRate * 100).toFixed(1)` | **Bug:** Worksheet returns cap_rate as **percentage** (5.5). createLTRReturns expects decimal; ReturnsGrid multiplies by 100 again → 550%. |
| **Mobile** | `buildMetricsFromAPI` in verdict-iq | `capRate = raw.returnFactors.capRate ?? 0`; display: `(capRate * 100).toFixed(1)` | **Bug:** Backend sends 5.5; ×100 → "550.0%". Should not multiply when value is already percentage. |

**Verdict:** **Unit mismatch.** Backend verdict and worksheet both expose cap rate as **percentage** (5.5). Frontend and mobile treat it as decimal and multiply by 100 again, so displayed value is wrong. Fix: either (a) backend sends decimal (0.055) for cap_rate in verdict/worksheet, or (b) frontend/mobile do **not** multiply when displaying (use as-is or divide by 100 only for decimal math).

---

## 6. Cash-on-Cash Return

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/calculators/common.py:112` | annual_cash_flow / total_cash_invested (decimal) | Decimal |
| **Backend (LTR)** | `backend/app/services/calculators/ltr.py:102` | cash_on_cash = calculate_cash_on_cash(annual_cash_flow, total_cash_required) | Decimal in dict |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:76-83` | coc_pct = coc * 100; "cash_on_cash": round(coc_pct, 2) | **Percentage** (e.g. 8.5) in strategy |
| **API (verdict)** | Verdict response | strategies[].cash_on_cash, return_factors.cash_on_cash | **Percentage** |
| **API (worksheet)** | LTR worksheet | coc_return = (annual_cash_flow / total_cash_needed * 100) | **`cash_on_cash_return`** as **percentage** |
| **Frontend** | useIQAnalysis: `cashOnCash: (strat?.cash_on_cash ?? strat?.cashOnCash ?? 0) * 100` | Same **double-percent** issue: API sends 8.5; frontend ×100 → 850. createLTRReturns expects decimal; ReturnsGrid does (cashOnCash * 100).toFixed(1). | Wrong display unless fixed |
| **Mobile** | From strategies or returnFactors | Same unit issue if displayed as (value * 100)% | Same fix as cap rate |

**Verdict:** Same **unit mismatch** as cap rate: backend sends CoC as **percentage**; frontend/mobile multiply by 100 again. Fix: send decimal from backend or stop multiplying on client.

---

## 7. DSCR

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/calculators/common.py:118` | noi / annual_debt_service | Ratio (e.g. 1.25) |
| **Backend (LTR)** | `backend/app/services/calculators/ltr.py:103` | dscr = calculate_dscr(noi, annual_debt_service) | In dict |
| **Backend (verdict)** | `backend/app/services/iq_verdict_service.py:79` | dscr = noi / annual_debt if annual_debt > 0 else 0; round(dscr, 2) | Ratio in strategy and return_factors |
| **API** | Verdict + worksheet | strategies[].dscr, return_factors.dscr; worksheet "dscr" | Ratio (no unit conversion) |
| **Frontend** | useIQAnalysis: `dscr: strat?.dscr ?? 0`; createLTRReturns; ReturnsGrid: `dscr.toFixed(2)` | No extra scaling | Same value |
| **Mobile** | raw.returnFactors.dscr, raw.strategies[0].dscr | Display as-is | Same value |

**Verdict:** Chain is identical; DSCR is a ratio and is not double-scaled.

---

## 8. Monthly Payment (P&I)

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | `backend/app/services/calculators/common.py:86` | `calculate_monthly_mortgage(principal, annual_rate, years)` — standard P&I formula | Monthly dollars |
| **Backend (LTR)** | `backend/app/services/calculators/ltr.py:71` | monthly_pi = calculate_monthly_mortgage(loan_amount, interest_rate, loan_term_years) | "monthly_pi" in dict |
| **Backend (verdict)** | `iq_verdict_service.py:68` | monthly_pi = calculate_monthly_mortgage(...) (used inside strategy; **not** in strategy result dict) | Verdict strategy dict does **not** include monthly_payment; only annual_cash_flow, monthly_cash_flow |
| **API (worksheet)** | `POST /api/v1/worksheet/ltr/calculate` | `"monthly_payment": result["monthly_pi"]` | **`monthly_payment`** (snake_case) |
| **Frontend** | Worksheet: metricsAtTarget / metricsAtList | Keys are snake_case: `monthly_payment` (worksheet). Frontend checks `'monthlyCashFlow' in m` — so it expects camelCase; worksheet returns snake_case. | **Possible bug:** Frontend may not see worksheet metrics if it only checks for camelCase. Need to read `monthly_cash_flow` and `monthly_payment` from worksheet response. |
| **Mobile** | Worksheet | `metrics?.monthly_payment` or from worksheet result | Same value from worksheet |

**Verdict:** Monthly payment is **not** in the verdict response; it is in the **worksheet** response as `monthly_payment`. Frontend must use worksheet result and handle snake_case keys for LTR metrics (or backend could return camelCase for worksheet).

---

## 9. Cash Flow (Monthly)

| Stage | Location | Formula / Source | Output key / usage |
|-------|----------|------------------|--------------------|
| **Backend** | LTR: noi − annual_debt_service, then / 12 | monthly_cash_flow = annual_cash_flow / 12 | In LTR dict as "monthly_cash_flow" |
| **Backend (verdict)** | `iq_verdict_service.py:74-84` | monthly_cash_flow = annual_cash_flow / 12; in strategy dict | strategies[].monthly_cash_flow (camelCase: monthlyCashFlow) |
| **API (verdict)** | Verdict response | strategies[].monthly_cash_flow → **monthlyCashFlow** | Same value |
| **API (worksheet)** | LTR worksheet | "monthly_cash_flow": result["monthly_cash_flow"] | **`monthly_cash_flow`** (snake_case) |
| **Frontend** | useIQAnalysis: `monthlyCashFlow: strat?.monthly_cash_flow ?? strat?.monthlyCashFlow ?? 0` (verdict). For worksheet: m.monthly_cash_flow vs m.monthlyCashFlow | Verdict path: correct. Worksheet path: must use snake_case key if API returns snake_case. | Same value when key matches |
| **Frontend render** | ReturnsGrid, etc. | formatCurrency(monthlyCashFlow) | Same value |
| **Mobile** | raw.strategies[0]?.monthlyCashFlow; worksheet metricsAtTarget.monthly_cash_flow | buildMetricsFromAPI: monthlyCashFlow from strategies[0] | Same value |

**Verdict:** Chain is consistent. Frontend worksheet flow must read `monthly_cash_flow` from worksheet response (snake_case); verdict path uses camelCase and is correct.

---

## Summary Table

| Metric | Backend → API | Frontend (Verdict) | Frontend (Worksheet) | Mobile (Verdict) | Mobile (Worksheet) | Identical? |
|--------|----------------|--------------------|----------------------|------------------|--------------------|------------|
| Income Value | ✓ income_value → incomeValue | ✓ from verdict | N/A | ⚠ use incomeValue ?? breakevenPrice | N/A | Fix mobile mapping |
| Target Buy | ✓ purchase_price → purchasePrice | ✓ | N/A | ✓ | N/A | Yes |
| Deal Gap | ✓ deal_gap_percent, opportunity_factors.deal_gap | ✓ | N/A | ✓ | N/A | Yes |
| NOI | Worksheet only: noi | From worksheet only | From worksheet (noi) | From worksheet only | From worksheet | Yes when using worksheet |
| Cap Rate | Verdict/worksheet: **%** (5.5) | ⚠ ×100 again → wrong | ⚠ ×100 again → wrong | ⚠ ×100 again → wrong | — | **No — unit fix needed** |
| Cash-on-Cash | Verdict/worksheet: **%** (8.5) | ⚠ ×100 again → wrong | ⚠ ×100 again → wrong | ⚠ ×100 again → wrong | — | **No — unit fix needed** |
| DSCR | ✓ ratio | ✓ | ✓ | ✓ | ✓ | Yes |
| Monthly Payment | Worksheet only: monthly_payment | N/A | ✓ if snake_case read | N/A | ✓ | Yes when using worksheet |
| Cash Flow | ✓ verdict + worksheet | ✓ verdict monthlyCashFlow | ✓ if monthly_cash_flow read | ✓ | ✓ | Yes |

---

## Recommended Fixes

1. **Mobile incomeValue:** In `convertToComponentData`, set `incomeValue: data.incomeValue ?? data.breakevenPrice` so backend’s `incomeValue` is used.
2. **Cap rate / Cash-on-Cash units:** Either (a) have backend send **decimal** (0.055, 0.085) for cap_rate and cash_on_cash in verdict and worksheet, and keep frontend/mobile `* 100` for display, or (b) keep backend as percentage and remove the `* 100` in frontend/mobile for these two fields (e.g. ReturnsGrid, buildMetricsFromAPI, useIQAnalysis map).
3. **Frontend worksheet keys:** Ensure StrategyAnalyticsContainer (and any consumer of worksheet metrics) reads **snake_case** from worksheet response (`monthly_cash_flow`, `cap_rate`, `cash_on_cash_return`, `dscr`, `noi`, `monthly_payment`) or normalize once after fetch to camelCase so the rest of the app sees the same keys as verdict.
