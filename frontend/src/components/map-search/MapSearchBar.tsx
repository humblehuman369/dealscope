'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export interface MapSearchSelection {
  address: string
  components?: { city?: string; state?: string; zipCode?: string }
  meta?: { placeTypes: string[]; location?: { lat: number; lng: number } }
}

interface Prediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

interface MapSearchBarProps {
  /** Initial value (e.g. label from URL params). */
  initialValue?: string
  /** Called when the user picks a suggestion (address, city, state, or zip). */
  onSelect: (selection: MapSearchSelection) => void
  /** Called when the user clears the input. */
  onClear?: () => void
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 200

/**
 * MapSearchBar
 *
 * Custom search overlay built on Google's `AutocompleteService` + `Geocoder`
 * (NOT the legacy `Autocomplete` widget). This gives us full control over:
 *   - the dropdown UI (theming, accessibility, click handling)
 *   - the selection event flow (no race against Google's internal listeners)
 *   - the geometry resolution (Geocoder with placeId, no REST endpoint required)
 *
 * Supports addresses, cities, states, and zip codes (US-restricted).
 */
export function MapSearchBar({ initialValue = '', onSelect, onClear }: MapSearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [isReady, setIsReady] = useState(
    typeof window !== 'undefined' && !!window.google?.maps?.places,
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  // Wait for the Places library to load (APIProvider on the parent loads it).
  useEffect(() => {
    if (isReady) return
    const t = setInterval(() => {
      if (typeof window !== 'undefined' && window.google?.maps?.places) {
        setIsReady(true)
        clearInterval(t)
      }
    }, 100)
    return () => clearInterval(t)
  }, [isReady])

  // Fetch predictions whenever the query changes (debounced).
  useEffect(() => {
    if (!isReady) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = value.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setPredictions([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      const service = new google.maps.places.AutocompleteService()
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      }
      const myRequestId = ++requestIdRef.current
      setIsLoading(true)
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: 'us' },
          types: ['geocode'],
          sessionToken: sessionTokenRef.current,
        },
        (results, status) => {
          if (myRequestId !== requestIdRef.current) return
          setIsLoading(false)
          if (
            status !== google.maps.places.PlacesServiceStatus.OK ||
            !results ||
            results.length === 0
          ) {
            setPredictions([])
            setIsOpen(false)
            return
          }
          setPredictions(
            results.map((p) => ({
              placeId: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text ?? p.description,
              secondaryText: p.structured_formatting?.secondary_text ?? '',
              types: p.types ?? [],
            })),
          )
          setIsOpen(true)
          setHighlightedIndex(-1)
        },
      )
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, isReady])

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const resolveAndSelect = useCallback(
    (prediction: Prediction) => {
      setValue(prediction.description)
      setIsOpen(false)
      setPredictions([])

      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ placeId: prediction.placeId }, (results, status) => {
        if (status !== google.maps.GeocoderStatus.OK || !results || !results[0]) {
          // eslint-disable-next-line no-console
          console.warn('[MapSearchBar] Geocoder failed for', prediction.description, status)
          return
        }
        const result = results[0]
        const loc = result.geometry?.location
        if (!loc) {
          // eslint-disable-next-line no-console
          console.warn('[MapSearchBar] No geometry for', prediction.description)
          return
        }

        const components = {
          city: result.address_components?.find(
            (c) => c.types.includes('locality') || c.types.includes('sublocality'),
          )?.long_name,
          state: result.address_components?.find((c) =>
            c.types.includes('administrative_area_level_1'),
          )?.short_name,
          zipCode: result.address_components?.find((c) => c.types.includes('postal_code'))
            ?.long_name,
        }

        onSelect({
          address: prediction.description,
          components,
          meta: {
            placeTypes: prediction.types,
            location: { lat: loc.lat(), lng: loc.lng() },
          },
        })

        // Reset session token after a selection (per Google billing best practice).
        sessionTokenRef.current = null
      })
    },
    [onSelect],
  )

  const handleClear = () => {
    setValue('')
    setPredictions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
    onClear?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.min(i + 1, predictions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = highlightedIndex >= 0 ? highlightedIndex : 0
      const choice = predictions[idx]
      if (choice) resolveAndSelect(choice)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex items-center gap-2 w-full rounded-full shadow-xl pl-4 pr-1.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-sky)]"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Search size={18} style={{ color: 'var(--text-secondary)' }} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Address, city, or zip"
          aria-label="Search the map by address, city, state, or zip code"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="map-search-listbox"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium placeholder:font-normal"
          style={{ color: 'var(--text-heading)' }}
        />
        {isLoading && (
          <Loader2
            size={16}
            className="animate-spin flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden
          />
        )}
        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors flex-shrink-0"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <ul
          id="map-search-listbox"
          role="listbox"
          className="absolute left-0 right-0 mt-1.5 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          {predictions.map((p, idx) => (
            <li key={p.placeId} role="option" aria-selected={highlightedIndex === idx}>
              <button
                type="button"
                // mousedown (not click) so it fires before the input's blur — keeps the dropdown
                // from closing before the selection is processed in some browsers.
                onMouseDown={(e) => {
                  e.preventDefault()
                  resolveAndSelect(p)
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                style={{
                  backgroundColor:
                    highlightedIndex === idx
                      ? 'rgba(14, 165, 233, 0.10)'
                      : 'transparent',
                }}
              >
                <Search
                  size={14}
                  style={{ color: 'var(--text-secondary)' }}
                  className="mt-1 flex-shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {p.mainText}
                  </div>
                  {p.secondaryText && (
                    <div
                      className="text-xs truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {p.secondaryText}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
