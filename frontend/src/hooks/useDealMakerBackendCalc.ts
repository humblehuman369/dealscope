/**
 * useDealMakerBackendCalc — Debounced backend calculation for Deal Maker
 *
 * Replaces local strategy calculations in DealMakerScreen with
 * debounced backend calls to the appropriate worksheet endpoint.
 *
 * Architecture: All financial calculations run on the backend.
 * The client only provides inputs and displays results.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api-client'

const DEBOUNCE_MS = 150

// Strategy type from deal maker types
type StrategyType = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale'

// Endpoint mapping
const WORKSHEET_ENDPOINTS: Record<StrategyType, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
}

/**
 * Build the backend payload for a given strategy type.
 * Maps the frontend DealMaker state to the backend's expected input format.
 */
function buildPayload(
  strategyType: StrategyType,
  state: Record<string, unknown>,
): Record<string, unknown> {
  // Common fields for LTR
  if (strategyType === 'ltr') {
    const s = state as {
      buyPrice: number
      monthlyRent: number
      otherIncome: number
      downPaymentPercent: number
      closingCostsPercent: number
      interestRate: number
      loanTermYears: number
      rehabBudget: number
      arv: number
      vacancyRate: number
      maintenanceRate: number
      managementRate: number
      annualPropertyTax: number
      annualInsurance: number
      monthlyHoa: number
    }
    return {
      purchase_price: s.buyPrice,
      monthly_rent: s.monthlyRent + (s.otherIncome || 0),
      down_payment_pct: s.downPaymentPercent * 100,
      interest_rate: s.interestRate * 100,
      loan_term_years: s.loanTermYears,
      closing_costs: s.buyPrice * s.closingCostsPercent,
      rehab_costs: s.rehabBudget || 0,
      arv: s.arv || s.buyPrice,
      vacancy_rate: s.vacancyRate,
      property_management_pct: s.managementRate,
      maintenance_pct: s.maintenanceRate,
      property_taxes_annual: s.annualPropertyTax,
      insurance_annual: s.annualInsurance,
      hoa_monthly: s.monthlyHoa || 0,
    }
  }

  if (strategyType === 'str') {
    const s = state as Record<string, number>
    return {
      purchase_price: s.purchasePrice || s.buyPrice,
      average_daily_rate: s.averageDailyRate,
      occupancy_rate: s.occupancyRate,
      down_payment_pct: (s.downPaymentPercent || 0.2) * 100,
      interest_rate: (s.interestRate || 0.06) * 100,
      loan_term_years: s.loanTermYears || 30,
      closing_costs: (s.purchasePrice || s.buyPrice) * (s.closingCostsPercent || 0.03),
      furnishing_budget: s.furnitureSetupCost || s.furnishingBudget || 0,
      platform_fees_pct: s.platformFeesPct || 0.03,
      property_management_pct: s.strManagementRate || s.managementRate || 0.2,
      cleaning_cost_per_turn: s.cleaningCostPerTurnover || s.cleaningCostPerTurn || 75,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
      maintenance_pct: s.maintenanceRate || 0.05,
    }
  }

  if (strategyType === 'brrrr') {
    const s = state as Record<string, number>
    return {
      purchase_price: s.purchasePrice || s.buyPrice,
      rehab_costs: s.rehabBudget || 0,
      arv: s.arv || 0,
      monthly_rent: s.monthlyRent || 0,
      down_payment_pct: (s.downPaymentPercent || 0.2) * 100,
      interest_rate: (s.interestRate || 0.06) * 100,
      holding_months: s.holdingPeriodMonths || 6,
      refi_ltv: (s.refinanceLtv || 0.75) * 100,
      refi_interest_rate: (s.refinanceInterestRate || s.interestRate || 0.06) * 100,
      refi_loan_term: s.refinanceLoanTerm || 30,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
      vacancy_rate: s.vacancyRate || 0.05,
      property_management_pct: s.managementRate || 0.08,
      maintenance_pct: s.maintenanceRate || 0.05,
    }
  }

  if (strategyType === 'flip') {
    const s = state as Record<string, number>
    return {
      purchase_price: s.purchasePrice || s.buyPrice,
      rehab_costs: s.rehabBudget || 0,
      arv: s.arv || 0,
      down_payment_pct: (s.downPaymentPercent || 0.2) * 100,
      interest_rate: (s.interestRate || 0.06) * 100,
      holding_months: s.holdingPeriodMonths || 6,
      selling_costs_pct: (s.sellingCostsPct || 0.08) * 100,
      capital_gains_rate: (s.capitalGainsRate || 0.15) * 100,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
    }
  }

  if (strategyType === 'house_hack') {
    const s = state as Record<string, number | number[]>
    return {
      purchase_price: (s.purchasePrice as number) || (s.buyPrice as number),
      unit_rents: s.unitRents || [(s.avgRentPerUnit as number) || 1500],
      down_payment_pct: ((s.downPaymentPercent as number) || 0.05) * 100,
      interest_rate: ((s.interestRate as number) || 0.06) * 100,
      loan_term_years: (s.loanTermYears as number) || 30,
      property_taxes_annual: (s.annualPropertyTax as number) || 3600,
      insurance_annual: (s.annualInsurance as number) || 1500,
      vacancy_rate: (s.vacancyRate as number) || 0.05,
      maintenance_pct: (s.maintenanceRate as number) || 0.05,
    }
  }

  // wholesale
  const s = state as Record<string, number>
  return {
    arv: s.arv || 0,
    contract_price: s.contractPrice || 0,
    investor_price: s.investorPrice || s.contractPrice + (s.assignmentFee || 10000),
    rehab_costs: s.estimatedRepairs || s.rehabBudget || 0,
    assignment_fee: s.assignmentFee || 10000,
    earnest_money: s.earnestMoney || 1000,
  }
}

export interface UseDealMakerBackendCalcReturn<T> {
  result: T | null
  isCalculating: boolean
  error: string | null
}

export function useDealMakerBackendCalc<T>(
  strategyType: StrategyType,
  state: Record<string, unknown>,
): UseDealMakerBackendCalcReturn<T> {
  const [result, setResult] = useState<T | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const endpoint = WORKSHEET_ENDPOINTS[strategyType]

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsCalculating(true)
      setError(null)

      try {
        const payload = buildPayload(strategyType, state)
        const data = await api.post<T>(endpoint, payload)
        setResult(data)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : `Failed to calculate ${strategyType} worksheet metrics`
        setError(message)
      } finally {
        setIsCalculating(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [strategyType, state, endpoint])

  return { result, isCalculating, error }
}
