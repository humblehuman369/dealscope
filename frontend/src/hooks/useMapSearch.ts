'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { MapListing, MapSearchRequest, MapSearchResponse } from '@/lib/api'
import {
  scoreDealSignals,
  sortListings,
  filterByListingStatus,
  filterByMinDom,
  type DealSignalResult,
  type SortOption,
} from '@/lib/dealSignal'

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
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

const DEFAULT_FILTERS: MapSearchFilters = {
  listing_type: 'sale',
  listing_statuses: [],
  sort_by: 'deal_signal',
}

export function useMapSearch() {
  const [rawListings, setRawListings] = useState<MapListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null)
  const [filters, setFilters] = useState<MapSearchFilters>(DEFAULT_FILTERS)
  const [polygon, setPolygon] = useState<number[][] | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBoundsRef = useRef<MapBounds | null>(null)
  const filtersRef = useRef<MapSearchFilters>(DEFAULT_FILTERS)

  const fetchListings = useCallback(
    async (bounds: MapBounds, activePolygon?: number[][] | null, filterOverride?: MapSearchFilters) => {
      const activeFilters = filterOverride ?? filtersRef.current
      setIsLoading(true)
      setError(null)

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
        str_state: activeFilters.str_state,
        str_city: activeFilters.str_city,
        limit: 500,
      }

      if (activePolygon) {
        request.polygon = activePolygon
      }

      try {
        const response: MapSearchResponse = await api.mapSearch.searchArea(request)
        setRawListings(response.listings)
        setTotalCount(response.total_count)
        setEstimatedTotal(response.estimated_total ?? null)
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

  const polygonRef = useRef<number[][] | null>(null)

  const onBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      lastBoundsRef.current = bounds
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        fetchListings(bounds, polygonRef.current)
      }, 400)
    },
    [fetchListings],
  )

  const onPolygonComplete = useCallback(
    (vertices: number[][]) => {
      setPolygon(vertices)
      polygonRef.current = vertices
      if (lastBoundsRef.current) {
        fetchListings(lastBoundsRef.current, vertices)
      }
    },
    [fetchListings],
  )

  const clearPolygon = useCallback(() => {
    setPolygon(null)
    polygonRef.current = null
    if (lastBoundsRef.current) {
      fetchListings(lastBoundsRef.current, null)
    }
  }, [fetchListings])

  const updateFilters = useCallback(
    (next: Partial<MapSearchFilters>) => {
      const needsRefetch = (
        'listing_type' in next ||
        'property_type' in next ||
        'min_price' in next ||
        'max_price' in next ||
        'bedrooms' in next ||
        'bathrooms' in next ||
        'listing_statuses' in next ||
        'include_str_listings' in next
      )

      setFilters((prev) => {
        const merged = { ...prev, ...next }
        filtersRef.current = merged
        if (needsRefetch && lastBoundsRef.current) {
          fetchListings(lastBoundsRef.current, polygonRef.current, merged)
        }
        return merged
      })
    },
    [fetchListings],
  )

  const dealSignals = useMemo(() => scoreDealSignals(rawListings), [rawListings])

  const filteredAndSortedListings = useMemo(() => {
    let result = rawListings
    result = filterByListingStatus(result, filters.listing_statuses)
    result = filterByMinDom(result, filters.min_dom)
    result = sortListings(result, dealSignals, filters.sort_by)
    return result
  }, [rawListings, filters.listing_statuses, filters.min_dom, filters.sort_by, dealSignals])

  return {
    listings: filteredAndSortedListings,
    rawListings,
    isLoading,
    error,
    totalCount,
    estimatedTotal,
    filters,
    polygon,
    dealSignals,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  }
}
