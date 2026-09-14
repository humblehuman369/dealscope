import { describe, expect, it } from 'vitest'

import { PLAN_TARGET_DEFAULTS, type ScoredPlanOption } from '@/lib/dealStructures/planMetrics'
import { formatPlanSnapshot } from '@/lib/dealStructures/planSnapshot'

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
})
