import { describe, expect, it } from 'vitest'
import { sellerMonthlyPayment } from '@/lib/sellerFinancing'
import { calculateMortgagePayment } from '@/utils/calculations'

describe('sellerMonthlyPayment', () => {
  it('amortizes principal over the term for a 0% note (principal ÷ term)', () => {
    expect(sellerMonthlyPayment(133_735, 0, 5)).toBeCloseTo(133_735 / (5 * 12), 2)
  })

  it('returns 0 for a deferred (interest-only) 0% note — balloon only', () => {
    expect(sellerMonthlyPayment(133_735, 0, 5, true)).toBe(0)
  })

  it('amortizes when rate is positive', () => {
    const pi = sellerMonthlyPayment(100_000, 0.06, 30)
    const expected = calculateMortgagePayment(100_000, 6, 30)
    expect(pi).toBeCloseTo(expected, 2)
  })
})
