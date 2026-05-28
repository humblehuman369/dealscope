/**
 * @deprecated Production UI must use API `valuation_snapshot` from `/analysis/verdict`.
 * Retained for unit tests and `scripts/valuation-parity-check` only — do not import from
 * `src/app`, `src/features`, or `src/components` (enforced by ESLint).
 *
 * Income Value — purchase price at which annual cash flow ≈ $0.
 * Mirrors `app.core.valuation.estimate_income_value`.
 */

import type {
  StrategyType,
  AnyStrategyState,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  HouseHackDealMakerState,
} from '@/features/deal-maker/components/types'

import {
  DEFAULT_OPERATING_CAPEX_PCT,
  DEFAULT_OPERATING_LANDSCAPING_ANNUAL,
  DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
  DEFAULT_OPERATING_UTILITIES_MONTHLY,
} from '@/lib/operatingExpenseDefaults'

export {
  DEFAULT_OPERATING_CAPEX_PCT,
  DEFAULT_OPERATING_UTILITIES_MONTHLY,
  DEFAULT_OPERATING_LANDSCAPING_ANNUAL,
  DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
} from '@/lib/operatingExpenseDefaults'

export interface EstimateIncomeValueParams {
  monthlyRent: number
  propertyTaxesAnnual: number
  insuranceAnnual: number
  /** 0–1 */
  downPaymentPct: number
  /** Annual rate as decimal, e.g. 0.06 */
  interestRate: number
  loanTermYears: number
  /** 0–1 */
  vacancyRate: number
  /** 0–1 — maintenance % of annual gross rent */
  maintenancePct: number
  /** 0–1 — management % of annual gross rent */
  managementPct: number
  /** 0–1 — reserves/capex % of annual gross rent */
  capexPct?: number
  utilitiesAnnual?: number
  otherAnnualExpenses?: number
  /** 0–1 portion of purchase price financed by seller carry (second lien) */
  sellerFinancingPct?: number
  /** Decimal rate for seller financing (often 0.0) */
  sellerFinancingRate?: number
  /** Term or balloon years for seller financing */
  sellerFinancingTermYears?: number
  /** When provided, use this NOI instead of recomputing from rent/expenses.
   *  This keeps the Deal Gap Income Value consistent with the displayed
   *  Net Cash Flow / Cap Rate / Cash-on-Cash that come from the backend breakdown.
   */
  baseNOI?: number
}

// ---------------------------------------------------------------------------
// Backend-aligned operating expense defaults
//
// The Deal Gap bar's Income Value must subtract the SAME operating expenses
// the worksheet displays (NOI / Cap Rate / Cash-on-Cash). Otherwise the bar's
// Income Value runs higher than the worksheet implies, producing a Price Gap
// that disagrees with the cap-rate / cash-flow numbers right below it.
//
// These constants mirror `backend/app/core/defaults.OperatingDefaults` and
// must stay in sync. The backend NOI used for `data.income_value` and the
// LTR/STR/BRRRR strategy breakdowns deducts capex (5%), utilities ($100/mo),
// and pest control ($200/yr) from rent — so the client-side Income Value
// must do the same.
// ---------------------------------------------------------------------------

/** Backend's "other annual expenses" line item summed for convenience. */
const DEFAULT_OPERATING_OTHER_ANNUAL =
  DEFAULT_OPERATING_LANDSCAPING_ANNUAL + DEFAULT_OPERATING_PEST_CONTROL_ANNUAL

/** Default base utilities (annual) summed for convenience. */
const DEFAULT_OPERATING_UTILITIES_ANNUAL = DEFAULT_OPERATING_UTILITIES_MONTHLY * 12

/**
 * Solve for purchase price P where NOI covers annual debt service:
 *
 *   IncomeValue = NOI / denominator
 *   denominator = (bankLTV × bankConstant) + (sellerLTV × sellerConstant)
 *
 * Pure cash: denominator is 0 → NOI / 0.05 cap-rate floor.
 *
 * @see backend `app.core.formulas.estimate_income_value`
 */
