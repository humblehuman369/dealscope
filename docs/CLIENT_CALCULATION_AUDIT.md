# Client Calculation Audit

Per-file list of calculations to remove (use backend API instead) vs display-only. All user-facing numbers for Verdict, Price Targets, and Deal Score must come from backend.

**Target APIs:** `POST /api/v1/analysis/verdict`, `POST /api/v1/worksheet/deal-score`, strategy/worksheet calculate endpoints.

---

## Frontend

| File | Calculation to remove / replace | Use API field instead |
|------|--------------------------------|------------------------|
| `frontend/src/components/analytics/DealScoreDisplay.tsx` | `discountPercent`, `overall = 100 - (discountPercent*100/45)`, grade/verdict bands from list/income value | Verdict: `discountPercent` → verdict response or deal-score `discount_percent`; score/grade → `dealScore`, verdict label from API |
| `frontend/src/components/analytics/VerdictIQPage.tsx` | `incomeValue = noi/0.07`, `targetBuy = incomeValue*0.95`, `wholesale = marketEstimate*0.66`, verdict from dealGapPercent | Verdict API: `income_value`, `target_price`/purchase_price, wholesale from strategies.wholesale or price ladder API; verdict text from response |
| `frontend/src/components/iq-verdict/VerdictIQPageNew.tsx` | `incomeValue = noi/mortgageConstant`, `targetBuyPrice = incomeValue*0.95`, `wholesalePrice = incomeValue*0.70` | Verdict API: `income_value`, `target_price`, wholesale from response (strategy or dedicated field) |
| `frontend/src/components/iq-verdict/IQVerdictScreen.tsx` | `discountNeeded`, `calculatedDealGap`, `maxDiscount`, NOI/mortgage/cash flow from defaults | Verdict API: discount/gap from response; LTR/strategy metrics from verdict `strategies[]` and financial breakdown from API |
| `frontend/src/components/iq-verdict/types.ts` | `estimateIncomeValue`, `calculateTargetPurchasePrice`, `calculateWholesaleStrategy` (deprecated) | Remove or keep only for types; call Verdict/deal-score API for values |
| `frontend/src/components/deal-maker/DealMakerPage.tsx` | Mortgage (P&I), NOI, cash flow, cap rate, CoC, `calculateDealScore(cocReturn, capRate, annualCashFlow)`, `getDealGrade`, `getProfitQualityGrade` | Use Deal Maker backend or verdict/analytics API for all metrics; display API `deal_score`/grade |
| `frontend/src/components/deal-maker/DealMakerPopup.tsx` | MAO = ARV×0.70 - repairs, 70% rule check, end-buyer profit, net profit, ROI | Worksheet wholesale or analytics API: `seventy_pct_max_offer`, `deal_viability`, `net_profit`, `roi` |
| `frontend/src/hooks/useDealGap.ts` | `dealGapPercent`, `dealScore = dealGapPercent*4`, `getDealGrade(dealGapPercent)` | Use `useDealScore` / verdict API: `discount_percent`, `deal_score`, grade from API |
| `frontend/src/lib/analytics.ts` | `calculateDealScore(incomeValue, listPrice, metrics)`, grade/verdict bands, `incomeValueEstimate` | Use deal-score or verdict API; remove local formula when API data available |
| `frontend/src/utils/calculations.ts` | `calculateIncomeValue` (binary search), deal score from income value + list price, `getOpportunityGradeInfo` | Use verdict/deal-score API for income_value, score, grade |
| `frontend/src/app/deal-gap/page.tsx` | Fallback income value (noi/0.06 or list×0.85) when result missing | Show loading/empty state or "—"; no synthetic numbers |
| `frontend/src/app/strategy/page.tsx` | Fallback: downPayment, closingCosts, loanAmount, monthlyPI, noi, annualCashFlow, monthlyCashFlow | Prefer `topStrategy?.monthly_cash_flow` etc. from verdict; remove local LTR math when API data present |
| `frontend/src/components/worksheet/str/STRMetricsChart.tsx` | `buyDiscount`, `breakevenOccupancy`, `profitQualityScore` from cap/CoC/DSCR/occupancy thresholds | Use STR worksheet API and verdict for scores; display API metrics |
| `frontend/src/components/worksheet/str/StrWorksheet.tsx` | Verdict bands from `dealScoreResult?.discountPercent` (≤5% Strong, etc.); est LTR cash flow | Use backend verdict/grade when available; LTR from worksheet or verdict |

---

## Mobile

| File | Calculation to remove / replace | Use API field instead |
|------|--------------------------------|------------------------|
| `mobile/lib/iqTarget.ts` | `estimateLTRBreakeven` (income value), `calculateBuyPrice`, `getOpportunityGradeFromScore` | Verdict/deal-score API: `income_value`, `target_price`/purchase_price, grade from API |
| `mobile/app/verdict-iq/[address].tsx` | `wholesalePrice = targetPrice*0.70`, cash needed (targetPrice*(downPaymentPct+closingCostsPct)) | Verdict response: wholesale from strategies or API field; cash needed from API or same-terms breakdown from backend |

---

## Policy

- **When API data is available:** Display only API response fields; no client-side formula for that metric.
- **Loading/error:** Show skeleton or "—"; do not show synthetic or fallback-calculated numbers unless product explicitly approves a minimal, labeled fallback (e.g. "Estimate" with disclaimer).
- **Deal Maker / worksheets:** Prefer backend-calculated metrics (verdict, analytics, or worksheet endpoints); remove duplicate mortgage/NOI/cash flow/cap/CoC/score logic from frontend and mobile.
