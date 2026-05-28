/**
 * Seller-carry monthly payment — 0% seconds are interest-only until balloon ($0/mo).
 * Matches backend `seller_monthly_payment` in calculators/common.py.
 */

import { calculateMortgagePayment } from '@/utils/calculations'

/** Annual rate as decimal (0.05 = 5%). Term in years. */
export function sellerMonthlyPayment(
  principal: number,
  annualRateDecimal: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0
  if (annualRateDecimal <= 0) return 0
  return calculateMortgagePayment(principal, annualRateDecimal * 100, termYears)
}
