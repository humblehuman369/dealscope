import { describe, expect, it } from 'vitest'
import { actualMonthlyCashFlow, cashFlowVariancePct } from '@/lib/portfolioActuals'

describe('actualMonthlyCashFlow', () => {
  it('returns rent minus all-in expenses', () => {
    expect(actualMonthlyCashFlow({ monthly_rent: 2300, monthly_expenses: 1900 })).toBe(400)
  })

  it('returns null when either side is missing', () => {
    expect(actualMonthlyCashFlow({ monthly_rent: 2300 })).toBeNull()
    expect(actualMonthlyCashFlow({ monthly_expenses: 1900 })).toBeNull()
    expect(actualMonthlyCashFlow(null)).toBeNull()
  })

  it('preserves a zero cash-flow result', () => {
    expect(actualMonthlyCashFlow({ monthly_rent: 1900, monthly_expenses: 1900 })).toBe(0)
  })
})

describe('cashFlowVariancePct', () => {
  it('is positive when actual beats the underwrite', () => {
    expect(cashFlowVariancePct(400, 320)).toBeCloseTo(25, 5)
  })

  it('is negative when actual underperforms', () => {
    expect(cashFlowVariancePct(240, 320)).toBeCloseTo(-25, 5)
  })

  it('returns null when projected is missing or zero', () => {
    expect(cashFlowVariancePct(400, null)).toBeNull()
    expect(cashFlowVariancePct(400, 0)).toBeNull()
    expect(cashFlowVariancePct(null, 320)).toBeNull()
  })
})
