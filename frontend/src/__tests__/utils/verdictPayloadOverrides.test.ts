import { describe, it, expect } from 'vitest'
import {
  buildVerdictAnalysisPayload,
  buildVerdictBaseFromPropertyResponse,
  toOccupancyFraction,
} from '@/utils/verdictPayload'

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

describe('toOccupancyFraction', () => {
  it('passes 0-1 fractions through unchanged', () => {
    expect(toOccupancyFraction(0.75)).toBe(0.75)
    expect(toOccupancyFraction(1)).toBe(1)
  })

  it('converts percent values to fractions', () => {
    expect(toOccupancyFraction(75)).toBe(0.75)
    expect(toOccupancyFraction(68.3)).toBeCloseTo(0.683)
  })

  it('preserves a legitimate 0 and rejects null/NaN', () => {
    expect(toOccupancyFraction(0)).toBe(0)
    expect(toOccupancyFraction(null)).toBeNull()
    expect(toOccupancyFraction(undefined)).toBeNull()
    expect(toOccupancyFraction(Number.NaN)).toBeNull()
  })
})

describe('STR inputs in verdict payload', () => {
  it('normalizes occupancy and maps monthlyStrRevenue to mashvisor_monthly_str_revenue', () => {
    const payload = buildVerdictAnalysisPayload({
      ...base,
      averageDailyRate: 211,
      occupancyRate: 0.683, // already a fraction — must NOT be divided again
      monthlyStrRevenue: 4_400,
    })
    expect(payload.average_daily_rate).toBe(211)
    expect(payload.occupancy_rate).toBeCloseTo(0.683)
    expect(payload.mashvisor_monthly_str_revenue).toBe(4_400)
  })

  it('omits mashvisor_monthly_str_revenue when absent', () => {
    const payload = buildVerdictAnalysisPayload(base)
    expect(payload.mashvisor_monthly_str_revenue).toBeUndefined()
  })

  it('buildVerdictBaseFromPropertyResponse reads STR fields without corrupting fraction occupancy', () => {
    const propertyResponse = {
      valuations: { zestimate: 400_000 },
      rentals: {
        monthly_rent_ltr: 2_500,
        average_daily_rate: 195,
        occupancy_rate: 0.74, // backend 0-1 fraction (AirROI convention)
        str_market_stats: { monthly_revenue_per_bed: 4_367 },
      },
      details: { bedrooms: 3, bathrooms: 2, square_footage: 1500 },
      market: {},
      listing: {},
    }
    const result = buildVerdictBaseFromPropertyResponse(propertyResponse)
    expect(result.averageDailyRate).toBe(195)
    expect(result.occupancyRate).toBeCloseTo(0.74) // old code produced 0.0074
    expect(result.monthlyStrRevenue).toBe(4_367)
  })
})
