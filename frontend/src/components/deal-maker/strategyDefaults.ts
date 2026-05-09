/**
 * Strategy state initializers for unsaved properties.
 *
 * Extracted from DealMakerScreen to keep the main component focused on
 * rendering. Each function builds an initial state for a strategy using
 * the property data (price, rent, taxes, etc.) merged with the defaults
 * exported from `./types`, optionally overlaid with admin-resolved
 * `AllAssumptions` (from `useDefaults()`).
 *
 * Resolution order (highest priority wins):
 *   1. Property data        (`property.rent`, `property.propertyTax`, etc.)
 *   2. Admin defaults       (`assumptions.flip.hard_money_rate`, etc.)
 *   3. Hardcoded fallback   (`DEFAULT_*_DEAL_MAKER_STATE`)
 *
 * Hardcoded fallback values are used only during the brief window before
 * `useDefaults()` resolves; once admin values arrive, callers re-seed via
 * these builders with `assumptions` provided.
 */

import {
  StrategyType,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  FlipDealMakerState,
  HouseHackDealMakerState,
  WholesaleDealMakerState,
  AnyStrategyState,
  DealMakerPropertyData,
  DEFAULT_STR_DEAL_MAKER_STATE,
  DEFAULT_BRRRR_DEAL_MAKER_STATE,
  DEFAULT_FLIP_DEAL_MAKER_STATE,
  DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
  DEFAULT_SELLER_FINANCING_FIELDS,
} from './types'
import { OPERATING_INSURANCE_PCT } from '@/lib/insurance'
import { DEFAULT_REQUIRED_EQUITY_YIELD } from '@/utils/estimateIncomeValue'
import type { AllAssumptions } from '@/stores/index'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Resolve a numeric value from admin assumptions or fall back. `null` /
 * `undefined` admin values defer to the fallback so partial responses
 * (e.g. legacy persisted store missing a field) still render correctly.
 */
function pick<T extends number | undefined>(adminValue: T | null | undefined, fallback: number): number {
  return typeof adminValue === 'number' && Number.isFinite(adminValue) ? adminValue : fallback
}

// ------------------------------------------------------------------
// Individual strategy initializers
// ------------------------------------------------------------------

export function buildLTRState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): LTRDealMakerState {
  const price = listPrice ?? property.price ?? 350000
  const f = assumptions?.financing
  const o = assumptions?.operating

  return {
    buyPrice: price,
    downPaymentPercent: pick(f?.down_payment_pct, 0.20),
    closingCostsPercent: pick(f?.closing_costs_pct, 0.03),
    interestRate: pick(f?.interest_rate, 0.06),
    loanTermYears: pick(f?.loan_term_years, 30),
    ...DEFAULT_SELLER_FINANCING_FIELDS,
    rehabBudget: 0,
    arv: price * 1.0,
    monthlyRent: property.rent ?? 2800,
    otherIncome: 0,
    vacancyRate: pick(o?.vacancy_rate, 0.01),
    maintenanceRate: pick(o?.maintenance_pct, 0.05),
    managementRate: pick(o?.property_management_pct, 0.00),
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance:
      property.insurance ??
      Math.round(price * pick(o?.insurance_pct, OPERATING_INSURANCE_PCT)),
    monthlyHoa: property.monthlyHoa ?? 0,
    requiredEquityYield: pick(o?.required_equity_yield, DEFAULT_REQUIRED_EQUITY_YIELD),
  }
}

