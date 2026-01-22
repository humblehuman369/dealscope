import { useEffect, useRef, useState } from 'react'
import { SavedProperty } from './useWorksheetProperty'

const WORKSHEET_API_URL = '/api/v1/worksheet/brrrr/calculate'
const CALC_DEBOUNCE_MS = 150

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

// Default percentages for calculated fields
const DEFAULT_INSURANCE_PCT = 0.01        // 1% of purchase price
const DEFAULT_REHAB_BUDGET_PCT = 0.05     // 5% of ARV
const DEFAULT_REFI_CLOSING_COSTS_PCT = 0.03 // 3% of refinance amount

const defaultInputs: BrrrrWorksheetInputs = {
  purchase_price: 285000,
  purchase_costs: 8550,
  rehab_costs: 425000 * DEFAULT_REHAB_BUDGET_PCT, // 5% of ARV
  arv: 425000,
  monthly_rent: 2800,
  property_taxes_annual: 5700,
  insurance_annual: 285000 * DEFAULT_INSURANCE_PCT, // 1% of purchase price
  utilities_monthly: 100,                  // $100 (was $475)
  down_payment_pct: 0.1,
  loan_to_cost_pct: 90,
  interest_rate: 0.12,                     // 12% hard money
  points: 2,
  holding_months: 4,
  refi_ltv: 0.75,                          // 75%
  refi_interest_rate: 0.06,                // 6% (was 7%)
  refi_loan_term: 30,
  refi_closing_costs: 425000 * 0.75 * DEFAULT_REFI_CLOSING_COSTS_PCT, // 3% of refinance amount
  vacancy_rate: 0.01,                      // 1% (was 5%)
  property_management_pct: 0.00,           // 0% (was 8%)
  maintenance_pct: 0.05,                   // 5%
  capex_pct: 0.05,                         // 5%
}

export function useBrrrrWorksheetCalculator(property: SavedProperty | null) {
  const [inputs, setInputs] = useState<BrrrrWorksheetInputs>(defaultInputs)
  const [result, setResult] = useState<BrrrrWorksheetResult | null>(null)
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
    const rehabCosts = arv * DEFAULT_REHAB_BUDGET_PCT
    const refiLoanAmount = arv * 0.75
    const refiClosingCosts = refiLoanAmount * DEFAULT_REFI_CLOSING_COSTS_PCT

    setInputs((prev) => ({
      ...prev,
      purchase_price: listPrice,
      purchase_costs: listPrice * 0.03,
      arv: arv,
      rehab_costs: rehabCosts,
      monthly_rent: data.monthlyRent ?? prev.monthly_rent,
      property_taxes_annual: data.propertyTaxes ?? prev.property_taxes_annual,
      insurance_annual: insurance,
      refi_closing_costs: refiClosingCosts,
      sqft: data.sqft ?? prev.sqft,
    }))

    hasInitialized.current = true
  }, [property])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const payload = {
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
          throw new Error(data?.detail || 'Failed to calculate BRRRR worksheet metrics')
        }
        setResult(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate BRRRR worksheet metrics'
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, CALC_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [inputs])

  const updateInput = <K extends keyof BrrrrWorksheetInputs>(key: K, value: BrrrrWorksheetInputs[K]) => {
    setInputs((prev) => {
      if (key === 'loan_to_cost_pct') {
        const ltc = Number(value)
        return {
          ...prev,
          loan_to_cost_pct: ltc,
          down_payment_pct: Math.max(0, 1 - ltc / 100),
        }
      }
      return {
        ...prev,
        [key]: value,
      }
    })
  }

  return {
    inputs,
    updateInput,
    result,
    isCalculating,
    error,
  }
}
