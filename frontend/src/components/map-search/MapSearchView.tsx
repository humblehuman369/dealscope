'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import { MarkerClusterer, type Renderer } from '@googlemaps/markerclusterer'
import { Eraser, Pentagon, Loader2, Home, MousePointerClick } from 'lucide-react'
import { useMapSearch } from '@/hooks/useMapSearch'
import { usePropertyData } from '@/hooks/usePropertyData'
import type { MapListing } from '@/lib/api'
import { FilterPanel } from './FilterPanel'
import { PropertyPreviewCard } from './PropertyPreviewCard'
import { GeocodedPrompt, type OffMarketPreview } from './GeocodedPrompt'

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }
const DEFAULT_ZOOM = 5
const MAP_ID = 'DEMO_MAP_ID'
const MIN_ZOOM_FOR_GEOCODE = 13
const HINT_DISMISSED_KEY = 'dealscope:map-click-hint-dismissed'

const US_BOUNDS = {
  north: 72,
  south: 17,
  east: -65,
  west: -165,
}

interface GeocodeResult {
  formatted_address: string
  city?: string
  state?: string
  zip_code?: string
}

async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<GeocodeResult | null> {
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
    const result = match || data.results[0]
    if (!result?.formatted_address) return null

    const components: Array<{ types: string[]; long_name: string; short_name: string }> =
      result.address_components || []
    const long = (type: string) =>
      components.find((c) => c.types.includes(type))?.long_name
    const short = (type: string) =>
      components.find((c) => c.types.includes(type))?.short_name

    return {
      formatted_address: result.formatted_address,
      city: long('locality') || long('sublocality'),
      state: short('administrative_area_level_1'),
      zip_code: long('postal_code'),
    }
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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`.replace('.0K', 'K')
  return String(n)
}

const clusterRenderer: Renderer = {
  render({ count, position }) {
    const size = count >= 100 ? 48 : count >= 10 ? 40 : 34
    const el = document.createElement('div')
    Object.assign(el.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: '#7B1818',
      border: '2.5px solid rgba(255,255,255,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: `${count >= 1000 ? 10 : 12}px`,
      fontWeight: '700',
      fontFamily: 'system-ui, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
    })
    el.textContent = formatCount(count)

    return new google.maps.marker.AdvancedMarkerElement({
      position,
      content: el,
      zIndex: 1000 + count,
    })
  },
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

  // Pan map to center the selected listing
  useEffect(() => {
    if (!map || !selectedListing) return
    map.panTo({
      lat: selectedListing.latitude,
      lng: selectedListing.longitude,
    })
  }, [map, selectedListing])

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

  // Initialize marker clusterer with custom renderer
  useEffect(() => {
    if (!map) return
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers: [],
        renderer: clusterRenderer,
      })
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
  const searchParams = useSearchParams()

  const initialCenter = useMemo(() => {
    const lat = parseFloat(searchParams.get('lat') ?? '')
    const lng = parseFloat(searchParams.get('lng') ?? '')
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    return DEFAULT_CENTER
  }, [searchParams])

  const initialZoom = useMemo(() => {
    const z = parseInt(searchParams.get('zoom') ?? '', 10)
    return Number.isFinite(z) ? z : DEFAULT_ZOOM
  }, [searchParams])

  const locationLabel = searchParams.get('label') ?? null

  const {
    listings,
    isLoading,
    error,
    totalCount,
    estimatedTotal,
    filters,
    onBoundsChanged,
    onPolygonComplete,
    clearPolygon,
    updateFilters,
  } = useMapSearch()

  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showLabel, setShowLabel] = useState(!!locationLabel)
  const [drawingPolygon, setDrawingPolygon] = useState<google.maps.Polygon | null>(null)

  const { fetchProperty } = usePropertyData()

  useEffect(() => {
    if (!showLabel) return
    const t = setTimeout(() => setShowLabel(false), 4000)
    return () => clearTimeout(t)
  }, [showLabel])

  // Click-to-geocode state
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [dropPin, setDropPin] = useState<{ lat: number; lng: number } | null>(null)
  const [zoomHint, setZoomHint] = useState(false)
  const [isZoomedIn, setIsZoomedIn] = useState(initialZoom >= MIN_ZOOM_FOR_GEOCODE)
  const currentZoomRef = useRef(initialZoom)
  const zoomHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Off-market property preview
  const [propertyPreview, setPropertyPreview] = useState<OffMarketPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // "Click any home" hint — shown once per user at street-level zoom
  const [showClickHint, setShowClickHint] = useState(false)
  const hintShownRef = useRef(false)

  const dismissClickHint = useCallback(() => {
    setShowClickHint(false)
    try { localStorage.setItem(HINT_DISMISSED_KEY, '1') } catch { /* private browsing */ }
  }, [])

  useEffect(() => {
    if (!isZoomedIn || hintShownRef.current) {
      if (!isZoomedIn) setShowClickHint(false)
      return
    }
    try {
      if (localStorage.getItem(HINT_DISMISSED_KEY)) return
    } catch { /* private browsing */ }
    hintShownRef.current = true
    setShowClickHint(true)
    const timer = setTimeout(dismissClickHint, 8000)
    return () => clearTimeout(timer)
  }, [isZoomedIn, dismissClickHint])

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      if (isDrawing) return
      dismissClickHint()
      setSelectedListing(null)

      const latLng = e.detail.latLng
      if (!latLng || !apiKey) return

      if (currentZoomRef.current < MIN_ZOOM_FOR_GEOCODE) {
        setGeocodeResult(null)
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
      setGeocodeResult(null)
      setPropertyPreview(null)
      setIsGeocoding(true)

      const result = await reverseGeocode(lat, lng, apiKey)
      setGeocodeResult(result)
      setIsGeocoding(false)
    },
    [isDrawing, apiKey, dismissClickHint],
  )

  const clearGeocode = useCallback(() => {
    setGeocodeResult(null)
    setDropPin(null)
    setIsGeocoding(false)
    setPropertyPreview(null)
    setIsLoadingPreview(false)
  }, [])

  // Fetch property details when a geocoded address is resolved
  useEffect(() => {
    if (!geocodeResult) return
    let cancelled = false
    setIsLoadingPreview(true)

    fetchProperty(geocodeResult.formatted_address, {
      city: geocodeResult.city,
      state: geocodeResult.state,
      zip_code: geocodeResult.zip_code,
    })
      .then((data) => {
        if (cancelled) return
        setPropertyPreview({
          bedrooms: data.details?.bedrooms ?? null,
          bathrooms: data.details?.bathrooms ?? null,
          sqft: data.details?.square_footage ?? null,
          year_built: data.details?.year_built ?? null,
          estimated_value:
            data.valuations?.value_iq_estimate
            ?? data.valuations?.zestimate
            ?? data.valuations?.market_price
            ?? null,
          property_type: data.details?.property_type ?? null,
          is_off_market: data.listing?.is_off_market ?? null,
          monthly_rent: data.rentals?.monthly_rent_ltr ?? null,
        })
        setIsLoadingPreview(false)
      })
      .catch(() => {
        if (cancelled) return
        setIsLoadingPreview(false)
      })

    return () => { cancelled = true }
  }, [geocodeResult, fetchProperty])

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
          defaultCenter={initialCenter}
          defaultZoom={initialZoom}
          mapId={MAP_ID}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={true}
          streetViewControl={false}
          fullscreenControl={false}
          zoomControl={true}
          minZoom={3}
          restriction={{
            latLngBounds: US_BOUNDS,
            strictBounds: false,
          }}
          style={{ width: '100%', height: '100%' }}
          clickableIcons={false}
          draggableCursor={isZoomedIn && !isDrawing ? 'crosshair' : undefined}
          onClick={handleMapClick}
          onZoomChanged={(e) => {
            if (e.detail?.zoom != null) {
              currentZoomRef.current = e.detail.zoom
              setIsZoomedIn(e.detail.zoom >= MIN_ZOOM_FOR_GEOCODE)
            }
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

          {/* Click-to-geocode popup — anchored above the drop pin */}
          {!selectedListing && (dropPin || isGeocoding) && dropPin && (
            <AdvancedMarker position={dropPin} zIndex={9999}>
              {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
              <div
                style={{ transform: 'translateY(-100%)', paddingBottom: '40px' }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <GeocodedPrompt
                  address={geocodeResult?.formatted_address ?? null}
                  addressComponents={geocodeResult ? {
                    city: geocodeResult.city,
                    state: geocodeResult.state,
                    zip_code: geocodeResult.zip_code,
                  } : undefined}
                  isGeocoding={isGeocoding}
                  onClose={clearGeocode}
                  propertyPreview={propertyPreview}
                  isLoadingPreview={isLoadingPreview}
                />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Selected listing popup — centered on screen */}
      {selectedListing && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <PropertyPreviewCard listing={selectedListing} onClose={() => setSelectedListing(null)} />
          </div>
        </div>
      )}

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

      {/* Location label from search */}
      {showLabel && locationLabel && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            {locationLabel}
          </div>
        </div>
      )}

      {/* Listing count badge — Zillow-style, top-left below filters */}
      {totalCount > 0 && !isLoading && (
        <div className="absolute top-16 left-3 z-10">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-lg"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.85)',
              color: '#fff',
            }}
          >
            <Home size={13} />
            {estimatedTotal
              ? `${totalCount.toLocaleString()} of ~${formatCount(estimatedTotal)} homes`
              : `${totalCount.toLocaleString()} homes`}
          </div>
        </div>
      )}

      {/* Click-any-home hint — shown once when user first zooms to street level */}
      {showClickHint && !selectedListing && !dropPin && !isGeocoding && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <MousePointerClick size={16} style={{ color: 'var(--accent-sky)' }} />
            Click any home to analyze
          </div>
        </div>
      )}

    </div>
  )
}
