/**
 * Portfolio assumptions-vs-actuals helpers (R11).
 *
 * Actual cash flow = actual rent − all-in expenses (includes mortgage).
 * Variance is (actual − projected) / |projected| so a beat is positive.
 */

import type { PropertyActuals } from '@/types/savedProperty'

export function actualMonthlyCashFlow(actuals: PropertyActuals | null | undefined): number | null {
  const rent = actuals?.monthly_rent
  const expenses = actuals?.monthly_expenses
  if (typeof rent !== 'number' || !Number.isFinite(rent)) return null
  if (typeof expenses !== 'number' || !Number.isFinite(expenses)) return null
  return rent - expenses
}

/** Percent variance of actual vs projected. Null when either side is missing or projected is 0. */
export function cashFlowVariancePct(
  actualCashFlow: number | null,
  projectedCashFlow: number | null | undefined,
): number | null {
  if (actualCashFlow === null) return null
  if (projectedCashFlow == null || !Number.isFinite(projectedCashFlow) || projectedCashFlow === 0) {
    return null
  }
  return ((actualCashFlow - projectedCashFlow) / Math.abs(projectedCashFlow)) * 100
}
