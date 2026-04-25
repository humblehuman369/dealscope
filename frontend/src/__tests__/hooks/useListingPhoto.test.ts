import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MapListing } from '@/lib/api'
import { useListingPhoto } from '@/components/map-search/listingPhoto'

const ORIGINAL_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

function makeListing(over: Partial<MapListing> = {}): MapListing {
  return {
    id: 'a',
    address: '1 Main',
    latitude: 40,
    longitude: -75,
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
    ...over,
  }
}

describe('useListingPhoto', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'KEY123')
  })
  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      vi.unstubAllEnvs()
    } else {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', ORIGINAL_KEY)
    }
  })

  it('returns photo_url first, then Street View on error, then null', () => {
    const listing = makeListing({ photo_url: 'https://a/p.jpg' })
    const { result } = renderHook(() => useListingPhoto(listing))
    expect(result.current.src).toBe('https://a/p.jpg')

    act(() => result.current.handleError())
    expect(result.current.src).toMatch(/^https:\/\/maps\.googleapis\.com\/maps\/api\/streetview/)
    expect(result.current.src).toContain('location=40,-75')

    act(() => result.current.handleError())
    expect(result.current.src).toBeNull()
  })

  it('upgrades http://photo URLs to https://', () => {
    const listing = makeListing({ photo_url: 'http://insecure/p.jpg' })
    const { result } = renderHook(() => useListingPhoto(listing))
    expect(result.current.src).toBe('https://insecure/p.jpg')
  })

  it('falls back to Street View when no photo_url is present', () => {
    const listing = makeListing({ photo_url: null })
    const { result } = renderHook(() => useListingPhoto(listing))
    expect(result.current.src).toMatch(/streetview/)
  })

  // Regression: a previous listing's failure state must not leak into a new
  // listing rendered by the same hook instance (PropertyPreviewCard reuses
  // its instance when the user clicks a different marker).
  it('resets to the new listing primary photo when the listing prop changes after an error', () => {
    const listingA = makeListing({ id: 'a', photo_url: 'https://a/p.jpg' })
    const listingB = makeListing({
      id: 'b',
      latitude: 41,
      longitude: -74,
      photo_url: 'https://b/p.jpg',
    })
    const { result, rerender } = renderHook(
      ({ listing }: { listing: MapListing }) => useListingPhoto(listing),
      { initialProps: { listing: listingA } },
    )
    expect(result.current.src).toBe('https://a/p.jpg')

    act(() => result.current.handleError())
    expect(result.current.src).toMatch(/streetview/)

    rerender({ listing: listingB })
    expect(result.current.src).toBe('https://b/p.jpg')
  })

  // Regression: even with the same listing.id, if the merge step refreshes
  // photo_url the next render must try the fresh URL — not stay stuck on
  // the prior failed candidate's index.
  it('resets when photo_url changes for the same listing.id after an error', () => {
    const initial = makeListing({ id: 'same', photo_url: 'https://stale/p.jpg' })
    const refreshed = { ...initial, photo_url: 'https://fresh/p.jpg' }
    const { result, rerender } = renderHook(
      ({ listing }: { listing: MapListing }) => useListingPhoto(listing),
      { initialProps: { listing: initial } },
    )
    expect(result.current.src).toBe('https://stale/p.jpg')

    act(() => result.current.handleError())
    expect(result.current.src).toMatch(/streetview/)

    rerender({ listing: refreshed })
    expect(result.current.src).toBe('https://fresh/p.jpg')
  })
})
