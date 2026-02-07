/**
 * BRRRR Worksheet Calculator Hook
 *
 * Thin wrapper around the unified useWorksheetCalculator.
 * All shared logic (debouncing, API calls, error handling) lives there.
 * This file defines the BRRRR-specific configuration only.
 */

import { SavedProperty } from '@/types/savedProperty'
import { calculateInitialPurchasePrice } from '@/lib/iqTarget'
import {
  useWorksheetCalculator,
  WorksheetStrategyConfig,
} from './useWorksheetCalculator'

// =============================================================================
// FALLBACK DEFAULTS — Must match backend/app/core/defaults.py
// =============================================================================
const FALLBACK_INSURANCE_PCT = 0.01
const FALLBACK_REHAB_BUDGET_PCT = 0.05
const FALLBACK_REFI_CLOSING_COSTS_PCT = 0.03
const FALLBACK_VACANCY_RATE = 0.01
const FALLBACK_MANAGEMENT_PCT = 0.00
const FALLBACK_MAINTENANCE_PCT = 0.05
const FALLBACK_REFI_INTEREST_RATE = 0.06
const FALLBACK_REFI_LTV = 0.75

// =============================================================================
// Types
// =============================================================================

export interface BrrrrWorksheetInputs {
  purchase_price: number
  purchase_costs: number
  rehab_costs: number
  arv: number
  sqft?: number
  monthly_rent: number
  property_taxes_annual: number
  insurance_annual: number
  utilities_monthly: number
  down_payment_pct: number
  loan_to_cost_pct: number
  interest_rate: number
  points: number
  holding_months: number
  refi_ltv: number
  refi_interest_rate: number
  refi_loan_term: number
  refi_closing_costs: number
  vacancy_rate: number
  property_management_pct: number
  maintenance_pct: number
  capex_pct: number
}

export interface BrrrrWorksheetResult {
  purchase_price: number
  purchase_costs: number
  total_rehab: number
  holding_costs: number
  holding_interest: number
  holding_taxes: number
  holding_insurance: number
  holding_utilities: number
  all_in_cost: number
  loan_to_cost_pct: number
  loan_amount: number
  cash_to_close: number
  points_cost: number
  total_cash_invested: number
  refinance_loan_amount: number
  cash_out: number
  cash_left_in_deal: number
  refinance_costs: number
  payoff_old_loan: number
  annual_gross_rent: number
  vacancy_loss: number
  effective_income: number
  property_taxes: number
  insurance: number
  property_management: number
  maintenance: number
  capex: number
  total_expenses: number
  noi: number
  monthly_cash_flow: number
  annual_cash_flow: number
  annual_debt_service: number
  cap_rate_arv: number
  cash_on_cash_return: number
  return_on_equity: number
  total_roi_year1: number
  equity_position: number
  all_in_pct_arv: number
  infinite_roi_achieved: boolean
  deal_score: number
  arv: number
  arv_psf: number
  price_psf: number
  rehab_psf: number
  equity_created: number
}

// =============================================================================
// Default inputs
// =============================================================================

const defaultInputs: BrrrrWorksheetInputs = {
  purchase_price: 285000,
  purchase_costs: 8550,
  rehab_costs: 425000 * FALLBACK_REHAB_BUDGET_PCT,
  arv: 425000,
  monthly_rent: 2800,
  property_taxes_annual: 5700,
  insurance_annual: 285000 * FALLBACK_INSURANCE_PCT,
  utilities_monthly: 100,
  down_payment_pct: 0.1,
  loan_to_cost_pct: 90,
  interest_rate: 0.12,
  points: 2,
  holding_months: 4,
  refi_ltv: FALLBACK_REFI_LTV,
  refi_interest_rate: FALLBACK_REFI_INTEREST_RATE,
  refi_loan_term: 30,
  refi_closing_costs: 425000 * FALLBACK_REFI_LTV * FALLBACK_REFI_CLOSING_COSTS_PCT,
  vacancy_rate: FALLBACK_VACANCY_RATE,
  property_management_pct: FALLBACK_MANAGEMENT_PCT,
  maintenance_pct: FALLBACK_MAINTENANCE_PCT,
  capex_pct: 0.05,
}

