import { describe, expect, it } from 'vitest'

import {
  formatGuideCompare,
  formatGuideStrong,
  formatPlanSentence,
  formatPlanTitle,
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
})
