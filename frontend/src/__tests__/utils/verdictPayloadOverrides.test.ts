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

  it('uses monthlyRentOverride when worksheet did not set monthlyRent', () => {
    const payload = buildVerdictAnalysisPayload(base, null, {
      monthlyRent: 2_400,
      monthlyRentOverride: 2_800,
    })
    expect(payload.monthly_rent).toBe(2_800)
  })

  it('worksheet monthlyRent wins over monthlyRentOverride (Three Paths apply)', () => {
    const payload = buildVerdictAnalysisPayload(
      base,
      { monthlyRent: 3_612 },
      { monthlyRentOverride: 2_800 },
    )
    expect(payload.monthly_rent).toBe(3_612)
  })
})

describe('buildVerdictAnalysisPayload seller motivation fields', () => {
  it('maps price reductions and rich motivation signals to snake_case', () => {
    const payload = buildVerdictAnalysisPayload({
      ...base,
      listingStatus: 'FOR_SALE',
      priceReductions: 2,
      sellerMotivationScore: 68,
      isAbsenteeOwner: true,
      ownerState: 'IL',
    })
    expect(payload.price_reductions).toBe(2)
    expect(payload.seller_motivation_score).toBe(68)
    expect(payload.is_absentee_owner).toBe(true)
    expect(payload.owner_state).toBe('IL')
  })
})
