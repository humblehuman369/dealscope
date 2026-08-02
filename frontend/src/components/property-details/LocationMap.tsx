'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapPin, Maximize2 } from 'lucide-react'
import { trackEvent } from '@/lib/eventTracking'
import { MyDealMapLayer, MyDealLayerToggle } from '@/components/map/MyDealMapLayer'
import { useSession } from '@/hooks/useSession'

interface LocationMapProps {
  latitude?: number
  longitude?: number
  address: string
}

const PROPERTY_MAP_ZOOM = 15
const PROPERTY_MAP_ID = 'DEMO_MAP_ID'

export function LocationMap({ latitude, longitude, address }: LocationMapProps) {
  const router = useRouter()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasCoordinates = latitude != null && longitude != null
  const { isAuthenticated } = useSession()
  const [showMyDeals, setShowMyDeals] = useState(false)

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

  const headerRow = (
    <div className="flex items-center justify-between mb-4 gap-2">
      <span
        className="text-xs font-bold uppercase tracking-[0.12em]"
        style={{ color: 'var(--accent-sky)' }}
      >
        Location
      </span>
      <div className="flex items-center gap-2">
        {isAuthenticated && hasCoordinates && apiKey && (
          <MyDealLayerToggle active={showMyDeals} onClick={() => setShowMyDeals((v) => !v)} />
        )}
        <button
          type="button"
          onClick={handleOpenMapSearch}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors hover:brightness-110"
          style={{ color: 'var(--accent-sky)' }}
        >
          View on map
          <Maximize2 size={11} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )

  if (!hasCoordinates || !apiKey) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        {headerRow}
        <button
          type="button"
          onClick={handleOpenMapSearch}
          className="h-48 rounded-xl flex items-center justify-center w-full transition-colors hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-sky)]"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: `1px solid var(--border-subtle)`,
          }}
          aria-label={`View ${address} and nearby listings on the map`}
        >
          <div className="text-center px-4">
            <MapPin size={24} className="mx-auto mb-2" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {address}
            </p>
            {hasCoordinates && (
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}
              >
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
          </div>
        </button>
        <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
          Tap to explore nearby listings
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      {headerRow}
      <div
        className="h-48 rounded-xl overflow-hidden relative"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
          <Map
            defaultCenter={{ lat: latitude, lng: longitude }}
            defaultZoom={PROPERTY_MAP_ZOOM}
            mapId={PROPERTY_MAP_ID}
            gestureHandling="cooperative"
            disableDefaultUI={true}
            clickableIcons={false}
            style={{ width: '100%', height: '100%' }}
          >
            <Marker position={{ lat: latitude, lng: longitude }} />
            <MyDealMapLayer enabled={showMyDeals} />
          </Map>
        </APIProvider>
      </div>
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
        {address}
      </p>
    </div>
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
      <div
        className="h-3 w-16 rounded animate-pulse mb-4"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div
        className="h-48 rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
    </div>
  )
}
