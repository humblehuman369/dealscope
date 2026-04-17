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
import { Eraser, Pentagon, Loader2, Home, MousePointerClick, List, MapIcon } from 'lucide-react'
import { useMapSearch } from '@/hooks/useMapSearch'
import { usePropertyData } from '@/hooks/usePropertyData'
import type { MapListing } from '@/lib/api'
import { markerColorFromGrade, type DealSignalResult } from '@/lib/dealSignal'
import { FilterPanel } from './FilterPanel'
import { PropertyPreviewCard } from './PropertyPreviewCard'
import { PropertyCardList } from './PropertyCardList'
import { GeocodedPrompt, type OffMarketPreview } from './GeocodedPrompt'
import { HeatmapLegend } from './HeatmapLegend'
import { NeighborhoodCard } from './NeighborhoodCard'
import { api, type NeighborhoodOverview } from '@/lib/api'

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }
const DEFAULT_ZOOM = 5
const GEOLOCATION_ZOOM = 9
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

async function forwardGeocode(
  query: string,
  apiKey: string,
): Promise<{ lat: number; lng: number; zoom: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:US&key=${apiKey}`
    const res = await fetch(url)
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return null
    const result = data.results[0]
    const loc = result.geometry?.location
    if (!loc) return null
    const types: string[] = result.types || []
    let zoom = 12
    if (types.includes('postal_code')) zoom = 13
    else if (types.includes('locality') || types.includes('sublocality')) zoom = 12
    else if (types.includes('administrative_area_level_2')) zoom = 10
    else if (types.includes('administrative_area_level_1')) zoom = 7
    return { lat: loc.lat, lng: loc.lng, zoom }
  } catch {
    return null
  }
}

function LabelGeocoder({ label, apiKey }: { label: string; apiKey: string }) {
  const map = useMap()
  const geocodedRef = useRef(false)

  useEffect(() => {
    if (!map || !label || geocodedRef.current) return
    geocodedRef.current = true

    forwardGeocode(label, apiKey).then((result) => {
      if (!result || !map) return
      map.panTo({ lat: result.lat, lng: result.lng })
      map.setZoom(result.zoom)
    })
  }, [map, label, apiKey])

  return null
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
  dealSignals: Map<string, DealSignalResult>
  selectedListing: MapListing | null
  onSelectListing: (listing: MapListing | null) => void
  onBoundsChanged: (bounds: { north: number; south: number; east: number; west: number }) => void
  isDrawing: boolean
  onPolygonComplete: (vertices: number[][]) => void
  drawingPolygon: google.maps.Polygon | null
  setDrawingPolygon: (p: google.maps.Polygon | null) => void
  panToRef: React.MutableRefObject<((lat: number, lng: number) => void) | null>
}

function MapContent({
  listings,
  dealSignals,
  selectedListing,
  onSelectListing,
  onBoundsChanged,
  isDrawing,
  onPolygonComplete,
  drawingPolygon,
  setDrawingPolygon,
  panToRef,
}: MapContentProps) {
  const map = useMap()
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new (globalThis.Map)())
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)

  useEffect(() => {
    if (!map) return
    panToRef.current = (lat: number, lng: number) => {
      map.panTo({ lat, lng })
    }
    return () => { panToRef.current = null }
  }, [map, panToRef])

  useEffect(() => {
    if (!map || !selectedListing) return
    map.panTo({
      lat: selectedListing.latitude,
      lng: selectedListing.longitude,
    })
  }, [map, selectedListing])

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

  useEffect(() => {
    if (!clustererRef.current) return
    const allMarkers = Array.from(markersRef.current.values())
    clustererRef.current.clearMarkers()
    clustererRef.current.addMarkers(allMarkers)
  }, [listings])

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
      {listings.map((listing) => {
        const isAirbnb = listing.source === 'mashvisor_airbnb'
        const signal = dealSignals.get(listing.id)
        const isSelected = selectedListing?.id === listing.id

        let markerBg: string
        let markerText: string
        let markerBorder: string
        let displayLabel: string

        if (isAirbnb) {
          markerBg = '#FB7185'
          markerText = '#fff'
          markerBorder = isSelected ? 'var(--accent-sky)' : 'rgba(255,255,255,0.7)'
          displayLabel = listing.night_price != null ? `$${listing.night_price}/n` : 'Airbnb'
        } else {
          markerBg = signal ? markerColorFromGrade(signal.grade) : 'var(--surface-card)'
          markerText = signal ? '#fff' : 'var(--text-heading)'
          markerBorder = isSelected
            ? 'var(--accent-sky)'
            : signal ? 'rgba(255,255,255,0.7)' : 'var(--border-default)'
          displayLabel = formatCompactPrice(listing.price)
        }

        return (
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
                backgroundColor: isSelected ? 'var(--accent-sky)' : markerBg,
                color: isSelected ? '#fff' : markerText,
                border: `1.5px solid ${markerBorder}`,
              }}
            >
              {displayLabel}
            </div>
          </AdvancedMarker>
        )
      })}
    </>
  )
}

// ──────────────────────────────────────────────
// Main MapSearchView
// ──────────────────────────────────────────────

export function MapSearchView() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const searchParams = useSearchParams()

  const paramCenter = useMemo(() => {
    const lat = parseFloat(searchParams.get('lat') ?? '')
    const lng = parseFloat(searchParams.get('lng') ?? '')
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
    return null
  }, [searchParams])

  const paramZoom = useMemo(() => {
    const z = parseInt(searchParams.get('zoom') ?? '', 10)
    return Number.isFinite(z) ? z : null
  }, [searchParams])

  const locationLabel = searchParams.get('label') ?? null
  const needsGeocode = !!locationLabel && !paramCenter
  const hasExplicitLocation = !!paramCenter || needsGeocode

  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [geoResolved, setGeoResolved] = useState(hasExplicitLocation)

  useEffect(() => {
    if (hasExplicitLocation) return
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoResolved(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoResolved(true)
      },
      () => { setGeoResolved(true) },
      { timeout: 5000, maximumAge: 300000 },
    )
  }, [hasExplicitLocation])

  const initialCenter = paramCenter ?? geoCenter ?? DEFAULT_CENTER
  const initialZoom = paramZoom ?? (geoCenter ? GEOLOCATION_ZOOM : DEFAULT_ZOOM)

  const {
    listings,
    rawListings,
    isLoading,
    error,
    totalCount,
    estimatedTotal,
    filters,
    dealSignals,
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
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')

  const panToRef = useRef<((lat: number, lng: number) => void) | null>(null)

  const { fetchProperty } = usePropertyData()

  useEffect(() => {
    if (!showLabel) return
    const t = setTimeout(() => setShowLabel(false), 4000)
    return () => clearTimeout(t)
  }, [showLabel])

  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [dropPin, setDropPin] = useState<{ lat: number; lng: number } | null>(null)
  const [zoomHint, setZoomHint] = useState(false)
  const [isZoomedIn, setIsZoomedIn] = useState(initialZoom >= MIN_ZOOM_FOR_GEOCODE)
  const currentZoomRef = useRef(initialZoom)
  const zoomHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [propertyPreview, setPropertyPreview] = useState<OffMarketPreview | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [showClickHint, setShowClickHint] = useState(false)
  const hintShownRef = useRef(false)

  // Heatmap and neighborhood intelligence (Mashvisor)
  const [heatmapActive, setHeatmapActive] = useState(false)
  const [heatmapMetric, setHeatmapMetric] = useState('AirbnbCoc')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<NeighborhoodOverview | null>(null)
  const [isLoadingNeighborhood, setIsLoadingNeighborhood] = useState(false)

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

  const handleCardSelect = useCallback((listing: MapListing) => {
    setSelectedListing(listing)
    clearGeocode()
    if (panToRef.current) {
      panToRef.current(listing.latitude, listing.longitude)
    }
    setMobileView('map')
  }, [clearGeocode])

  const handleMarkerSelect = useCallback((listing: MapListing | null) => {
    clearGeocode()
    setSelectedListing(listing)
  }, [clearGeocode])

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

  if (!geoResolved) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: 'var(--surface-base)' }}
      >
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Finding your location...
          </span>
        </div>
      </div>
    )
  }

  const mapSection = (
    <div className="relative w-full h-full">
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
            listings={rawListings}
            dealSignals={dealSignals}
            selectedListing={selectedListing}
            onSelectListing={handleMarkerSelect}
            onBoundsChanged={onBoundsChanged}
            isDrawing={isDrawing}
            onPolygonComplete={onPolygonComplete}
            drawingPolygon={drawingPolygon}
            setDrawingPolygon={setDrawingPolygon}
            panToRef={panToRef}
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

          {needsGeocode && apiKey && (
            <LabelGeocoder label={locationLabel!} apiKey={apiKey} />
          )}
        </Map>
      </APIProvider>

      {/* Selected listing popup */}
      {selectedListing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
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

      {/* Off-market geocoded property popup */}
      {!selectedListing && (dropPin || isGeocoding) && dropPin && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="pointer-events-auto"
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

      {/* Investment Heatmap Legend */}
      <HeatmapLegend
        isActive={heatmapActive}
        metricType={heatmapMetric}
        onToggle={() => setHeatmapActive((p) => !p)}
        onMetricChange={setHeatmapMetric}
      />

      {/* Neighborhood Intelligence Card */}
      {selectedNeighborhood && (
        <NeighborhoodCard
          neighborhood={selectedNeighborhood}
          onClose={() => setSelectedNeighborhood(null)}
        />
      )}

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

      {/* Listing count badge */}
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

      {/* Click-any-home hint */}
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

  const listSection = (
    <div
      className="h-full"
      style={{
        backgroundColor: 'var(--surface-base)',
        borderLeft: '1px solid var(--border-subtle)',
      }}
    >
      <PropertyCardList
        listings={listings}
        dealSignals={dealSignals}
        selectedId={selectedListing?.id ?? null}
        onSelectListing={handleCardSelect}
        isLoading={isLoading}
        activeStatuses={filters.listing_statuses}
        onResetStatuses={() => updateFilters({ listing_statuses: [] })}
      />
    </div>
  )

  return (
    <div className="w-full h-full" style={{ backgroundColor: 'var(--surface-base)' }}>
      {/* Desktop: split panel */}
      <div className="hidden md:flex w-full h-full">
        <div className="w-[60%] h-full">{mapSection}</div>
        <div className="w-[40%] h-full">{listSection}</div>
      </div>

      {/* Mobile: toggle between map and list */}
      <div className="md:hidden w-full h-full relative">
        {mobileView === 'map' ? mapSection : listSection}

        {/* Mobile view toggle */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-xl transition-colors"
            style={{
              backgroundColor: 'var(--accent-sky)',
              color: '#fff',
            }}
          >
            {mobileView === 'map' ? (
              <>
                <List size={16} />
                View List ({listings.length})
              </>
            ) : (
              <>
                <MapIcon size={16} />
                View Map
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