export function buildSTRState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): STRDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  const f = assumptions?.financing
  const o = assumptions?.operating
  const s = assumptions?.str

  return {
    ...DEFAULT_STR_DEAL_MAKER_STATE,
    buyPrice: basePrice,
    downPaymentPercent: pick(f?.down_payment_pct, DEFAULT_STR_DEAL_MAKER_STATE.downPaymentPercent),
    closingCostsPercent: pick(f?.closing_costs_pct, DEFAULT_STR_DEAL_MAKER_STATE.closingCostsPercent),
    interestRate: pick(f?.interest_rate, DEFAULT_STR_DEAL_MAKER_STATE.interestRate),
    loanTermYears: pick(f?.loan_term_years, DEFAULT_STR_DEAL_MAKER_STATE.loanTermYears),
    arv: basePrice * 1.0,
    furnitureSetupCost: pick(s?.furniture_setup_cost, DEFAULT_STR_DEAL_MAKER_STATE.furnitureSetupCost),
    cleaningFeeRevenue: pick(s?.cleaning_fee_revenue, DEFAULT_STR_DEAL_MAKER_STATE.cleaningFeeRevenue),
    avgLengthOfStayDays: pick(s?.avg_length_of_stay_days, DEFAULT_STR_DEAL_MAKER_STATE.avgLengthOfStayDays),
    platformFeeRate: pick(s?.platform_fees_pct, DEFAULT_STR_DEAL_MAKER_STATE.platformFeeRate),
    strManagementRate: pick(s?.str_management_pct, DEFAULT_STR_DEAL_MAKER_STATE.strManagementRate),
    cleaningCostPerTurnover: pick(
      s?.cleaning_cost_per_turnover,
      DEFAULT_STR_DEAL_MAKER_STATE.cleaningCostPerTurnover,
    ),
    suppliesMonthly: pick(s?.supplies_monthly, DEFAULT_STR_DEAL_MAKER_STATE.suppliesMonthly),
    additionalUtilitiesMonthly: pick(
      s?.additional_utilities_monthly,
      DEFAULT_STR_DEAL_MAKER_STATE.additionalUtilitiesMonthly,
    ),
    maintenanceRate: pick(o?.maintenance_pct, DEFAULT_STR_DEAL_MAKER_STATE.maintenanceRate),
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance:
      property.insurance ??
      Math.round(basePrice * pick(o?.insurance_pct, OPERATING_INSURANCE_PCT)),
    monthlyHoa: property.monthlyHoa ?? 0,
    requiredEquityYield: pick(o?.required_equity_yield, DEFAULT_REQUIRED_EQUITY_YIELD),
  }
}

export function buildBRRRRState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): BRRRRDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  const discountedPrice = basePrice * 0.85
  const f = assumptions?.financing
  const o = assumptions?.operating
  const b = assumptions?.brrrr
  const fl = assumptions?.flip
  const r = assumptions?.rehab

  return {
    ...DEFAULT_BRRRR_DEAL_MAKER_STATE,
    purchasePrice: discountedPrice,
    buyDiscountPct: pick(b?.buy_discount_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.buyDiscountPct),
    downPaymentPercent: pick(f?.down_payment_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.downPaymentPercent),
    closingCostsPercent: pick(f?.closing_costs_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.closingCostsPercent),
    // BRRRR's "Phase 1" hard money rate shares the Flip hard-money default (admin field).
    hardMoneyRate: pick(fl?.hard_money_rate, DEFAULT_BRRRR_DEAL_MAKER_STATE.hardMoneyRate),
    contingencyPct: pick(r?.contingency_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.contingencyPct),
    holdingPeriodMonths: pick(r?.holding_period_months, DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingPeriodMonths),
    arv: basePrice * 1.15,
    postRehabMonthlyRent: property.rent ? property.rent * 1.1 : 2800,
    postRehabRentIncreasePct: pick(
      b?.post_rehab_rent_increase_pct,
      DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabRentIncreasePct,
    ),
    refinanceLtv: pick(b?.refinance_ltv, DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceLtv),
    refinanceInterestRate: pick(
      b?.refinance_interest_rate,
      DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceInterestRate,
    ),
    refinanceTermYears: pick(b?.refinance_term_years, DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceTermYears),
    refinanceClosingCostsPct: pick(
      b?.refinance_closing_costs_pct,
      DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceClosingCostsPct,
    ),
    vacancyRate: pick(o?.vacancy_rate, DEFAULT_BRRRR_DEAL_MAKER_STATE.vacancyRate),
    maintenanceRate: pick(o?.maintenance_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.maintenanceRate),
    managementRate: pick(o?.property_management_pct, DEFAULT_BRRRR_DEAL_MAKER_STATE.managementRate),
    annualPropertyTax: property.propertyTax || 4200,
    annualInsurance:
      property.insurance ??
      Math.round(discountedPrice * pick(o?.insurance_pct, OPERATING_INSURANCE_PCT)),
    monthlyHoa: property.monthlyHoa ?? 0,
    requiredEquityYield: pick(o?.required_equity_yield, DEFAULT_REQUIRED_EQUITY_YIELD),
  }
}

