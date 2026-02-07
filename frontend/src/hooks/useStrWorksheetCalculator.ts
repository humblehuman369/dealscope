/**
 * STR Worksheet Calculator Hook
 *
 * Thin wrapper around the unified useWorksheetCalculator.
 * All shared logic (debouncing, API calls, error handling) lives there.
 * This file defines the STR-specific configuration only.
 */

import { useMemo } from 'react'
import { SavedProperty } from '@/types/savedProperty'
import { calculateInitialPurchasePrice } from '@/lib/iqTarget'
import {
  useWorksheetCalculator,
  WorksheetStrategyConfig,
} from './useWorksheetCalculator'

// =============================================================================
// FALLBACK DEFAULTS — Must match backend/app/core/defaults.py
// Components using this hook should ideally pass defaults from useDefaults()
// =============================================================================
const FALLBACK_INSURANCE_PCT = 0.01
const FALLBACK_DOWN_PAYMENT_PCT = 0.20
const FALLBACK_INTEREST_RATE = 0.06
const FALLBACK_VACANCY_RATE = 0.01
const FALLBACK_MAINTENANCE_PCT = 0.05
const FALLBACK_MANAGEMENT_PCT = 0.00
const FALLBACK_PLATFORM_FEES_PCT = 0.15
const FALLBACK_STR_MANAGEMENT_PCT = 0.10
const FALLBACK_FURNISHING = 6000

// =============================================================================
// Types (unchanged — consumers may import these)
// =============================================================================

export interface StrWorksheetInputs {
  purchase_price: number
  list_price?: number
  purchase_costs: number
  furnishing_budget: number
  down_payment_pct: number
  interest_rate: number
  loan_term_years: number
  average_daily_rate: number
  occupancy_rate: number
  cleaning_fee_revenue: number
  avg_booking_length: number
  platform_fees_pct: number
  property_management_pct: number
  cleaning_cost_per_turn: number
  supplies_monthly: number
  utilities_monthly: number
  insurance_annual: number
  property_taxes_annual: number
  maintenance_pct: number
  capex_pct: number
}

export interface StrWorksheetResult {
  gross_revenue: number
  rental_revenue: number
  cleaning_fee_revenue: number
  nights_occupied: number
  num_bookings: number
  revpar: number
  gross_expenses: number
  platform_fees: number
  str_management: number
  cleaning_costs: number
  property_taxes: number
  insurance: number
  supplies: number
  utilities: number
  maintenance: number
  capex: number
  noi: number
  monthly_cash_flow: number
  annual_cash_flow: number
  cap_rate: number
  cash_on_cash_return: number
  dscr: number
  break_even_occupancy: number
  deal_score: number
  loan_amount: number
  monthly_payment: number
  annual_debt_service: number
  total_cash_needed: number
  list_price: number
  breakeven_price: number
  target_coc_price: number
  mao_price: number
  discount_percent: number
  seasonality: {
    summer: number
    spring: number
    fall: number
    winter: number
  }
}

// =============================================================================
// Default inputs
// =============================================================================

const defaultInputs: StrWorksheetInputs = {
  purchase_price: 485000,
  purchase_costs: 14550,
  furnishing_budget: FALLBACK_FURNISHING,
  down_payment_pct: FALLBACK_DOWN_PAYMENT_PCT,
  interest_rate: FALLBACK_INTEREST_RATE,
  loan_term_years: 30,
  average_daily_rate: 280,
  occupancy_rate: 0.7,
  cleaning_fee_revenue: 75,
  avg_booking_length: 6,
  platform_fees_pct: FALLBACK_PLATFORM_FEES_PCT,
  property_management_pct: FALLBACK_STR_MANAGEMENT_PCT,
  cleaning_cost_per_turn: 150,
  supplies_monthly: 100,
  utilities_monthly: 100,
  insurance_annual: 485000 * FALLBACK_INSURANCE_PCT,
  property_taxes_annual: 485 * 12,
  maintenance_pct: FALLBACK_MAINTENANCE_PCT,
  capex_pct: 0.05,
}

// =============================================================================
// Strategy configuration (module-level constant — stable reference)
// =============================================================================

const strConfig: WorksheetStrategyConfig<StrWorksheetInputs, StrWorksheetResult> = {
  apiUrl: '/api/v1/worksheet/str/calculate',
  strategyName: 'STR',
  defaultInputs,

  initializeFromProperty(property, defaults) {
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaults.purchase_price
    const propertyTaxes = data.propertyTaxes ?? defaults.property_taxes_annual
    const insurance = data.insurance ?? listPrice * FALLBACK_INSURANCE_PCT
    const adr = data.averageDailyRate ?? defaults.average_daily_rate
    const occupancy = data.occupancyRate ?? defaults.occupancy_rate
    const estimatedMonthlyRent = adr * occupancy * 30

    const initialPurchasePrice = calculateInitialPurchasePrice({
      monthlyRent: estimatedMonthlyRent,
      propertyTaxes,
      insurance,
      listPrice,
      vacancyRate: FALLBACK_VACANCY_RATE,
      maintenancePct: FALLBACK_MAINTENANCE_PCT,
      managementPct: FALLBACK_MANAGEMENT_PCT,
      downPaymentPct: FALLBACK_DOWN_PAYMENT_PCT,
      interestRate: FALLBACK_INTEREST_RATE,
      loanTermYears: 30,
    })

    return {
      purchase_price: initialPurchasePrice,
      list_price: listPrice,
      purchase_costs: initialPurchasePrice * 0.03,
      average_daily_rate: adr,
      occupancy_rate: occupancy,
      property_taxes_annual: propertyTaxes,
      insurance_annual: insurance,
    }
  },

  buildPayload(inputs) {
    return {
      purchase_price: inputs.purchase_price,
      list_price: inputs.list_price,
      average_daily_rate: inputs.average_daily_rate,
      occupancy_rate: inputs.occupancy_rate,
      property_taxes_annual: inputs.property_taxes_annual,
      insurance_annual: inputs.insurance_annual,
      down_payment_pct: inputs.down_payment_pct,
      interest_rate: inputs.interest_rate,
      loan_term_years: inputs.loan_term_years,
      closing_costs: inputs.purchase_costs,
      furnishing_budget: inputs.furnishing_budget,
      platform_fees_pct: inputs.platform_fees_pct,
      property_management_pct: inputs.property_management_pct,
      cleaning_cost_per_turn: inputs.cleaning_cost_per_turn,
      cleaning_fee_revenue: inputs.cleaning_fee_revenue,
      avg_booking_length: inputs.avg_booking_length,
      supplies_monthly: inputs.supplies_monthly,
      utilities_monthly: inputs.utilities_monthly,
      maintenance_pct: inputs.maintenance_pct,
      capex_pct: inputs.capex_pct,
    }
  },
}

// =============================================================================
// Hook (preserves exact same return shape as before)
// =============================================================================

export function useStrWorksheetCalculator(property: SavedProperty | null) {
  const { inputs, updateInput, result, isCalculating, error } =
    useWorksheetCalculator(property, strConfig)

  // STR previously exposed a `derived` object — preserve for backward compat
  const derived = useMemo(
    () => ({
      annualDebtService: result?.annual_debt_service ?? 0,
    }),
    [result],
  )

  return { inputs, updateInput, result, derived, isCalculating, error }
}
