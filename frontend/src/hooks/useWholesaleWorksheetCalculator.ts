/**
 * Wholesale Worksheet Calculator Hook
 *
 * Thin wrapper around the unified useWorksheetCalculator.
 * All shared logic (debouncing, API calls, error handling) lives there.
 * This file defines the Wholesale-specific configuration only.
 */

import { SavedProperty } from '@/types/savedProperty'
import {
  useWorksheetCalculator,
  WorksheetStrategyConfig,
} from './useWorksheetCalculator'

// =============================================================================
// Types
// =============================================================================

export interface WholesaleInputs {
  investor_price: number
  contract_price: number
  rehab_costs: number
  arv: number
  marketing_costs: number
  earnest_money: number
  selling_costs_pct: number
  investor_down_payment_pct: number
  investor_purchase_costs_pct: number
  tax_rate: number
}

export interface WholesaleResult {
  contract_price: number
  investor_price: number
  assignment_fee: number
  closing_costs: number
  earnest_money: number
  mao: number
  gross_profit: number
  net_profit: number
  post_tax_profit: number
  roi: number
  total_cash_at_risk: number
  investor_all_in: number
  investor_purchase_costs: number
  down_payment: number
  amount_financed: number
  total_cash_needed: number
  selling_costs: number
  sale_proceeds: number
  investor_profit: number
  investor_roi: number
  deal_viability: string
  spread_available: number
  deal_score: number
}

// =============================================================================
// Default inputs
// =============================================================================

const defaultInputs: WholesaleInputs = {
  investor_price: 24000,
  contract_price: 12000,
  rehab_costs: 18865,
  arv: 75000,
  marketing_costs: 500,
  earnest_money: 1800,
  selling_costs_pct: 0.06,
  investor_down_payment_pct: 0.25,
  investor_purchase_costs_pct: 0.03,
  tax_rate: 0.2,
}

// =============================================================================
// Strategy configuration
// =============================================================================

const wholesaleConfig: WorksheetStrategyConfig<WholesaleInputs, WholesaleResult> = {
  apiUrl: '/api/v1/worksheet/wholesale/calculate',
  strategyName: 'Wholesale',
  defaultInputs,

  initializeFromProperty(property, defaults) {
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaults.investor_price

    return {
      investor_price: listPrice,
      contract_price: listPrice * 0.5,
      arv: data.arv ?? listPrice,
      earnest_money: listPrice * 0.5 * 0.01,
    }
  },

  buildPayload(inputs) {
    return {
      arv: inputs.arv,
      contract_price: inputs.contract_price,
      investor_price: inputs.investor_price,
      rehab_costs: inputs.rehab_costs,
      assignment_fee: inputs.investor_price - inputs.contract_price,
      marketing_costs: inputs.marketing_costs,
      earnest_money: inputs.earnest_money,
      selling_costs_pct: inputs.selling_costs_pct,
      investor_down_payment_pct: inputs.investor_down_payment_pct,
      investor_purchase_costs_pct: inputs.investor_purchase_costs_pct,
      tax_rate: inputs.tax_rate,
    }
  },

  onUpdateInput(key, value, prev) {
    // Sync contract_price → earnest_money (1% of contract)
    if (key === 'contract_price') {
      const earnestMoney = Number(value) * 0.01
      return {
        ...prev,
        contract_price: value as WholesaleInputs['contract_price'],
        earnest_money: earnestMoney,
      }
    }
    return null
  },
}

// =============================================================================
// Hook
// =============================================================================

export function useWholesaleWorksheetCalculator(property: SavedProperty | null) {
  return useWorksheetCalculator(property, wholesaleConfig)
}