export function buildFlipState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): FlipDealMakerState {
  const basePrice = listPrice ?? property.price ?? 350000
  const fl = assumptions?.flip
  const f = assumptions?.financing
  const r = assumptions?.rehab
  // Use admin's purchase_discount_pct (default 20%) to seed the discounted purchase price.
  const purchaseDiscountPct = pick(fl?.purchase_discount_pct, DEFAULT_FLIP_DEAL_MAKER_STATE.purchaseDiscountPct)
  const discountedPrice = basePrice * (1 - purchaseDiscountPct)
  const monthlyHoa = property.monthlyHoa ?? 0

  return {
    ...DEFAULT_FLIP_DEAL_MAKER_STATE,
    purchasePrice: discountedPrice,
    purchaseDiscountPct,
    closingCostsPercent: pick(f?.closing_costs_pct, DEFAULT_FLIP_DEAL_MAKER_STATE.closingCostsPercent),
    hardMoneyLtv: pick(fl?.hard_money_ltv, DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyLtv),
    hardMoneyRate: pick(fl?.hard_money_rate, DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyRate),
    contingencyPct: pick(r?.contingency_pct, DEFAULT_FLIP_DEAL_MAKER_STATE.contingencyPct),
    rehabTimeMonths: pick(r?.holding_period_months, DEFAULT_FLIP_DEAL_MAKER_STATE.rehabTimeMonths),
    sellingCostsPct: pick(fl?.selling_costs_pct, DEFAULT_FLIP_DEAL_MAKER_STATE.sellingCostsPct),
    arv: basePrice * 1.10,
    // Holding costs already encode taxes + insurance + maintenance buffer.
    // Add HOA so the slider total reflects the real monthly carry.
    holdingCostsMonthly:
      (property.propertyTax || 4200) / 12 +
      (property.insurance ?? discountedPrice * OPERATING_INSURANCE_PCT) / 12 +
      200 +
      monthlyHoa,
    monthlyHoa,
  }
}

export function buildHouseHackState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): HouseHackDealMakerState {
  const basePrice = listPrice ?? property.price ?? 400000
  const hh = assumptions?.house_hack
  const f = assumptions?.financing
  const o = assumptions?.operating

  return {
    ...DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
    purchasePrice: basePrice,
    ownerUnitMarketRent: property.rent
      ? Math.round(property.rent / 4)
      : 1500,
    avgRentPerUnit: property.rent ? Math.round(property.rent / 4) : 1500,
    downPaymentPercent: pick(hh?.fha_down_payment_pct, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.downPaymentPercent),
    interestRate: pick(hh?.fha_interest_rate, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.interestRate),
    loanTermYears: pick(f?.loan_term_years, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.loanTermYears),
    pmiRate: pick(hh?.fha_mip_rate, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.pmiRate),
    closingCostsPercent: pick(f?.closing_costs_pct, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.closingCostsPercent),
    vacancyRate: pick(o?.vacancy_rate, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.vacancyRate),
    maintenanceRate: pick(o?.maintenance_pct, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.maintenanceRate),
    capexRate: pick(o?.capex_pct, DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.capexRate),
    annualPropertyTax: property.propertyTax || 6000,
    annualInsurance:
      property.insurance ??
      Math.round(basePrice * pick(o?.insurance_pct, OPERATING_INSURANCE_PCT)),
    monthlyHoa: property.monthlyHoa ?? 0,
    requiredEquityYield: pick(o?.required_equity_yield, DEFAULT_REQUIRED_EQUITY_YIELD),
  }
}

export function buildWholesaleState(
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): WholesaleDealMakerState {
  const basePrice = listPrice ?? property.price ?? 300000
  const w = assumptions?.wholesale
  const estimatedArv = basePrice * 1.15
  const estimatedRepairs = estimatedArv * 0.15
  const mao = estimatedArv * 0.7 - estimatedRepairs
  const contractPrice = Math.min(basePrice * 0.85, mao * 0.95)

  return {
    ...DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
    arv: estimatedArv,
    estimatedRepairs,
    contractPrice,
    earnestMoney: pick(w?.earnest_money_deposit, DEFAULT_WHOLESALE_DEAL_MAKER_STATE.earnestMoney),
    daysToClose: pick(w?.days_to_close, DEFAULT_WHOLESALE_DEAL_MAKER_STATE.daysToClose),
    assignmentFee: pick(w?.assignment_fee, DEFAULT_WHOLESALE_DEAL_MAKER_STATE.assignmentFee),
    marketingCosts: pick(w?.marketing_costs, DEFAULT_WHOLESALE_DEAL_MAKER_STATE.marketingCosts),
    squareFootage: property.sqft || 1500,
    monthlyHoa: property.monthlyHoa ?? 0,
  }
}

// ------------------------------------------------------------------
// Unified initializer — used by DealMakerScreen
// ------------------------------------------------------------------

export function buildInitialState(
  strategy: StrategyType,
  property: DealMakerPropertyData,
  listPrice?: number,
  assumptions?: AllAssumptions | null,
): AnyStrategyState {
  switch (strategy) {
    case 'str':
      return buildSTRState(property, listPrice, assumptions)
    case 'brrrr':
      return buildBRRRRState(property, listPrice, assumptions)
    case 'flip':
      return buildFlipState(property, listPrice, assumptions)
    case 'house_hack':
      return buildHouseHackState(property, listPrice, assumptions)
    case 'wholesale':
      return buildWholesaleState(property, listPrice, assumptions)
    case 'ltr':
    default:
      return buildLTRState(property, listPrice, assumptions)
  }
}
