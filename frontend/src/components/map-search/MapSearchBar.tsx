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

// Minimal types for the modern Places API (Places API New). We define these here
// because @types/google.maps's coverage of the new API has been incomplete and
// we want to keep this component self-contained.
interface NewPlacesNamespace {
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (request: {
      input: string
      includedRegionCodes?: string[]
      includedPrimaryTypes?: string[]
      sessionToken?: unknown
    }) => Promise<{ suggestions: NewSuggestion[] }>
  }
  AutocompleteSessionToken?: new () => unknown
  Place?: new (options: { id: string }) => NewPlace
}

interface NewSuggestion {
  placePrediction?: {
    placeId: string
    text?: { text?: string }
    mainText?: { text?: string }
    secondaryText?: { text?: string }
    types?: string[]
    toPlace?: () => NewPlace
  }
}

interface NewPlace {
  id?: string
  fetchFields: (options: { fields: string[] }) => Promise<{ place: NewPlace }>
  formattedAddress?: string
  location?: { lat: () => number; lng: () => number }
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>
  types?: string[]
}

/**
 * MapSearchBar
 *
 * Address search overlay built on Google's modern `AutocompleteSuggestion`
 * (Places API New) with a fallback to the legacy `AutocompleteService`. This
 * gives us:
 *   - support for both old + new Google Cloud accounts (the legacy widget +
 *     `AutocompleteService` were closed to "new customers" in March 2025)
 *   - full control over the dropdown UI (theming, accessibility, click handling)
 *   - clean event flow with no race against Google's internal listeners
 *
 * Restricted to US street addresses. (City/state/zip support depends on
 * Google API access tier and was unreliable in production, so we restrict to
 * full addresses for predictable behavior.)
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
  const sessionTokenRef = useRef<unknown>(null)
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

    debounceRef.current = setTimeout(async () => {
      const myRequestId = ++requestIdRef.current
      setIsLoading(true)

      const placesNs = (google.maps.places as unknown) as NewPlacesNamespace
      const newApi = placesNs.AutocompleteSuggestion
      const NewSessionToken = placesNs.AutocompleteSessionToken

      // ── Primary: modern Places API (AutocompleteSuggestion) ─────────────
      if (newApi?.fetchAutocompleteSuggestions) {
        try {
          if (!sessionTokenRef.current && NewSessionToken) {
            sessionTokenRef.current = new NewSessionToken()
          }
          const { suggestions } = await newApi.fetchAutocompleteSuggestions({
            input: trimmed,
            includedRegionCodes: ['us'],
            includedPrimaryTypes: ['street_address'],
            sessionToken: sessionTokenRef.current ?? undefined,
          })
          if (myRequestId !== requestIdRef.current) return
          setIsLoading(false)
          const mapped: Prediction[] = suggestions
            .map((s) => s.placePrediction)
            .filter((p): p is NonNullable<typeof p> => !!p && !!p.placeId)
            .map((p) => ({
              placeId: p.placeId,
              description: p.text?.text ?? '',
              mainText: p.mainText?.text ?? p.text?.text ?? '',
              secondaryText: p.secondaryText?.text ?? '',
              types: p.types ?? [],
            }))
          if (mapped.length === 0) {
            setPredictions([])
            setIsOpen(false)
            return
          }
          setPredictions(mapped)
          setIsOpen(true)
          setHighlightedIndex(-1)
          return
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[MapSearchBar] AutocompleteSuggestion failed, trying legacy:', err)
          // fall through to legacy
        }
      }

      // ── Fallback: legacy AutocompleteService ────────────────────────────
      const LegacyService = google.maps.places.AutocompleteService
      const LegacySessionToken = google.maps.places.AutocompleteSessionToken
      if (!LegacyService) {
        setIsLoading(false)
        // eslint-disable-next-line no-console
        console.error(
          '[MapSearchBar] Neither AutocompleteSuggestion nor AutocompleteService is available. ' +
            'Enable "Places API (New)" or "Places API" in Google Cloud Console for this key.',
        )
        return
      }
      const service = new LegacyService()
      if (!sessionTokenRef.current && LegacySessionToken) {
        sessionTokenRef.current = new LegacySessionToken()
      }
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: 'us' },
          types: ['address'],
          sessionToken: sessionTokenRef.current as google.maps.places.AutocompleteSessionToken | undefined,
        },
        (results, status) => {
          if (myRequestId !== requestIdRef.current) return
          setIsLoading(false)
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            // eslint-disable-next-line no-console
            console.warn('[MapSearchBar] Legacy AutocompleteService returned status:', status)
            setPredictions([])
            setIsOpen(false)
            return
          }
          if (!results || results.length === 0) {
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
    async (prediction: Prediction) => {
      setValue(prediction.description)
      setIsOpen(false)
      setPredictions([])

      const placesNs = (google.maps.places as unknown) as NewPlacesNamespace
      const PlaceCtor = placesNs.Place

      // ── Primary: modern Place.fetchFields ───────────────────────────────
      if (PlaceCtor) {
        try {
          const place = new PlaceCtor({ id: prediction.placeId })
          await place.fetchFields({
            fields: ['location', 'formattedAddress', 'addressComponents', 'types'],
          })
          if (place.location) {
            const components = {
              city: place.addressComponents?.find(
                (c) => c.types?.includes('locality') || c.types?.includes('sublocality'),
              )?.longText,
              state: place.addressComponents?.find((c) =>
                c.types?.includes('administrative_area_level_1'),
              )?.shortText,
              zipCode: place.addressComponents?.find((c) => c.types?.includes('postal_code'))
                ?.longText,
            }
            onSelect({
              address: place.formattedAddress ?? prediction.description,
              components,
              meta: {
                placeTypes: place.types ?? prediction.types,
                location: { lat: place.location.lat(), lng: place.location.lng() },
              },
            })
            sessionTokenRef.current = null
            return
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[MapSearchBar] Place.fetchFields failed, falling back to Geocoder:', err)
        }
      }

      // ── Fallback: Geocoder with placeId (works on legacy keys) ─────────
      const Geocoder = google.maps.Geocoder
      if (!Geocoder) {
        // eslint-disable-next-line no-console
        console.error('[MapSearchBar] No Geocoder available to resolve selection')
        return
      }
      const geocoder = new Geocoder()
      try {
        const { results } = await geocoder.geocode({ placeId: prediction.placeId })
        if (!results || !results[0]) {
          // eslint-disable-next-line no-console
          console.warn('[MapSearchBar] Geocoder returned no results for', prediction.description)
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
        sessionTokenRef.current = null
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[MapSearchBar] Geocoder failed for', prediction.description, err)
      }
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
          placeholder="Address Search"
          aria-label="Search the map by street address"
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
                // mousedown (not click) fires before the input's blur, so the
                // dropdown doesn't close out from under the selection in some
                // browsers.
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
