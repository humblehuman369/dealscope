import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import {
  CLEARED_OWNER_LEADS,
  filterListingsByTenureBuckets,
  isOwnerRecordsActive,
  nextOwnerAvailability,
  nextOwnerOccupancy,
  normalizeOwnerLeadsFilters,
  ownerAvailabilityIsSelected,
  ownerLeadsPatch,
  tenureBucketsFromMinMax,
  tenureEnvelope,
  toggleTenureBucket,
  withDerivedTenure,
  type OwnerTenureBucketId,
} from '@/components/map-search/ownerLeadsFilters'
import { DEFAULT_FILTERS, type MapSearchFilters } from '@/hooks/useMapSearch'

function filters(partial: Partial<MapSearchFilters> = {}): MapSearchFilters {
  return { ...DEFAULT_FILTERS, ...partial }
}

function listing(id: string, ownerYears: number | null): MapListing {
  return {
    id,
    address: `${id} Main`,
    latitude: 26.7,
    longitude: -80.1,
    price: 300000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    property_type: 'Single Family',
    listing_status: 'active',
    photo_url: null,
    source: 'test',
    days_on_market: 10,
    year_built: 1990,
    owner_years: ownerYears,
  }
}

describe('empty default', () => {
  it('starts with Owner Leads off', () => {
    expect(isOwnerRecordsActive(DEFAULT_FILTERS)).toBe(false)
    expect(DEFAULT_FILTERS.owner_tenure_buckets).toBeUndefined()
    expect(DEFAULT_FILTERS.owner_occupancy).toBeUndefined()
    expect(DEFAULT_FILTERS.owner_records_availability).toBeUndefined()
  })

  it('starts with motivated sellers, distressed, and Active + Owner Listed on', () => {
    expect(DEFAULT_FILTERS.motivated_seller_search).toBe(true)
    expect(DEFAULT_FILTERS.listing_type).toBe('sale')
    expect(DEFAULT_FILTERS.sort_by).toBe('deal_signal')
    expect(DEFAULT_FILTERS.listing_statuses).toEqual([
      'active',
      'owner_listed',
      'foreclosure',
      'auction',
      'pre-foreclosure',
    ])
    expect(DEFAULT_FILTERS.listing_statuses).not.toContain('expired')
  })
})

describe('tenure buckets', () => {
  it('toggles independently (OR within the group)', () => {
    const one = toggleTenureBucket([], '30_plus')
    expect(one).toEqual(['30_plus'])
    const two = toggleTenureBucket(one, '10_20')
    expect(two).toEqual(['10_20', '30_plus'])
    expect(toggleTenureBucket(two, '30_plus')).toEqual(['10_20'])
  })

  it('maps a single bucket to the RentCast envelope', () => {
    expect(tenureEnvelope(['10_20'])).toEqual({
      owner_tenure_min_years: 10,
      owner_tenure_max_years: 20,
    })
    expect(tenureEnvelope(['30_plus'])).toEqual({
      owner_tenure_min_years: 30,
      owner_tenure_max_years: undefined,
    })
  })

  it('uses the outer envelope when multiple buckets are on', () => {
    expect(tenureEnvelope(['10_20', '30_plus'])).toEqual({
      owner_tenure_min_years: 10,
      owner_tenure_max_years: undefined,
    })
  })

  it('drops rows whose owner_years fall in a gap between selected buckets', () => {
    const rows = [listing('a', 15), listing('b', 25), listing('c', 35)]
    const kept = filterListingsByTenureBuckets(rows, ['10_20', '30_plus'])
    expect(kept.map((r) => r.id)).toEqual(['a', 'c'])
  })
})

describe('occupancy', () => {
  it('is exclusive: clicking the other switches, clicking the active one clears', () => {
    expect(nextOwnerOccupancy(undefined, 'absentee')).toBe('absentee')
    expect(nextOwnerOccupancy('absentee', 'owner_occupied')).toBe('owner_occupied')
    expect(nextOwnerOccupancy('absentee', 'absentee')).toBeUndefined()
  })
})

describe('availability', () => {
  it('toggles independently like listing type, and last-off clears', () => {
    expect(nextOwnerAvailability(undefined, 'off_market')).toBe('off_market')
    expect(nextOwnerAvailability('off_market', 'for_sale')).toBe('any')
    expect(nextOwnerAvailability('any', 'for_sale')).toBe('off_market')
    expect(nextOwnerAvailability('off_market', 'off_market')).toBeUndefined()
  })

  it('presses both pills when the request is any', () => {
    expect(ownerAvailabilityIsSelected('any', 'off_market')).toBe(true)
    expect(ownerAvailabilityIsSelected('any', 'for_sale')).toBe(true)
  })
})

describe('ownerLeadsPatch', () => {
  it('enters owner mode from a single pill and clears Motivated Seller', () => {
    const next = ownerLeadsPatch(filters({ motivated_seller_search: true }), {
      owner_tenure_buckets: ['30_plus'],
    })
    expect(next.motivated_seller_search).toBe(false)
    expect(next.listing_statuses).toEqual([])
    expect(next.owner_tenure_min_years).toBe(30)
    expect(isOwnerRecordsActive({ ...DEFAULT_FILTERS, ...next })).toBe(true)
  })

  it('clears owner mode when the last pill turns off', () => {
    const active = filters({
      owner_tenure_buckets: ['30_plus'],
      ...withDerivedTenure(['30_plus']),
    })
    const next = ownerLeadsPatch(active, { owner_tenure_buckets: [] })
    expect(isOwnerRecordsActive({ ...active, ...next })).toBe(false)
    expect(next.owner_tenure_min_years).toBeUndefined()
    expect(next.motivated_seller_search).toBeUndefined()
  })
})

describe('saved-search restore', () => {
  it('restores availability any as both Off-market and For sale', () => {
    expect(ownerAvailabilityIsSelected('any', 'off_market')).toBe(true)
    expect(ownerAvailabilityIsSelected('any', 'for_sale')).toBe(true)
  })

  it('does not press tenure pills for the old min=0 Any sentinel', () => {
    expect(tenureBucketsFromMinMax(0, undefined)).toEqual([])
    const restored = normalizeOwnerLeadsFilters(
      filters({ owner_tenure_min_years: 0, owner_records_availability: 'off_market' }),
    )
    expect(restored.owner_tenure_buckets).toEqual([])
    expect(restored.owner_tenure_min_years).toBeUndefined()
    expect(isOwnerRecordsActive(restored)).toBe(true)
  })

  it('restores a 30+ window onto the 30+ pill', () => {
    const restored = normalizeOwnerLeadsFilters(filters({ owner_tenure_min_years: 30 }))
    expect(restored.owner_tenure_buckets).toEqual<OwnerTenureBucketId[]>(['30_plus'])
  })
})

describe('CLEARED_OWNER_LEADS', () => {
  it('drops every Owner Leads field', () => {
    expect(isOwnerRecordsActive({ ...DEFAULT_FILTERS, ...CLEARED_OWNER_LEADS })).toBe(false)
  })
})
