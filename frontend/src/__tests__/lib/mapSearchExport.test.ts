import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import { buildExportRows } from '@/components/map-search/mapSearchExport'

function makeListing(overrides: Partial<MapListing> = {}): MapListing {
  return {
    id: 'test-1',
    address: '1 Main St, Boca Raton, FL 33432',
    latitude: 26.35,
    longitude: -80.08,
    price: 500000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    property_type: 'Single Family',
    listing_status: 'active',
    photo_url: null,
    source: 'rentcast',
    days_on_market: 12,
    year_built: null,
    ...overrides,
  }
}

describe('buildExportRows year built', () => {
  it('exports snake_case year_built', () => {
    const rows = buildExportRows([makeListing({ year_built: 1998 })], new Map())
    expect(rows[0]['Year Built']).toBe('1998')
  })

  it('falls back to camelCase yearBuilt when snake_case is missing', () => {
    const listing = makeListing({ year_built: null }) as MapListing & { yearBuilt: number }
    listing.yearBuilt = 2004
    const rows = buildExportRows([listing], new Map())
    expect(rows[0]['Year Built']).toBe('2004')
  })

  it('leaves Year Built blank when no construction year is available', () => {
    const rows = buildExportRows([makeListing({ year_built: null })], new Map())
    expect(rows[0]['Year Built']).toBe('')
  })
})
