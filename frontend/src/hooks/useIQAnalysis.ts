/**
 * useIQAnalysis — Backend-powered IQ Target and strategy analytics
 *
 * Replaces local calculateIQTarget() and getMetricsAtPrice() with
 * debounced backend calls to /api/v1/analysis/verdict and
 * /api/v1/worksheet/{strategy}/calculate.
 *
 * Architecture: All financial calculations run on the backend.
 * The client only provides inputs and displays results.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '@/lib/api-client'
import type { IQTargetResult, TargetAssumptions } from '@/lib/iqTarget'
import type { StrategyId } from '@/components/analytics/types'

const DEBOUNCE_MS = 200

// Worksheet endpoint mapping
const WORKSHEET_ENDPOINTS: Record<string, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
}

// Backend verdict response shape — supports both snake_case and camelCase from Pydantic
interface VerdictResponse {
  deal_score?: number; dealScore?: number
  deal_verdict?: string; dealVerdict?: string
  discount_percent?: number; discountPercent?: number
  purchase_price?: number; purchasePrice?: number
  breakeven_price?: number; breakevenPrice?: number
  list_price?: number; listPrice?: number
  strategies: Array<{
    id: string
    name: string
    score: number
    badge: string | null
    cap_rate?: number; capRate?: number
    cash_on_cash?: number; cashOnCash?: number
    dscr?: number
    annual_cash_flow?: number; annualCashFlow?: number
    monthly_cash_flow?: number; monthlyCashFlow?: number
    metric_label?: string; metricLabel?: string
    metric_value?: string | number; metricValue?: string | number
  }>
  inputs_used?: Record<string, unknown>; inputsUsed?: Record<string, unknown>
}

/**
 * Map verdict response → IQTargetResult shape that the UI expects.
 */
function mapVerdictToIQTarget(
  verdict: VerdictResponse,
  strategyId: StrategyId,
  assumptions: TargetAssumptions,
): IQTargetResult {
  const strat = verdict.strategies.find(
    (s) =>
      s.id === strategyId ||
      (strategyId === 'ltr' && s.id === 'ltr') ||
      (strategyId === 'str' && s.id === 'str') ||
      (strategyId === 'brrrr' && s.id === 'brrrr') ||
      (strategyId === 'flip' && s.id === 'flip') ||
      (strategyId === 'house_hack' && s.id === 'house_hack') ||
      (strategyId === 'wholesale' && s.id === 'wholesale'),
  )

  const targetPrice = verdict.purchase_price ?? verdict.purchasePrice ?? 0
  const breakevenPrice = verdict.breakeven_price ?? verdict.breakevenPrice ?? 0
  const listPrice = assumptions.listPrice
  const discount = listPrice - targetPrice
  const discountPct = listPrice > 0 ? discount / listPrice : 0

  return {
    targetPrice,
    discountFromList: discount,
    discountPercent: discountPct * 100,
    breakeven: breakevenPrice,
    breakevenPercent:
      listPrice > 0
        ? ((listPrice - breakevenPrice) / listPrice) * 100
        : 0,
    rationale: `Buy at $${Math.round(targetPrice).toLocaleString()} for optimal returns`,
    highlightedMetric: strat?.metric_value ?? strat?.metricValue ?? '',
    secondaryMetric: strat?.metric_label ?? strat?.metricLabel ?? '',
    monthlyCashFlow: strat?.monthly_cash_flow ?? strat?.monthlyCashFlow ?? 0,
    cashOnCash: (strat?.cash_on_cash ?? strat?.cashOnCash ?? 0) * 100,
    capRate: (strat?.cap_rate ?? strat?.capRate ?? 0) * 100,
    dscr: strat?.dscr ?? 0,
  }
}

/**
 * Build a worksheet payload for a specific strategy at a given price.
 */
