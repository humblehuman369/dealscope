'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { AddressAutocomplete, type AddressComponents, type PlaceMetadata } from '@/components/AddressAutocomplete'

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
}

function inferZoom(placeTypes: string[]): { zoom: number; isStreetAddress: boolean } {
  if (placeTypes.includes('street_address') || placeTypes.includes('premise') || placeTypes.includes('subpremise')) {
    return { zoom: 18, isStreetAddress: true }
  }
  if (placeTypes.includes('postal_code')) return { zoom: 13, isStreetAddress: false }
  if (placeTypes.includes('locality') || placeTypes.includes('sublocality')) return { zoom: 12, isStreetAddress: false }
  if (placeTypes.includes('administrative_area_level_2')) return { zoom: 10, isStreetAddress: false }
  if (placeTypes.includes('administrative_area_level_1')) return { zoom: 7, isStreetAddress: false }
  return { zoom: 14, isStreetAddress: false }
}

/**
 * Search input docked over the map. Wraps AddressAutocomplete in
 * `searchMode='location'` so users can search by address, city, state, or
 * ZIP — same suggestions as the homepage hero search.
 */
export function MapSearchBar({ onSelect, onClear }: MapSearchBarProps) {
  const [value, setValue] = useState('')

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

  return (
    <div
      className="flex items-center gap-2 rounded-lg shadow-lg w-[min(92vw,28rem)]"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        padding: '6px 10px',
      }}
    >
      <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <AddressAutocomplete
        value={value}
        onChange={setValue}
        onPlaceSelect={handlePlaceSelect}
        searchMode="location"
        placeholder="Search address, city, state, or ZIP"
        className="flex-1 bg-transparent outline-none border-0 text-sm"
        style={{ color: 'var(--text-heading)' }}
        aria-label="Search address, city, state, or ZIP"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="p-1 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
