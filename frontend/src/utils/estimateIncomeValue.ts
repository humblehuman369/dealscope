/**
 * Income Value — purchase price at which annual cash flow ≈ $0.
 * Port of `app.core.formulas.estimate_income_value` for client-side Deal Gap UX.
 */

import type {
  StrategyType,
  AnyStrategyState,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  HouseHackDealMakerState,
} from '@/components/deal-maker/types'

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
  /** Annual hurdle on equity for WACC (e.g. 0.08); pure cash uses this alone */
  requiredEquityYield?: number
  /** 0–1 — reserves/capex % of annual gross rent */
  capexPct?: number
  utilitiesAnnual?: number
  otherAnnualExpenses?: number
}

/** Default matches backend ``OPERATING.required_equity_yield`` */
export const DEFAULT_REQUIRED_EQUITY_YIELD = 0.08

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
    requiredEquityYield = DEFAULT_REQUIRED_EQUITY_YIELD,
    capexPct = 0,
    utilitiesAnnual = 0,
    otherAnnualExpenses = 0,
  } = params

  if (monthlyRent == null || monthlyRent < 0 || !Number.isFinite(monthlyRent)) return 0

  const pt = Math.max(0, propertyTaxesAnnual ?? 0)
  const ins = Math.max(0, insuranceAnnual ?? 0)

  const downPct = Math.min(1, Math.max(0, downPaymentPct))
  const equityYield = Math.min(0.5, Math.max(0.001, requiredEquityYield))
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

  const noi = effectiveGrossIncome - operatingExpenses
  if (noi <= 0) return 0

  const monthlyRate = rate / 12
  const numPayments = term * 12
  const ltvRatio = 1 - downPct

  let mortgageConstantAnnual: number
  if (rate > 0) {
    const compounded = (1 + monthlyRate) ** numPayments
    if (compounded <= 1) return 0
    mortgageConstantAnnual = ((monthlyRate * compounded) / (compounded - 1)) * 12
  } else {
    mortgageConstantAnnual = term > 0 ? 1 / term : 0
  }

  const debtCost = ltvRatio * mortgageConstantAnnual
  const equityCost = downPct * equityYield
  const wacc = debtCost + equityCost
  if (wacc <= 0) return 0

  return Math.round(noi / wacc)
}

/**
 * Live Income Value for the Strategy Deal Gap graph — driven by the same worksheet
 * state as DealMaker sliders (not stale `data.income_value` between API round-trips).
 */
export function computeDealGapIncomeValue(
  strategyType: StrategyType,
  ws: AnyStrategyState,
): number {
  switch (strategyType) {
    case 'ltr': {
      const s = ws as LTRDealMakerState
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
        requiredEquityYield: s.requiredEquityYield ?? DEFAULT_REQUIRED_EQUITY_YIELD,
        capexPct: 0,
        utilitiesAnnual: 0,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12,
      })
    }
    case 'str': {
      const s = ws as STRDealMakerState
      const monthlyRentEq = (s.averageDailyRate * 365 * s.occupancyRate) / 12
      const platformAnnual = monthlyRentEq * 12 * (s.platformFeeRate ?? 0)
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
        requiredEquityYield: s.requiredEquityYield ?? DEFAULT_REQUIRED_EQUITY_YIELD,
        capexPct: 0,
        utilitiesAnnual: (s.additionalUtilitiesMonthly ?? 0) * 12,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12 + platformAnnual + (s.suppliesMonthly ?? 0) * 12,
      })
    }
    case 'brrrr': {
      const s = ws as BRRRRDealMakerState
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
        requiredEquityYield: s.requiredEquityYield ?? DEFAULT_REQUIRED_EQUITY_YIELD,
        capexPct: 0,
        utilitiesAnnual: 0,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12,
      })
    }
    case 'house_hack': {
      const s = ws as HouseHackDealMakerState
      const rented = Math.max(0, s.totalUnits - s.ownerOccupiedUnits)
      const monthlyRentEq = s.avgRentPerUnit * rented
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
        requiredEquityYield: s.requiredEquityYield ?? DEFAULT_REQUIRED_EQUITY_YIELD,
        capexPct: s.capexRate,
        utilitiesAnnual: (s.utilitiesMonthly ?? 0) * 12,
        otherAnnualExpenses: (s.monthlyHoa ?? 0) * 12,
      })
    }
    case 'flip':
    case 'wholesale':
      return 0
    default:
      return 0
  }
}
