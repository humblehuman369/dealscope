/**
 * Maps Strategy page worksheet state → DealMakerRecord PATCH payload.
 * Field names match DealMakerScreen.updateState / backend DealMakerRecordUpdate.
 */

import type { DealMakerUpdate } from '@/stores/dealMakerStore'
import type {
  AnyStrategyState,
  StrategyType,
  LTRDealMakerState,
  STRDealMakerState,
  BRRRRDealMakerState,
  FlipDealMakerState,
  HouseHackDealMakerState,
  WholesaleDealMakerState,
} from '@/features/deal-maker/components/types'

function finiteNum(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

function sharedSellerFields(state: {
  sellerFinancingAmount?: number
  sellerInterestRate?: number
  sellerTermYears?: number
}): Pick<
  DealMakerUpdate,
  'seller_carry_amount' | 'seller_carry_rate' | 'seller_carry_term_years'
> {
  const out: Pick<
    DealMakerUpdate,
    'seller_carry_amount' | 'seller_carry_rate' | 'seller_carry_term_years'
  > = {}
  const amt = finiteNum(state.sellerFinancingAmount)
  const rate = finiteNum(state.sellerInterestRate)
  const term = finiteNum(state.sellerTermYears)
  if (amt != null) out.seller_carry_amount = amt
  if (rate != null) out.seller_carry_rate = rate
  if (term != null) out.seller_carry_term_years = Math.round(term)
  return out
}

function ltrStateToUpdate(state: LTRDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'ltr',
    buy_price: finiteNum(state.buyPrice),
    down_payment_pct: finiteNum(state.downPaymentPercent),
    closing_costs_pct: finiteNum(state.closingCostsPercent),
    interest_rate: finiteNum(state.interestRate),
    loan_term_years: finiteNum(state.loanTermYears)
      ? Math.round(state.loanTermYears)
      : undefined,
    rehab_budget: finiteNum(state.rehabBudget),
    arv: finiteNum(state.arv),
    monthly_rent: finiteNum(state.monthlyRent),
    other_income: finiteNum(state.otherIncome),
    vacancy_rate: finiteNum(state.vacancyRate),
    maintenance_pct: finiteNum(state.maintenanceRate),
    management_pct: finiteNum(state.managementRate),
    capex_pct: finiteNum(state.capexRate),
    annual_property_tax: finiteNum(state.annualPropertyTax),
    annual_insurance: finiteNum(state.annualInsurance),
    monthly_hoa: finiteNum(state.monthlyHoa),
    monthly_utilities: finiteNum(state.utilitiesMonthly),
    ...sharedSellerFields(state),
  }
}

function strStateToUpdate(state: STRDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'str',
    buy_price: finiteNum(state.buyPrice),
    down_payment_pct: finiteNum(state.downPaymentPercent),
    closing_costs_pct: finiteNum(state.closingCostsPercent),
    interest_rate: finiteNum(state.interestRate),
    loan_term_years: finiteNum(state.loanTermYears)
      ? Math.round(state.loanTermYears)
      : undefined,
    rehab_budget: finiteNum(state.rehabBudget),
    arv: finiteNum(state.arv),
    furniture_setup_cost: finiteNum(state.furnitureSetupCost),
    average_daily_rate: finiteNum(state.averageDailyRate),
    occupancy_rate: finiteNum(state.occupancyRate),
    cleaning_fee_revenue: finiteNum(state.cleaningFeeRevenue),
    avg_length_of_stay_days: finiteNum(state.avgLengthOfStayDays)
      ? Math.round(state.avgLengthOfStayDays)
      : undefined,
    platform_fee_rate: finiteNum(state.platformFeeRate),
    str_management_rate: finiteNum(state.strManagementRate),
    cleaning_cost_per_turnover: finiteNum(state.cleaningCostPerTurnover),
    supplies_monthly: finiteNum(state.suppliesMonthly),
    additional_utilities_monthly: finiteNum(state.additionalUtilitiesMonthly),
    maintenance_pct: finiteNum(state.maintenanceRate),
    annual_property_tax: finiteNum(state.annualPropertyTax),
    annual_insurance: finiteNum(state.annualInsurance),
    monthly_hoa: finiteNum(state.monthlyHoa),
    ...sharedSellerFields(state),
  }
}

function brrrrStateToUpdate(state: BRRRRDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'brrrr',
    buy_price: finiteNum(state.purchasePrice),
    buy_discount_pct: finiteNum(state.buyDiscountPct),
    down_payment_pct: finiteNum(state.downPaymentPercent),
    closing_costs_pct: finiteNum(state.closingCostsPercent),
    hard_money_rate: finiteNum(state.hardMoneyRate),
    rehab_budget: finiteNum(state.rehabBudget),
    contingency_pct: finiteNum(state.contingencyPct),
    holding_period_months: finiteNum(state.holdingPeriodMonths)
      ? Math.round(state.holdingPeriodMonths)
      : undefined,
    holding_costs_monthly: finiteNum(state.holdingCostsMonthly),
    arv: finiteNum(state.arv),
    post_rehab_monthly_rent: finiteNum(state.postRehabMonthlyRent),
    post_rehab_rent_increase_pct: finiteNum(state.postRehabRentIncreasePct),
    refinance_ltv: finiteNum(state.refinanceLtv),
    refinance_interest_rate: finiteNum(state.refinanceInterestRate),
    refinance_term_years: finiteNum(state.refinanceTermYears)
      ? Math.round(state.refinanceTermYears)
      : undefined,
    refinance_closing_costs_pct: finiteNum(state.refinanceClosingCostsPct),
    vacancy_rate: finiteNum(state.vacancyRate),
    maintenance_pct: finiteNum(state.maintenanceRate),
    management_pct: finiteNum(state.managementRate),
    annual_property_tax: finiteNum(state.annualPropertyTax),
    annual_insurance: finiteNum(state.annualInsurance),
    monthly_hoa: finiteNum(state.monthlyHoa),
    ...sharedSellerFields(state),
  }
}

