import { describe, expect, it } from 'vitest'

import { preLoadedRecordToDealMakerPatch } from '@/lib/dealStructures/loadScenario'
import {
  PLAN_TARGET_DEFAULTS,
  metricsFromPreLoadedRecord,
  optionKeyFromFamily,
  scoreAgainstTargets,
  scorePlanOptions,
  tuneGroupForOption,
  type PlanTargetDefaults,
} from '@/lib/dealStructures/planMetrics'

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

describe('scoreAgainstTargets', () => {
  it('scores the Sept 13 Option 3 worksheet fixtures as 0 of 4', () => {
    const score = scoreAgainstTargets({
      capRate: 4.84,
      cashOnCash: 1.77,
      monthlyCashFlow: 2_552 / 12,
      dscr: 1.09,
    })
    expect(score).toEqual({
      targetsMet: 0,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
    })
    expect(PLAN_TARGET_DEFAULTS).toEqual({
      capRate: 6.0,
      cashOnCash: 8.0,
      monthlyCashFlow: 300,
      dscr: 1.25,
    })
  })

  it('counts a target only when the worksheet number meets the bar', () => {
    expect(scoreAgainstTargets(PLAN_TARGET_DEFAULTS).targetsMet).toBe(4)
  })

  it('marks each of the four targets met and missed independently', () => {
    const below = {
      capRate: PLAN_TARGET_DEFAULTS.capRate - 0.1,
      cashOnCash: PLAN_TARGET_DEFAULTS.cashOnCash - 0.1,
      monthlyCashFlow: PLAN_TARGET_DEFAULTS.monthlyCashFlow - 1,
      dscr: PLAN_TARGET_DEFAULTS.dscr - 0.01,
    }
    expect(scoreAgainstTargets(below)).toEqual({
      targetsMet: 0,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
    })

    expect(scoreAgainstTargets({ ...below, capRate: PLAN_TARGET_DEFAULTS.capRate })).toEqual({
      targetsMet: 1,
      capMet: true,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
    })
    expect(scoreAgainstTargets({ ...below, cashOnCash: PLAN_TARGET_DEFAULTS.cashOnCash })).toEqual({
      targetsMet: 1,
      capMet: false,
      cocMet: true,
      cfMet: false,
      dscrMet: false,
    })
    expect(
      scoreAgainstTargets({ ...below, monthlyCashFlow: PLAN_TARGET_DEFAULTS.monthlyCashFlow }),
    ).toEqual({
      targetsMet: 1,
      capMet: false,
      cocMet: false,
      cfMet: true,
      dscrMet: false,
    })
    expect(scoreAgainstTargets({ ...below, dscr: PLAN_TARGET_DEFAULTS.dscr })).toEqual({
      targetsMet: 1,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: true,
    })

    const at = { ...PLAN_TARGET_DEFAULTS }
    expect(scoreAgainstTargets({ ...at, capRate: below.capRate }).capMet).toBe(false)
    expect(scoreAgainstTargets({ ...at, capRate: below.capRate }).targetsMet).toBe(3)
    expect(scoreAgainstTargets({ ...at, cashOnCash: below.cashOnCash }).cocMet).toBe(false)
    expect(scoreAgainstTargets({ ...at, cashOnCash: below.cashOnCash }).targetsMet).toBe(3)
    expect(scoreAgainstTargets({ ...at, monthlyCashFlow: below.monthlyCashFlow }).cfMet).toBe(false)
    expect(scoreAgainstTargets({ ...at, monthlyCashFlow: below.monthlyCashFlow }).targetsMet).toBe(3)
    expect(scoreAgainstTargets({ ...at, dscr: below.dscr }).dscrMet).toBe(false)
    expect(scoreAgainstTargets({ ...at, dscr: below.dscr }).targetsMet).toBe(3)
  })
})

describe('scorePlanOptions', () => {
  it('keeps engine slot order and picks most targets, then cash flow', () => {
    const scored = scorePlanOptions(
      [
        {
          family: 'income',
          id: 'opt-1',
          headline: 'Prove rent',
          familyLabel: 'Income',
          preLoadedRecord: { custom_purchase_price: 625_999, custom_rent_estimate: 6_000 },
        },
        {
          family: 'financing',
          id: 'opt-3',
          headline: 'Seller second',
          familyLabel: 'Financing',
          preLoadedRecord: {
            custom_purchase_price: 625_999,
            pending_extras: {
              seller_carry_amount: 115_228,
              seller_carry_rate: 0,
              seller_carry_interest_only: true,
            },
          },
        },
        {
          family: 'blended',
          id: 'blended-plan',
          headline: 'Engine blend',
          familyLabel: 'Blend',
          preLoadedRecord: {
            custom_purchase_price: 500_000,
            custom_rent_estimate: 6_000,
            pending_extras: {
              seller_carry_amount: 115_228,
              seller_carry_rate: 0,
              seller_carry_interest_only: true,
            },
          },
        },
      ],
      {
        listPrice: 625_999,
        monthlyRent: 4_345,
        annualPropertyTax: 0,
        annualInsurance: 0,
      },
    )
    expect(scored.map((option) => option.key)).toEqual(['1', '3', 'blend'])
    expect(optionKeyFromFamily('blended')).toBe('blend')
    const best = scored.find((option) => option.isBest)
    expect(best?.structureId).toBe('blended-plan')
  })

  it('breaks a targets-met tie with the higher monthly cash flow', () => {
    const openTargets = {
      capRate: -999,
      cashOnCash: -999,
      monthlyCashFlow: -999_999,
      dscr: -999,
    } as PlanTargetDefaults
    const scored = scorePlanOptions(
      [
        {
          family: 'price',
          id: 'lower-cf',
          headline: 'Lower cash flow',
          familyLabel: 'Price',
          preLoadedRecord: { custom_purchase_price: 400_000, custom_rent_estimate: 2_000 },
        },
        {
          family: 'financing',
          id: 'higher-cf',
          headline: 'Higher cash flow',
          familyLabel: 'Financing',
          preLoadedRecord: { custom_purchase_price: 400_000, custom_rent_estimate: 4_000 },
        },
      ],
      {
        listPrice: 400_000,
        monthlyRent: 2_000,
        annualPropertyTax: 0,
        annualInsurance: 0,
      },
      openTargets,
    )
    expect(scored.every((option) => option.targetsMet === 4)).toBe(true)
    const higher = scored.find((option) => option.structureId === 'higher-cf')
    const lower = scored.find((option) => option.structureId === 'lower-cf')
    expect(higher?.metrics.monthlyCashFlow).toBeGreaterThan(lower?.metrics.monthlyCashFlow ?? 0)
    expect(scored.find((option) => option.isBest)?.structureId).toBe('higher-cf')
  })
})

describe('tuneGroupForOption', () => {
  it('opens rent for option 1 and pay for price, finance, and equity', () => {
    expect(tuneGroupForOption('1')).toBe('earn')
    expect(tuneGroupForOption('2')).toBe('pay')
    expect(tuneGroupForOption('3')).toBe('pay')
    expect(tuneGroupForOption('4')).toBe('pay')
    expect(tuneGroupForOption('blend')).toBe('pay')
  })
})
