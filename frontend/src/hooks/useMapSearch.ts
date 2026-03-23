'use client'

import { useCallback, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { MapListing, MapSearchRequest, MapSearchResponse } from '@/lib/api'

export interface MapSearchFilters {
  listing_type: 'sale' | 'rental' | 'both'
  property_type?: string
  min_price?: number
  max_price?: number
  bedrooms?: number
  bathrooms?: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

const DEFAULT_FILTERS: MapSearchFilters = {
  listing_type: 'sale',
}

export function useMapSearch() {
  const [listings, setListings] = useState<MapListing[]>([])
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
        limit: 500,
      }

      if (activePolygon) {
        request.polygon = activePolygon
      }

      try {
        const response: MapSearchResponse = await api.mapSearch.searchArea(request)
        setListings(response.listings)
        setTotalCount(response.total_count)
        setEstimatedTotal(response.estimated_total ?? null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed'
        setError(msg)
        setListings([])
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
      setFilters((prev) => {
        const merged = { ...prev, ...next }
        filtersRef.current = merged
        if (lastBoundsRef.current) {
          fetchListings(lastBoundsRef.current, polygonRef.current, merged)
        }
        return merged
      })
    },
    [fetchListings],
  )

  return {
    listings,
    isLoading,
    error,
    totalCount,
    estimatedTotal,
    filters,
    polygon,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  }
}
