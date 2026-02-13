'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Called with the full formatted address when a place is selected */
  onPlaceSelect?: (address: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  autoFocus?: boolean
  id?: string
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

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

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

  // Initialize the autocomplete widget once the script is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const formatted = place?.formatted_address
      if (formatted) {
        onChange(formatted)
        onPlaceSelect?.(formatted)
      }
    })

    autocompleteRef.current = autocomplete
  }, [isLoaded, onChange, onPlaceSelect])

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      style={style}
      autoFocus={autoFocus}
      autoComplete="off"
    />
  )
}
