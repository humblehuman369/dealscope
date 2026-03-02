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

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Called with the full formatted address when a place is selected; optional components for structured data */
  onPlaceSelect?: (address: string, components?: AddressComponents) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
  id?: string
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
  placeholder = 'Enter a property address...',
  className = '',
  style,
  autoFocus = false,
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const onChangeRef = useRef(onChange)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  onChangeRef.current = onChange
  onPlaceSelectRef.current = onPlaceSelect

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

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

    if (document.querySelector('script[data-google-places]')) {
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
      console.warn('AddressAutocomplete: Failed to load Google Places script')
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

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'address_components'],
    })

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
        onPlaceSelectRef.current?.(formatted, components)
      }
    })

    autocompleteRef.current = autocomplete
    if (typeof console !== 'undefined' && console.log) {
      console.log('Google Places Autocomplete initialized successfully')
    }
  }, [isLoaded])

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      defaultValue={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  )
}
