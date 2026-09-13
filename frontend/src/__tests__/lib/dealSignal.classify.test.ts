import { describe, expect, it } from 'vitest'
import type { MapListing } from '@/lib/api'
import {
  classifyListing,
  isRentalListing,
  markerColorForCategory,
  RENTAL_MARKER_COLOR,
} from '@/lib/dealSignal'

const base: MapListing = {
  id: 'A',
  address: '1 Main',
  latitude: 0,
  longitude: 0,
  price: null,
  bedrooms: null,
  bathrooms: null,
  sqft: null,
  property_type: null,
  listing_status: 'Active',
  photo_url: null,
  source: 'test',
  days_on_market: 5,
  year_built: null,
}

describe('isRentalListing', () => {
  it('reads the fetch-path inventory tag', () => {
    expect(isRentalListing({ ...base, inventory: 'rental' })).toBe(true)
    expect(isRentalListing({ ...base, inventory: 'sale' })).toBe(false)
  })

  it('falls back to For Rent status strings', () => {
    expect(isRentalListing({ ...base, listing_status: 'FOR_RENT' })).toBe(true)
    expect(isRentalListing({ ...base, listing_status: 'For Rent' })).toBe(true)
  })

  it('treats a ZIP-rent ratio that only monthly rents produce as rental', () => {
    expect(isRentalListing({ ...base, zip_rent_to_price: 0.84 })).toBe(true)
    expect(isRentalListing({ ...base, zip_rent_to_price: 0.007 })).toBe(false)
  })

  it('does not override an explicit sale tag even with a high rent ratio', () => {
    expect(isRentalListing({ ...base, inventory: 'sale', zip_rent_to_price: 0.84 })).toBe(false)
  })
})

describe('classifyListing rental pins', () => {
  it('paints tagged rentals gold, not sale-green, even with short DOM', () => {
    const signal = classifyListing({ ...base, inventory: 'rental', days_on_market: 5 })
    expect(signal.category).toBe('rental')
    expect(signal.label).toBe('For Rent')
    expect(signal.color).toBe(RENTAL_MARKER_COLOR)
  })

  it('does not recolor a 60-day rental as stale orange', () => {
    const signal = classifyListing({
      ...base,
      inventory: 'rental',
      listing_status: 'Active',
      days_on_market: 72,
    })
    expect(signal.category).toBe('rental')
  })

  it('still paints a sale listing green', () => {
    const signal = classifyListing({ ...base, inventory: 'sale', days_on_market: 5 })
    expect(signal.category).toBe('active')
    expect(signal.color).toBe(markerColorForCategory('active'))
  })

  it('keeps distressed ahead of rental coloring', () => {
    const signal = classifyListing({
      ...base,
      inventory: 'rental',
      listing_status: 'Foreclosure',
    })
    expect(signal.category).toBe('distressed')
  })
})
