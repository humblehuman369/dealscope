import { describe, it, expect } from 'vitest'
import type { MapListing } from '@/lib/api'
import { mergeMapListingsByIdPreferStrongerStatus } from '@/lib/dealSignal'

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
  listing_status: null,
  photo_url: null,
  source: 'test',
  days_on_market: null,
  year_built: null,
}

describe('mergeMapListingsByIdPreferStrongerStatus', () => {
  it('keeps the stronger-status row but carries photo_url forward from the loser', () => {
    const winnerNoPhoto = { ...base, listing_status: 'Foreclosure', price: null }
    const loserWithPhoto = {
      ...base,
      listing_status: 'For Sale',
      photo_url: 'https://example.com/p.jpg',
      price: 350000,
    }
    const out = mergeMapListingsByIdPreferStrongerStatus([loserWithPhoto, winnerNoPhoto])
    expect(out).toHaveLength(1)
    expect(out[0].listing_status).toBe('Foreclosure')
    expect(out[0].photo_url).toBe('https://example.com/p.jpg')
    expect(out[0].price).toBe(350000)
  })

  it('does not overwrite the winner when its fields are populated', () => {
    const winner = {
      ...base,
      listing_status: 'Foreclosure',
      photo_url: 'https://winner/w.jpg',
      price: 400000,
    }
    const loser = {
      ...base,
      listing_status: 'For Sale',
      photo_url: 'https://loser/l.jpg',
      price: 350000,
    }
    const out = mergeMapListingsByIdPreferStrongerStatus([winner, loser])
    expect(out[0].photo_url).toBe('https://winner/w.jpg')
    expect(out[0].price).toBe(400000)
  })

  it('passes through a single listing unchanged', () => {
    const only = { ...base, listing_status: 'For Sale', photo_url: 'https://x/p.jpg' }
    const out = mergeMapListingsByIdPreferStrongerStatus([only])
    expect(out).toEqual([only])
  })
})
