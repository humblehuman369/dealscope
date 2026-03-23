'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { Eraser, Pentagon, Loader2 } from 'lucide-react'
import { useMapSearch } from '@/hooks/useMapSearch'
import type { MapListing } from '@/lib/api'
import { FilterPanel } from './FilterPanel'
import { PropertyPreviewCard } from './PropertyPreviewCard'
import { GeocodedPrompt } from './GeocodedPrompt'

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 } // center of US
const DEFAULT_ZOOM = 5
const MAP_ID = 'DEMO_MAP_ID'
const MIN_ZOOM_FOR_GEOCODE = 13

async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat.toFixed(6)},${lng.toFixed(6)}&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return null
    const match = data.results.find(
      (r: { types: string[] }) =>
        r.types.includes('street_address') ||
        r.types.includes('premise') ||
        r.types.includes('subpremise'),
    )
    return (match || data.results[0])?.formatted_address ?? null
  } catch {
    return null
  }
}

function formatCompactPrice(price: number | null): string {
  if (price == null) return '?'
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`
  return `$${price}`
}

// ──────────────────────────────────────────────
// Inner map content — must be a child of <Map>
// ──────────────────────────────────────────────

interface MapContentProps {
  listings: MapListing[]
  selectedListing: MapListing | null
  onSelectListing: (listing: MapListing | null) => void
  onBoundsChanged: (bounds: { north: number; south: number; east: number; west: number }) => void
  isDrawing: boolean
  onPolygonComplete: (vertices: number[][]) => void
  drawingPolygon: google.maps.Polygon | null
  setDrawingPolygon: (p: google.maps.Polygon | null) => void
}

function MapContent({
  listings,
  selectedListing,
  onSelectListing,
  onBoundsChanged,
  isDrawing,
  onPolygonComplete,
  drawingPolygon,
  setDrawingPolygon,
}: MapContentProps) {
  const map = useMap()
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new (globalThis.Map)())
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)

  // Viewport change handler
  useEffect(() => {
    if (!map) return
    const listener = map.addListener('idle', () => {
      const bounds = map.getBounds()
      if (!bounds) return
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      onBoundsChanged({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      })
    })
    return () => google.maps.event.removeListener(listener)
  }, [map, onBoundsChanged])

  // Initialize marker clusterer
  useEffect(() => {
    if (!map) return
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({ map, markers: [] })
    }
    return () => {
      clustererRef.current?.clearMarkers()
      clustererRef.current = null
    }
  }, [map])

  // Sync markers with clusterer
  useEffect(() => {
    if (!clustererRef.current) return
    const allMarkers = Array.from(markersRef.current.values())
    clustererRef.current.clearMarkers()
    clustererRef.current.addMarkers(allMarkers)
  }, [listings])

  // Drawing manager
  useEffect(() => {
    if (!map || !isDrawing) {
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null)
        drawingManagerRef.current = null
      }
      return
    }

    const dm = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        strokeColor: '#3B82F6',
        strokeWeight: 2,
        editable: false,
      },
    })
    dm.setMap(map)
    drawingManagerRef.current = dm

    const listener = google.maps.event.addListener(
      dm,
      'polygoncomplete',
      (poly: google.maps.Polygon) => {
        dm.setDrawingMode(null)
        if (drawingPolygon) {
          drawingPolygon.setMap(null)
        }
        setDrawingPolygon(poly)
        const path = poly.getPath()
        const vertices: number[][] = []
        for (let i = 0; i < path.getLength(); i++) {
          const pt = path.getAt(i)
          vertices.push([pt.lat(), pt.lng()])
        }
        onPolygonComplete(vertices)
      },
    )

    return () => {
      google.maps.event.removeListener(listener)
      dm.setMap(null)
    }
  }, [map, isDrawing, onPolygonComplete, drawingPolygon, setDrawingPolygon])

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, id: string) => {
      if (marker) {
        markersRef.current.set(id, marker)
      } else {
        markersRef.current.delete(id)
      }
    },
    [],
  )

  return (
    <>
      {listings.map((listing) => (
        <AdvancedMarker
          key={listing.id}
          position={{ lat: listing.latitude, lng: listing.longitude }}
          onClick={() => onSelectListing(listing)}
          ref={(marker) => {
            if (marker) setMarkerRef(marker, listing.id)
          }}
        >
          <div
            className="px-1.5 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer shadow-md transition-transform hover:scale-110"
            style={{
              backgroundColor:
                selectedListing?.id === listing.id ? 'var(--accent-sky)' : 'var(--surface-card)',
              color: selectedListing?.id === listing.id ? '#fff' : 'var(--text-heading)',
              border: `1.5px solid ${selectedListing?.id === listing.id ? 'var(--accent-sky)' : 'var(--border-default)'}`,
            }}
          >
            {formatCompactPrice(listing.price)}
          </div>
        </AdvancedMarker>
      ))}
    </>
  )
}

// ──────────────────────────────────────────────
// Main MapSearchView
// ──────────────────────────────────────────────

export function MapSearchView() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const {
    listings,
    isLoading,
    error,
    totalCount,
    filters,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  } = useMapSearch()

  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPolygon, setDrawingPolygon] = useState<google.maps.Polygon | null>(null)

  // Click-to-geocode state
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [dropPin, setDropPin] = useState<{ lat: number; lng: number } | null>(null)
  const [zoomHint, setZoomHint] = useState(false)
  const currentZoomRef = useRef(DEFAULT_ZOOM)
  const zoomHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      if (isDrawing) return
      setSelectedListing(null)

      const latLng = e.detail.latLng
      if (!latLng || !apiKey) return

      if (currentZoomRef.current < MIN_ZOOM_FOR_GEOCODE) {
        setGeocodedAddress(null)
        setDropPin(null)
        setZoomHint(true)
        if (zoomHintTimer.current) clearTimeout(zoomHintTimer.current)
        zoomHintTimer.current = setTimeout(() => setZoomHint(false), 3000)
        return
      }

      setZoomHint(false)
      const lat = Number(latLng.lat)
      const lng = Number(latLng.lng)
      setDropPin({ lat, lng })
      setGeocodedAddress(null)
      setIsGeocoding(true)

      const address = await reverseGeocode(lat, lng, apiKey)
      setGeocodedAddress(address)
      setIsGeocoding(false)
    },
    [isDrawing, apiKey],
  )

  const clearGeocode = useCallback(() => {
    setGeocodedAddress(null)
    setDropPin(null)
    setIsGeocoding(false)
  }, [])

  const handleClearPolygon = useCallback(() => {
    if (drawingPolygon) {
      drawingPolygon.setMap(null)
      setDrawingPolygon(null)
    }
    setIsDrawing(false)
    clearPolygon()
  }, [drawingPolygon, clearPolygon])

  const toggleDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
    } else {
      handleClearPolygon()
      setIsDrawing(true)
    }
  }, [isDrawing, handleClearPolygon])

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: 'var(--surface-base)', color: 'var(--text-secondary)' }}
      >
        <p>Google Maps API key not configured</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={{ backgroundColor: 'var(--surface-base)' }}>
      <APIProvider apiKey={apiKey} libraries={['places', 'drawing', 'marker']}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={true}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
          clickableIcons={false}
          onClick={handleMapClick}
          onZoomChanged={(e) => {
            if (e.detail?.zoom != null) currentZoomRef.current = e.detail.zoom
          }}
        >
          <MapContent
            listings={listings}
            selectedListing={selectedListing}
            onSelectListing={(listing) => {
              clearGeocode()
              setSelectedListing(listing)
            }}
            onBoundsChanged={onBoundsChanged}
            isDrawing={isDrawing}
            onPolygonComplete={onPolygonComplete}
            drawingPolygon={drawingPolygon}
            setDrawingPolygon={setDrawingPolygon}
          />
          {dropPin && (
            <AdvancedMarker position={dropPin}>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: 'var(--accent-sky)',
                  border: '2px solid #fff',
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onChange={updateFilters}
        totalCount={totalCount}
        isLoading={isLoading}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen((p) => !p)}
      />

      {/* Drawing controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={toggleDrawing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
          style={{
            backgroundColor: isDrawing ? 'var(--accent-sky)' : 'var(--surface-card)',
            color: isDrawing ? '#fff' : 'var(--text-body)',
            border: `1px solid ${isDrawing ? 'var(--accent-sky)' : 'var(--border-default)'}`,
          }}
        >
          <Pentagon size={16} />
          {isDrawing ? 'Drawing...' : 'Draw Area'}
        </button>
        {drawingPolygon && (
          <button
            onClick={handleClearPolygon}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-body)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Eraser size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-body)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-sky)' }} />
            Searching...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium shadow-lg"
            style={{ backgroundColor: '#EF4444', color: '#fff' }}
          >
            {error}
          </div>
        </div>
      )}

      {/* Zoom hint */}
      {zoomHint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 transition-opacity">
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Zoom in closer to select a property
          </div>
        </div>
      )}

      {/* Selected listing preview */}
      {selectedListing && (
        <PropertyPreviewCard listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}

      {/* Click-to-geocode prompt */}
      {!selectedListing && (dropPin || isGeocoding) && (
        <GeocodedPrompt
          address={geocodedAddress}
          isGeocoding={isGeocoding}
          onClose={clearGeocode}
        />
      )}
    </div>
  )
}
