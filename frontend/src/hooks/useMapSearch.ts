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
  const [filters, setFilters] = useState<MapSearchFilters>(DEFAULT_FILTERS)
  const [polygon, setPolygon] = useState<number[][] | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastBoundsRef = useRef<MapBounds | null>(null)

  const fetchListings = useCallback(
    async (bounds: MapBounds, activePolygon?: number[][] | null) => {
      setIsLoading(true)
      setError(null)

      const request: MapSearchRequest = {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
        listing_type: filters.listing_type,
        property_type: filters.property_type,
        min_price: filters.min_price,
        max_price: filters.max_price,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
        limit: 500,
      }

      if (activePolygon) {
        request.polygon = activePolygon
      }

      try {
        const response: MapSearchResponse = await api.mapSearch.searchArea(request)
        setListings(response.listings)
        setTotalCount(response.total_count)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed'
        setError(msg)
        setListings([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    },
    [filters],
  )

  const onBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      lastBoundsRef.current = bounds
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        fetchListings(bounds, polygon)
      }, 400)
    },
    [fetchListings, polygon],
  )

  const onPolygonComplete = useCallback(
    (vertices: number[][]) => {
      setPolygon(vertices)
      if (lastBoundsRef.current) {
        fetchListings(lastBoundsRef.current, vertices)
      }
    },
    [fetchListings],
  )

  const clearPolygon = useCallback(() => {
    setPolygon(null)
    if (lastBoundsRef.current) {
      fetchListings(lastBoundsRef.current, null)
    }
  }, [fetchListings])

  const updateFilters = useCallback(
    (next: Partial<MapSearchFilters>) => {
      setFilters((prev) => {
        const merged = { ...prev, ...next }
        if (lastBoundsRef.current) {
          fetchListings(lastBoundsRef.current, polygon)
        }
        return merged
      })
    },
    [fetchListings, polygon],
  )

  return {
    listings,
    isLoading,
    error,
    totalCount,
    filters,
    polygon,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  }
}
