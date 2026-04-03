'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface AddressComponents {
  streetNumber: string
  street: string
  city: string
  state: string
  zipCode: string
  county?: string
}

export interface PlaceMetadata {
  placeTypes: string[]
  location?: { lat: number; lng: number }
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Called with the full formatted address when a place is selected; optional components for structured data */
  onPlaceSelect?: (address: string, components?: AddressComponents, meta?: PlaceMetadata) => void
  /**
   * 'address' (default) — restrict suggestions to street addresses.
   * 'location' — allow addresses, cities, states, and zip codes.
   */
  searchMode?: 'address' | 'location'
  /** Called when user presses Enter without selecting a suggestion */
  onManualSubmit?: (text: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
  id?: string
  name?: string
  'aria-label'?: string
}

/** New Places `Place` / legacy `PlaceResult` address line helper */
function getAddressLine(
  place: { addressComponents?: google.maps.places.AddressComponent[] | null },
  type: string,
): string {
  const components = place.addressComponents ?? []
  const c = components.find((x) => x.types?.includes(type))
  if (!c) return ''
  const row = c as google.maps.places.AddressComponent & {
    longText?: string
    shortText?: string
    long_name?: string
    short_name?: string
  }
  return row.longText ?? row.long_name ?? row.shortText ?? row.short_name ?? ''
}

function readLatLng(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined,
): { lat: number; lng: number } | undefined {
  if (!loc) return undefined
  if (typeof (loc as google.maps.LatLng).lat === 'function') {
    const ll = loc as google.maps.LatLng
    return { lat: ll.lat(), lng: ll.lng() }
  }
  const lit = loc as google.maps.LatLngLiteral
  return { lat: lit.lat, lng: lit.lng }
}

type PlacePredictionSelectEventLike = Event & {
  placePrediction: { toPlace: () => google.maps.places.Place }
}

/** Maps JS `PlaceAutocompleteElement`; @types/google.maps is often behind the live widget API. */
type PlaceAutocompleteWidget = google.maps.places.PlaceAutocompleteElement & {
  value: string
  placeholder: string
  name: string
  input: HTMLInputElement
}

/**
 * AddressAutocomplete
 *
 * Google Places suggestions restricted to the US via `includedRegionCodes`.
 * Uses `PlaceAutocompleteElement` (recommended) instead of legacy `Autocomplete`.
 * Parent `value` is synced when it changes (e.g. "Accept correction") and on selection / input.
 *
 * Script loader uses `loading=async` per Maps JS best practices.
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, Maps JavaScript API, and Places API (New) enabled.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  searchMode = 'address',
  onManualSubmit,
  placeholder = 'Enter a property address...',
  className = '',
  style,
  autoFocus = false,
  id,
  name,
  'aria-label': ariaLabel,
}: AddressAutocompleteProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const pacRef = useRef<PlaceAutocompleteWidget | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const onChangeRef = useRef(onChange)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const onManualSubmitRef = useRef(onManualSubmit)
  onChangeRef.current = onChange
  onPlaceSelectRef.current = onPlaceSelect
  onManualSubmitRef.current = onManualSubmit

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    if (apiKey) return
    console.warn(
      '[AddressAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. ' +
        'Add it to .env.local (local) or Vercel env vars, then restart the dev server or redeploy. ' +
        'Address suggestions will not appear until the key is available at build time.',
    )
  }, [apiKey])

  const loadPlacesAndMarkReady = useCallback(() => {
    const maps = window.google?.maps
    if (!maps) return
    if (typeof maps.importLibrary === 'function') {
      maps
        .importLibrary('places')
        .then(() => setIsLoaded(true))
        .catch((err: unknown) => {
          console.error(
            '[AddressAutocomplete] Failed to load Places library via importLibrary(). ' +
              'Ensure Places API (New) is enabled for this key.',
            err,
          )
        })
      return
    }
    if (maps.places) {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!apiKey || typeof window === 'undefined') return

    if (window.google?.maps) {
      loadPlacesAndMarkReady()
      return
    }

    const existing = document.querySelector('script[data-google-places]')
    if (existing) {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(interval)
          loadPlacesAndMarkReady()
        }
      }, 200)
      return () => clearInterval(interval)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=places`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-places', 'true')
    script.onload = () => loadPlacesAndMarkReady()
    script.onerror = () => {
      console.error(
        '[AddressAutocomplete] Google Places script failed to load. ' +
          'Check that Maps JavaScript API and Places API are enabled for this key in Google Cloud Console, ' +
          'and that the key is restricted to your domain (or localhost) if needed.',
      )
    }
    document.head.appendChild(script)
  }, [apiKey, loadPlacesAndMarkReady])

  // PlaceAutocompleteElement (mount / searchMode)
  useEffect(() => {
    if (!isLoaded || !hostRef.current || pacRef.current) return

    const host = hostRef.current

    const Ctor = google.maps.places.PlaceAutocompleteElement
    if (typeof Ctor !== 'function') {
      console.error(
        '[AddressAutocomplete] PlaceAutocompleteElement is missing. ' +
          'Use a current Maps JS API version and enable Places API (New).',
      )
      return
    }

    // @types/google.maps may lag the live API; runtime options match PlaceAutocompleteElement docs.
    const el = new Ctor({
      includedRegionCodes: ['us'],
      placeholder,
      ...(name ? { name } : {}),
      ...(searchMode === 'address'
        ? { includedPrimaryTypes: ['street_address', 'premise', 'subpremise'] }
        : {}),
    } as google.maps.places.PlaceAutocompleteElementOptions) as PlaceAutocompleteWidget
    if (id) el.id = id
    el.value = value

    el.style.width = '100%'
    el.style.boxSizing = 'border-box'

    const onGmpSelect = async (ev: Event) => {
      const e = ev as PlacePredictionSelectEventLike
      const place = e.placePrediction.toPlace()
      try {
        await place.fetchFields({
          fields: ['formattedAddress', 'addressComponents', 'location', 'types', 'displayName'],
        })
      } catch (err) {
        console.error('[AddressAutocomplete] fetchFields failed:', err)
        return
      }

      const formatted = place.formattedAddress
      if (!formatted) return

      onChangeRef.current(formatted)

      const components: AddressComponents = {
        streetNumber: getAddressLine(place, 'street_number'),
        street: getAddressLine(place, 'route'),
        city: getAddressLine(place, 'locality') || getAddressLine(place, 'sublocality'),
        state: getAddressLine(place, 'administrative_area_level_1'),
        zipCode: getAddressLine(place, 'postal_code'),
        county: getAddressLine(place, 'administrative_area_level_2') || undefined,
      }

      const meta: PlaceMetadata = {
        placeTypes: (place.types as string[] | undefined) ?? [],
        location: readLatLng(place.location),
      }

      onPlaceSelectRef.current?.(formatted, components, meta)
    }

    const onInput = () => {
      onChangeRef.current(el.value)
    }

    const onKeyDownInner = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !onManualSubmitRef.current) return
      const text = el.value?.trim()
      if (text) {
        e.preventDefault()
        onManualSubmitRef.current(text)
      }
    }

    el.addEventListener('gmp-select', onGmpSelect)
    el.addEventListener('input', onInput)

    const inner = el.input
    inner?.setAttribute('autocomplete', 'off')
    if (ariaLabel) inner?.setAttribute('aria-label', ariaLabel)
    inner?.addEventListener('keydown', onKeyDownInner)

    host.appendChild(el)
    pacRef.current = el

    if (autoFocus) {
      requestAnimationFrame(() => inner?.focus())
    }

    return () => {
      inner?.removeEventListener('keydown', onKeyDownInner)
      el.removeEventListener('gmp-select', onGmpSelect)
      el.removeEventListener('input', onInput)
      pacRef.current = null
      if (el.parentNode === host) {
        host.removeChild(el)
      }
    }
    // Intentionally narrow deps: placeholder/name/id/ariaLabel/autoFocus/style applied in separate effects or initial only where noted.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate widget only when mode or load state changes
  }, [isLoaded, searchMode])

  useEffect(() => {
    const el = pacRef.current
    if (!el) return
    el.placeholder = placeholder
  }, [placeholder])

  useEffect(() => {
    const el = pacRef.current
    if (!el) return
    if (name) el.name = name
  }, [name])

  useEffect(() => {
    const el = pacRef.current
    if (!el) return
    if (id) el.id = id
  }, [id])

  useEffect(() => {
    const inner = pacRef.current?.input
    if (!inner) return
    if (ariaLabel) inner.setAttribute('aria-label', ariaLabel)
    else inner.removeAttribute('aria-label')
  }, [ariaLabel])

  useEffect(() => {
    const el = pacRef.current
    if (!el || value === el.value) return
    el.value = value
  }, [value])

  return <div ref={hostRef} className={className} style={{ width: '100%', ...style }} />
}
