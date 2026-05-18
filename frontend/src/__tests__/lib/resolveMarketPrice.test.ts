import { describe, expect, it } from 'vitest'
import { resolveMarketPriceFromPropertyResponse } from '@/lib/resolveMarketPrice'

describe('resolveMarketPriceFromPropertyResponse', () => {
  it('prefers IQ estimate over market_price when off-market', () => {
    const price = resolveMarketPriceFromPropertyResponse({
      listing: { listing_status: 'OFF_MARKET', list_price: null },
      valuations: {
        value_iq_estimate: 810_000,
        market_price: 950_000,
        zestimate: 900_000,
      },
    })
    expect(price).toBe(810_000)
  })

  it('uses list price when actively listed', () => {
    const price = resolveMarketPriceFromPropertyResponse({
      listing: { listing_status: 'FOR_SALE', list_price: 425_000 },
      valuations: {
        value_iq_estimate: 500_000,
        market_price: 480_000,
      },
    })
    expect(price).toBe(425_000)
  })
})
