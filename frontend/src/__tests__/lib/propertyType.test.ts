import { describe, expect, it } from 'vitest'
import {
  canonicalizePropertyType,
  filterByPropertyType,
  listingMatchesPropertyType,
} from '@/lib/propertyType'

describe('canonicalizePropertyType', () => {
  it('maps provider Multi-Family labels onto one bucket', () => {
    for (const raw of ['Multi-Family', 'Multi Family', 'MULTI_FAMILY', 'Duplex', 'Triplex']) {
      expect(canonicalizePropertyType(raw), raw).toBe('multi_family')
    }
  })

  it('does not collapse MULTI_FAMILY onto single_family', () => {
    expect(canonicalizePropertyType('MULTI_FAMILY')).not.toBe('single_family')
    expect(canonicalizePropertyType('Multi-Family')).not.toBe('single_family')
  })

  it('maps Single Family / Condo / Townhouse', () => {
    expect(canonicalizePropertyType('SINGLE_FAMILY')).toBe('single_family')
    expect(canonicalizePropertyType('Condo')).toBe('condo')
    expect(canonicalizePropertyType('Townhome')).toBe('townhouse')
  })
})

describe('listingMatchesPropertyType', () => {
  it('keeps Zillow MULTI_FAMILY when the filter is Multi-Family', () => {
    expect(listingMatchesPropertyType('MULTI_FAMILY', 'Multi-Family')).toBe(true)
  })

  it('drops Single Family when the filter is Multi-Family', () => {
    expect(listingMatchesPropertyType('Single Family', 'Multi-Family')).toBe(false)
    expect(listingMatchesPropertyType('SINGLE_FAMILY', 'Multi-Family')).toBe(false)
  })

  it('drops listings with no type once a filter is set', () => {
    expect(listingMatchesPropertyType(null, 'Multi-Family')).toBe(false)
  })
})

describe('filterByPropertyType', () => {
  const rows = [
    { id: 'sf', property_type: 'SINGLE_FAMILY' },
    { id: 'mf', property_type: 'MULTI_FAMILY' },
    { id: 'dup', property_type: 'Duplex' },
    { id: 'condo', property_type: 'Condo' },
    { id: 'none', property_type: null },
  ]

  it('removes single-family rows from a Multi-Family filter', () => {
    expect(filterByPropertyType(rows, 'Multi-Family').map((r) => r.id)).toEqual(['mf', 'dup'])
  })

  it('is a no-op when no type is selected', () => {
    expect(filterByPropertyType(rows, undefined)).toEqual(rows)
  })
})
