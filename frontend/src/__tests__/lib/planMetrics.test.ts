import { describe, expect, it } from 'vitest'

import { preLoadedRecordToDealMakerPatch } from '@/lib/dealStructures/loadScenario'
import { metricsFromPreLoadedRecord } from '@/lib/dealStructures/planMetrics'

describe('blended plan handoff → worksheet metrics', () => {
  const levers = {
    custom_purchase_price: 818_570,
    custom_rent_estimate: 6_186,
    pending_extras: {
      seller_carry_amount: 88_837,
      seller_carry_rate: 0,
      seller_carry_term_years: 5,
      seller_carry_balloon_years: 5,
      seller_carry_interest_only: true,
      down_payment_pct_override: 0.035,
    },
  }

  it('maps wizard DP and seller interest-only onto the worksheet patch', () => {
    const patch = preLoadedRecordToDealMakerPatch(levers)
    expect(patch.buyPrice).toBe(818_570)
    expect(patch.monthlyRent).toBe(6_186)
    expect(patch.sellerFinancingAmount).toBe(88_837)
    expect(patch.sellerInterestOnly).toBe(true)
    expect(patch.downPayment).toBeCloseTo(3.5, 5)
    expect(patch.sellerBalloonYears).toBe(5)
  })

  it('cash to close matches DP + closing at the offer price, not 20% down', () => {
    const metrics = metricsFromPreLoadedRecord(levers, {
      listPrice: 870_123,
      monthlyRent: 5_334,
    })
    expect(metrics.downPaymentPercent).toBeCloseTo(0.035, 5)
    expect(metrics.sellerInterestOnly).toBe(true)
    expect(metrics.cashToClose).toBeCloseTo(818_570 * (0.035 + 0.03), 0)
    expect(metrics.cashToClose).toBeLessThan(60_000)
    expect(metrics.cashToClose).not.toBeCloseTo(818_570 * 0.23, 0)
  })

  it('does not amortize a 0% interest-only seller 2nd', () => {
    const io = metricsFromPreLoadedRecord(levers, {
      listPrice: 870_123,
      monthlyRent: 6_186,
      annualPropertyTax: 0,
      annualInsurance: 0,
    })
    const amortizing = metricsFromPreLoadedRecord(
      {
        ...levers,
        pending_extras: {
          ...(levers.pending_extras as Record<string, unknown>),
          seller_carry_interest_only: false,
        },
      },
      {
        listPrice: 870_123,
        monthlyRent: 6_186,
        annualPropertyTax: 0,
        annualInsurance: 0,
      },
    )
    expect(io.monthlyCashFlow).toBeGreaterThan(amortizing.monthlyCashFlow + 900)
  })
})
