import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapListing, MapSearchResponse } from '@/lib/api'

const mockSearchArea = vi.fn()
const mockReadSnapshot = vi.fn(() => null)
const mockWriteSnapshot = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    mapSearch: {
      searchArea: (...args: unknown[]) => mockSearchArea(...args),
    },
  },
}))

vi.mock('@/components/map-search/mapSearchSnapshot', () => ({
  readMapSnapshot: () => mockReadSnapshot(),
  writeMapSnapshot: (...args: unknown[]) => mockWriteSnapshot(...args),
}))

import { isContinentalViewport, useMapSearch } from '@/hooks/useMapSearch'

const BOUNDS = { north: 26.8, south: 26.6, east: -80.0, west: -80.2 }
const CONTINENTAL_BOUNDS = { north: 49, south: 25, east: -66, west: -125 }

function listing(id: string, price: number): MapListing {
  return {
    id,
    address: `${id} Main`,
    latitude: 26.7,
    longitude: -80.1,
    price,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    property_type: 'Single Family',
    listing_status: 'active',
    photo_url: null,
    source: 'test',
    days_on_market: 10,
    year_built: 1990,
  }
}

function response(listings: MapListing[]): MapSearchResponse {
  return {
    listings,
    total_count: listings.length,
    estimated_total: listings.length,
    viewport_center: [26.7, -80.1],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('useMapSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSearchArea.mockReset()
    mockReadSnapshot.mockReturnValue(null)
    mockWriteSnapshot.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not search expensive inventory on a continental-US viewport', async () => {
    mockSearchArea.mockResolvedValue(response([]))
    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.onBoundsChanged(CONTINENTAL_BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })

    expect(isContinentalViewport(CONTINENTAL_BOUNDS)).toBe(true)
    expect(mockSearchArea).not.toHaveBeenCalled()
    expect(result.current.notice).toBeNull()

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(1)
  })

  it('ignores a slower first search so pan/filter races cannot show stale listings', async () => {
    const first = deferred<MapSearchResponse>()
    const second = deferred<MapSearchResponse>()
    mockSearchArea.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.updateFilters({
        motivated_seller_search: false,
        listing_statuses: ['active'],
      })
    })

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })

    act(() => {
      result.current.onBoundsChanged({ ...BOUNDS, north: 26.9 })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })

    expect(mockSearchArea).toHaveBeenCalledTimes(2)

    await act(async () => {
      second.resolve(response([listing('new', 300_000)]))
      await Promise.resolve()
    })
    expect(result.current.listings.map((l) => l.id)).toEqual(['new'])

    await act(async () => {
      first.resolve(response([listing('stale', 100_000)]))
      await Promise.resolve()
    })

    expect(result.current.listings.map((l) => l.id)).toEqual(['new'])
    expect(result.current.error).toBeNull()
  })

  it('debounces price-filter refetches so typing does not fan out a search per keystroke', async () => {
    mockSearchArea.mockResolvedValue(response([listing('a', 250_000)]))
    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateFilters({ min_price: 2 })
      result.current.updateFilters({ min_price: 25 })
      result.current.updateFilters({ min_price: 250000 })
    })

    expect(mockSearchArea).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(2)

    const lastRequest = mockSearchArea.mock.calls.at(-1)?.[0] as { min_price?: number }
    expect(lastRequest.min_price).toBe(250000)
  })

  it('does not enter Owner Leads on the default empty pills', async () => {
    mockSearchArea.mockResolvedValue(response([]))
    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })

    const firstRequest = mockSearchArea.mock.calls.at(-1)?.[0] as {
      owner_tenure_min_years?: number
      owner_occupancy?: string
      owner_records_availability?: string
      motivated_seller_search?: boolean
      listing_statuses?: string[]
    }
    expect(firstRequest.owner_tenure_min_years).toBeUndefined()
    expect(firstRequest.owner_occupancy).toBeUndefined()
    expect(firstRequest.owner_records_availability).toBeUndefined()
    // Off by default: the field is omitted entirely so the first request takes
    // the plain RentCast + Zillow path.
    expect(firstRequest.motivated_seller_search).toBeUndefined()
    expect(firstRequest.listing_statuses).toEqual([
      'active',
      'owner_listed',
      'foreclosure',
      'auction',
      'pre-foreclosure',
    ])
    expect(result.current.isExpensiveMode).toBe(true)
  })

  it('activates Owner Leads when availability is toggled from the default map', async () => {
    mockSearchArea.mockResolvedValue(response([]))
    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateFilters({ owner_records_availability: 'off_market' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(mockSearchArea).toHaveBeenCalledTimes(2)
    const lastRequest = mockSearchArea.mock.calls.at(-1)?.[0] as {
      owner_tenure_min_years?: number
      owner_records_availability?: string
    }
    expect(lastRequest.owner_tenure_min_years).toBeUndefined()
    expect(lastRequest.owner_records_availability).toBe('off_market')
    expect(result.current.filters.owner_tenure_min_years).toBeUndefined()
    expect(result.current.isExpensiveMode).toBe(true)
  })

  it('does not refetch Airbnb until city/state are resolved', async () => {
    mockSearchArea.mockResolvedValue(response([]))
    const { result } = renderHook(() => useMapSearch())

    act(() => {
      result.current.onBoundsChanged(BOUNDS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateFilters({ include_str_listings: true })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.updateFilters({ str_city: 'Boca Raton', str_state: 'FL' })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(mockSearchArea).toHaveBeenCalledTimes(2)
    const lastRequest = mockSearchArea.mock.calls.at(-1)?.[0] as {
      include_str_listings?: boolean
      str_city?: string
      str_state?: string
    }
    expect(lastRequest.include_str_listings).toBe(true)
    expect(lastRequest.str_city).toBe('Boca Raton')
    expect(lastRequest.str_state).toBe('FL')
  })
})
