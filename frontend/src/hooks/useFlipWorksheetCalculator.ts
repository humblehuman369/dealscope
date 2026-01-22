import { useEffect, useRef, useState } from 'react'
import { SavedProperty } from './useWorksheetProperty'
import { DEFAULT_RENOVATION_BUDGET_PCT, DEFAULT_TARGET_PURCHASE_PCT } from '@/lib/iqTarget'

const WORKSHEET_API_URL = '/api/v1/worksheet/flip/calculate'
const CALC_DEBOUNCE_MS = 150

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

// Default percentages for calculated fields
const DEFAULT_INSURANCE_PCT = 0.01        // 1% of purchase price
const DEFAULT_REHAB_BUDGET_PCT = 0.05     // 5% of ARV

const defaultInputs: FlipWorksheetInputs = {
  purchase_price: 24000,
  purchase_costs: 1225,
  rehab_costs: 75000 * DEFAULT_REHAB_BUDGET_PCT, // 5% of ARV
  arv: 75000,
  down_payment_pct: 0.20,              // 20% (was 25%)
  interest_rate: 0.12,                 // 12% hard money
  points: 2,
  holding_months: 6,                   // 6 months (was 3)
  property_taxes_annual: 792,
  insurance_annual: 24000 * DEFAULT_INSURANCE_PCT, // 1% of purchase price
  utilities_monthly: 100,              // $100 (was $75)
  dumpster_monthly: 100,
  inspection_costs: 0,
  contingency_pct: 0.05,               // 5% (was 0)
  selling_costs_pct: 0.06,             // 6% (was 8%)
  capital_gains_rate: 0.2,
  loan_type: 'interest_only',
}

export function useFlipWorksheetCalculator(property: SavedProperty | null) {
  const [inputs, setInputs] = useState<FlipWorksheetInputs>(defaultInputs)
  const [result, setResult] = useState<FlipWorksheetResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!property || hasInitialized.current) return
    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaultInputs.purchase_price
    const arv = data.arv ?? listPrice
    
    // Calculate percentage-based fields
    const insurance = data.insurance ?? (listPrice * DEFAULT_INSURANCE_PCT)
    const rehabCosts = arv * DEFAULT_RENOVATION_BUDGET_PCT
    
    // For flips, estimate breakeven using 70% rule: ARV * 0.70 - Rehab = MAO
    // Then initial purchase price = MAO * 95% (DEFAULT_TARGET_PURCHASE_PCT)
    const mao = (arv * 0.70) - rehabCosts
    const initialPurchasePrice = Math.max(
      Math.round(mao * DEFAULT_TARGET_PURCHASE_PCT),
      listPrice * 0.50  // Floor at 50% of list to avoid unrealistic values
    )

    setInputs((prev) => ({
      ...prev,
      purchase_price: Math.min(initialPurchasePrice, listPrice),
      purchase_costs: initialPurchasePrice * 0.03,
      arv: arv,
      rehab_costs: rehabCosts,
      property_taxes_annual: data.propertyTaxes ?? prev.property_taxes_annual,
      insurance_annual: insurance,
    }))
    hasInitialized.current = true
  }, [property])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const payload = {
      ...inputs,
    }

    timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)
      try {
        const response = await fetch(WORKSHEET_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.detail || 'Failed to calculate Fix & Flip worksheet metrics')
        }
        setResult(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate Fix & Flip worksheet metrics'
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, CALC_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [inputs])

  const updateInput = <K extends keyof FlipWorksheetInputs>(key: K, value: FlipWorksheetInputs[K]) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return {
    inputs,
    updateInput,
    result,
    isCalculating,
    error,
  }
}
