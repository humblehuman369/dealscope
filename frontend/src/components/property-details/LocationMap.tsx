'use client'

import { useRouter } from 'next/navigation'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapPin, Maximize2 } from 'lucide-react'
import { trackEvent } from '@/lib/eventTracking'

interface LocationMapProps {
  latitude?: number
  longitude?: number
  address: string
}

const PROPERTY_MAP_ZOOM = 15

export function LocationMap({ latitude, longitude, address }: LocationMapProps) {
  const router = useRouter()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasCoordinates = latitude != null && longitude != null

  const cardStyle = {
    backgroundColor: 'var(--surface-base)',
    border: `1px solid var(--border-subtle)`,
    boxShadow: 'var(--shadow-card)',
  }

  const handleOpenMapSearch = () => {
    trackEvent('map_search_opened', {
      source: 'property_details_location_card',
      has_coordinates: hasCoordinates,
    })

    const params = new URLSearchParams()
    if (hasCoordinates) {
      params.set('lat', String(latitude))
      params.set('lng', String(longitude))
      params.set('zoom', String(PROPERTY_MAP_ZOOM))
      if (address) params.set('label', address)
    } else if (address) {
      params.set('label', address)
    }

    const qs = params.toString()
    router.push(qs ? `/map-search?${qs}` : '/map-search')
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.border = '1px solid var(--border-focus)'
    e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.border = '1px solid var(--border-subtle)'
    e.currentTarget.style.boxShadow = 'var(--shadow-card)'
  }

  const headerRow = (
    <div className="flex items-center justify-between mb-4">
      <span
        className="text-xs font-bold uppercase tracking-[0.12em]"
        style={{ color: 'var(--accent-sky)' }}
      >
        Location
      </span>
      <span
        className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: 'var(--accent-sky)' }}
      >
        View on map
        <Maximize2 size={11} strokeWidth={2.5} />
      </span>
    </div>
  )

  if (!hasCoordinates || !apiKey) {
    return (
      <button
        type="button"
        onClick={handleOpenMapSearch}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="rounded-[14px] p-5 w-full text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
        style={cardStyle}
        aria-label={`View ${address} and nearby listings on the map`}
      >
        {headerRow}
        <div
          className="h-48 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--surface-elevated)', border: `1px solid var(--border-subtle)` }}
        >
          <div className="text-center px-4">
            <MapPin size={24} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{address}</p>
            {hasCoordinates && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
          Tap to explore nearby listings
        </p>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleOpenMapSearch}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rounded-[14px] p-5 w-full text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-sky)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-base)]"
      style={cardStyle}
      aria-label={`View ${address} and nearby listings on the map`}
    >
      {headerRow}
      <div
        className="h-48 rounded-xl overflow-hidden relative"
        style={{ pointerEvents: 'none' }}
      >
        <APIProvider apiKey={apiKey} libraries={['places']}>
          <Map
            defaultCenter={{ lat: latitude, lng: longitude }}
            defaultZoom={PROPERTY_MAP_ZOOM}
            gestureHandling="none"
            disableDefaultUI={true}
            clickableIcons={false}
            keyboardShortcuts={false}
            style={{ width: '100%', height: '100%' }}
          >
            <Marker position={{ lat: latitude, lng: longitude }} />
          </Map>
        </APIProvider>
      </div>
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
        {address}
      </p>
    </button>
  )
}

/**
 * LocationMapSkeleton
 * Loading state for the location map
 */
export function LocationMapSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div className="h-3 w-16 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--surface-elevated)' }} />
      <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
    </div>
  )
}
