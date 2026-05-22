import { describe, expect, it } from 'vitest'
import { buildRehabUrl, rehabPropertySnapshotFromSearchParams } from '@/lib/rehabNavigation'

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
      has_pool: false,
      stories: undefined,
    })
  })

  it('returns undefined when no snapshot fields present', () => {
    expect(rehabPropertySnapshotFromSearchParams(new URLSearchParams('address=foo'))).toBeUndefined()
  })
})
