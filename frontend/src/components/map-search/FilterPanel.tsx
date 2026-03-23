'use client'

import { useCallback } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { MapSearchFilters } from '@/hooks/useMapSearch'

interface FilterPanelProps {
  filters: MapSearchFilters
  onChange: (next: Partial<MapSearchFilters>) => void
  totalCount: number
  isLoading: boolean
  isOpen: boolean
  onToggle: () => void
}

const LISTING_TYPES: { value: MapSearchFilters['listing_type']; label: string }[] = [
  { value: 'sale', label: 'For Sale' },
  { value: 'rental', label: 'For Rent' },
  { value: 'both', label: 'Both' },
]

const PROPERTY_TYPES = [
  { value: '', label: 'Any' },
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Condo', label: 'Condo' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Multi-Family', label: 'Multi-Family' },
]

const BEDROOM_OPTIONS = [
  { value: undefined, label: 'Any' },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
]

export function FilterPanel({ filters, onChange, totalCount, isLoading, isOpen, onToggle }: FilterPanelProps) {
  const handlePriceChange = useCallback(
    (field: 'min_price' | 'max_price', raw: string) => {
      const num = raw ? Number(raw) : undefined
      onChange({ [field]: num && !isNaN(num) ? num : undefined })
    },
    [onChange],
  )

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
        style={{
          backgroundColor: 'var(--surface-card)',
          color: 'var(--text-body)',
          border: '1px solid var(--border-default)',
        }}
      >
        <SlidersHorizontal size={16} />
        Filters
        {totalCount > 0 && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent-sky)', color: '#fff' }}
          >
            {totalCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="absolute top-4 left-4 z-10 w-72 rounded-xl shadow-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Filters
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isLoading ? 'Searching...' : `${totalCount} results`}
          </span>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:opacity-70 transition-opacity">
          <X size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Listing Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Listing Type
          </label>
          <div className="flex gap-1">
            {LISTING_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ listing_type: opt.value })}
                className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: filters.listing_type === opt.value ? 'var(--accent-sky)' : 'var(--surface-elevated)',
                  color: filters.listing_type === opt.value ? '#fff' : 'var(--text-body)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Property Type
          </label>
          <select
            value={filters.property_type || ''}
            onChange={(e) => onChange({ property_type: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-body)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {PROPERTY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Price Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.min_price ?? ''}
              onChange={(e) => handlePriceChange('min_price', e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-body)',
                border: '1px solid var(--border-subtle)',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.max_price ?? ''}
              onChange={(e) => handlePriceChange('max_price', e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-body)',
                border: '1px solid var(--border-subtle)',
              }}
            />
          </div>
        </div>

        {/* Bedrooms */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Bedrooms
          </label>
          <div className="flex gap-1">
            {BEDROOM_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onChange({ bedrooms: opt.value })}
                className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: filters.bedrooms === opt.value ? 'var(--accent-sky)' : 'var(--surface-elevated)',
                  color: filters.bedrooms === opt.value ? '#fff' : 'var(--text-body)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            Bathrooms
          </label>
          <div className="flex gap-1">
            {[
              { value: undefined, label: 'Any' },
              { value: 1, label: '1+' },
              { value: 2, label: '2+' },
              { value: 3, label: '3+' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => onChange({ bathrooms: opt.value })}
                className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: filters.bathrooms === opt.value ? 'var(--accent-sky)' : 'var(--surface-elevated)',
                  color: filters.bathrooms === opt.value ? '#fff' : 'var(--text-body)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
