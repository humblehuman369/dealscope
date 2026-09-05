/**
 * A saved search is only useful if it replays the query the investor actually
 * saved. The map's filter state carries two client-only fields (`sort_by` and
 * `min_dom` shape the local list, not the request), so saving is a projection
 * and restoring is a merge — and either direction can silently drop or invent
 * a filter.
 *
 * The consequence of getting it wrong is not a crash: it is a saved "under
 * $250k foreclosures" area that quietly comes back as every active listing,
 * and alerts that email about inventory the investor never asked to see.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, type MapSearchFilters } from '@/hooks/useMapSearch'
import { fromSavedFilters, toSavedFilters } from '@/components/map-search/SavedSearchesPanel'

function filters(overrides: Partial<MapSearchFilters> = {}): MapSearchFilters {
  return { ...DEFAULT_FILTERS, ...overrides }
}

describe('toSavedFilters', () => {
  it('keeps the fields that define the query', () => {
    const saved = toSavedFilters(
      filters({
        listing_type: 'sale',
        property_type: 'Multi-Family',
        min_price: 100_000,
        max_price: 250_000,
        bedrooms: 3,
        listing_statuses: ['active', 'owner_listed'],
      }),
    )

    expect(saved).toEqual({
      listing_type: 'sale',
      property_type: 'Multi-Family',
      min_price: 100_000,
      max_price: 250_000,
      bedrooms: 3,
      listing_statuses: ['active', 'owner_listed'],
    })
  })

  it('drops the client-only list controls', () => {
    const saved = toSavedFilters(filters({ sort_by: 'price_asc', min_dom: 90 }))

    expect(saved).not.toHaveProperty('sort_by')
    expect(saved).not.toHaveProperty('min_dom')
  })

  it('omits an empty status list rather than saving it as a filter', () => {
    expect(toSavedFilters(filters({ listing_statuses: [] }))).not.toHaveProperty(
      'listing_statuses',
    )
  })

  it('does not save an STR city left behind after the toggle was turned off', () => {
    const saved = toSavedFilters(
      filters({ include_str_listings: false, str_state: 'FL', str_city: 'Miami' }),
    )

    expect(saved).not.toHaveProperty('str_state')
    expect(saved).not.toHaveProperty('str_city')
  })

  it('saves the STR location when the toggle is on', () => {
    const saved = toSavedFilters(
      filters({ include_str_listings: true, str_state: 'FL', str_city: 'Miami' }),
    )

    expect(saved.str_state).toBe('FL')
    expect(saved.str_city).toBe('Miami')
  })
})

describe('fromSavedFilters', () => {
  it('round-trips the query fields unchanged', () => {
    const original = filters({
      listing_type: 'rental',
      property_type: 'Condo',
      min_price: 75_000,
      max_price: 400_000,
      bedrooms: 2,
      bathrooms: 1.5,
      listing_statuses: ['pre-foreclosure'],
      motivated_seller_search: true,
    })

    const restored = fromSavedFilters(toSavedFilters(original))

    expect(restored.listing_type).toBe('rental')
    expect(restored.property_type).toBe('Condo')
    expect(restored.min_price).toBe(75_000)
    expect(restored.max_price).toBe(400_000)
    expect(restored.bedrooms).toBe(2)
    expect(restored.bathrooms).toBe(1.5)
    expect(restored.listing_statuses).toEqual(['pre-foreclosure'])
    expect(restored.motivated_seller_search).toBe(true)
  })

  it('supplies the defaults for the client-only controls', () => {
    const restored = fromSavedFilters(toSavedFilters(filters({ sort_by: 'price_asc' })))

    expect(restored.sort_by).toBe(DEFAULT_FILTERS.sort_by)
  })

  it('restores an omitted status list as empty, not undefined', () => {
    // `listing_statuses` is read with `.length` throughout the map, so an
    // undefined here is a crash rather than a wrong result.
    const restored = fromSavedFilters({})

    expect(restored.listing_statuses).toEqual([])
    expect(restored.listing_type).toBe('sale')
  })

  it('cannot inherit a filter from the state it is replacing', () => {
    // A saved search that didn't set max_price must not pick one up from
    // whatever the investor happened to be looking at, or restoring it
    // silently excludes inventory they saved.
    const restored = fromSavedFilters(toSavedFilters(filters({ min_price: 500_000 })))

    expect(restored.min_price).toBe(500_000)
    expect(restored.max_price).toBeUndefined()
    expect(restored.bedrooms).toBeUndefined()
  })
})
