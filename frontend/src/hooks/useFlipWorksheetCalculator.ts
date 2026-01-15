import { useEffect, useRef, useState } from 'react'
import { SavedProperty } from './useWorksheetProperty'

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

const defaultInputs: FlipWorksheetInputs = {
  purchase_price: 24000,
  purchase_costs: 1225,
  rehab_costs: 18865,
  arv: 75000,
  down_payment_pct: 0.25,
  interest_rate: 0.12,
  points: 2,
  holding_months: 3,
  property_taxes_annual: 792,
  insurance_annual: 648,
  utilities_monthly: 75,
  dumpster_monthly: 100,
  inspection_costs: 0,
  contingency_pct: 0,
  selling_costs_pct: 0.08,
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

    setInputs((prev) => ({
      ...prev,
      purchase_price: listPrice,
      purchase_costs: listPrice * 0.03,
      arv: data.arv ?? listPrice,
      property_taxes_annual: data.propertyTaxes ?? prev.property_taxes_annual,
      insurance_annual: data.insurance ?? prev.insurance_annual,
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
