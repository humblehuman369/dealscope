import { describe, expect, it } from 'vitest'
import { computeLtrMetricsFromState } from '@/lib/ltrWorksheetMetrics'
import { calculateMortgagePayment } from '@/utils/calculations'
import type { LTRDealMakerState } from '@/features/deal-maker/components/types'

describe('computeLtrMetricsFromState', () => {
  it('zeros the bank loan when seller financing covers the full zero-down purchase', () => {
    const state = {
      buyPrice: 735_000,
      downPaymentPercent: 0,
      closingCostsPercent: 0.03,
      loanType: '30-year',
      interestRate: 0.05,
      loanTermYears: 30,
      sellerFinancingAmount: 735_000,
      sellerInterestRate: 0.05,
      sellerTermYears: 30,
      rehabBudget: 0,
      arv: 735_000,
      monthlyRent: 6_000,
      otherIncome: 0,
      vacancyRate: 0.05,
      maintenanceRate: 0.05,
      managementRate: 0.08,
      annualPropertyTax: 0,
      annualInsurance: 0,
      monthlyHoa: 0,
      capexRate: 0,
      utilitiesMonthly: 0,
      pestControlAnnual: 0,
    } satisfies LTRDealMakerState

    const metrics = computeLtrMetricsFromState(state)
    const sellerPi = calculateMortgagePayment(735_000, 5, 30)

    expect(metrics.loanAmount).toBe(0)
    expect(metrics.bankMonthlyPayment).toBe(0)
    expect(metrics.sellerMonthlyPayment).toBeCloseTo(sellerPi, 2)
    expect(metrics.monthlyPayment).toBeCloseTo(sellerPi, 2)
    expect(metrics.cashNeeded).toBe(0)
  })
})
