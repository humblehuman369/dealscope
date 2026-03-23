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

function getComponent(place: google.maps.places.PlaceResult, type: string): string {
  const components = place.address_components ?? []
  const c = components.find((x) => x.types?.includes(type))
  return c?.long_name ?? ''
}

/**
 * AddressAutocomplete
 *
 * A Google Places Autocomplete input restricted to US addresses.
 * Uses an UNCONTROLLED input so the dropdown can open correctly (controlled
 * inputs conflict with the Places widget). Parent value is synced when it
 * changes (e.g. "Accept correction") and on place selection or typing.
 *
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and Maps JavaScript API with Places library.
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
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const onChangeRef = useRef(onChange)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const onManualSubmitRef = useRef(onManualSubmit)
  onChangeRef.current = onChange
  onPlaceSelectRef.current = onPlaceSelect
  onManualSubmitRef.current = onManualSubmit

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Warn once when key is missing (NEXT_PUBLIC_* is inlined at build time — set env and restart dev or redeploy)
  useEffect(() => {
    if (apiKey) return
    console.warn(
      '[AddressAutocomplete] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. ' +
      'Add it to .env.local (local) or Vercel env vars, then restart the dev server or redeploy. ' +
      'Address suggestions will not appear until the key is available at build time.'
    )
  }, [apiKey])

  // Sync parent value into the input when it changes (e.g. "Accept correction")
  useEffect(() => {
    if (inputRef.current && value !== inputRef.current.value) {
      inputRef.current.value = value
    }
  }, [value])

  // Load the Google Maps script once globally
  const loadScript = useCallback(() => {
    if (!apiKey) return
    if (typeof window === 'undefined') return

    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    if (window.google?.maps) {
      const importLibrary = window.google.maps.importLibrary
      if (typeof importLibrary === 'function') {
        importLibrary('places')
          .then(() => setIsLoaded(true))
          .catch((err) => {
            console.error(
              '[AddressAutocomplete] Failed to load Places library via importLibrary(). ' +
                'Ensure the Places API is enabled for this key.',
              err
            )
          })
        return
      }

      console.error(
        '[AddressAutocomplete] Google Maps JS API is already loaded without the Places library. ' +
          'Load the initial script with libraries=places to enable address suggestions.'
      )
      return
    }

    const existing = document.querySelector('script[data-google-places]')
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsLoaded(true)
          clearInterval(check)
        }
      }, 200)
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.setAttribute('data-google-places', 'true')
    script.onload = () => setIsLoaded(true)
    script.onerror = () => {
      console.error(
        '[AddressAutocomplete] Google Places script failed to load. ' +
        'Check that Maps JavaScript API and Places API are enabled for this key in Google Cloud Console, ' +
        'and that the key is restricted to your domain (or localhost) if needed.'
      )
    }
    document.head.appendChild(script)
  }, [apiKey])

  useEffect(() => {
    loadScript()
  }, [loadScript])

  // Notify parent of current value (no debounce). We do NOT set React state for the input,
  // so the input stays uncontrolled and the Places dropdown works.
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeRef.current(e.target.value)
  }, [])

  // Initialize Autocomplete once after script loads. Use refs for callbacks so this runs only when isLoaded/ref are ready (mount-only deps).
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    const isLocationMode = searchMode === 'location'
    const types = isLocationMode ? ['geocode'] : ['address']
    const fields = isLocationMode
      ? ['formatted_address', 'address_components', 'geometry', 'types']
      : ['formatted_address', 'address_components']

    let autocomplete: google.maps.places.Autocomplete
    try {
      autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types,
        componentRestrictions: { country: 'us' },
        fields,
      })
    } catch (err) {
      console.error(
        '[AddressAutocomplete] Failed to create Places Autocomplete. ' +
        'Ensure Maps JavaScript API and Places API (or Places API (New)) are enabled for your key in Google Cloud Console.',
        err
      )
      return
    }

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const formatted = place?.formatted_address
      if (formatted) {
        onChangeRef.current(formatted)
        const streetNumber = getComponent(place, 'street_number')
        const route = getComponent(place, 'route')
        const components: AddressComponents = {
          streetNumber,
          street: route,
          city: getComponent(place, 'locality') || getComponent(place, 'sublocality'),
          state: getComponent(place, 'administrative_area_level_1'),
          zipCode: getComponent(place, 'postal_code'),
          county: getComponent(place, 'administrative_area_level_2') || undefined,
        }

        const meta: PlaceMetadata = {
          placeTypes: place.types ?? [],
          location: place.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined,
        }

        onPlaceSelectRef.current?.(formatted, components, meta)
      }
    })

    autocompleteRef.current = autocomplete
  }, [isLoaded, searchMode])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const text = inputRef.current?.value?.trim()
      if (text && onManualSubmitRef.current) {
        e.preventDefault()
        onManualSubmitRef.current(text)
      }
    }
  }, [])

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="text"
      defaultValue={value}
      onChange={handleInputChange}
      onKeyDown={onManualSubmit ? handleKeyDown : undefined}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
      autoComplete="off"
      aria-label={ariaLabel}
    />
  )
}
