import { describe, expect, it } from 'vitest'

import type { DealStructure, DealStructuresPayload } from '@/components/iq-verdict/PathOptionCard'
import {
  buildHowThisClosesRows,
  closesGapFromAlone,
  confidenceTagFromRating,
  howThisClosesParagraph,
  startHereRowId,
} from '@/lib/leverTags'

function structure(
  id: string,
  family: DealStructure['family'],
  extra: Partial<DealStructure> = {},
): DealStructure {
  return {
    id,
    family,
    familyLabel: family,
    realismLabel: 'Common',
    headline: id,
    bullets: [],
    summary: 'engine summary',
    levers: [],
    monthlySavings: 250,
    cashRequired: 60_000,
    rankingScore: 50,
    pitchScript: null,
    caveat: null,
    selectionReason: null,
    preLoadedRecord: null,
    ...extra,
  }
}

const PAYLOAD: DealStructuresPayload = {
  hasPaths: true,
  narrativeParagraphs: [],
  paths: [
    structure('rent-verification', 'income', {
      breakeven: {
        changePct: 18.2,
        changeAmount: 535,
        resultAmount: 3_475,
        resultLabel: 'Target rent',
        closesGapAlone: true,
        termsNote: null,
      },
      negotiability: { rating: 'low', score: 30, reasons: ['A 18.2% lift usually means rehab'] },
    }),
    structure('price-negotiation', 'price', {
      breakeven: {
        changePct: 33.0,
        changeAmount: 152_000,
        resultAmount: 307_000,
        resultLabel: 'Target Buy',
        closesGapAlone: true,
        termsNote: null,
      },
      negotiability: { rating: 'medium', score: 55, reasons: ['3 price cuts already'] },
    }),
    structure('larger-down', 'capital_stack', {
      breakeven: {
        changePct: 15,
        changeAmount: 68_850,
        resultAmount: 160_650,
        resultLabel: 'Down payment',
        closesGapAlone: true,
        termsNote: '35% down',
      },
      negotiability: { rating: 'your_call', score: 100, reasons: ['Your decision'] },
    }),
    structure('seller-second', 'financing', {
      breakeven: {
        changePct: 20,
        changeAmount: 91_800,
        resultAmount: 91_800,
        resultLabel: 'Seller financing',
        closesGapAlone: false,
        termsNote: '0% interest',
      },
      negotiability: { rating: 'high', score: 72, reasons: ['Listed over a year'] },
    }),
    structure('blended-plan', 'blended', {
      headline: 'Blend: 8% price cut + $40,000 seller 2nd + 2% rent lift',
      preLoadedRecord: { pending_extras: { blended_closes_gap: true } },
    }),
  ],
  breakevenSummary: {
    listPrice: 459_000,
    baselineCashRequired: 114_750,
    gapAmount: 152_000,
    gapPct: 33.0,
    monthlyShortfall: 812,
    incomeValue: 323_000,
    targetBuyPrice: 307_000,
  },
  blendRecommendation:
    '3 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
}

describe('lever tag mapping', () => {
  it('maps closesGapAlone without comparing prices', () => {
    expect(closesGapFromAlone(true)).toEqual({ text: 'Closes the gap: yes', tone: 'yes' })
    expect(closesGapFromAlone(false)).toEqual({ text: 'Closes the gap: partly', tone: 'partly' })
  })

  it('maps the existing confidence field to the Section 5 adverbs', () => {
    expect(confidenceTagFromRating('price', 'high')).toEqual({
      text: 'Sellers say yes: often',
      tone: 'often',
    })
    expect(confidenceTagFromRating('financing', 'medium')).toEqual({
      text: 'Sellers say yes: sometimes',
      tone: 'sometimes',
    })
    expect(confidenceTagFromRating('income', 'low')).toEqual({
      text: 'Market says yes: rarely',
      tone: 'rarely',
    })
    expect(confidenceTagFromRating('capital_stack', 'your_call')).toEqual({
      text: 'You decide',
      tone: 'decide',
    })
  })
})

describe('buildHowThisClosesRows', () => {
  it('reads engine fields for five rows and opens Price as Start here', () => {
    const rows = buildHowThisClosesRows(PAYLOAD)
    expect(rows.map((r) => r.name)).toEqual(['Blend', 'Price', 'Terms', 'Income', 'Equity'])
    expect(startHereRowId(rows)).toBe('price')

    const price = rows.find((r) => r.id === 'price')
    expect(price?.closesTag?.text).toBe('Closes the gap: yes')
    expect(price?.confidenceTag?.text).toBe('Sellers say yes: sometimes')
    expect(price?.detail).toBe('Ask $152,000 less — buy at $307,000')

    const terms = rows.find((r) => r.id === 'financing')
    expect(terms?.closesTag?.text).toBe('Closes the gap: partly')
    expect(terms?.confidenceTag?.text).toBe('Sellers say yes: often')

    const income = rows.find((r) => r.id === 'income')
    expect(income?.confidenceTag?.text).toBe('Market says yes: rarely')

    const equity = rows.find((r) => r.id === 'capital_stack')
    expect(equity?.confidenceTag?.text).toBe('You decide')

    const blend = rows.find((r) => r.id === 'blended')
    expect(blend?.closesTag?.text).toBe('Closes the gap: yes')
    expect(blend?.confidenceTag?.text).toBe('Sellers say yes: often')
  })

  it('promotes the existing Most likely close text when the engine wrote a blend', () => {
    expect(howThisClosesParagraph(PAYLOAD)).toBe(
      'Most likely close: a blend. 3 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
    )
  })

  it('keeps the engine 1 vs 2 price-cut phrasing in How this closes', () => {
    expect(
      howThisClosesParagraph({
        ...PAYLOAD,
        blendRecommendation:
          '1 price cut already: a modest price cut plus a small seller-carried second is the most probable close.',
      }),
    ).toBe(
      'Most likely close: a blend. 1 price cut already: a modest price cut plus a small seller-carried second is the most probable close.',
    )
    expect(
      howThisClosesParagraph({
        ...PAYLOAD,
        blendRecommendation:
          '2 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
      }),
    ).toBe(
      'Most likely close: a blend. 2 price cuts already: a modest price cut plus a small seller-carried second is the most probable close.',
    )
  })

  it('promotes Your move text when the gap is a conversation', () => {
    const small: DealStructuresPayload = {
      ...PAYLOAD,
      blendRecommendation: null,
      breakevenSummary: {
        ...PAYLOAD.breakevenSummary!,
        gapPct: 4.6,
        gapAmount: 17_516,
        monthlyShortfall: 40,
        incomeValue: 381_465,
        targetBuyPrice: 362_465,
        listPrice: 379_981,
      },
    }
    expect(howThisClosesParagraph(small)).toMatch(/Ask \$152,000 less — buy at \$307,000/)
    expect(startHereRowId(buildHowThisClosesRows(small))).toBe('price')
  })
})
