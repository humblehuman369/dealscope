'use client'

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'

interface LocationMapProps {
  latitude?: number
  longitude?: number
  address: string
}

/**
 * LocationMap Component
 * 
 * Displays an interactive Google Map centered on the property location.
 * Falls back to a placeholder when coordinates or API key are unavailable.
 */
export function LocationMap({ latitude, longitude, address }: LocationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Fallback placeholder if no coordinates or API key
  if (!latitude || !longitude || !apiKey) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
        <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
          Location
        </div>
        <div className="h-48 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <div className="text-center">
            <MapPin size={24} className="mx-auto mb-2 text-slate-400 dark:text-slate-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{address}</p>
            {latitude && longitude && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Location
      </div>
      <div className="h-48 rounded-lg overflow-hidden">
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
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="h-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
    </div>
  )
}
