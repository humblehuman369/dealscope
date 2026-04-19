'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { AddressAutocomplete, type AddressComponents, type PlaceMetadata } from '@/components/AddressAutocomplete'

export interface MapSearchSelection {
  address: string
  components?: AddressComponents
  meta?: PlaceMetadata
}

interface MapSearchBarProps {
  /** Initial value (e.g. label from URL params). */
  initialValue?: string
  /** Called when the user picks a suggestion (address, city, state, or zip). */
  onSelect: (selection: MapSearchSelection) => void
  /** Called when the user submits free text without picking a suggestion (Enter key). */
  onManualSubmit?: (text: string) => void
  /** Called when the user clears the input. */
  onClear?: () => void
}

/**
 * MapSearchBar
 *
 * Top-of-map search overlay. Wraps the shared AddressAutocomplete in
 * `searchMode="location"` so users can search by full address, city,
 * state, or zip code. The parent (MapSearchView) decides what to do
 * with the selection — typically: pan + zoom, and for exact addresses
 * also drop a pin and show the off-market preview card.
 */
export function MapSearchBar({
  initialValue = '',
  onSelect,
  onManualSubmit,
  onClear,
}: MapSearchBarProps) {
  const [value, setValue] = useState(initialValue)

  const handleClear = () => {
    setValue('')
    onClear?.()
  }

  return (
    <div
      className="flex items-center gap-2 w-full rounded-full shadow-xl pl-4 pr-1.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-[var(--accent-sky)]"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <Search size={18} style={{ color: 'var(--text-secondary)' }} aria-hidden />
      <AddressAutocomplete
        value={value}
        onChange={setValue}
        searchMode="location"
        placeholder="Address, city, or zip"
        aria-label="Search the map by address, city, state, or zip code"
        onPlaceSelect={(address, components, meta) => {
          setValue(address)
          onSelect({ address, components, meta })
        }}
        onManualSubmit={(text) => onManualSubmit?.(text)}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium placeholder:font-normal"
        style={{
          color: 'var(--text-heading)',
        }}
      />
      {value && (
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
  )
}
