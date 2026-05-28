import { describe, expect, it } from 'vitest'
import { sellerMonthlyPayment } from '@/lib/sellerFinancing'
import { calculateMortgagePayment } from '@/utils/calculations'

describe('sellerMonthlyPayment', () => {
  it('returns 0 for 0% creative-finance seconds (balloon only)', () => {
    expect(sellerMonthlyPayment(133_735, 0, 5)).toBe(0)
  })

  it('amortizes when rate is positive', () => {
    const pi = sellerMonthlyPayment(100_000, 0.06, 30)
    const expected = calculateMortgagePayment(100_000, 6, 30)
    expect(pi).toBeCloseTo(expected, 2)
  })
})
