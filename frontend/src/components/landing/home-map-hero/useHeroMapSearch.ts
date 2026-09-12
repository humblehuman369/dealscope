'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { MapListing, MapSearchRequest, MapSearchResponse } from '@/lib/api'
import { classifyListings, mergeMapListingsByIdPreferStrongerStatus } from '@/lib/dealSignal'
import type { MapBounds } from '@/hooks/useMapSearch'
import { DEFAULT_HERO_PRESET, type HeroPreset } from './presets'

/**
 * Search state for the homepage map hero.
 *
 * Deliberately separate from `useMapSearch`: that hook hydrates from and
 * writes to the tab's map-search session snapshot, which the hero must not
 * touch (a visitor playing with homepage presets should not change the
 * filters they find later in the real map).
 *
 * Cost rules, in one place:
 *  - Cheap presets (All deals) fetch once the camera settles, debounced.
 *  - Expensive presets fetch once when the visitor picks them (one click,
 *    one query, which returns both pins and count). They never re-fetch on
 *    pan; the visitor asks again via the count prompt (`reveal`).
 *  - The count prompt never costs a query when the preset is already
 *    fetched for the current viewport — it only reveals a number we have.
 *  - Pins cap at HERO_PIN_LIMIT so a dense viewport stays a sample.
 */
const BOUNDS_DEBOUNCE_MS = 1200
const HERO_PIN_LIMIT = 200

export interface HeroSearchState {
  listings: MapListing[]
  dealSignals: ReturnType<typeof classifyListings>
  isLoading: boolean
  error: string | null
  notice: string | null
  /** Count for the active preset, or null until it has been fetched. */
  count: number | null
  /** True once the active preset has been fetched for the current viewport. */
  fetched: boolean
  preset: HeroPreset
}

export function useHeroMapSearch() {
  const [preset, setPresetState] = useState<HeroPreset>(DEFAULT_HERO_PRESET)
  const [rawListings, setRawListings] = useState<MapListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [fetched, setFetched] = useState(false)

  const boundsRef = useRef<MapBounds | null>(null)
  const presetRef = useRef<HeroPreset>(DEFAULT_HERO_PRESET)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeq = useRef(0)
  const fetchedRef = useRef(false)

  const run = useCallback(async (bounds: MapBounds, active: HeroPreset) => {
    const seq = ++requestSeq.current
    setIsLoading(true)
    setError(null)
    setNotice(null)

    const request: MapSearchRequest = {
      north: bounds.north,
      south: bounds.south,
      east: bounds.east,
      west: bounds.west,
      ...active.request,
      limit: HERO_PIN_LIMIT,
    }

    try {
      const response: MapSearchResponse = await api.mapSearch.searchArea(request)
      if (seq !== requestSeq.current) return
      setRawListings(response.listings)
      setCount(response.estimated_total ?? response.total_count)
      setNotice(response.notice ?? null)
      setFetched(true)
      fetchedRef.current = true
    } catch (err) {
      if (seq !== requestSeq.current) return
      setError(err instanceof Error ? err.message : 'Search failed')
      setRawListings([])
      setCount(null)
      fetchedRef.current = false
    } finally {
      if (seq === requestSeq.current) setIsLoading(false)
    }
  }, [])

  /** Camera settled. Cheap presets auto-search; expensive ones keep their pins and wait for `reveal`. */
  const onBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      const first = boundsRef.current == null
      boundsRef.current = bounds
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (presetRef.current.expensive) {
        // First settled viewport after a preset pick: run it. Later pans keep
        // the pins on screen but invalidate the count so the prompt re-arms.
        if (first || !fetchedRef.current) {
          run(bounds, presetRef.current)
        } else {
          setFetched(false)
          setCount(null)
        }
        return
      }
      setFetched(false)
      setCount(null)
      debounceRef.current = setTimeout(() => {
        run(bounds, presetRef.current)
      }, BOUNDS_DEBOUNCE_MS)
    },
    [run],
  )

  /** Preset button clicked. Always searches the current viewport once. */
  const setPreset = useCallback(
    (next: HeroPreset) => {
      presetRef.current = next
      setPresetState(next)
      setFetched(false)
      fetchedRef.current = false
      setCount(null)
      setRawListings([])
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (boundsRef.current) run(boundsRef.current, next)
    },
    [run],
  )

  /** The count prompt was clicked. Runs the one query for the active preset. */
  const reveal = useCallback(() => {
    if (!boundsRef.current) return
    if (fetched && count != null) return
    run(boundsRef.current, presetRef.current)
  }, [run, fetched, count])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const listings = useMemo(
    () => mergeMapListingsByIdPreferStrongerStatus(rawListings),
    [rawListings],
  )
  const dealSignals = useMemo(() => classifyListings(listings), [listings])

  const state: HeroSearchState = {
    listings,
    dealSignals,
    isLoading,
    error,
    notice,
    count,
    fetched,
    preset,
  }

  return { ...state, onBoundsChanged, setPreset, reveal }
}
