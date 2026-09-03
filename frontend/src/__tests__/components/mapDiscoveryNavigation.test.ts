import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapListing } from '@/lib/api'
import { navigateToDiscoveryFromMap } from '@/components/map-search/mapDiscoveryNavigation'
import { MAP_RESTORE_VIEWPORT_KEY } from '@/components/map-search/mapSearchSnapshot'

const listing: MapListing = {
  id: '12345678',
  address: '123 Main St',
  city: 'Austin',
  state: 'TX',
  zip_code: '78701',
  latitude: 30.27,
  longitude: -97.74,
  price: 400000,
  bedrooms: 3,
  bathrooms: 2,
  sqft: 1800,
  property_type: 'Single Family',
  listing_status: 'FOR_SALE',
  photo_url: null,
  source: 'zillow',
  days_on_market: 10,
  year_built: 1990,
}

describe('navigateToDiscoveryFromMap', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('navigates in the same tab rather than opening a new one', () => {
    const createElement = vi.spyOn(document, 'createElement')
    const router = { push: vi.fn() }

    navigateToDiscoveryFromMap(router, listing)

    expect(router.push).toHaveBeenCalledOnce()
    const href = router.push.mock.calls[0][0]
    expect(href).toContain('/discovery?')
    expect(href).toContain('address=123+Main+St')
    expect(href).toContain('zpid=12345678')
    // A tab per pin is what made working a farm area unusable.
    expect(createElement).not.toHaveBeenCalledWith('a')
  })

  it('flags the viewport for restore before leaving, so "Back to map" works', () => {
    const router = { push: vi.fn() }

    navigateToDiscoveryFromMap(router, listing)

    expect(sessionStorage.getItem(MAP_RESTORE_VIEWPORT_KEY)).not.toBeNull()
  })
})
