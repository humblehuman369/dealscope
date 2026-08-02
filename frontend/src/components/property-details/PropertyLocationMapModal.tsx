'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { trackEvent } from '@/lib/eventTracking'
import { MyDealMapLayer, MyDealLayerToggle } from '@/components/map/MyDealMapLayer'
import { useSession } from '@/hooks/useSession'

const PROPERTY_MAP_ZOOM = 15
const PROPERTY_MAP_ID = 'DEMO_MAP_ID'

interface PropertyLocationMapModalProps {
  open: boolean
  onClose: () => void
  latitude?: number
  longitude?: number
  address: string
}

export function PropertyLocationMapModal({
  open,
  onClose,
  latitude,
  longitude,
  address,
}: PropertyLocationMapModalProps) {
  const router = useRouter()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasCoordinates = latitude != null && longitude != null
  const { isAuthenticated } = useSession()
  const [showMyDeals, setShowMyDeals] = useState(false)

  const handleOpenMapSearch = () => {
    trackEvent('map_search_opened', {
      source: 'property_details_map_modal',
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
    onClose()
    router.push(qs ? `/map-search?${qs}` : '/map-search')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Map Location"
      size="lg"
      aria-label="Property location map"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {address}
        </p>
        {isAuthenticated && hasCoordinates && apiKey && (
          <MyDealLayerToggle active={showMyDeals} onClick={() => setShowMyDeals((v) => !v)} />
        )}
      </div>

      {hasCoordinates && apiKey ? (
        <div
          className="h-[min(60vh,420px)] w-full rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
            <Map
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={PROPERTY_MAP_ZOOM}
              mapId={PROPERTY_MAP_ID}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              <Marker position={{ lat: latitude, lng: longitude }} />
              <MyDealMapLayer enabled={showMyDeals} />
            </Map>
          </APIProvider>
        </div>
      ) : (
        <div
          className="h-48 rounded-xl flex flex-col items-center justify-center gap-3 px-4 text-center"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <MapPin size={28} style={{ color: 'var(--text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {hasCoordinates && !apiKey
              ? 'Map preview is unavailable. Open the full map to view this property.'
              : 'Location coordinates are not available for this property.'}
          </p>
          <button
            type="button"
            onClick={handleOpenMapSearch}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:brightness-110"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--text-inverse)',
            }}
          >
            Open Map Search
          </button>
        </div>
      )}
    </Modal>
  )
}
