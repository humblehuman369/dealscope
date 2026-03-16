'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { MapPin } from 'lucide-react'

export interface CompsMapPoint {
  id: string | number
  latitude: number
  longitude: number
  address: string
}

interface CompsProximityMapProps {
  subject: { latitude?: number; longitude?: number; address: string }
  comps: CompsMapPoint[]
  activeView: 'sale' | 'rent'
  /** When true, omit the "Proximity Map" title and legend (e.g. when used inside an accordion that provides its own header). */
  hideHeader?: boolean
  /** Override the default map container height class (default: "h-56"). */
  className?: string
}

function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Inner component rendered as a child of <Map> so the Google Maps JS API
 * (and therefore `google.maps.*`) is guaranteed to be loaded by the time
 * `useMap()` returns a non-null instance.
 */
function MapContent({ subject, comps, activeView }: CompsProximityMapProps) {
  const map = useMap()
  const [geocodedPos, setGeocodedPos] = useState<google.maps.LatLngLiteral | null>(null)

  const validComps = useMemo(
    () => comps.filter(c => isFiniteCoord(c.latitude, c.longitude)),
    [comps],
  )

  const hasDirectCoords = isFiniteCoord(subject.latitude, subject.longitude)
  const subjectPos = hasDirectCoords
    ? { lat: subject.latitude!, lng: subject.longitude! }
    : geocodedPos

  useEffect(() => {
    if (hasDirectCoords || !map || !subject.address) return
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: subject.address }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location
        setGeocodedPos({ lat: loc.lat(), lng: loc.lng() })
      }
    })
  }, [map, hasDirectCoords, subject.address])

  useEffect(() => {
    if (!map) return
    const points: google.maps.LatLngLiteral[] = []
    if (subjectPos) points.push(subjectPos)
    validComps.forEach(c => points.push({ lat: c.latitude, lng: c.longitude }))

    if (points.length === 0) return
    if (points.length === 1) {
      map.setCenter(points[0])
      map.setZoom(15)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    points.forEach(p => bounds.extend(p))
    map.fitBounds(bounds, 50)
  }, [map, subjectPos, validComps])

  if (!map) return null

  const compColor = activeView === 'sale' ? '#0EA5E9' : '#38bdf8'

  return (
    <>
      {subjectPos && (
        <Marker
          position={subjectPos}
          title={`Subject: ${subject.address}`}
          zIndex={1000}
          label={{
            text: 'S',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: '#EA4335',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
            labelOrigin: new google.maps.Point(0, 0),
          }}
        />
      )}

      {validComps.map((comp, idx) => (
        <Marker
          key={comp.id}
          position={{ lat: comp.latitude, lng: comp.longitude }}
          title={comp.address}
          label={{
            text: String(idx + 1),
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '11px',
          }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: compColor,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            labelOrigin: new google.maps.Point(0, 0),
          }}
        />
      ))}
    </>
  )
}

const cardBorderGlow =
  'border border-[rgba(14,165,233,0.25)] shadow-[0_0_30px_rgba(14,165,233,0.08),0_0_60px_rgba(14,165,233,0.04)]'

export function CompsProximityMap({ subject, comps, activeView, hideHeader = false, className }: CompsProximityMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasSubject = isFiniteCoord(subject.latitude, subject.longitude)
  const validComps = comps.filter(c => isFiniteCoord(c.latitude, c.longitude))
  const hasAnyPoints = hasSubject || validComps.length > 0

  if (!apiKey || !hasAnyPoints) {
    const placeholder = (
      <div className="h-48 rounded-lg bg-white/[0.05] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="mx-auto mb-2 w-6 h-6 text-[#F1F5F9]" />
          <p className="text-xs text-[#F1F5F9]">
            {!apiKey ? 'Map unavailable' : 'No coordinates available'}
          </p>
        </div>
      </div>
    )
    if (hideHeader) return <div className="p-4">{placeholder}</div>
    return (
      <div className={`rounded-xl bg-[var(--surface-base)] ${cardBorderGlow} p-4`}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-[#38bdf8]" />
          <span className="text-sm font-semibold text-[#F1F5F9]">Proximity Map</span>
        </div>
        {placeholder}
      </div>
    )
  }

  const center = hasSubject
    ? { lat: subject.latitude!, lng: subject.longitude! }
    : { lat: validComps[0].latitude, lng: validComps[0].longitude }

  const mapContent = (
    <div className={className ?? 'h-56'}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapContent subject={subject} comps={comps} activeView={activeView} />
        </Map>
      </APIProvider>
    </div>
  )

  if (hideHeader) return mapContent

  return (
    <div className={`rounded-xl bg-[var(--surface-base)] ${cardBorderGlow} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#38bdf8]" />
          <span className="text-sm font-semibold text-[#F1F5F9]">Proximity Map</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] inline-block" />
            <span className="text-[#F1F5F9]">Subject</span>
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: activeView === 'sale' ? '#0EA5E9' : '#38bdf8' }}
            />
            <span className="text-[#F1F5F9]">
              {activeView === 'sale' ? 'Sale' : 'Rent'} Comps ({validComps.length})
            </span>
          </span>
        </div>
      </div>
      {mapContent}
    </div>
  )
}