function flipStateToUpdate(state: FlipDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'flip',
    buy_price: finiteNum(state.purchasePrice),
    purchase_discount_pct: finiteNum(state.purchaseDiscountPct),
    closing_costs_pct: finiteNum(state.closingCostsPercent),
    financing_type: state.financingType,
    hard_money_ltv: finiteNum(state.hardMoneyLtv),
    hard_money_rate: finiteNum(state.hardMoneyRate),
    loan_points: finiteNum(state.loanPoints),
    rehab_budget: finiteNum(state.rehabBudget),
    contingency_pct: finiteNum(state.contingencyPct),
    rehab_time_months: finiteNum(state.rehabTimeMonths)
      ? Math.round(state.rehabTimeMonths)
      : undefined,
    arv: finiteNum(state.arv),
    holding_costs_monthly: finiteNum(state.holdingCostsMonthly),
    days_on_market: finiteNum(state.daysOnMarket)
      ? Math.round(state.daysOnMarket)
      : undefined,
    selling_costs_pct: finiteNum(state.sellingCostsPct),
    capital_gains_rate: finiteNum(state.capitalGainsRate),
    monthly_hoa: finiteNum(state.monthlyHoa),
    ...sharedSellerFields(state),
  }
}

function houseHackStateToUpdate(state: HouseHackDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'house_hack',
    buy_price: finiteNum(state.purchasePrice),
    total_units: finiteNum(state.totalUnits) ? Math.round(state.totalUnits) : undefined,
    owner_occupied_units: finiteNum(state.ownerOccupiedUnits)
      ? Math.round(state.ownerOccupiedUnits)
      : undefined,
    owner_unit_market_rent: finiteNum(state.ownerUnitMarketRent),
    loan_type: state.loanType,
    down_payment_pct: finiteNum(state.downPaymentPercent),
    interest_rate: finiteNum(state.interestRate),
    loan_term_years: finiteNum(state.loanTermYears)
      ? Math.round(state.loanTermYears)
      : undefined,
    pmi_rate: finiteNum(state.pmiRate),
    closing_costs_pct: finiteNum(state.closingCostsPercent),
    avg_rent_per_unit: finiteNum(state.avgRentPerUnit),
    vacancy_rate: finiteNum(state.vacancyRate),
    current_housing_payment: finiteNum(state.currentHousingPayment),
    annual_property_tax: finiteNum(state.annualPropertyTax),
    annual_insurance: finiteNum(state.annualInsurance),
    monthly_hoa: finiteNum(state.monthlyHoa),
    utilities_monthly: finiteNum(state.utilitiesMonthly),
    maintenance_pct: finiteNum(state.maintenanceRate),
    capex_rate: finiteNum(state.capexRate),
    ...sharedSellerFields(state),
  }
}

function wholesaleStateToUpdate(state: WholesaleDealMakerState): DealMakerUpdate {
  return {
    strategy_type: 'wholesale',
    arv: finiteNum(state.arv),
    estimated_repairs: finiteNum(state.estimatedRepairs),
    contract_price: finiteNum(state.contractPrice),
    buy_price: finiteNum(state.contractPrice),
    earnest_money: finiteNum(state.earnestMoney),
    inspection_period_days: finiteNum(state.inspectionPeriodDays)
      ? Math.round(state.inspectionPeriodDays)
      : undefined,
    days_to_close: finiteNum(state.daysToClose) ? Math.round(state.daysToClose) : undefined,
    assignment_fee: finiteNum(state.assignmentFee),
    marketing_costs: finiteNum(state.marketingCosts),
    wholesale_closing_costs: finiteNum(state.closingCosts),
    monthly_hoa: finiteNum(state.monthlyHoa),
    ...sharedSellerFields(state),
  }
}

/** Build a PATCH body from the live Strategy worksheet state. */
export function strategyStateToDealMakerUpdate(
  strategyType: StrategyType,
  state: AnyStrategyState,
): DealMakerUpdate {
  switch (strategyType) {
    case 'str':
      return strStateToUpdate(state as STRDealMakerState)
    case 'brrrr':
      return brrrrStateToUpdate(state as BRRRRDealMakerState)
    case 'flip':
      return flipStateToUpdate(state as FlipDealMakerState)
    case 'house_hack':
      return houseHackStateToUpdate(state as HouseHackDealMakerState)
    case 'wholesale':
      return wholesaleStateToUpdate(state as WholesaleDealMakerState)
    case 'ltr':
    default:
      return ltrStateToUpdate(state as LTRDealMakerState)
  }
}
