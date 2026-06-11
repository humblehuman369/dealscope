import { describe, it, expect } from 'vitest'
import { mapPropertyToIQSources } from '@/utils/propertySourceMapper'
import type { PropertyResponse } from '@dealscope/shared'

const minimalProperty = {
  valuations: {
    value_iq_estimate: 400_000,
    zestimate: 390_000,
  },
  rentals: {
    monthly_rent_ltr: 2_500,
    rental_stats: {
      iq_estimate: 2_500,
      zillow_estimate: 2_400,
    },
  },
} as PropertyResponse

describe('mapPropertyToIQSources', () => {
  it('injects my_value when marketValueOverride is set', () => {
    const sources = mapPropertyToIQSources(minimalProperty, {
      marketValueOverride: 425_000,
    })
    expect(sources.value.my_value).toBe(425_000)
    expect(sources.value.iq).toBe(400_000)
  })

  it('injects my_rent when monthlyRentOverride is set', () => {
    const sources = mapPropertyToIQSources(minimalProperty, {
      monthlyRentOverride: 2_800,
    })
    expect(sources.rent.my_rent).toBe(2_800)
  })

  it('omits my_* rows when overrides are absent', () => {
    const sources = mapPropertyToIQSources(minimalProperty)
    expect(sources.value.my_value).toBeUndefined()
    expect(sources.rent.my_rent).toBeUndefined()
  })

  it('does not include the retired mashvisor source in the rent group', () => {
    const sources = mapPropertyToIQSources(minimalProperty)
    expect('mashvisor' in sources.rent).toBe(false)
  })
})
