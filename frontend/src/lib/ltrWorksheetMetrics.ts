/**
 * Client-side LTR worksheet metrics — keeps sliders and summary rows in sync
 * while the debounced `/api/v1/analysis/verdict` recalc is in flight.
 *
 * Math aligns with `DealMakerWorksheet` LTR (vacancy as income adjustment;
 * opex via `computeLtrOperatingExpenseBreakdown`; seller carry reduces bank loan).
 */

import { computeLtrOperatingExpenseBreakdown } from '@/lib/ltrOperatingExpenses'
import { sellerMonthlyPayment } from '@/lib/sellerFinancing'
import { calculateMortgagePayment } from '@/utils/calculations'
import type { LTRDealMakerMetrics, LTRDealMakerState } from '@/features/deal-maker/components/types'

export function computeLtrMetricsFromState(
  state: LTRDealMakerState,
  options?: { dealGapPct?: number; landscapingAnnual?: number },
): LTRDealMakerMetrics {
  const buy = state.buyPrice
  const downPaymentAmount = buy * state.downPaymentPercent
  const closingCostsAmount = buy * state.closingCostsPercent
  const sellerFin = Math.max(0, state.sellerFinancingAmount ?? 0)

  const loanAmount = Math.max(0, buy - downPaymentAmount - sellerFin)
  // Sources & uses: cash needed = (price + closing + rehab) − (bank loan + seller note).
  // Negative when financing exceeds purchase + costs (cash back at close).
  const cashNeeded = buy + closingCostsAmount + (state.rehabBudget ?? 0) - loanAmount - sellerFin
  const bankPi =
    loanAmount > 0
      ? calculateMortgagePayment(loanAmount, state.interestRate * 100, state.loanTermYears)
      : 0
  const sellerPi =
    sellerFin > 0
      ? sellerMonthlyPayment(
          sellerFin,
          state.sellerInterestRate ?? 0,
          state.sellerTermYears ?? 30,
        )
      : 0
  const monthlyPayment = bankPi + sellerPi

  const grossMonthlyIncome = state.monthlyRent + (state.otherIncome ?? 0)
  const annualGrossRent = grossMonthlyIncome * 12
  const effectiveGross = annualGrossRent * (1 - state.vacancyRate)

  const opex = computeLtrOperatingExpenseBreakdown({
    annualPropertyTax: state.annualPropertyTax,
    annualInsurance: state.annualInsurance,
    monthlyHoa: state.monthlyHoa,
    managementRate: state.managementRate ?? 0,
    maintenanceRate: state.maintenanceRate,
    annualGrossRent,
    capexPct: state.capexRate,
    utilitiesMonthly: state.utilitiesMonthly,
    pestControlAnnual: state.pestControlAnnual,
    landscapingAnnual: options?.landscapingAnnual,
  })

  const annualDebt = monthlyPayment * 12
  const annualProfit = effectiveGross - opex.total - annualDebt
  const noi = effectiveGross - opex.total
  const capRate = buy > 0 ? (noi / buy) * 100 : 0
  const cocReturn = cashNeeded > 0 ? (annualProfit / cashNeeded) * 100 : 0

  return {
    cashNeeded,
    dealGap: (options?.dealGapPct ?? 0) / 100,
    annualProfit,
    capRate,
    cocReturn,
    monthlyPayment,
    loanAmount,
    bankMonthlyPayment: bankPi,
    sellerMonthlyPayment: sellerPi,
    equityCreated: 0,
    grossMonthlyIncome,
    totalMonthlyExpenses: opex.total / 12 + monthlyPayment,
  }
}
