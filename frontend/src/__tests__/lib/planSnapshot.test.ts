import { describe, expect, it } from 'vitest'

import {
  PLAN_TARGET_DEFAULTS,
  metricsFromPreLoadedRecord,
  scoreAgainstTargets,
  type ScoredPlanOption,
} from '@/lib/dealStructures/planMetrics'
import { formatPlanSnapshot } from '@/lib/dealStructures/planSnapshot'
import { formatMoneyExact } from '@/lib/verdictCopy'

const OPTION_3_METRICS = {
  offerPrice: 625_999,
  sellerSecond: 115_228,
  sellerRate: 0,
  balloonYear: 5,
  monthlyRent: 4_345,
  downPaymentPercent: 0.2,
  sellerInterestOnly: true,
  cashToClose: 143_980,
  monthlyCashFlow: 213,
  capRate: 4.84,
  cashOnCash: 1.77,
  dscr: 1.09,
  bankLoan: 385_571,
}

const BLEND_METRICS = {
  ...OPTION_3_METRICS,
  offerPrice: 500_000,
  cashToClose: 115_000,
  monthlyCashFlow: 817,
  capRate: 6.5,
  cashOnCash: 8.5,
  dscr: 1.4,
}

function option(
  partial: Pick<ScoredPlanOption, 'key' | 'structureId' | 'headline' | 'metrics' | 'targetsMet' | 'isBest'>,
): ScoredPlanOption {
  return {
    family:
      partial.key === '1'
        ? 'income'
        : partial.key === '2'
          ? 'price'
          : partial.key === '3'
            ? 'financing'
            : partial.key === '4'
              ? 'capital_stack'
              : 'blended',
    familyLabel: partial.headline,
    ...partial,
  }
}

describe('formatPlanSnapshot', () => {
  it('maps and formats worksheet numbers without changing them', () => {
    const model = formatPlanSnapshot({
      optionKey: '3',
      offerPrice: 625_999,
      cashNeeded: 143_980,
      monthlyCashFlow: 213,
      cashOnCash: 1.77,
      capRate: 4.84,
      dscr: 1.09,
      bankLoan: 385_571,
      sellerAmount: 115_228,
      sellerRate: 0,
      balloonYear: 5,
      downPaymentPercent: 0.2,
      monthlyRent: 4_345,
      listPrice: 625_999,
      iqEstimate: 477_699,
      targetBuy: 453_814,
      askingGapDisplayPct: -27.5,
      gapLeftPct: 27.5,
      targetsMet: 0,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
      vsList: 0,
      equity: 477_699 - 625_999,
      sourceLow: 450_000,
      sourceHigh: 510_000,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [
        option({
          key: '3',
          structureId: 'seller-second-zero-balloon',
          headline: 'Seller carries $115,228 at 0%',
          metrics: OPTION_3_METRICS,
          targetsMet: 0,
          isBest: false,
        }),
        option({
          key: 'blend',
          structureId: 'blended-plan',
          headline: '$500,000 with the seller carrying $115,228 at 0%',
          metrics: BLEND_METRICS,
          targetsMet: 4,
          isBest: true,
        }),
      ],
      targets: PLAN_TARGET_DEFAULTS,
    })

    expect(model.offerPrice).toBe('$625,999')
    expect(model.cashNeeded).toBe('$143,980')
    expect(model.monthlyCashFlow).toBe('$213')
    expect(model.cashOnCash).toBe('1.8%')
    expect(model.targetRows.map((row) => [row.measure, row.plan, row.target, row.result])).toEqual([
      ['Cap rate', '4.8%', '6.0%', '✕ Below'],
      ['Cash-on-cash', '1.8%', '8.0%', '✕ Below'],
      ['Cash flow a month', '$213', '$300', '✕ Below'],
      ['DSCR', '1.09', '1.25', '✕ Below'],
    ])
    expect(model.guideApplyKind).toBe('apply')
    expect(model.guideApplyLabel).toBe('Apply the blend')
    expect(model.guideApplyStructureId).toBe('blended-plan')
    expect(model.options.find((item) => item.key === '3')?.isApplied).toBe(true)
    expect(model.options.find((item) => item.key === 'blend')?.isBest).toBe(true)
    expect(model.gapLine).toContain('Gap at asking -27.5%')
  })

  it('prints Plan numbers from the Sept 13 Option 3 worksheet record, not typed dollars', () => {
    // Frozen Option 3 record from the Sept 13 worksheet (annual cash flow $2,552,
    // cap rate 4.84%, cash-on-cash 1.77%, DSCR 1.09). Assert Plan === worksheet.
    const record = {
      custom_purchase_price: 625_999,
      custom_rent_estimate: 4_345,
      pending_extras: {
        seller_carry_amount: 115_228,
        seller_carry_rate: 0,
        seller_carry_term_years: 5,
        seller_carry_balloon_years: 5,
        seller_carry_interest_only: true,
        down_payment_pct_override: 0.2,
      },
    }
    const worksheet = metricsFromPreLoadedRecord(record, {
      listPrice: 625_999,
      monthlyRent: 4_345,
    })
    const score = scoreAgainstTargets({
      capRate: worksheet.capRate,
      cashOnCash: worksheet.cashOnCash,
      monthlyCashFlow: worksheet.monthlyCashFlow,
      dscr: worksheet.dscr,
    })
    const model = formatPlanSnapshot({
      optionKey: '3',
      offerPrice: worksheet.offerPrice,
      cashNeeded: worksheet.cashToClose,
      monthlyCashFlow: worksheet.monthlyCashFlow,
      cashOnCash: worksheet.cashOnCash,
      capRate: worksheet.capRate,
      dscr: worksheet.dscr,
      bankLoan: worksheet.bankLoan,
      sellerAmount: worksheet.sellerSecond,
      sellerRate: worksheet.sellerRate,
      balloonYear: worksheet.balloonYear,
      downPaymentPercent: worksheet.downPaymentPercent,
      monthlyRent: worksheet.monthlyRent,
      listPrice: 625_999,
      iqEstimate: null,
      targetBuy: 453_814,
      askingGapDisplayPct: 0,
      gapLeftPct: 0,
      targetsMet: score.targetsMet,
      capMet: score.capMet,
      cocMet: score.cocMet,
      cfMet: score.cfMet,
      dscrMet: score.dscrMet,
      vsList: 0,
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [],
      targets: PLAN_TARGET_DEFAULTS,
    })

    expect(model.offerPrice).toBe(formatMoneyExact(worksheet.offerPrice))
    expect(model.cashNeeded).toBe(formatMoneyExact(worksheet.cashToClose))
    expect(model.monthlyCashFlow).toBe(formatMoneyExact(worksheet.monthlyCashFlow))
    expect(model.cashOnCash).toBe(`${worksheet.cashOnCash.toFixed(1)}%`)
    expect(model.targetRows[0]?.plan).toBe(`${worksheet.capRate.toFixed(1)}%`)
    expect(model.targetRows[1]?.plan).toBe(`${worksheet.cashOnCash.toFixed(1)}%`)
    expect(model.targetRows[2]?.plan).toBe(formatMoneyExact(worksheet.monthlyCashFlow))
    expect(model.targetRows[3]?.plan).toBe(worksheet.dscr.toFixed(2))
  })
})
