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
      down_payment_pct: s.downPaymentPercent,
      interest_rate: s.interestRate,
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
    const buyPrice = s.purchasePrice || s.buyPrice
    return {
      purchase_price: buyPrice,
      average_daily_rate: s.averageDailyRate,
      occupancy_rate: s.occupancyRate,
      down_payment_pct: s.downPaymentPercent || 0.2,
      interest_rate: s.interestRate || 0.06,
      loan_term_years: s.loanTermYears || 30,
      closing_costs: buyPrice * (s.closingCostsPercent || 0.03),
      furnishing_budget: s.furnitureSetupCost || s.furnishingBudget || 0,
      platform_fees_pct: s.platformFeeRate || 0.15,
      property_management_pct: s.strManagementRate || s.managementRate || 0.10,
      cleaning_cost_per_turn: s.cleaningCostPerTurnover || s.cleaningCostPerTurn || 150,
      cleaning_fee_revenue: s.cleaningFeeRevenue || 75,
      avg_booking_length: s.avgLengthOfStayDays || 6,
      supplies_monthly: s.suppliesMonthly || 100,
      utilities_monthly: s.additionalUtilitiesMonthly || 0,
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
      monthly_rent: s.postRehabMonthlyRent || s.monthlyRent || 0,
      down_payment_pct: s.downPaymentPercent || 0.2,
      interest_rate: s.hardMoneyRate || s.interestRate || 0.10,
      holding_months: s.holdingPeriodMonths || 6,
      refi_ltv: s.refinanceLtv || 0.75,
      refi_interest_rate: s.refinanceInterestRate || 0.06,
      refi_loan_term: s.refinanceTermYears || 30,
      property_taxes_annual: s.annualPropertyTax || 3600,
      insurance_annual: s.annualInsurance || 1500,
      vacancy_rate: s.vacancyRate || 0.05,
      property_management_pct: s.managementRate || 0.08,
      maintenance_pct: s.maintenanceRate || 0.05,
    }
  }

  if (strategyType === 'flip') {
    const s = state as Record<string, number | string>
    const purchasePrice = Number(s.purchasePrice) || Number(s.buyPrice) || 0
    const closingCostsPct = Number(s.closingCostsPercent) || 0.03
    const rehabTimeMonths = Number(s.rehabTimeMonths) || 4
    const daysOnMarket = Number(s.daysOnMarket) || 45
    const holdingMonths = rehabTimeMonths + daysOnMarket / 30
    const isCash = s.financingType === 'cash'
    return {
      purchase_price: purchasePrice,
      purchase_costs: purchasePrice * closingCostsPct,
      rehab_costs: Number(s.rehabBudget) || 0,
      arv: Number(s.arv) || 0,
      down_payment_pct: isCash ? 1.0 : 1.0 - (Number(s.hardMoneyLtv) || 0.90),
      interest_rate: isCash ? 0 : Number(s.hardMoneyRate) || 0.12,
      points: isCash ? 0 : Number(s.loanPoints) ?? 2,
      holding_months: holdingMonths,
      contingency_pct: Number(s.contingencyPct) ?? 0.10,
      selling_costs_pct: Number(s.sellingCostsPct) || 0.08,
      capital_gains_rate: Number(s.capitalGainsRate) || 0.22,
      property_taxes_annual: 0,
      insurance_annual: 0,
      utilities_monthly: Number(s.holdingCostsMonthly) || 0,
      dumpster_monthly: 0,
    }
  }

  if (strategyType === 'house_hack') {
    const s = state as Record<string, number>
    const totalUnits = s.totalUnits || 4
    const ownerUnits = s.ownerOccupiedUnits || 1
    const rentedUnits = Math.max(0, totalUnits - ownerUnits)
    const avgRent = s.avgRentPerUnit || 1500
    const purchasePrice = s.purchasePrice || s.buyPrice
    return {
      purchase_price: purchasePrice,
      unit_rents: Array(rentedUnits).fill(avgRent),
      owner_market_rent: s.ownerUnitMarketRent || 1500,
      down_payment_pct: s.downPaymentPercent || 0.035,
      interest_rate: s.interestRate || 0.065,
      loan_term_years: s.loanTermYears || 30,
      closing_costs: purchasePrice * (s.closingCostsPercent || 0.03),
      pmi_rate: s.pmiRate || 0.0085,
      property_taxes_annual: s.annualPropertyTax || 6000,
      insurance_annual: s.annualInsurance || 2400,
      vacancy_rate: s.vacancyRate || 0.05,
      maintenance_pct: s.maintenanceRate || 0.05,
      capex_pct: s.capexRate || 0.05,
      utilities_monthly: s.utilitiesMonthly || 200,
    }
  }

  // wholesale
  const s = state as Record<string, number>
  const contractPrice = s.contractPrice || 0
  const assignmentFee = s.assignmentFee || 15000
  return {
    arv: s.arv || 0,
    contract_price: contractPrice,
    investor_price: contractPrice + assignmentFee,
    rehab_costs: s.estimatedRepairs || s.rehabBudget || 0,
    assignment_fee: assignmentFee,
    marketing_costs: s.marketingCosts || 500,
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
  const requestIdRef = useRef(0)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const id = ++requestIdRef.current

    const timer = setTimeout(async () => {
      setError(null)

      loadingTimerRef.current = setTimeout(() => {
        if (requestIdRef.current === id) setIsCalculating(true)
      }, 200)

      try {
        const payload = buildPayload(strategyType, state)
        const data = await api.post<T>(endpoint, payload)
        if (requestIdRef.current === id) {
          setResult(data)
        }
      } catch (err) {
        if (requestIdRef.current === id) {
          const message =
            err instanceof Error
              ? err.message
              : `Failed to calculate ${strategyType} worksheet metrics`
          setError(message)
        }
      } finally {
        clearTimeout(loadingTimerRef.current)
        if (requestIdRef.current === id) {
          setIsCalculating(false)
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      clearTimeout(loadingTimerRef.current)
    }
  }, [strategyType, state, endpoint])

  return { result, isCalculating, error }
}