function buildWorksheetPayload(
  strategyId: StrategyId,
  purchasePrice: number,
  assumptions: TargetAssumptions,
): Record<string, unknown> {
  const base = {
    purchase_price: purchasePrice,
    down_payment_pct: assumptions.downPaymentPct * 100,
    interest_rate: assumptions.interestRate * 100,
    loan_term_years: assumptions.loanTermYears,
    closing_costs: purchasePrice * assumptions.closingCostsPct,
    property_taxes_annual: assumptions.propertyTaxes,
    insurance_annual: assumptions.insurance,
    vacancy_rate: assumptions.vacancyRate,
    property_management_pct: assumptions.managementPct,
    maintenance_pct: assumptions.maintenancePct,
  }

  switch (strategyId) {
    case 'ltr':
      return {
        ...base,
        monthly_rent: assumptions.monthlyRent,
        rehab_costs: assumptions.rehabCost,
        arv: assumptions.arv,
      }
    case 'str':
      return {
        ...base,
        average_daily_rate: assumptions.averageDailyRate,
        occupancy_rate: assumptions.occupancyRate,
        platform_fees_pct: 0.03,
        cleaning_cost_per_turn: 75,
      }
    case 'brrrr':
      return {
        ...base,
        rehab_costs: assumptions.rehabCost,
        arv: assumptions.arv,
        monthly_rent: assumptions.monthlyRent,
        holding_months: assumptions.holdingPeriodMonths,
        refi_ltv: 75,
        refi_interest_rate: assumptions.interestRate * 100,
        refi_loan_term: 30,
      }
    case 'flip':
      return {
        ...base,
        rehab_costs: assumptions.rehabCost,
        arv: assumptions.arv,
        holding_months: assumptions.holdingPeriodMonths,
        selling_costs_pct: assumptions.sellingCostsPct * 100,
        capital_gains_rate: 15,
      }
    case 'house_hack':
      return {
        ...base,
        monthly_rent: assumptions.monthlyRent,
        unit_rents: [assumptions.monthlyRent],
      }
    case 'wholesale':
      return {
        arv: assumptions.arv,
        contract_price: purchasePrice,
        investor_price: purchasePrice * 1.03,
        rehab_costs: assumptions.rehabCost,
        assignment_fee: purchasePrice * assumptions.wholesaleFeePct,
        earnest_money: 1000,
      }
    default:
      return base
  }
}

export interface UseIQAnalysisReturn {
  iqTarget: IQTargetResult | null
  metricsAtTarget: Record<string, unknown> | null
  metricsAtList: Record<string, unknown> | null
  isLoading: boolean
  error: string | null
}

export function useIQAnalysis(
  strategyId: StrategyId | null,
  assumptions: TargetAssumptions,
): UseIQAnalysisReturn {
  const [iqTarget, setIqTarget] = useState<IQTargetResult | null>(null)
  const [metricsAtTarget, setMetricsAtTarget] = useState<Record<string, unknown> | null>(null)
  const [metricsAtList, setMetricsAtList] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!strategyId) {
      setIqTarget(null)
      setMetricsAtTarget(null)
      setMetricsAtList(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        // 1. Get IQ Target from verdict endpoint
        const verdictPayload = {
          list_price: assumptions.listPrice,
          monthly_rent: assumptions.monthlyRent,
          property_taxes: assumptions.propertyTaxes,
          insurance: assumptions.insurance,
          arv: assumptions.arv,
          average_daily_rate: assumptions.averageDailyRate,
          occupancy_rate: assumptions.occupancyRate,
        }

        const verdict = await api.post<VerdictResponse>(
          '/api/v1/analysis/verdict',
          verdictPayload,
        )

        const target = mapVerdictToIQTarget(verdict, strategyId, assumptions)
        setIqTarget(target)

        // 2. Get metrics at both prices via worksheet endpoint
        const endpoint = WORKSHEET_ENDPOINTS[strategyId]
        if (endpoint) {
          const [targetResult, listResult] = await Promise.all([
            api.post<Record<string, unknown>>(
              endpoint,
              buildWorksheetPayload(strategyId, target.targetPrice, assumptions),
            ),
            api.post<Record<string, unknown>>(
              endpoint,
              buildWorksheetPayload(strategyId, assumptions.listPrice, assumptions),
            ),
          ])

          setMetricsAtTarget(targetResult)
          setMetricsAtList(listResult)
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to calculate IQ analytics'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [strategyId, assumptions])

  return { iqTarget, metricsAtTarget, metricsAtList, isLoading, error }
}
