'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { MapListing, MapSearchRequest, MapSearchResponse } from '@/lib/api'
import {
  classifyListings,
  mergeMapListingsByIdPreferStrongerStatus,
  sortListings,
  filterByListingStatus,
  filterByMinDom,
  type DealSignalResult,
  type SortOption,
} from '@/lib/dealSignal'
import { readMapSnapshot, writeMapSnapshot } from '@/components/map-search/mapSearchSnapshot'

export interface MapSearchFilters {
  listing_type: 'sale' | 'rental' | 'both'
  property_type?: string
  min_price?: number
  max_price?: number
  bedrooms?: number
  bathrooms?: number
  listing_statuses: string[]
  min_dom?: number
  sort_by: SortOption
  include_str_listings?: boolean
  str_state?: string
  str_city?: string
  motivated_seller_search?: boolean
  owner_tenure_min_years?: number
  owner_tenure_max_years?: number
  owner_occupancy?: 'owner_occupied' | 'absentee'
  owner_records_availability?: 'any' | 'off_market' | 'for_sale'
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export const DEFAULT_FILTERS: MapSearchFilters = {
  listing_type: 'sale',
  listing_statuses: [],
  sort_by: 'deal_signal',
}

/**
 * Debounce before a pan/zoom triggers a search.
 *
 * Every dispatched search fans out to many paid provider calls, so the old
 * 400 ms fired mid-drag and billed for viewports the user was only passing
 * through. A second of stillness is a much better proxy for "this is the area
 * I care about".
 */
const BOUNDS_DEBOUNCE_MS = 1200

/**
 * Statuses whose backend dispatch is per-property rather than per-viewport:
 * each distressed bucket is its own Zillow URL query, and expired runs a
 * current-status lookup on every candidate.
 */
const EXPENSIVE_STATUSES = new Set(['foreclosure', 'pre-foreclosure', 'auction', 'expired'])

/**
 * True when the active filters put the backend into an expensive dispatch
 * mode. These do not auto-search on pan — the user asks for them explicitly
 * via "Search this area".
 */
/**
 * Rows requested per search. Providers also page their own results, so this
 * is a ceiling on a sample, not on what exists.
 */
const RESULT_LIMIT = 500

/**
 * True when the result set is a sample rather than everything in the viewport.
 *
 * Sorting happens client-side over whatever came back, so in a dense viewport
 * "top of the list" means "top of this sample" — a claim the UI has to make
 * honestly rather than implying it ranked the market.
 */
function isPartialResultSet(totalCount: number, estimatedTotal: number | null): boolean {
  if (totalCount >= RESULT_LIMIT) return true
  return estimatedTotal != null && estimatedTotal > totalCount
}

export function isExpensiveSearch(filters: MapSearchFilters): boolean {
  if (filters.motivated_seller_search) return true
  if (filters.owner_tenure_min_years != null || filters.owner_occupancy != null) return true
  return filters.listing_statuses.some((s) => EXPENSIVE_STATUSES.has(s))
}

export function useMapSearch() {
  const [rawListings, setRawListings] = useState<MapListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filters, setFilters] = useState<MapSearchFilters>(DEFAULT_FILTERS)
  const [polygon, setPolygon] = useState<number[][] | null>(null)
  // True when the viewport moved but the search was withheld because an
  // expensive mode is active. Drives the "Search this area" affordance.
  const [areaSearchPending, setAreaSearchPending] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBoundsRef = useRef<MapBounds | null>(null)
  const filtersRef = useRef<MapSearchFilters>(DEFAULT_FILTERS)
  const polygonRef = useRef<number[][] | null>(null)
  // Expensive modes skip auto-search on pan, but the first settled viewport
  // after mount still searches once so a restored expensive filter doesn't
  // land the user on an empty map.
  const hasSearchedRef = useRef(false)

