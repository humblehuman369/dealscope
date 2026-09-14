import { describe, expect, it } from 'vitest'
import {
  NUMBER_LABELS,
  formatPriceShort,
  formatSellerRead,
  formatVerdictSentence,
  sellerPathFromDealStructures,
} from '@/lib/verdictCopy'
import { isListedStatus } from '@/lib/resolveMarketPrice'

const WILLOW = {
  listPrice: 625_999,
  incomeValue: 477_699,
  targetBuy: 453_814,
  gapPct: 27.5,
}

describe('formatPriceShort', () => {
  it('rounds Wandering Willow dollars the way Section 5 does', () => {
    expect(formatPriceShort(WILLOW.listPrice)).toBe('$626K')
    expect(formatPriceShort(WILLOW.targetBuy)).toBe('$454K')
  })
})

describe('formatSellerRead', () => {
  it('names the two strongest signals and the blend path', () => {
    expect(
      formatSellerRead({ priceCuts: 10, daysOnMarket: 224 }, 'blend'),
    ).toBe(
      'After 10 price cuts and 224 days, this seller will most likely take a smaller price cut plus a small seller-carried second.',
    )
  })

  it('uses the Price and Terms clauses from Section 5', () => {
    expect(formatSellerRead({ priceCuts: 3, daysOnMarket: null }, 'price')).toBe(
      'After 3 price cuts, this seller will most likely take a real price cut.',
    )
    expect(formatSellerRead({ priceCuts: 0, daysOnMarket: 120 }, 'terms')).toBe(
      'After 120 days, this seller will most likely carry part of the price.',
    )
  })

  it('pluralizes 1 vs 2 price cuts and days', () => {
    expect(formatSellerRead({ priceCuts: 1, daysOnMarket: 1 }, 'price')).toBe(
      'After 1 price cut and 1 day, this seller will most likely take a real price cut.',
    )
    expect(formatSellerRead({ priceCuts: 2, daysOnMarket: 2 }, 'price')).toBe(
      'After 2 price cuts and 2 days, this seller will most likely take a real price cut.',
    )
  })

  it('returns the no-signal line when nothing fired', () => {
    expect(formatSellerRead({ priceCuts: 0, daysOnMarket: null }, 'blend')).toBe(
      'This seller has shown no sign of moving yet.',
    )
  })
})

describe('formatVerdictSentence', () => {
  it('matches the Section 5 Wandering Willow sentence word for word', () => {
    const sellerRead = formatSellerRead({ priceCuts: 10, daysOnMarket: 224 }, 'blend')
    expect(
      formatVerdictSentence({
        listPrice: WILLOW.listPrice,
        targetBuy: WILLOW.targetBuy,
        gapPct: WILLOW.gapPct,
        sellerRead,
      }),
    ).toBe(
      'Listed at $626K. Worth about $454K to you as a rental. That is a 27.5% gap. After 10 price cuts and 224 days, this seller will most likely take a smaller price cut plus a small seller-carried second.',
    )
  })

  it('uses the off-market first sentence and market-value short', () => {
    expect(
      formatVerdictSentence({
        listPrice: 379_981,
        targetBuy: 362_465,
        gapPct: 4.6,
        sellerRead: 'This seller has shown no sign of moving yet.',
        listed: false,
        marketValue: 379_981,
      }),
    ).toBe(
      'Not for sale. Valued at $380K. Worth about $362K to you as a rental. That is a 4.6% gap. This seller has shown no sign of moving yet.',
    )
  })

  it('treats FOR_RENT as not for sale through isListedStatus', () => {
    expect(isListedStatus('FOR_RENT')).toBe(false)
    expect(
      formatVerdictSentence({
        listPrice: 379_981,
        targetBuy: 362_465,
        gapPct: 4.6,
        sellerRead: 'This seller has shown no sign of moving yet.',
        listed: isListedStatus('FOR_RENT'),
        marketValue: 379_981,
      }),
    ).toBe(
      'Not for sale. Valued at $380K. Worth about $362K to you as a rental. That is a 4.6% gap. This seller has shown no sign of moving yet.',
    )
  })
})

describe('NUMBER_LABELS', () => {
  it('uses the listed label on market and the off-market sell-for label', () => {
    expect(NUMBER_LABELS.market).toBe('Market price. What it is listed for.')
    expect(NUMBER_LABELS.marketOffMarket).toBe('Market price. What it would likely sell for.')
  })
})

describe('sellerPathFromDealStructures', () => {
  it('prefers the engine blend recommendation', () => {
    expect(
      sellerPathFromDealStructures({
        blendRecommendation: 'a modest price cut plus a small seller-carried second',
        families: ['price', 'financing'],
      }),
    ).toBe('blend')
  })

  it('falls back to price, then terms', () => {
    expect(
      sellerPathFromDealStructures({ blendRecommendation: null, families: ['price'] }),
    ).toBe('price')
    expect(
      sellerPathFromDealStructures({ blendRecommendation: null, families: ['financing'] }),
    ).toBe('terms')
  })
})
