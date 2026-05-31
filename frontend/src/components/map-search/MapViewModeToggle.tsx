'use client'

import { List, MapIcon } from 'lucide-react'

interface MapViewModeToggleProps {
  viewMode: 'map' | 'list'
  onViewModeChange: (mode: 'map' | 'list') => void
  listingCount: number
}

export function MapViewModeToggle({
  viewMode,
  onViewModeChange,
  listingCount,
}: MapViewModeToggleProps) {
  return (
    <div
      className="flex rounded-full overflow-hidden shadow-xl"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
      role="group"
      aria-label="Map search view mode"
    >
      <button
        type="button"
        onClick={() => onViewModeChange('map')}
        aria-pressed={viewMode === 'map'}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors"
        style={{
          backgroundColor: viewMode === 'map' ? 'var(--accent-sky)' : 'transparent',
          color: viewMode === 'map' ? '#fff' : 'var(--text-secondary)',
        }}
      >
        <MapIcon size={16} aria-hidden />
        Map
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('list')}
        aria-pressed={viewMode === 'list'}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors"
        style={{
          backgroundColor: viewMode === 'list' ? 'var(--accent-sky)' : 'transparent',
          color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
        }}
      >
        <List size={16} aria-hidden />
        List ({listingCount})
      </button>
    </div>
  )
}