  // Hydrate filters + polygon from the tab's session snapshot exactly once on
  // first client mount. Done in an effect (not a useState initializer) so SSR
  // and the first client paint stay aligned with DEFAULT_FILTERS — the tiny
  // re-render that follows is masked by the map's own mount/load. Refs are
  // updated alongside state so the first bounds-driven fetch picks up the
  // hydrated values.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    const snap = readMapSnapshot()
    if (!snap) return
    if (snap.filters) {
      const merged = { ...DEFAULT_FILTERS, ...snap.filters }
      setFilters(merged)
      filtersRef.current = merged
    }
    if (snap.polygon) {
      setPolygon(snap.polygon)
      polygonRef.current = snap.polygon
    }
  }, [])

  const fetchListings = useCallback(
    async (
      bounds: MapBounds,
      activePolygon?: number[][] | null,
      filterOverride?: MapSearchFilters,
    ) => {
      const activeFilters = filterOverride ?? filtersRef.current
      hasSearchedRef.current = true
      setAreaSearchPending(false)
      setIsLoading(true)
      setError(null)
      setNotice(null)

      const request: MapSearchRequest = {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
        listing_type: activeFilters.listing_type,
        property_type: activeFilters.property_type,
        min_price: activeFilters.min_price,
        max_price: activeFilters.max_price,
        bedrooms: activeFilters.bedrooms,
        bathrooms: activeFilters.bathrooms,
        listing_statuses:
          activeFilters.listing_statuses.length > 0 ? activeFilters.listing_statuses : undefined,
        include_str_listings: activeFilters.include_str_listings,
        // Only sent when STR is actually on, so a stale city/state left in the
        // filter state can't fragment the server-side cache key.
        str_state: activeFilters.include_str_listings ? activeFilters.str_state : undefined,
        str_city: activeFilters.include_str_listings ? activeFilters.str_city : undefined,
        motivated_seller_search: activeFilters.motivated_seller_search || undefined,
        owner_tenure_min_years: activeFilters.owner_tenure_min_years,
        owner_tenure_max_years: activeFilters.owner_tenure_max_years,
        owner_occupancy: activeFilters.owner_occupancy,
        owner_records_availability: activeFilters.owner_records_availability,
        limit: RESULT_LIMIT,
      }

      if (activePolygon) {
        request.polygon = activePolygon
      }

      try {
        const response: MapSearchResponse = await api.mapSearch.searchArea(request)
        setRawListings(response.listings)
        setTotalCount(response.total_count)
        setEstimatedTotal(response.estimated_total ?? null)
        setNotice(response.notice ?? null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed'
        setError(msg)
        setRawListings([])
        setTotalCount(0)
        setEstimatedTotal(null)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const onBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      lastBoundsRef.current = bounds
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      // Expensive modes never auto-search on a camera move; the user pans to
      // frame an area and then asks for it. The one exception is the first
      // settled viewport of the session, so the map isn't blank on arrival.
      if (isExpensiveSearch(filtersRef.current) && hasSearchedRef.current) {
        setAreaSearchPending(true)
        return
      }
      debounceRef.current = setTimeout(() => {
        fetchListings(bounds, polygonRef.current)
      }, BOUNDS_DEBOUNCE_MS)
    },
    [fetchListings],
  )

  /** Run the withheld search for the current viewport (expensive modes). */
  const searchThisArea = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!lastBoundsRef.current) return
    fetchListings(lastBoundsRef.current, polygonRef.current)
  }, [fetchListings])

  /**
   * The last settled viewport, read on demand.
   *
   * A callback rather than state on purpose: bounds change on every frame of
   * a drag, and holding them in state would re-render the whole map view
   * continuously. The only consumer needs them at the instant the user saves
   * a search.
   */
  const getCurrentBounds = useCallback((): MapBounds | null => lastBoundsRef.current, [])

  /**
   * Restore a saved search: its filters, its drawn boundary, and a fetch at
   * its own bounds rather than wherever the camera currently sits. Moving the
   * camera is the caller's job — this hook owns the query, not the map.
   */
  const applySavedSearch = useCallback(
    (bounds: MapBounds, savedPolygon: number[][] | null, savedFilters: MapSearchFilters) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      setFilters(savedFilters)
      filtersRef.current = savedFilters
      setPolygon(savedPolygon)
      polygonRef.current = savedPolygon
      lastBoundsRef.current = bounds
      writeMapSnapshot({ filters: savedFilters, polygon: savedPolygon })

      fetchListings(bounds, savedPolygon, savedFilters)
    },
    [fetchListings],
  )

  const onPolygonComplete = useCallback(
    (vertices: number[][]) => {
      setPolygon(vertices)
      polygonRef.current = vertices
      writeMapSnapshot({ polygon: vertices })
      if (lastBoundsRef.current) {
        fetchListings(lastBoundsRef.current, vertices)
      }
    },
    [fetchListings],
  )

  const clearPolygon = useCallback(() => {
    setPolygon(null)
    polygonRef.current = null
    writeMapSnapshot({ polygon: null })
    if (lastBoundsRef.current) {
      fetchListings(lastBoundsRef.current, null)
    }
  }, [fetchListings])

  const updateFilters = useCallback(
    (next: Partial<MapSearchFilters>) => {
      const needsRefetch =
        'listing_type' in next ||
        'property_type' in next ||
        'min_price' in next ||
        'max_price' in next ||
        'bedrooms' in next ||
        'bathrooms' in next ||
        'listing_statuses' in next ||
        'include_str_listings' in next ||
        'str_state' in next ||
        'str_city' in next ||
        'motivated_seller_search' in next ||
        'owner_tenure_min_years' in next ||
        'owner_tenure_max_years' in next ||
        'owner_occupancy' in next ||
        'owner_records_availability' in next

      setFilters((prev) => {
        const merged = { ...prev, ...next }
        filtersRef.current = merged
        writeMapSnapshot({ filters: merged })
        if (needsRefetch && lastBoundsRef.current) {
          fetchListings(lastBoundsRef.current, polygonRef.current, merged)
        }
        return merged
      })
    },
    [fetchListings],
  )

  const mergedListings = useMemo(
    () => mergeMapListingsByIdPreferStrongerStatus(rawListings),
    [rawListings],
  )

  const dealSignals = useMemo(() => classifyListings(mergedListings), [mergedListings])

  const filteredAndSortedListings = useMemo(() => {
    // Owner Leads (RentCast records) is a distinct inventory whose rows carry
    // off-market / for-sale statuses and no days-on-market. The listing-oriented
    // status and DOM filters don't apply and would drop every row, so skip them
    // when owner-records mode is active.
    const ownerRecordsActive =
      filters.owner_tenure_min_years != null || filters.owner_occupancy != null
    let result = mergedListings
    if (!ownerRecordsActive) {
      result = filterByListingStatus(result, filters.listing_statuses)
      result = filterByMinDom(result, filters.min_dom, dealSignals)
    }
    result = sortListings(result, dealSignals, filters.sort_by)
    return result
  }, [
    mergedListings,
    filters.listing_statuses,
    filters.min_dom,
    filters.sort_by,
    filters.owner_tenure_min_years,
    filters.owner_occupancy,
    dealSignals,
  ])

  return {
    listings: filteredAndSortedListings,
    rawListings: mergedListings,
    isLoading,
    error,
    notice,
    totalCount,
    estimatedTotal,
    filters,
    polygon,
    dealSignals,
    resultsArePartial: isPartialResultSet(totalCount, estimatedTotal),
    isExpensiveMode: isExpensiveSearch(filters),
    areaSearchPending,
    searchThisArea,
    getCurrentBounds,
    applySavedSearch,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  }
}
