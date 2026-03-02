'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const DEBOUNCE_MS = 300

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
 * Falls back to a plain text input if the API key is missing or the script fails to load.
 *
 * Uses the Google Maps JavaScript API (Places library).
 * Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to be set.
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
  const [inputValue, setInputValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Keep input in sync with controlled value (e.g. when parent sets address from validation)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Load the Google Maps script once globally
  const loadScript = useCallback(() => {
    if (!apiKey) return
    if (typeof window === 'undefined') return

    // Already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true)
      return
    }

    // Already loading
    if (document.querySelector('script[data-google-places]')) {
      // Wait for it
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

  // Debounced onChange to parent (300ms)
  const scheduleOnChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        onChange(newValue)
      }, DEBOUNCE_MS)
    },
    [onChange]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInputValue(v)
      scheduleOnChange(v)
    },
    [scheduleOnChange]
  )

  // Initialize the autocomplete widget once the script is loaded
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
        setInputValue(formatted)
        onChange(formatted)
        const streetNumber = getComponent(place, 'street_number')
        const route = getComponent(place, 'route')
        const street = [streetNumber, route].filter(Boolean).join(' ')
        const components: AddressComponents = {
          streetNumber,
          street: route,
          city: getComponent(place, 'locality') || getComponent(place, 'sublocality'),
          state: getComponent(place, 'administrative_area_level_1'),
          zipCode: getComponent(place, 'postal_code'),
          county: getComponent(place, 'administrative_area_level_2') || undefined,
        }
        onPlaceSelect?.(formatted, components)
      }
    })

    autocompleteRef.current = autocomplete
  }, [isLoaded, onChange, onPlaceSelect])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  )
}
