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
    // Seller note covers the full purchase price; only closing costs (3% of 735k) remain as cash.
    expect(metrics.cashNeeded).toBeCloseTo(735_000 * 0.03, 2)
  })

  const seller0PctBase = {
    buyPrice: 1_208_305,
    downPaymentPercent: 0.2,
    closingCostsPercent: 0.03,
    loanType: '30-year' as const,
    interestRate: 0.06,
    loanTermYears: 30,
    sellerFinancingAmount: 133_735,
    sellerInterestRate: 0,
    sellerTermYears: 5,
    rehabBudget: 0,
    arv: 1_300_000,
    monthlyRent: 7_030,
    otherIncome: 0,
    vacancyRate: 0.05,
    maintenanceRate: 0.05,
    managementRate: 0.08,
    annualPropertyTax: 12_000,
    annualInsurance: 12_000,
    monthlyHoa: 0,
    capexRate: 0.05,
    utilitiesMonthly: 0,
    pestControlAnnual: 0,
  }

  it('amortizes a 0% seller note over the term (principal ÷ term)', () => {
    const metrics = computeLtrMetricsFromState(seller0PctBase satisfies LTRDealMakerState)
    expect(metrics.sellerMonthlyPayment).toBeCloseTo(133_735 / (5 * 12), 2)
    expect(metrics.monthlyPayment).toBeCloseTo(
      (metrics.bankMonthlyPayment ?? 0) + (metrics.sellerMonthlyPayment ?? 0),
      2,
    )
  })

  it('treats a deferred (interest-only) 0% seller note as $0/mo', () => {
    const state = { ...seller0PctBase, sellerInterestOnly: true } satisfies LTRDealMakerState
    const metrics = computeLtrMetricsFromState(state)
    expect(metrics.sellerMonthlyPayment).toBe(0)
    expect(metrics.monthlyPayment).toBeCloseTo(metrics.bankMonthlyPayment ?? 0, 2)
  })
})
