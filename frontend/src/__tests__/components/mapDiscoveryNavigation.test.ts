import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapListing } from '@/lib/api'
import { navigateToDiscoveryFromMap } from '@/components/map-search/mapDiscoveryNavigation'

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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens a noreferrer anchor in a new tab instead of window.open', () => {
    const click = vi.fn()
    const remove = vi.fn()
    const link = {
      href: '',
      target: '',
      rel: '',
      style: { display: '' },
      click,
      remove,
    }

    vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLAnchorElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => link as unknown as Node)

    const router = { push: vi.fn() }
    navigateToDiscoveryFromMap(router, listing)

    expect(link.rel).toBe('noopener noreferrer')
    expect(link.target).toBe('_blank')
    expect(link.href).toContain('/discovery?')
    expect(link.href).toContain('address=123+Main+St')
    expect(click).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })
})
