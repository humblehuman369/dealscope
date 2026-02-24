/**
 * Canonical monthly mortgage payment (P&I) calculation.
 *
 * All call sites across the mobile app should import from here
 * to avoid duplicated formulas with divergent rate conventions.
 *
 * @param principal   - Loan amount in dollars
 * @param annualRate  - Annual interest rate as a **decimal** (0.06 = 6 %).
 *                      If you have a percentage like 7.25, divide by 100 first.
 * @param termYears   - Loan term in years (e.g. 30)
 * @returns Monthly payment amount (principal + interest only)
 */
export function calculateMonthlyMortgage(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return Number.isFinite(payment) ? payment : 0;
}

/**
 * Convenience wrapper for callers that pass the rate as a whole-number
 * percentage (e.g. 7.25 for 7.25 %).  Used by the deprecated
 * `calculations.ts` strategy files which use that convention.
 */
export function calculateMortgagePaymentPct(
  principal: number,
  annualRatePct: number,
  termYears: number,
): number {
  return calculateMonthlyMortgage(principal, annualRatePct / 100, termYears);
}
