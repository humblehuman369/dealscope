/**
 * Fix & Flip Worksheet Calculator Hook
 *
 * Thin wrapper around the unified useWorksheetCalculator.
 * All shared logic (debouncing, API calls, error handling) lives there.
 * This file defines the Flip-specific configuration only.
 */

import { SavedProperty } from '@/types/savedProperty'
import {
  useWorksheetCalculator,
  WorksheetStrategyConfig,
} from './useWorksheetCalculator'

// =============================================================================
// FALLBACK DEFAULTS — Must match backend/app/core/defaults.py
// =============================================================================
const FALLBACK_INSURANCE_PCT = 0.01
const FALLBACK_REHAB_BUDGET_PCT = 0.05
const FALLBACK_BUY_DISCOUNT_PCT = 0.05
const FALLBACK_SELLING_COSTS_PCT = 0.06
const FALLBACK_DOWN_PAYMENT_PCT = 0.20
const FALLBACK_CONTINGENCY_PCT = 0.05

// =============================================================================
// Types
// =============================================================================

export interface FlipWorksheetInputs {
  purchase_price: number
  purchase_costs: number
  rehab_costs: number
  arv: number
  down_payment_pct: number
  interest_rate: number
  points: number
  holding_months: number
  property_taxes_annual: number
  insurance_annual: number
  utilities_monthly: number
  dumpster_monthly: number
  inspection_costs: number
  contingency_pct: number
  selling_costs_pct: number
  capital_gains_rate: number
  loan_type: 'interest_only' | 'amortizing'
}

export interface FlipWorksheetResult {
  purchase_price: number
  purchase_costs: number
  inspection_costs: number
  points_cost: number
  total_renovation: number
  total_holding_costs: number
  total_project_cost: number
  total_cash_required: number
  loan_amount: number
  loan_to_cost_pct: number
  monthly_payment: number
  holding_months: number
  arv: number
  selling_costs: number
  net_sale_proceeds: number
  loan_repayment: number
  gross_profit: number
  net_profit_before_tax: number
  net_profit_after_tax: number
  roi: number
  annualized_roi: number
  profit_margin: number
  meets_70_rule: boolean
  mao: number
  deal_score: number
  all_in_cost: number
  purchase_rehab_cost: number
  breakeven_price: number
  target_fifteen_all_in: number
}

// =============================================================================
// Default inputs
// =============================================================================

const defaultInputs: FlipWorksheetInputs = {
  purchase_price: 24000,
  purchase_costs: 1225,
  rehab_costs: 75000 * FALLBACK_REHAB_BUDGET_PCT,
  arv: 75000,
  down_payment_pct: FALLBACK_DOWN_PAYMENT_PCT,
  interest_rate: 0.12,
  points: 2,
  holding_months: 6,
  property_taxes_annual: 792,
  insurance_annual: 24000 * FALLBACK_INSURANCE_PCT,
  utilities_monthly: 100,
  dumpster_monthly: 100,
  inspection_costs: 0,
  contingency_pct: FALLBACK_CONTINGENCY_PCT,
  selling_costs_pct: FALLBACK_SELLING_COSTS_PCT,
  capital_gains_rate: 0.2,
  loan_type: 'interest_only',
}

// =============================================================================
// Strategy configuration
// =============================================================================

const flipConfig: WorksheetStrategyConfig<FlipWorksheetInputs, FlipWorksheetResult> = {
  apiUrl: '/api/v1/worksheet/flip/calculate',
  strategyName: 'Fix & Flip',
  defaultInputs,

  initializeFromProperty(property, defaults) {
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaults.purchase_price
    const arv = data.arv ?? listPrice
    const insurance = data.insurance ?? listPrice * FALLBACK_INSURANCE_PCT
    const rehabCosts = arv * FALLBACK_REHAB_BUDGET_PCT

    // 70% rule: MAO = ARV × 0.70 − Rehab
    const mao = arv * 0.70 - rehabCosts
    const initialPurchasePrice = Math.max(
      Math.round(mao * (1 - FALLBACK_BUY_DISCOUNT_PCT)),
      listPrice * 0.50,
    )

    return {
      purchase_price: Math.min(initialPurchasePrice, listPrice),
      purchase_costs: initialPurchasePrice * 0.03,
      arv,
      rehab_costs: rehabCosts,
      property_taxes_annual: data.propertyTaxes ?? defaults.property_taxes_annual,
      insurance_annual: insurance,
    }
  },

  buildPayload(inputs) {
    return { ...inputs }
  },
}

// =============================================================================
// Hook
// =============================================================================

export function useFlipWorksheetCalculator(property: SavedProperty | null) {
  return useWorksheetCalculator(property, flipConfig)
}
