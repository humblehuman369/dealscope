/**
 * The rent-vs-price screen's whole value rests on it being labelled honestly.
 * It is a ZIP median — what comparable homes rent for — and the moment a
 * surface presents it as an estimate for the specific property, the feature
 * has become the fabricated-precision it was designed to avoid.
 *
 * These tests pin the two things that could quietly break that: the basis
 * label must degrade from "3-bed median" to "ZIP median" when no bedroom
 * bucket matched, and a listing with no harvested rent must produce nothing
 * rather than a number derived from price.
 */
import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import { getZipRentScreen, zipRentRatioColor } from '@/components/map-search/zipRentScreen'

function listing(overrides: Partial<MapListing> = {}): MapListing {
  return {
    address: '2406 River Hammock Ln',
    city: 'Fort Pierce',
    state: 'FL',
    zip_code: '34981',
    latitude: 27.4,
    longitude: -80.35,
    price: 340000,
    bedrooms: 3,
    bathrooms: 2,
    zip_median_rent: 2250,
    zip_median_rent_basis: 'bedroom',
    zip_rent_to_price: 2250 / 340000,
    ...overrides,
  } as MapListing
}

describe('getZipRentScreen', () => {
  it('labels a bedroom-matched median by its bedroom count', () => {
    const screen = getZipRentScreen(listing())

    expect(screen?.basisLabel).toBe('3-bed median')
    expect(screen?.rentLabel).toBe('$2,250/mo')
    expect(screen?.ratioLabel).toBe('0.66%')
  })

  it('falls back to "ZIP median" when no bedroom bucket matched', () => {
    const screen = getZipRentScreen(listing({ zip_median_rent_basis: 'zip' }))

    expect(screen?.basisLabel).toBe('ZIP median')
  })

  it('does not claim a bedroom match when the listing has no bedroom count', () => {
    const screen = getZipRentScreen(listing({ bedrooms: null }))

    expect(screen?.basisLabel).toBe('ZIP median')
  })

  it('always discloses that this is a market screen, not a property estimate', () => {
    const screen = getZipRentScreen(listing())

    expect(screen?.disclosure).toContain('not an estimate for this property')
  })

  it('returns nothing when the ZIP has not been harvested', () => {
    expect(getZipRentScreen(listing({ zip_median_rent: null }))).toBeNull()
    expect(getZipRentScreen(listing({ zip_median_rent: 0 }))).toBeNull()
  })

  it('still shows the rent when the ratio is unavailable', () => {
    const screen = getZipRentScreen(listing({ price: null, zip_rent_to_price: null }))

    expect(screen?.rentLabel).toBe('$2,250/mo')
    expect(screen?.ratioLabel).toBeNull()
  })
})

describe('zipRentRatioColor', () => {
  it('bands on the rules of thumb investors already carry', () => {
    expect(zipRentRatioColor(0.012)).toBe('var(--status-positive)')
    expect(zipRentRatioColor(0.008)).toBe('var(--status-warning)')
    expect(zipRentRatioColor(0.004)).toBe('var(--text-secondary)')
  })

  it('is neutral when there is no ratio to colour', () => {
    expect(zipRentRatioColor(null)).toBe('var(--text-secondary)')
    expect(zipRentRatioColor(undefined)).toBe('var(--text-secondary)')
  })
})