export function estimateIncomeValue(params: EstimateIncomeValueParams): number {
  const {
    monthlyRent,
    propertyTaxesAnnual,
    insuranceAnnual,
    downPaymentPct,
    interestRate,
    loanTermYears,
    vacancyRate,
    maintenancePct,
    managementPct,
    capexPct = 0,
    utilitiesAnnual = 0,
    otherAnnualExpenses = 0,
    sellerFinancingPct = 0,
    sellerFinancingRate = 0,
    sellerFinancingTermYears = 30,
    baseNOI,
  } = params

  if (monthlyRent == null || monthlyRent < 0 || !Number.isFinite(monthlyRent)) return 0

  const pt = Math.max(0, propertyTaxesAnnual ?? 0)
  const ins = Math.max(0, insuranceAnnual ?? 0)

  const downPct = Math.min(1, Math.max(0, downPaymentPct))
  const rate = Math.min(0.3, Math.max(0, interestRate))
  const term = Math.max(1, Math.min(50, Math.round(loanTermYears)))
  const vacancy = Math.min(1, Math.max(0, vacancyRate))
  const maintPct = Math.min(1, Math.max(0, maintenancePct))
  const mgmtPct = Math.min(1, Math.max(0, managementPct))
  const capPct = Math.min(1, Math.max(0, capexPct))

  const annualGrossRent = monthlyRent * 12
  const effectiveGrossIncome = annualGrossRent * (1 - vacancy)

  const annualMaintenance = annualGrossRent * maintPct
  const annualManagement = annualGrossRent * mgmtPct
  const annualCapex = annualGrossRent * capPct
  const operatingExpenses =
    pt +
    ins +
    annualMaintenance +
    annualManagement +
    annualCapex +
    utilitiesAnnual +
    otherAnnualExpenses

  // If the caller supplied an authoritative baseNOI (from backend breakdown),
  // use it so the Income Value is consistent with the displayed cash-flow metrics.
  // Otherwise fall back to the internal calculation (used for pure live previews).
  const noi =
    typeof baseNOI === 'number' && Number.isFinite(baseNOI)
      ? baseNOI
      : effectiveGrossIncome - operatingExpenses
  if (noi <= 0) return 0

  const ltvRatio = 1 - downPct
  const sellerPct = Math.min(ltvRatio, Math.max(0, sellerFinancingPct))
  const bankLtv = Math.max(0, ltvRatio - sellerPct)

  // Helper: annual mortgage constant (payment per $1 borrowed)
  const mortgageConstant = (r: number, t: number): number => {
    const mr = r / 12
    const n = Math.max(1, Math.round(t)) * 12
    if (r <= 0) return t > 0 ? 1 / t : 0
    const compounded = (1 + mr) ** n
    if (compounded <= 1) return 0
    return ((mr * compounded) / (compounded - 1)) * 12
  }

  const bankConstant = mortgageConstant(rate, term)
  // 0% seller seconds are balloon-only — no monthly debt service in the denominator.
  const sellerConstant =
    sellerFinancingRate <= 0 ? 0 : mortgageConstant(sellerFinancingRate, sellerFinancingTermYears)

  const denominator = bankLtv * bankConstant + sellerPct * sellerConstant
  if (denominator <= 0) return Math.round(noi / 0.05)

  return Math.round(noi / denominator)
}

/**
 * Admin-resolved operating defaults that affect Income Value.
 *
 * Lets callers (Strategy / Verdict pages) thread `useDefaults().defaults.operating`
 * into `computeDealGapIncomeValue` so the live Deal Gap bar uses the same capex,
 * utilities, and pest control values the admin has configured — instead of the
 * compile-time `DEFAULT_OPERATING_*` fallbacks.
 *
 * All fields are optional; missing fields fall back to the schema defaults.
 */
