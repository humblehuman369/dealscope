import { describe, expect, it } from 'vitest'

import { formatPlanSnapshot } from '@/lib/dealStructures/planSnapshot'
import { PLAN_TARGET_DEFAULTS } from '@/lib/dealStructures/planMetrics'
import { formatPlanSourceCountLine, PHASE_15_COPY } from '@/lib/phase15Copy'

describe('source-count sentence on Plan', () => {
  it('never hardcodes Five and names the missing source when N is below the roster', () => {
    expect(
      formatPlanSourceCountLine({
        answered: 4,
        total: 5,
        missingLabels: ['Zillow'],
        low: '$200,000',
        high: '$240,000',
        iqEstimate: '$220,000',
      }),
    ).toBe(
      '4 of 5 sources value this house between $200,000 and $240,000. Zillow did not answer. The IQ Estimate is $220,000. Tap any number for its source.',
    )
    expect(
      formatPlanSourceCountLine({
        answered: 5,
        total: 5,
        missingLabels: [],
        low: '$200,000',
        high: '$240,000',
        iqEstimate: '$220,000',
      }),
    ).toBe(
      '5 sources value this house between $200,000 and $240,000. The IQ Estimate is $220,000. Tap any number for its source.',
    )
    expect(formatPlanSourceCountLine({
      answered: 5,
      total: 5,
      missingLabels: [],
      low: '$200,000',
      high: '$240,000',
      iqEstimate: '$220,000',
    })).not.toContain('Five')
  })

  it('uses the same roster counts on the Plan snapshot line', () => {
    const model = formatPlanSnapshot({
      optionKey: '2',
      offerPrice: 200_000,
      cashNeeded: 46_000,
      monthlyCashFlow: 115,
      cashOnCash: 1.3,
      capRate: 6.1,
      dscr: 1.2,
      bankLoan: 160_000,
      sellerAmount: 0,
      sellerRate: 0,
      balloonYear: 5,
      downPaymentPercent: 0.2,
      monthlyRent: 2_000,
      listPrice: 250_000,
      iqEstimate: 220_000,
      targetBuy: 200_000,
      askingGapDisplayPct: -20,
      gapLeftPct: 0,
      targetsMet: 1,
      capMet: true,
      cocMet: false,
      cfMet: false,
      dscrMet: false,
      vsList: 50_000,
      equity: 20_000,
      sourceLow: 200_000,
      sourceHigh: 240_000,
      sourceAnswered: 4,
      sourceTotal: 5,
      sourceMissingLabels: ['Zillow'],
      appliedStructureId: null,
      options: [],
      targets: PLAN_TARGET_DEFAULTS,
    })
    expect(model.sourceLine).toBe(
      '4 of 5 sources value this house between $200,000 and $240,000. Zillow did not answer. The IQ Estimate is $220,000. Tap any number for its source.',
    )
    expect(PHASE_15_COPY.seeTheVerdict).toBe('See the verdict')
    expect(PHASE_15_COPY.couldNotSaveProperty).toBe('Could not save property')
  })

  it('starts with answered of total when a source is missing but unlabeled', () => {
    expect(
      formatPlanSourceCountLine({
        answered: 4,
        total: 5,
        missingLabels: [],
        low: '$200,000',
        high: '$240,000',
        iqEstimate: '$220,000',
      }),
    ).toBe(
      '4 of 5 sources value this house between $200,000 and $240,000. The IQ Estimate is $220,000. Tap any number for its source.',
    )
    expect(
      formatPlanSourceCountLine({
        answered: 4,
        total: 5,
        missingLabels: [],
        low: '$200,000',
        high: '$240,000',
        iqEstimate: '$220,000',
      }),
    ).not.toContain('did not answer')
  })
})
