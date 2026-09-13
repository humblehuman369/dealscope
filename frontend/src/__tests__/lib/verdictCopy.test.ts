import { describe, expect, it } from 'vitest'
import {
  formatPriceShort,
  formatSellerRead,
  formatVerdictSentence,
  sellerPathFromDealStructures,
} from '@/lib/verdictCopy'

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