export interface DealGapOperatingOverrides {
  /** 0–1 — reserves/capex % of annual gross rent (mirrors `OPERATING.capex_pct`) */
  capexPct?: number | null
  /** Base monthly utilities cost (mirrors `OPERATING.utilities_monthly`) */
  utilitiesMonthly?: number | null
  /** Annual landscaping cost (mirrors `OPERATING.landscaping_annual`) */
  landscapingAnnual?: number | null
  /** Annual pest control cost (mirrors `OPERATING.pest_control_annual`) */
  pestControlAnnual?: number | null
}

function pickFinite(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Live Income Value for the Strategy Deal Gap graph — driven by the same worksheet
 * state as DealMaker sliders (not stale `data.income_value` between API round-trips).
 *
 * Pass `operatingOverrides` (typically `defaults.operating` from `useDefaults()`) to honor
 * admin-configured capex / utilities / pest control.
 */
export function computeDealGapIncomeValue(
  strategyType: StrategyType,
  ws: AnyStrategyState,
  operatingOverrides?: DealGapOperatingOverrides | null,
  /** Authoritative NOI from backend breakdown. When provided, the Income Value
   *  uses this NOI (which matches the displayed Net Cash Flow / Cap Rate)
   *  instead of re-computing a potentially different expense set.
   */
  authoritativeNOI?: number | null,
): number {
  const capexPct = pickFinite(operatingOverrides?.capexPct, DEFAULT_OPERATING_CAPEX_PCT)
  const baseUtilitiesAnnual =
    pickFinite(operatingOverrides?.utilitiesMonthly, DEFAULT_OPERATING_UTILITIES_MONTHLY) * 12
  const landscapingAnnual = pickFinite(
    operatingOverrides?.landscapingAnnual,
    DEFAULT_OPERATING_LANDSCAPING_ANNUAL,
  )
  const pestControlAnnual = pickFinite(
    operatingOverrides?.pestControlAnnual,
    DEFAULT_OPERATING_PEST_CONTROL_ANNUAL,
  )
  const otherAnnualBase = landscapingAnnual + pestControlAnnual

  switch (strategyType) {
    case 'ltr': {
      const s = ws as LTRDealMakerState
      const sellerFinancingPct =
        (s.sellerFinancingAmount ?? 0) / Math.max(1, s.buyPrice || 1)
      return estimateIncomeValue({
        monthlyRent: s.monthlyRent,
        propertyTaxesAnnual: s.annualPropertyTax,
        insuranceAnnual: s.annualInsurance,
        downPaymentPct: s.downPaymentPercent,
        interestRate: s.interestRate,
        loanTermYears: s.loanTermYears,
        vacancyRate: s.vacancyRate,
        maintenancePct: s.maintenanceRate,
        managementPct: s.managementRate ?? 0,
        capexPct: s.capexRate ?? capexPct,
        utilitiesAnnual:
          (s.utilitiesMonthly ??
            pickFinite(operatingOverrides?.utilitiesMonthly, DEFAULT_OPERATING_UTILITIES_MONTHLY)) *
          12,
        otherAnnualExpenses:
          (s.monthlyHoa ?? 0) * 12 +
          pickFinite(s.pestControlAnnual, pestControlAnnual) +
          landscapingAnnual,
        sellerFinancingPct,
        sellerFinancingRate: s.sellerInterestRate ?? 0,
        sellerFinancingTermYears: s.sellerTermYears ?? 30,
        baseNOI: authoritativeNOI ?? undefined,
      })
    }
    case 'str': {
      const s = ws as STRDealMakerState
      const monthlyRentEq = (s.averageDailyRate * 365 * s.occupancyRate) / 12
      const platformAnnual = monthlyRentEq * 12 * (s.platformFeeRate ?? 0)
      const sellerFinancingPct =
        (s.sellerFinancingAmount ?? 0) / Math.max(1, s.buyPrice || 1)
      return estimateIncomeValue({
        monthlyRent: monthlyRentEq,
        propertyTaxesAnnual: s.annualPropertyTax,
        insuranceAnnual: s.annualInsurance,
        downPaymentPct: s.downPaymentPercent,
        interestRate: s.interestRate,
        loanTermYears: s.loanTermYears,
        vacancyRate: 0,
        maintenancePct: s.maintenanceRate,
        managementPct: s.strManagementRate,
        // Backend `_calculate_str_strategy` deducts base utilities, capex,
        // platform fees, supplies, and HOA from STR revenue. Mirror that here
        // so the bar agrees with the worksheet's NOI / Cap Rate.
        capexPct,
        utilitiesAnnual: baseUtilitiesAnnual + (s.additionalUtilitiesMonthly ?? 0) * 12,
        otherAnnualExpenses:
          (s.monthlyHoa ?? 0) * 12 + platformAnnual + (s.suppliesMonthly ?? 0) * 12,
        sellerFinancingPct,
        sellerFinancingRate: s.sellerInterestRate ?? 0,
        sellerFinancingTermYears: s.sellerTermYears ?? 30,
        baseNOI: authoritativeNOI ?? undefined,
      })
    }
    case 'brrrr': {
      const s = ws as BRRRRDealMakerState
      const sellerFinancingPct =
        (s.sellerFinancingAmount ?? 0) / Math.max(1, s.purchasePrice || 1)
      return estimateIncomeValue({
        monthlyRent: s.postRehabMonthlyRent,
        propertyTaxesAnnual: s.annualPropertyTax,
        insuranceAnnual: s.annualInsurance,
        downPaymentPct: Math.min(1, Math.max(0, 1 - s.refinanceLtv)),
        interestRate: s.refinanceInterestRate,
        loanTermYears: s.refinanceTermYears,
        vacancyRate: s.vacancyRate,
        maintenancePct: s.maintenanceRate,
        managementPct: s.managementRate,
        // Backend `_calculate_brrrr_strategy` (verdict response NOI) deducts
        // capex, utilities, and pest control. Match here so the bar's Income
        // Value lines up with the worksheet Cap Rate.
        capexPct,
        utilitiesAnnual: baseUtilitiesAnnual,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12 + otherAnnualBase,
        sellerFinancingPct,
        sellerFinancingRate: s.sellerInterestRate ?? 0,
        sellerFinancingTermYears: s.sellerTermYears ?? 30,
        baseNOI: authoritativeNOI ?? undefined,
      })
    }
    case 'house_hack': {
      const s = ws as HouseHackDealMakerState
      const rented = Math.max(0, s.totalUnits - s.ownerOccupiedUnits)
      const monthlyRentEq = s.avgRentPerUnit * rented
      const sellerFinancingPct =
        (s.sellerFinancingAmount ?? 0) / Math.max(1, s.purchasePrice || 1)
      // House Hack pulls capex + utilities directly from worksheet state because
      // those are user-editable sliders on this strategy (unlike LTR/STR/BRRRR).
      return estimateIncomeValue({
        monthlyRent: monthlyRentEq,
        propertyTaxesAnnual: s.annualPropertyTax,
        insuranceAnnual: s.annualInsurance,
        downPaymentPct: s.downPaymentPercent,
        interestRate: s.interestRate,
        loanTermYears: s.loanTermYears,
        vacancyRate: s.vacancyRate,
        maintenancePct: s.maintenanceRate,
        managementPct: 0,
        capexPct: s.capexRate,
        utilitiesAnnual: (s.utilitiesMonthly ?? 0) * 12,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12,
        sellerFinancingPct,
        sellerFinancingRate: s.sellerInterestRate ?? 0,
        sellerFinancingTermYears: s.sellerTermYears ?? 30,
        baseNOI: authoritativeNOI ?? undefined,
      })
    }
    case 'flip':
    case 'wholesale':
      return 0
    default:
      return 0
  }
}
