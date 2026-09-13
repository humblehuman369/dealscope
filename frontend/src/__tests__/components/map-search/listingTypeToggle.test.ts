import { describe, expect, it } from 'vitest'
import {
  listingTypeIsSelected,
  nextListingType,
} from '@/components/map-search/FilterPanel'

describe('nextListingType', () => {
  it('adds For Rent onto For Sale to request both', () => {
    expect(nextListingType('sale', 'rental')).toBe('both')
  })

  it('adds For Sale onto For Rent to request both', () => {
    expect(nextListingType('rental', 'sale')).toBe('both')
  })

  it('drops For Sale from both, leaving For Rent', () => {
    expect(nextListingType('both', 'sale')).toBe('rental')
  })

  it('drops For Rent from both, leaving For Sale', () => {
    expect(nextListingType('both', 'rental')).toBe('sale')
  })

  it('refuses to clear the last selected type', () => {
    expect(nextListingType('sale', 'sale')).toBe('sale')
    expect(nextListingType('rental', 'rental')).toBe('rental')
  })
})

describe('listingTypeIsSelected', () => {
  it('presses both pills when the request is both', () => {
    expect(listingTypeIsSelected('both', 'sale')).toBe(true)
    expect(listingTypeIsSelected('both', 'rental')).toBe(true)
  })

  it('presses only the matching pill for a single type', () => {
    expect(listingTypeIsSelected('sale', 'sale')).toBe(true)
    expect(listingTypeIsSelected('sale', 'rental')).toBe(false)
    expect(listingTypeIsSelected('rental', 'rental')).toBe(true)
    expect(listingTypeIsSelected('rental', 'sale')).toBe(false)
  })
})
