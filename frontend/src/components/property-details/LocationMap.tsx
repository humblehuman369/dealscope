'use client'

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface LocationMapProps {
  latitude?: number
  longitude?: number
  address: string
}

/**
 * LocationMap Component
 * 
 * Interactive Google Map centered on the property. Falls back to
 * a dark placeholder when coordinates or API key are unavailable.
 */
export function LocationMap({ latitude, longitude, address }: LocationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const cardStyle = {
    backgroundColor: colors.background.card,
    border: `1px solid ${colors.ui.border}`,
    boxShadow: colors.shadow.card,
  }

  // Fallback placeholder if no coordinates or API key
  if (!latitude || !longitude || !apiKey) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
          Location
        </div>
        <div
          className="h-48 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: colors.background.cardUp, border: `1px solid ${colors.ui.border}` }}
        >
          <div className="text-center">
            <MapPin size={24} className="mx-auto mb-2" style={{ color: colors.text.tertiary }} />
            <p className="text-sm" style={{ color: colors.text.secondary }}>{address}</p>
            {latitude && longitude && (
              <p className="text-xs mt-1" style={{ color: colors.text.tertiary, fontVariantNumeric: 'tabular-nums' }}>
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
        Location
      </div>
      <div className="h-48 rounded-xl overflow-hidden">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: latitude, lng: longitude }}
            defaultZoom={15}
            mapId="property-location-map"
            gestureHandling="cooperative"
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
          >
            <AdvancedMarker position={{ lat: latitude, lng: longitude }} />
          </Map>
        </APIProvider>
      </div>
      <p className="text-xs mt-2 text-center" style={{ color: colors.text.tertiary }}>
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
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="h-3 w-16 rounded animate-pulse mb-4" style={{ backgroundColor: colors.background.cardUp }} />
      <div className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
    </div>
  )
}
