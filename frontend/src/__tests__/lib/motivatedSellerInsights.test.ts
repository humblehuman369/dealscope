import { describe, expect, it } from 'vitest'

import { buildMotivatedSellerInsights } from '@/lib/motivatedSellerInsights'

describe('buildMotivatedSellerInsights price-cut copy', () => {
  it('uses the one-cut sentence when the seller has moved once', () => {
    const insights = buildMotivatedSellerInsights({
      listing: { price_reduction_count: 1 },
      seller_motivation: null,
    } as Parameters<typeof buildMotivatedSellerInsights>[0])

    expect(insights[0]?.detail).toBe(
      'One price cut so far. The seller has moved once; watch for a second.',
    )
  })

  it('keeps the existing sentence for two or more cuts', () => {
    const insights = buildMotivatedSellerInsights({
      listing: { price_reduction_count: 2 },
      seller_motivation: null,
    } as Parameters<typeof buildMotivatedSellerInsights>[0])

    expect(insights[0]?.detail).toBe(
      'Repeated price cuts signal a seller adjusting to the market — a strong opening for a below-ask offer.',
    )
  })
})
