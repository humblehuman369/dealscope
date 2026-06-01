'use client'

import { useRouter } from 'next/navigation'
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { trackEvent } from '@/lib/eventTracking'

const PROPERTY_MAP_ZOOM = 15

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
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        {address}
      </p>

      {hasCoordinates && apiKey ? (
        <div
          className="h-[min(60vh,420px)] w-full rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <APIProvider apiKey={apiKey} libraries={['places']}>
            <Map
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={PROPERTY_MAP_ZOOM}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              <Marker position={{ lat: latitude, lng: longitude }} />
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