// =============================================================================
// Strategy configuration
// =============================================================================

const brrrrConfig: WorksheetStrategyConfig<BrrrrWorksheetInputs, BrrrrWorksheetResult> = {
  apiUrl: '/api/v1/worksheet/brrrr/calculate',
  strategyName: 'BRRRR',
  defaultInputs,

  initializeFromProperty(property, defaults) {
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaults.purchase_price
    const arv = data.arv ?? listPrice
    const monthlyRent = data.monthlyRent ?? defaults.monthly_rent
    const propertyTaxes = data.propertyTaxes ?? defaults.property_taxes_annual
    const insurance = data.insurance ?? listPrice * FALLBACK_INSURANCE_PCT
    const rehabCosts = arv * FALLBACK_REHAB_BUDGET_PCT
    const refiLoanAmount = arv * FALLBACK_REFI_LTV
    const refiClosingCosts = refiLoanAmount * FALLBACK_REFI_CLOSING_COSTS_PCT

    const initialPurchasePrice = calculateInitialPurchasePrice({
      monthlyRent,
      propertyTaxes,
      insurance,
      listPrice,
      vacancyRate: FALLBACK_VACANCY_RATE,
      maintenancePct: FALLBACK_MAINTENANCE_PCT,
      managementPct: FALLBACK_MANAGEMENT_PCT,
      downPaymentPct: 0.10,
      interestRate: FALLBACK_REFI_INTEREST_RATE,
      loanTermYears: 30,
    })

    return {
      purchase_price: initialPurchasePrice,
      purchase_costs: initialPurchasePrice * 0.03,
      arv,
      rehab_costs: rehabCosts,
      monthly_rent: monthlyRent,
      property_taxes_annual: propertyTaxes,
      insurance_annual: insurance,
      refi_closing_costs: refiClosingCosts,
      sqft: data.sqft ?? defaults.sqft,
    }
  },

  buildPayload(inputs) {
    return {
      purchase_price: inputs.purchase_price,
      purchase_costs: inputs.purchase_costs,
      rehab_costs: inputs.rehab_costs,
      arv: inputs.arv,
      sqft: inputs.sqft,
      monthly_rent: inputs.monthly_rent,
      property_taxes_annual: inputs.property_taxes_annual,
      insurance_annual: inputs.insurance_annual,
      utilities_monthly: inputs.utilities_monthly,
      down_payment_pct: inputs.down_payment_pct,
      loan_to_cost_pct: inputs.loan_to_cost_pct,
      interest_rate: inputs.interest_rate,
      points: inputs.points,
      holding_months: inputs.holding_months,
      refi_ltv: inputs.refi_ltv,
      refi_interest_rate: inputs.refi_interest_rate,
      refi_loan_term: inputs.refi_loan_term,
      refi_closing_costs: inputs.refi_closing_costs,
      vacancy_rate: inputs.vacancy_rate,
      property_management_pct: inputs.property_management_pct,
      maintenance_pct: inputs.maintenance_pct,
      capex_pct: inputs.capex_pct,
    }
  },

  onUpdateInput(key, value, prev) {
    // Sync loan_to_cost_pct ↔ down_payment_pct
    if (key === 'loan_to_cost_pct') {
      const ltc = Number(value)
      return {
        ...prev,
        loan_to_cost_pct: ltc,
        down_payment_pct: Math.max(0, 1 - ltc / 100),
      }
    }
    return null // fall through to default
  },
}

// =============================================================================
// Hook
// =============================================================================

export function useBrrrrWorksheetCalculator(property: SavedProperty | null) {
  return useWorksheetCalculator(property, brrrrConfig)
}
