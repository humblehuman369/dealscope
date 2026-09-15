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

  it('uses the break-even guide when every Willow option meets 0 of 4', () => {
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
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [
        option({
          key: '1',
          structureId: 'rent-verification',
          headline: 'Target Rent → $5,203',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 25 },
          targetsMet: 0,
          isBest: false,
        }),
        option({
          key: '2',
          structureId: 'price-negotiation',
          headline: 'Negotiate to $454K',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 115 },
          targetsMet: 0,
          isBest: false,
        }),
        option({
          key: '3',
          structureId: 'seller-second-zero-balloon',
          headline: 'Seller carries $115,228 at 0%',
          metrics: OPTION_3_METRICS,
          targetsMet: 0,
          isBest: true,
        }),
        option({
          key: '4',
          structureId: 'larger-down',
          headline: 'Down Payment 39%',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 0 },
          targetsMet: 0,
          isBest: false,
        }),
        option({
          key: 'blend',
          structureId: 'blended-plan',
          headline: 'Blend: 6.7% price cut + $26K seller 2nd',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 25 },
          targetsMet: 0,
          isBest: false,
        }),
      ],
    })

    expect(model.guideText).toBe(
      'No lever gets this house to your targets. The best the levers do is Seller carries $115,228 at 0%: $213 a month, 0 of 4 targets. That is what you offer, and where you walk away.',
    )
    expect(model.guideApplyKind).toBe('start')
  })

  it('uses the break-even guide when the best plan meets 0 of 4 even if another option is applied', () => {
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
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [
        option({
          key: '2',
          structureId: 'price-negotiation',
          headline: 'Negotiate to $454K',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 79 },
          targetsMet: 0,
          isBest: true,
        }),
        option({
          key: '3',
          structureId: 'seller-second-zero-balloon',
          headline: 'Seller carries $115,228 at 0%',
          metrics: OPTION_3_METRICS,
          targetsMet: 0,
          isBest: false,
        }),
      ],
    })

    expect(model.guideText).toBe(
      'No lever gets this house to your targets. The best the levers do is Negotiate to $454K: $79 a month, 0 of 4 targets. That is what you offer, and where you walk away.',
    )
    expect(model.guideText).not.toContain('meets 0 of 4 targets. Option 2')
  })

  it('prints a minus before the dollar sign on option cards and hero tiles', () => {
    const model = formatPlanSnapshot({
      optionKey: '3',
      offerPrice: 625_999,
      cashNeeded: 143_980,
      monthlyCashFlow: -11,
      cashOnCash: -0.4,
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
      equity: -36,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [
        option({
          key: '3',
          structureId: 'seller-second-zero-balloon',
          headline: 'Seller carries $115,228 at 0%',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: -11 },
          targetsMet: 0,
          isBest: true,
        }),
        option({
          key: '4',
          structureId: 'larger-down',
          headline: 'Down Payment 39%',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: -36 },
          targetsMet: 0,
          isBest: false,
        }),
      ],
    })

    expect(model.monthlyCashFlow).toBe('-$11')
    expect(model.options.find((item) => item.key === '3')?.cashFlowLabel).toBe('-$11 a month')
    expect(model.options.find((item) => item.key === '4')?.cashFlowLabel).toBe('-$36 a month')
    expect(model.closeCells[1]?.value).toBe('-$36')
    expect(model.monthlyCashFlow).not.toMatch(/\$\-/)
  })

  it('reads the balloon year from the Option 3 record', () => {
    const record = {
      custom_purchase_price: 625_999,
      pending_extras: {
        seller_carry_amount: 115_228,
        seller_carry_rate: 0,
        seller_carry_term_years: 5,
        seller_carry_interest_only: true,
      },
    }
    const worksheet = metricsFromPreLoadedRecord(record, {
      listPrice: 625_999,
      monthlyRent: 4_345,
    })
    expect(worksheet.balloonYear).toBe(5)
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
      targetsMet: 0,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
      vsList: 0,
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'seller-second-zero-balloon',
      options: [],
    })
    expect(model.closeCells[5]?.caption).toBe(
      'Owed to the seller in year 5. Plan the refinance or the payoff now.',
    )
    expect(model.closeCells[5]?.caption).not.toContain('year 10')
  })

  it('keeps the strong guide when the best plan meets 1 of 4', () => {
    const model = formatPlanSnapshot({
      optionKey: '2',
      offerPrice: 453_820,
      cashNeeded: 104_379,
      monthlyCashFlow: 115,
      cashOnCash: 1.3,
      capRate: 6.1,
      dscr: 1.2,
      bankLoan: 363_056,
      sellerAmount: 0,
      sellerRate: 0,
      balloonYear: 5,
      downPaymentPercent: 0.2,
      monthlyRent: 4_345,
      listPrice: 625_999,
      iqEstimate: 477_699,
      targetBuy: 453_814,
      askingGapDisplayPct: -27.5,
      gapLeftPct: 0,
      targetsMet: 1,
      capMet: true,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
      vsList: 172_179,
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: 'price-negotiation',
      options: [
        option({
          key: '2',
          structureId: 'price-negotiation',
          headline: 'Negotiate to $454K',
          metrics: { ...OPTION_3_METRICS, monthlyCashFlow: 115 },
          targetsMet: 1,
          isBest: true,
        }),
        option({
          key: '3',
          structureId: 'seller-second-zero-balloon',
          headline: 'Seller carries $115,228 at 0%',
          metrics: OPTION_3_METRICS,
          targetsMet: 0,
          isBest: false,
        }),
      ],
    })

    expect(model.guideText).toBe(
      'This is the strongest plan the levers make. It meets 1 of 4 targets and pays $115 a month. Start working it.',
    )
    expect(model.closeCells.some((cell) => cell.value === '$0')).toBe(false)
    expect(model.closeCells.some((cell) => cell.caption.includes('Owed to the seller'))).toBe(false)
    expect(model.nextMoves[0]).toContain('before you write the offer at $453,820')
  })

  it('does not print a $0 seller-second tile on If this closes', () => {
    const model = formatPlanSnapshot({
      optionKey: 'custom',
      offerPrice: 175_000,
      cashNeeded: 40_250,
      monthlyCashFlow: 1_791,
      cashOnCash: 53.4,
      capRate: 12,
      dscr: 2,
      bankLoan: 140_000,
      sellerAmount: 0,
      sellerRate: 0,
      balloonYear: 5,
      downPaymentPercent: 0.2,
      monthlyRent: 3_892,
      listPrice: 175_000,
      iqEstimate: 175_000,
      targetBuy: 175_000,
      askingGapDisplayPct: 0,
      gapLeftPct: 0,
      targetsMet: 4,
      capMet: true,
      cocMet: true,
      cfMet: true,
      dscrMet: true,
      vsList: 0,
      equity: 0,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: null,
      options: [],
    })
    expect(model.title).toBe('Your plan: your own numbers')
    expect(model.sentence).toContain('Your own numbers: buy at $175,000.')
    expect(model.sentence).not.toContain('seller carry $0')
    expect(model.closeCells).toHaveLength(5)
  })

  it('puts the payload cushion in the Guide why text', () => {
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
      iqEstimate: null,
      targetBuy: 453_814,
      askingGapDisplayPct: 0,
      gapLeftPct: 0,
      targetsMet: 0,
      capMet: false,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
      vsList: 0,
      equity: null,
      sourceLow: null,
      sourceHigh: null,
      appliedStructureId: null,
      options: [],
      monthlyCashFlowTarget: 25,
    })

    expect(model.guideWhy).toBe(
      'Options 1, 3, 4, and the blend show the smallest move on that lever that keeps the house from costing you money, with a $25 a month cushion. Option 2 shows the price that gets you to Target Buy.',
    )
    expect(
      formatPlanSnapshot({
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
        iqEstimate: null,
        targetBuy: 453_814,
        askingGapDisplayPct: 0,
        gapLeftPct: 0,
        targetsMet: 0,
        capMet: false,
        cocMet: false,
        cfMet: false,
        dscrMet: false,
        vsList: 0,
        equity: null,
        sourceLow: null,
        sourceHigh: null,
        appliedStructureId: null,
        options: [],
        monthlyCashFlowTarget: 99,
      }).guideWhy,
    ).toContain('$99 a month cushion')
  })
})
