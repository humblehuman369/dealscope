import { describe, it, expect } from 'vitest'
import { buildVerdictAnalysisPayload } from '@/utils/verdictPayload'

const base = {
  listPrice: 400_000,
  monthlyRent: 2_500,
  propertyTaxes: 5_000,
  insurance: 4_000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1500,
}

describe('buildVerdictAnalysisPayload appraiser overrides', () => {
  it('uses marketValueOverride over sourceOverrides.price', () => {
    const payload = buildVerdictAnalysisPayload(base, null, {
      price: 390_000,
      marketValueOverride: 425_000,
    })
    expect(payload.list_price).toBe(425_000)
  })

  it('uses monthlyRentOverride over sourceOverrides.monthlyRent', () => {
    const payload = buildVerdictAnalysisPayload(base, null, {
      monthlyRent: 2_400,
      monthlyRentOverride: 2_800,
    })
    expect(payload.monthly_rent).toBe(2_800)
  })
})
