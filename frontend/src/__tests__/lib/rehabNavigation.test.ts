import { describe, expect, it } from 'vitest'
import {
  buildRehabUrl,
  mergeRehabPropertySnapshots,
  rehabPropertySnapshotFromSearchParams,
  rehabSnapshotFromPropertyResponse,
} from '@/lib/rehabNavigation'

describe('buildRehabUrl', () => {
  it('includes address and saved property id', () => {
    const url = buildRehabUrl({
      address: '123 Main St, Boca Raton, FL 33486',
      savedPropertyId: 'abc-123',
    })
    expect(url).toContain('/rehab?')
    expect(url).toContain('address=123')
    expect(url).toContain('saved_property_id=abc-123')
  })

  it('encodes property snapshot fields', () => {
    const url = buildRehabUrl({
      address: '1 Test Rd',
      property: { square_footage: 1800, zip_code: '33401', has_pool: true },
    })
    expect(url).toContain('sqft=1800')
    expect(url).toContain('zip_code=33401')
    expect(url).toContain('has_pool=true')
  })

  it('returns bare path when no options', () => {
    expect(buildRehabUrl({})).toBe('/rehab')
  })
})

describe('rehabPropertySnapshotFromSearchParams', () => {
  it('parses numeric query params', () => {
    const params = new URLSearchParams('sqft=2000&year_built=1995&arv=350000&bedrooms=3')
    expect(rehabPropertySnapshotFromSearchParams(params)).toEqual({
      square_footage: 2000,
      year_built: 1995,
      arv: 350000,
      zip_code: undefined,
      bedrooms: 3,
      bathrooms: undefined,
      stories: undefined,
    })
  })

  it('returns undefined when no snapshot fields present', () => {
    expect(rehabPropertySnapshotFromSearchParams(new URLSearchParams('address=foo'))).toBeUndefined()
  })
})

describe('mergeRehabPropertySnapshots', () => {
  it('fills year_built from API when missing in URL snapshot', () => {
    const merged = mergeRehabPropertySnapshots(
      { square_footage: 3172, arv: 750700 },
      { year_built: 1998, zip_code: '33414' },
    )
    expect(merged).toEqual({
      square_footage: 3172,
      year_built: 1998,
      arv: 750700,
      zip_code: '33414',
    })
  })
})

describe('rehabSnapshotFromPropertyResponse', () => {
  it('maps year_built from property search response', () => {
    const snapshot = rehabSnapshotFromPropertyResponse({
      address: { zip_code: '33414' },
      details: {
        square_footage: 3172,
        year_built: 1998,
        bedrooms: 5,
        bathrooms: 3,
        has_pool: false,
        roof_type: 'Tile',
      },
      valuations: { current_value_avm: 750700 },
    })
    expect(snapshot.year_built).toBe(1998)
    expect(snapshot.square_footage).toBe(3172)
    expect(snapshot.roof_type).toBe('Tile')
  })
})
