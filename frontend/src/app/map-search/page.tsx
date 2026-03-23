'use client'

import { MapSearchView } from '@/components/map-search/MapSearchView'

export default function MapSearchPage() {
  return (
    <div className="w-full" style={{ height: 'calc(100vh - 64px)', backgroundColor: 'var(--surface-base)' }}>
      <MapSearchView />
    </div>
  )
}
