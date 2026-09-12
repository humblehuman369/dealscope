'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import {
  AddressAutocomplete,
  type AddressComponents,
  type PlaceMetadata,
} from '@/components/AddressAutocomplete'
import type { MapOverlayChrome } from '@/components/map-search/mapOverlayChrome'

export interface MapSearchSelection {
  formatted_address: string
  components?: AddressComponents
  location?: { lat: number; lng: number }
  /** Suggested zoom level inferred from Google place types (city/zip/state/etc). */
  zoom: number
  /** True when the result is a specific street address (vs a city/state/zip region). */
  isStreetAddress: boolean
  placeTypes: string[]
}

interface MapSearchBarProps {
  onSelect: (selection: MapSearchSelection) => void
  /** Called when the user clears the input. */
  onClear?: () => void
  /**
   * When set, paints the bar to match map light/dark tiles instead of global
   * `--surface-*` tokens (which stay dark when the app theme is dark).
   */
  overlayChrome?: MapOverlayChrome | null
  /** Text shown in the input before the user types (e.g. the visitor's city). */
  initialValue?: string
  /** Static placeholder when `placeholders` is not set. */
  placeholder?: string
  /** When set, cycles these prompts while the input is empty. */
  placeholders?: string[]
}

function inferZoom(placeTypes: string[]): { zoom: number; isStreetAddress: boolean } {
  if (
    placeTypes.includes('street_address') ||
    placeTypes.includes('premise') ||
    placeTypes.includes('subpremise')
  ) {
    return { zoom: 18, isStreetAddress: true }
  }
  if (placeTypes.includes('postal_code')) return { zoom: 13, isStreetAddress: false }
  if (placeTypes.includes('locality') || placeTypes.includes('sublocality'))
    return { zoom: 12, isStreetAddress: false }
  if (placeTypes.includes('administrative_area_level_2'))
    return { zoom: 10, isStreetAddress: false }
  if (placeTypes.includes('administrative_area_level_1')) return { zoom: 7, isStreetAddress: false }
  return { zoom: 14, isStreetAddress: false }
}

/**
 * Search input docked over the map. Wraps AddressAutocomplete in
 * `searchMode='location'` so users can search by address, city, state, or
 * ZIP — same suggestions as the homepage hero search.
 */
const ROTATE_MS = 3200
const DEFAULT_PLACEHOLDER = 'Search address, city, state, or ZIP'

export function MapSearchBar({
  onSelect,
  onClear,
  overlayChrome,
  initialValue = '',
  placeholder = DEFAULT_PLACEHOLDER,
  placeholders,
}: MapSearchBarProps) {
  const [value, setValue] = useState(initialValue)
  const [promptIndex, setPromptIndex] = useState(0)
  const rotating = Boolean(placeholders && placeholders.length > 0 && !value)

  useEffect(() => {
    if (!placeholders || placeholders.length < 2 || value) return
    const id = window.setInterval(() => {
      setPromptIndex((i) => (i + 1) % placeholders.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [placeholders, value])

  const handlePlaceSelect = (
    address: string,
    components?: AddressComponents,
    meta?: PlaceMetadata,
  ) => {
    const placeTypes = meta?.placeTypes ?? []
    const { zoom, isStreetAddress } = inferZoom(placeTypes)
    onSelect({
      formatted_address: address,
      components,
      location: meta?.location,
      zoom,
      isStreetAddress,
      placeTypes,
    })
  }

  const handleClear = () => {
    setValue('')
    onClear?.()
  }

  const chrome = overlayChrome ?? null

  return (
    <div
      className="flex items-center gap-2 rounded-lg shadow-lg w-full min-w-0"
      style={{
        backgroundColor: chrome?.backgroundColor ?? 'var(--surface-card)',
        border: `1px solid ${chrome?.borderColor ?? 'var(--border-default)'}`,
        padding: '6px 10px',
        ...(chrome && {
          ['--map-search-placeholder' as string]: chrome.secondaryText,
        }),
      }}
    >
      <Search
        size={16}
        style={{ color: chrome?.secondaryText ?? 'var(--text-secondary)', flexShrink: 0 }}
      />
      <div className="relative flex-1 min-w-0">
        <AddressAutocomplete
          value={value}
          onChange={setValue}
          onPlaceSelect={handlePlaceSelect}
          searchMode="location"
          placeholder={rotating ? '' : placeholder}
          className={`w-full bg-transparent outline-none border-0 text-sm min-w-0${
            chrome ? ' map-search-chrome-input' : ''
          }`}
          style={{
            color: chrome?.primaryText ?? 'var(--text-heading)',
          }}
          aria-label={DEFAULT_PLACEHOLDER}
        />
        {rotating && placeholders && (
          <span
            key={promptIndex}
            className="absolute inset-0 flex items-center text-sm truncate pointer-events-none map-search-rotating-ph"
            style={{ color: chrome?.secondaryText ?? 'var(--text-label)' }}
            aria-hidden="true"
          >
            {placeholders[promptIndex % placeholders.length]}
          </span>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 rounded hover:opacity-70 transition-opacity shrink-0"
          style={{ color: chrome?.secondaryText ?? 'var(--text-secondary)' }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
