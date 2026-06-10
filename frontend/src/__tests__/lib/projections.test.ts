import { describe, expect, it } from 'vitest'
import {
  calculate10YearProjections,
  calculateProjectionSummary,
  calculateYearProjections,
  getDefaultProjectionAssumptions,
  projectionHorizonYears,
} from '@/lib/projections'

describe('projections', () => {
  const assumptions = getDefaultProjectionAssumptions(300_000, 2_500, 4_500)

  it('extends horizon to loan term up to 30 years', () => {
    const thirtyYear = { ...assumptions, loanTermYears: 30 }
    expect(projectionHorizonYears(thirtyYear)).toBe(30)
    expect(calculateYearProjections(thirtyYear).length).toBe(30)
  })

  it('keeps a minimum 10-year horizon for short loans', () => {
    const fiveYearLoan = { ...assumptions, loanTermYears: 5 }
    expect(projectionHorizonYears(fiveYearLoan)).toBe(10)
  })

  it('computes a positive IRR for a cash-flowing rental scenario', () => {
    const projections = calculate10YearProjections(assumptions)
    const totalCashInvested =
      assumptions.purchasePrice * assumptions.downPaymentPct +
      assumptions.purchasePrice * assumptions.closingCostsPct
    const summary = calculateProjectionSummary(projections, totalCashInvested)

    expect(summary.irr).toBeGreaterThan(0)
    expect(Number.isFinite(summary.irr)).toBe(true)
  })
})
