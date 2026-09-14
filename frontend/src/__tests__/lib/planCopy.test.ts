import { describe, expect, it } from 'vitest'

import {
  PLAN_GUIDE_WHY,
  formatGuideBreakeven,
  formatGuideCompare,
  formatGuideStrong,
  formatGuideWhy,
  formatOptionsFooter,
  formatPlanBottomLine,
  formatPlanSentence,
  formatPlanTitle,
  formatResetToOption,
} from '@/lib/planCopy'

const WILLOW_OPTION_3 = {
  optionKey: '3' as const,
  offerPrice: 625_999,
  monthlyRent: 4_345,
  sellerAmount: 115_228,
  sellerRate: 0,
  balloonYear: 5,
  downPaymentPercent: 0.2,
  cashNeeded: 143_980,
  monthlyCashFlow: 213,
  targetsMet: 0,
}

describe('formatPlanSentence', () => {
  it('matches the Section 5 Option 3 sentence for Wandering Willow', () => {
    expect(formatPlanSentence(WILLOW_OPTION_3)).toBe(
      'Option 3 keeps the price at $625,999 and has the seller carry $115,228 at 0%. You bring $143,980. It pays you $213 a month. That misses all four of your targets.',
    )
  })

  it('uses the feed-it clause and the four-of-four clause', () => {
    expect(
      formatPlanSentence({
        ...WILLOW_OPTION_3,
        optionKey: '2',
        offerPrice: 500_000,
        monthlyCashFlow: -80,
        targetsMet: 4,
      }),
    ).toBe(
      'You negotiate the price down to $500,000. You bring $143,980. You would feed it $80 a month. That meets all four of your targets.',
    )
  })

  it('assembles each of the five structures plus custom', () => {
    const base = { ...WILLOW_OPTION_3, targetsMet: 2 }
    expect(formatPlanSentence({ ...base, optionKey: '1' })).toBe(
      'You buy at $625,999 and prove a rent of $4,345 a month. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
    expect(formatPlanSentence({ ...base, optionKey: '2', offerPrice: 500_000 })).toBe(
      'You negotiate the price down to $500,000. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
    expect(formatPlanSentence({ ...base, optionKey: '4' })).toBe(
      'You buy at $625,999 and put 20% down. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
    expect(formatPlanSentence({ ...base, optionKey: 'blend' })).toBe(
      'You buy at $625,999 with the seller carrying $115,228 at 0%, paid in full in year 5. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
    expect(formatPlanSentence({ ...base, optionKey: 'custom' })).toBe(
      'Your own numbers: buy at $625,999 with the seller carrying $115,228 at 0%. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
    expect(formatPlanSentence({ ...base, optionKey: 'custom', sellerAmount: 0 })).toBe(
      'Your own numbers: buy at $625,999. You bring $143,980. It pays you $213 a month. That meets 2 of your four targets.',
    )
  })
})

describe('formatPlanTitle', () => {
  it('names the applied option', () => {
    expect(formatPlanTitle('3')).toBe('Your plan: creative finance')
    expect(formatPlanTitle('blend')).toBe('Your plan: blend')
  })
})

describe('guide copy', () => {
  it('recommends the blend when Option 3 is weaker', () => {
    expect(
      formatGuideCompare({
        appliedTitle: 'Option 3: Creative finance',
        appliedMet: 0,
        bestTitle: 'Blend',
        bestMet: 4,
        bestLever: '$500,000 with the seller carrying $115,228 at 0%',
        bestMonthlyCashFlow: 817,
        bestCashOnCash: 8.5,
      }),
    ).toBe(
      'Option 3: Creative finance meets 0 of 4 targets. Blend meets 4 of 4: $500,000 with the seller carrying $115,228 at 0%. That pays $817 a month, a 8.5% cash return.',
    )
  })

  it('calls the applied option strongest when it wins', () => {
    expect(formatGuideStrong({ targetsMet: 4, monthlyCashFlow: 817 })).toBe(
      'This is the strongest plan the levers make. It meets 4 of 4 targets and pays $817 a month. Start working it.',
    )
  })

  it('still uses the strong case at 1 of 4', () => {
    expect(formatGuideStrong({ targetsMet: 1, monthlyCashFlow: 115 })).toBe(
      'This is the strongest plan the levers make. It meets 1 of 4 targets and pays $115 a month. Start working it.',
    )
  })

  it('uses the break-even branch when no option meets a target', () => {
    expect(
      formatGuideBreakeven({
        bestLever: 'Seller carries $115,228 at 0%',
        monthlyCashFlow: 213,
      }),
    ).toBe(
      'No lever gets this house to your targets. The best the levers do is Seller carries $115,228 at 0%: $213 a month, 0 of 4 targets. That is what you offer, and where you walk away.',
    )
  })

  it('reads the $25 cushion from the plan payload, not a frontend constant', () => {
    expect(formatGuideWhy(25)).toBe(
      'Options 1, 3, 4, and the blend show the smallest move on that lever that keeps the house from costing you money, with a $25 a month cushion. Option 2 shows the price that gets you to Target Buy.',
    )
    expect(formatGuideWhy(99)).toContain('$99 a month cushion')
    expect(formatGuideWhy(99)).not.toContain('$25 a month cushion')
    expect(formatGuideWhy(null)).toBe(PLAN_GUIDE_WHY)
  })
})

describe('formatOptionsFooter', () => {
  it('names the standard targets and does not mention the profile', () => {
    expect(
      formatOptionsFooter({
        capRate: 6,
        cashOnCash: 8,
        monthlyCashFlow: 300,
        dscr: 1.25,
      }),
    ).toBe(
      "Scores use DealGapIQ's standard targets: 6.0% cap rate, 8.0% cash-on-cash, $300 a month, 1.25 DSCR.",
    )
  })
})

describe('formatPlanBottomLine', () => {
  it('says the plan misses when zero targets are met', () => {
    expect(formatPlanBottomLine(0)).toBe('This plan misses your targets.')
  })

  it('names how many of the four targets are met', () => {
    expect(formatPlanBottomLine(2)).toBe('This plan meets 2 of your four targets.')
    expect(formatPlanBottomLine(4)).toBe('This plan meets 4 of your four targets.')
  })

  it('never uses the old numbers-work string', () => {
    for (const n of [0, 1, 2, 3, 4]) {
      expect(formatPlanBottomLine(n)).not.toMatch(/numbers work/i)
    }
  })
})

describe('formatResetToOption', () => {
  it('names the applied option', () => {
    expect(formatResetToOption('3')).toBe('Reset to creative finance')
  })
})
