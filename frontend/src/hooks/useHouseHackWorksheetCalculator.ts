/**
 * House Hack Worksheet Calculator Hook
 *
 * Thin wrapper around the unified useWorksheetCalculator.
 * All shared logic (debouncing, API calls, error handling) lives there.
 * This file defines the HouseHack-specific configuration only.
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
const FALLBACK_FHA_DOWN_PAYMENT_PCT = 0.035
const FALLBACK_FHA_MIP_RATE = 0.0085
const FALLBACK_INTEREST_RATE = 0.06
const FALLBACK_VACANCY_RATE = 0.01
const FALLBACK_MAINTENANCE_PCT = 0.05

// =============================================================================
// Types
// =============================================================================

export type PropertyTypeOption = '2' | '3' | '4' | '1' | 'rooms'

export interface HouseHackInputs {
  property_type: PropertyTypeOption
  purchase_price: number
  down_payment_pct: number
  closing_costs: number
  interest_rate: number
  loan_term_years: number
  pmi_rate: number
  unit2_rent: number
  unit3_rent: number
  unit4_rent: number
  vacancy_rate: number
  property_taxes_monthly: number
  insurance_monthly: number
  maintenance_pct: number
  capex_pct: number
  utilities_monthly: number
  owner_market_rent: number
  list_price: number
  fha_max_price: number
  loan_type: 'fha' | 'conventional' | 'va'
}

export interface HouseHackResult {
  your_housing_cost: number
  rental_income: number
  total_monthly_expenses: number
  savings_vs_renting: number
  full_rental_income: number
  full_rental_cash_flow: number
  full_rental_annual: number
  moveout_cap_rate: number
  loan_amount: number
  monthly_payment: number
  monthly_pmi: number
  monthly_piti: number
  down_payment: number
  closing_costs: number
  total_cash_needed: number
  monthly_taxes: number
  monthly_insurance: number
  maintenance_monthly: number
  capex_monthly: number
  utilities_monthly: number
  total_rent: number
  housing_offset: number
  coc_return: number
  deal_score: number
  list_price: number
  breakeven_price: number
  target_coc_price: number
  fha_max_price: number
}

// =============================================================================
// Helpers
// =============================================================================

const getUnitsCount = (propertyType: PropertyTypeOption) => {
  if (propertyType === 'rooms') return 2
  return Number.parseInt(propertyType, 10)
}

// =============================================================================
// Default inputs
// =============================================================================

const defaultInputs: HouseHackInputs = {
  property_type: '2',
  purchase_price: 425000,
  down_payment_pct: FALLBACK_FHA_DOWN_PAYMENT_PCT,
  closing_costs: 8625,
  interest_rate: FALLBACK_INTEREST_RATE,
  loan_term_years: 30,
  pmi_rate: FALLBACK_FHA_MIP_RATE,
  unit2_rent: 1800,
  unit3_rent: 1600,
  unit4_rent: 1500,
  vacancy_rate: FALLBACK_VACANCY_RATE,
  property_taxes_monthly: 354,
  insurance_monthly: (425000 * FALLBACK_INSURANCE_PCT) / 12,
  maintenance_pct: FALLBACK_MAINTENANCE_PCT,
  capex_pct: 0.05,
  utilities_monthly: 100,
  owner_market_rent: 2200,
  list_price: 449000,
  fha_max_price: 472030,
  loan_type: 'fha',
}

// =============================================================================
// Strategy configuration
// =============================================================================

const houseHackConfig: WorksheetStrategyConfig<HouseHackInputs, HouseHackResult> = {
  apiUrl: '/api/v1/worksheet/househack/calculate',
  strategyName: 'House Hack',
  defaultInputs,

  initializeFromProperty(property, defaults) {
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaults.purchase_price
    const bedrooms = data.bedrooms ?? 3
    const monthlyRent = data.monthlyRent ?? defaults.unit2_rent
    const propertyTaxes = data.propertyTaxes ?? defaults.property_taxes_monthly * 12
    const insuranceAnnual = data.insurance ?? listPrice * FALLBACK_INSURANCE_PCT
    const insuranceMonthly = insuranceAnnual / 12
    const rentPerRoom = monthlyRent / bedrooms
    const roomRentMonthly = rentPerRoom * 2
    const ownerUnitMarketRent = rentPerRoom

    const initialPurchasePrice = calculateInitialPurchasePrice({
      monthlyRent: roomRentMonthly,
      propertyTaxes,
      insurance: insuranceAnnual,
      listPrice,
      vacancyRate: FALLBACK_VACANCY_RATE,
      maintenancePct: FALLBACK_MAINTENANCE_PCT,
      managementPct: 0,
      downPaymentPct: FALLBACK_FHA_DOWN_PAYMENT_PCT,
      interestRate: FALLBACK_INTEREST_RATE,
      loanTermYears: 30,
    })

    return {
      purchase_price: initialPurchasePrice,
      list_price: listPrice * 1.056,
      property_taxes_monthly: propertyTaxes / 12,
      insurance_monthly: insuranceMonthly,
      unit2_rent: roomRentMonthly,
      owner_market_rent: ownerUnitMarketRent,
    }
  },

  buildPayload(inputs) {
    const unitCount = getUnitsCount(inputs.property_type)
    return {
      purchase_price: inputs.purchase_price,
      unit_rents: [
        inputs.unit2_rent,
        unitCount >= 3 ? inputs.unit3_rent : 0,
        unitCount >= 4 ? inputs.unit4_rent : 0,
      ],
      owner_market_rent: inputs.owner_market_rent,
      list_price: inputs.list_price,
      fha_max_price: inputs.fha_max_price,
      property_taxes_annual: inputs.property_taxes_monthly * 12,
      insurance_annual: inputs.insurance_monthly * 12,
      down_payment_pct: inputs.down_payment_pct,
      interest_rate: inputs.interest_rate,
      loan_term_years: inputs.loan_term_years,
      closing_costs: inputs.closing_costs,
      pmi_rate: inputs.pmi_rate,
      vacancy_rate: inputs.vacancy_rate,
      maintenance_pct: inputs.maintenance_pct,
      capex_pct: inputs.capex_pct,
      maintenance_monthly: 0,
      capex_monthly: 0,
      utilities_monthly: inputs.utilities_monthly,
      loan_type: inputs.loan_type,
    }
  },

  onUpdateInput(key, value, prev) {
    // Sync loan_type → minimum down_payment_pct
    if (key === 'loan_type') {
      const minDown = value === 'fha' ? 0.035 : value === 'va' ? 0 : 0.05
      return {
        ...prev,
        loan_type: value as HouseHackInputs['loan_type'],
        down_payment_pct: Math.max(minDown, prev.down_payment_pct),
      }
    }
    return null
  },
}

// =============================================================================
// Hook
// =============================================================================

export function useHouseHackWorksheetCalculator(property: SavedProperty | null) {
  return useWorksheetCalculator(property, houseHackConfig)
}
