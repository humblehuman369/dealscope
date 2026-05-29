/**
 * Seller-carry monthly payment. By default the note amortizes principal over the term —
 * including 0% notes, where the payment is simply principal ÷ term (no interest).
 * Pass `interestOnly` for deferred/balloon-only creative-finance notes (e.g. Morby Method,
 * Seller 2nd 0% balloon): a 0% deferred note has no monthly payment ($0/mo until balloon).
 * Matches backend `seller_monthly_payment` in calculators/common.py.
 */

import { calculateMortgagePayment } from '@/utils/calculations'

/** Annual rate as decimal (0.05 = 5%). Term in years. */
export function sellerMonthlyPayment(
  principal: number,
  annualRateDecimal: number,
  termYears: number,
  interestOnly = false,
): number {
  if (principal <= 0 || termYears <= 0) return 0
  if (interestOnly) {
    return annualRateDecimal <= 0 ? 0 : (principal * annualRateDecimal) / 12
  }
  // 0% amortizes principal over the term; nonzero amortizes P&I over the term.
  return calculateMortgagePayment(principal, annualRateDecimal * 100, termYears)
}
