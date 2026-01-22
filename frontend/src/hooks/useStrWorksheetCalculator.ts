import { useEffect, useMemo, useRef, useState } from 'react'
import { SavedProperty } from './useWorksheetProperty'
import { calculateInitialPurchasePrice, DEFAULT_RENOVATION_BUDGET_PCT } from '@/lib/iqTarget'

const WORKSHEET_API_URL = '/api/v1/worksheet/str/calculate'
const CALC_DEBOUNCE_MS = 150

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

// Default insurance as 1% of purchase price
const DEFAULT_INSURANCE_PCT = 0.01

const defaultInputs: StrWorksheetInputs = {
  purchase_price: 485000,
  purchase_costs: 14550,
  furnishing_budget: 6000,           // $6,000 (updated)
  down_payment_pct: 0.20,            // 20% (was 25%)
  interest_rate: 0.06,               // 6% (was 7.5%)
  loan_term_years: 30,
  average_daily_rate: 280,
  occupancy_rate: 0.7,
  cleaning_fee_revenue: 75,          // $75 (was 150)
  avg_booking_length: 6,             // 6 days (was 5)
  platform_fees_pct: 0.15,           // 15% (was 12%)
  property_management_pct: 0.10,     // 10% (was 20%)
  cleaning_cost_per_turn: 150,       // $150 (was 100)
  supplies_monthly: 100,             // $100 (was 250)
  utilities_monthly: 100,            // $100 (was 350) - no additional utilities for STR
  insurance_annual: 485000 * DEFAULT_INSURANCE_PCT, // 1% of purchase price (was fixed)
  property_taxes_annual: 485 * 12,
  maintenance_pct: 0.05,
  capex_pct: 0.05,
}

export function useStrWorksheetCalculator(property: SavedProperty | null) {
  const [inputs, setInputs] = useState<StrWorksheetInputs>(defaultInputs)
  const [result, setResult] = useState<StrWorksheetResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!property || hasInitialized.current) return

    const data = property.property_data_snapshot || {}
    const listPrice = data.listPrice ?? defaultInputs.purchase_price
    const propertyTaxes = data.propertyTaxes ?? defaultInputs.property_taxes_annual
    // Calculate insurance as 1% of purchase price if not provided
    const insurance = data.insurance ?? (listPrice * DEFAULT_INSURANCE_PCT)
    
    const adr = data.averageDailyRate ?? defaultInputs.average_daily_rate
    const occupancy = data.occupancyRate ?? defaultInputs.occupancy_rate
    // Estimate monthly rent from STR revenue (ADR * occupancy * 30 days)
    const estimatedMonthlyRent = adr * occupancy * 30
    
    // Calculate initial purchase price as 95% of estimated breakeven
    const initialPurchasePrice = calculateInitialPurchasePrice({
      monthlyRent: estimatedMonthlyRent,
      propertyTaxes: propertyTaxes,
      insurance: insurance,
      listPrice: listPrice,
      vacancyRate: 0.01,
      maintenancePct: 0.05,
      managementPct: 0.10,
      downPaymentPct: 0.20,
      interestRate: 0.06,
      loanTermYears: 30,
    })

    setInputs((prev) => ({
      ...prev,
      purchase_price: initialPurchasePrice,
      list_price: listPrice,
      purchase_costs: initialPurchasePrice * 0.03,
      average_daily_rate: adr,
      occupancy_rate: occupancy,
      property_taxes_annual: propertyTaxes,
      insurance_annual: insurance,
    }))

    hasInitialized.current = true
  }, [property])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const payload = {
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
          throw new Error(data?.detail || 'Failed to calculate STR worksheet metrics')
        }
        setResult(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to calculate STR worksheet metrics'
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, CALC_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
    }
  }, [inputs])

  const updateInput = <K extends keyof StrWorksheetInputs>(key: K, value: StrWorksheetInputs[K]) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const derived = useMemo(() => {
    if (!result) {
      return {
        annualDebtService: 0,
      }
    }
    return {
      annualDebtService: result.annual_debt_service,
    }
  }, [result])

  return {
    inputs,
    updateInput,
    result,
    derived,
    isCalculating,
    error,
  }
}
