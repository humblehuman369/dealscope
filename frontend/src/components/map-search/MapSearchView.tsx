'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { api as apiClient } from '@/lib/api-client'
import {
  APIProvider,
  ControlPosition,
  Map,
  useMap,
  AdvancedMarker,
  AdvancedMarkerAnchorPoint,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps'
import { Loader2, Home, MousePointerClick, List, MapIcon, Bookmark, Check } from 'lucide-react'
import { useMapSearch } from '@/hooks/useMapSearch'
import { usePropertyData } from '@/hooks/usePropertyData'
import type { MapListing } from '@/lib/api'
import { markerColorForCategory, type DealSignalResult } from '@/lib/dealSignal'
import { FilterPanel } from './FilterPanel'
import { PropertyPreviewCard } from './PropertyPreviewCard'
import { PropertyCardList } from './PropertyCardList'
import { GeocodedPrompt, type OffMarketPreview } from './GeocodedPrompt'
import { NeighborhoodCard } from './NeighborhoodCard'
import { MapSearchBar, type MapSearchSelection } from './MapSearchBar'
import type { NeighborhoodOverview } from '@/lib/api'

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }
const DEFAULT_ZOOM = 5
// Initial zoom used while the map is mounting before `fitBounds` runs.
// ~15 ≈ a ~4-mile-wide span on a typical desktop viewport (2 mi radius), so first paint
// is already close to the final framing instead of zooming out and snapping in.
const GEOLOCATION_INITIAL_ZOOM = 15
const GEOLOCATION_RADIUS_MILES = 2
const MAP_ID = 'DEMO_MAP_ID'
const MIN_ZOOM_FOR_GEOCODE = 13
const HINT_DISMISSED_KEY = 'dealscope:map-click-hint-dismissed'
const ZIP_CACHE_PREFIX = 'dealscope:zip-cache:'
// Zoom used when centering on the user's saved ZIP (ZIP-level framing).
const ACCOUNT_ZIP_INITIAL_ZOOM = 13

interface ZipCacheEntry {
  lat: number
  lng: number
}

function readZipCache(zip: string): ZipCacheEntry | null {
  try {
    const raw = localStorage.getItem(ZIP_CACHE_PREFIX + zip)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ZipCacheEntry
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') return parsed
  } catch { /* ignore */ }
  return null
}

function writeZipCache(zip: string, entry: ZipCacheEntry): void {
  try { localStorage.setItem(ZIP_CACHE_PREFIX + zip, JSON.stringify(entry)) } catch { /* ignore */ }
}

const US_BOUNDS = {
  north: 72,
  south: 17,
  east: -65,
  west: -165,
}

const MAP_MARKER_LEGEND: { color: string; label: string }[] = [
  { color: '#16A34A', label: 'Active' },
  { color: '#22C55E', label: 'Owner listed' },
  { color: '#EAB308', label: '30+ days on market' },
  { color: '#F97316', label: '60+ days on market' },
  { color: '#EF4444', label: 'Auction / foreclosure' },
  { color: '#9CA3AF', label: 'Status or DOM unknown' },
]

function MapMarkerLegend() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div
        className="hidden md:block absolute bottom-4 left-3 z-10 max-w-[min(92vw,16rem)] pointer-events-auto"
        role="region"
        aria-label="Map marker color legend"
      >
        <div
          className="rounded-lg px-3 py-2 shadow-lg"
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
            style={{ color: 'rgba(255, 255, 255, 0.75)' }}
          >
            Marker colors
          </p>
          <ul className="space-y-1">
            {MAP_MARKER_LEGEND.map((row) => (
              <li
                key={row.label}
                className="flex items-center gap-2 text-[11px]"
                style={{ color: 'rgba(255, 255, 255, 0.95)' }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                {row.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="md:hidden absolute bottom-4 left-3 z-10 pointer-events-auto">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg"
          style={{
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
          aria-expanded={open}
        >
          Legend
        </button>
        {open && (
          <div
            className="mt-2 rounded-lg px-3 py-2 shadow-lg max-w-[min(92vw,16rem)]"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <ul className="space-y-1.5">
              {MAP_MARKER_LEGEND.map((row) => (
                <li key={row.label} className="flex items-center gap-2 text-[11px] text-white">
                  <span
                    className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  {row.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
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
  // Prefer the in-browser Geocoder (same auth as Maps JS API). Falls back to the
  // REST Geocoding API only if the in-browser geocoder isn't available — many
  // production keys restrict the REST endpoint while allowing the JS Geocoder.
  const w = typeof window !== 'undefined' ? (window as Window & { google?: typeof google }) : undefined
  const Geocoder = w?.google?.maps?.Geocoder
  if (Geocoder) {
    try {
      const geocoder = new Geocoder()
      const { results } = await geocoder.geocode({
        address: query,
        componentRestrictions: { country: 'us' },
      })
      if (!results?.length) return null
      const r = results[0]
      const loc = r.geometry?.location
      if (!loc) return null
      const types: string[] = r.types || []
      let zoom = 12
      if (types.includes('postal_code')) zoom = 13
      else if (types.includes('locality') || types.includes('sublocality')) zoom = 12
      else if (types.includes('administrative_area_level_2')) zoom = 10
      else if (types.includes('administrative_area_level_1')) zoom = 7
      return { lat: loc.lat(), lng: loc.lng(), zoom }
    } catch (err) {
      console.warn('[MapSearch] In-browser geocoder failed, trying REST API:', err)
    }
  }

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

function LabelGeocoder({
  label,
  apiKey,
  onResolved,
}: {
  label: string
  apiKey: string
  onResolved?: (bounds: { north: number; south: number; east: number; west: number }) => void
}) {
  const map = useMap()
  const geocodedRef = useRef(false)
  const onResolvedRef = useRef(onResolved)
  onResolvedRef.current = onResolved

  useEffect(() => {
    if (!map || !label || geocodedRef.current) return
    geocodedRef.current = true

    forwardGeocode(label, apiKey).then((result) => {
      if (!result || !map) return
      // setCenter + setZoom (instead of panTo, which animates) avoids racing
      // the `idle` listener that drives the listings fetch. Then we proactively
      // push the resolved bounds in case `idle` doesn't fire (e.g. when the
      // tile cache is warm and the camera change is treated as a no-op).
      map.setCenter({ lat: result.lat, lng: result.lng })
      map.setZoom(result.zoom)
      setTimeout(() => {
        const bounds = map.getBounds()
        if (!bounds || !onResolvedRef.current) return
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        onResolvedRef.current({
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        })
      }, 200)
    })
  }, [map, label, apiKey])

  return null
}

/**
 * Fits the map viewport to a circular radius (in miles) around `center` once
 * on mount. Using `fitBounds` (instead of a fixed zoom) keeps the framing
 * consistent across desktop, mobile, and the desktop 60% split panel where
 * the rendered map width varies considerably.
 */
function FitToRadius({
  center,
  radiusMiles,
  onFitted,
}: {
  center: { lat: number; lng: number }
  radiusMiles: number
  onFitted?: (bounds: { north: number; south: number; east: number; west: number }) => void
}) {
  const map = useMap()
  const fittedRef = useRef(false)
  const onFittedRef = useRef(onFitted)
  onFittedRef.current = onFitted

  useEffect(() => {
    if (!map || fittedRef.current) return
    fittedRef.current = true

    // 1° latitude ≈ 69 miles; longitude scales by cos(latitude).
    const latDelta = radiusMiles / 69
    const lngDelta = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180))
    const bounds = {
      north: center.lat + latDelta,
      south: center.lat - latDelta,
      east: center.lng + lngDelta,
      west: center.lng - lngDelta,
    }
    map.fitBounds(bounds)

    // Push the resolved bounds to the listings hook in case `idle` doesn't fire
    // (mirrors LabelGeocoder's belt-and-suspenders pattern).
    setTimeout(() => {
      const b = map.getBounds()
      if (!b || !onFittedRef.current) return
      const ne = b.getNorthEast()
      const sw = b.getSouthWest()
      onFittedRef.current({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      })
    }, 200)
  }, [map, center.lat, center.lng, radiusMiles])

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
  panToRef: React.MutableRefObject<((lat: number, lng: number, zoom?: number) => void) | null>
  mapInstanceRef?: React.MutableRefObject<google.maps.Map | null>
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
  mapInstanceRef,
}: MapContentProps) {
  const map = useMap()

  useEffect(() => {
    if (!mapInstanceRef) return
    mapInstanceRef.current = map ?? null
    return () => { if (mapInstanceRef) mapInstanceRef.current = null }
  }, [map, mapInstanceRef])
  // Markers are intentionally NOT clustered — each listing renders as its
  // own price pill at all zoom levels. The <AdvancedMarker> components
  // below attach themselves to the map via @vis.gl/react-google-maps
  // context, so no manual marker management is needed here.
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null)

  useEffect(() => {
    if (!map) return
    panToRef.current = (lat: number, lng: number, zoom?: number) => {
      if (zoom != null) {
        map.setCenter({ lat, lng })
        map.setZoom(zoom)
      } else {
        map.panTo({ lat, lng })
      }
      // Belt-and-suspenders: explicitly trigger a bounds refresh after the camera
      // settles. setCenter/setZoom usually fire `idle` (which the listener below
      // uses to refetch), but for "no-op" or near-no-op changes the event can
      // be skipped. This guarantees the listings hook always re-queries for the
      // new viewport after a programmatic pan/zoom.
      setTimeout(() => {
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
      }, 150)
    }
    return () => { panToRef.current = null }
  }, [map, panToRef, onBoundsChanged])

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
          markerBg = signal ? markerColorForCategory(signal.category) : 'var(--surface-card)'
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
            zIndex={isSelected ? 1000 : undefined}
          >
            <div
              className="px-1.5 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer shadow-md transition-transform hover:scale-110"
              style={{
                backgroundColor: isSelected ? 'var(--accent-sky)' : markerBg,
                color: isSelected ? '#fff' : markerText,
                border: `1.5px solid ${markerBorder}`,
                transform: isSelected ? 'scale(1.25)' : undefined,
                boxShadow: isSelected
                  ? '0 0 0 4px rgba(56, 189, 248, 0.35), 0 4px 12px rgba(0, 0, 0, 0.25)'
                  : undefined,
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

  // Authenticated user — used to prefer the saved business_address_zip as the
  // initial map center, ahead of navigator.geolocation.
  const { user, isLoading: authLoading } = useAuth()
  const accountZip = user?.business_address_zip?.trim() || null

  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [accountZipCenter, setAccountZipCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [geoResolved, setGeoResolved] = useState(hasExplicitLocation)

  // Resolve the user's saved ZIP synchronously from cache so the map can mount
  // immediately on subsequent visits without waiting on a geocode round-trip.
  useEffect(() => {
    if (hasExplicitLocation || !accountZip) return
    const cached = readZipCache(accountZip)
    if (cached) {
      setAccountZipCenter(cached)
      setGeoResolved(true)
    }
  }, [hasExplicitLocation, accountZip])

  // Fallback geocode for the user's ZIP if not cached. Uses the same
  // forwardGeocode helper as the URL-label flow.
  useEffect(() => {
    if (hasExplicitLocation || !accountZip || !apiKey) return
    if (accountZipCenter) return // already resolved from cache
    let cancelled = false
    forwardGeocode(accountZip, apiKey).then((result) => {
      if (cancelled || !result) return
      const entry = { lat: result.lat, lng: result.lng }
      setAccountZipCenter(entry)
      writeZipCache(accountZip, entry)
      setGeoResolved(true)
    })
    return () => { cancelled = true }
  }, [hasExplicitLocation, accountZip, accountZipCenter, apiKey])

  useEffect(() => {
    if (hasExplicitLocation) return
    // Wait for auth to settle so we can prefer the saved ZIP over GPS.
    if (authLoading) return
    if (accountZip) return // account-zip path takes precedence
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoResolved(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoResolved(true)
      },
      () => {
        // Geolocation denied or unavailable — use IP-based location fallback
        fetch('https://ipapi.co/json/')
          .then((r) => r.json())
          .then((data) => {
            if (data.latitude && data.longitude) {
              setGeoCenter({ lat: data.latitude, lng: data.longitude })
            }
          })
          .catch(() => {})
          .finally(() => setGeoResolved(true))
      },
      { timeout: 5000, maximumAge: 300000 },
    )
  }, [hasExplicitLocation, authLoading, accountZip])

  const initialCenter = paramCenter ?? accountZipCenter ?? geoCenter ?? DEFAULT_CENTER
  const initialZoom = paramZoom
    ?? (accountZipCenter
      ? ACCOUNT_ZIP_INITIAL_ZOOM
      : geoCenter ? GEOLOCATION_INITIAL_ZOOM : DEFAULT_ZOOM)

  // Only fit-to-radius and show the "you are here" pin when the location came
  // from the user's actual GPS — never for URL params, account-ZIP centering,
  // or the US-center default.
  const shouldUseUserLocation = !paramCenter && !needsGeocode && !accountZipCenter && !!geoCenter
  const userLocation = shouldUseUserLocation ? geoCenter : null

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
  const [activeLabel] = useState<string | null>(locationLabel)
  const [showLabel, setShowLabel] = useState(!!locationLabel)
  const [drawingPolygon, setDrawingPolygon] = useState<google.maps.Polygon | null>(null)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')

  const panToRef = useRef<((lat: number, lng: number, zoom?: number) => void) | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  const [savingDefault, setSavingDefault] = useState(false)
  const [savedDefaultToast, setSavedDefaultToast] = useState<string | null>(null)

  const { fetchProperty } = usePropertyData()

  useEffect(() => {
    if (!showLabel) return
    const t = setTimeout(() => setShowLabel(false), 4000)
    return () => clearTimeout(t)
  }, [showLabel, activeLabel])

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

  const handleSaveDefaultLocation = useCallback(async () => {
    const map = mapInstanceRef.current
    if (!map || !apiKey || savingDefault) return
    const center = map.getCenter()
    if (!center) return
    setSavingDefault(true)
    try {
      const result = await reverseGeocode(center.lat(), center.lng(), apiKey)
      const zip = result?.zip_code?.trim()
      if (!zip) {
        setSavedDefaultToast("Couldn't find a ZIP for this view")
        return
      }
      await apiClient.patch('/api/v1/users/me', { business_address_zip: zip })
      writeZipCache(zip, { lat: center.lat(), lng: center.lng() })
      setSavedDefaultToast(`Saved ${zip} as your default`)
    } catch {
      setSavedDefaultToast('Could not save default location')
    } finally {
      setSavingDefault(false)
      setTimeout(() => setSavedDefaultToast(null), 3500)
    }
  }, [apiKey, savingDefault])

  const handleSearchSelect = useCallback((selection: MapSearchSelection) => {
    if (!selection.location) return
    const { lat, lng } = selection.location

    // Pan + zoom to the result. Existing panToRef handles bounds refresh.
    if (panToRef.current) {
      panToRef.current(lat, lng, selection.zoom)
    }

    setSelectedListing(null)

    if (selection.isStreetAddress) {
      // Drop a pin and seed the geocode/property-preview flow directly — we
      // already have a formatted address from Places, no need to reverse-geocode.
      setDropPin({ lat, lng })
      setGeocodeResult({
        formatted_address: selection.formatted_address,
        city: selection.components?.city || undefined,
        state: selection.components?.state || undefined,
        zip_code: selection.components?.zipCode || undefined,
      })
      setPropertyPreview(null)
      setIsGeocoding(false)
    } else {
      // Region (city/state/zip) — clear any active drop pin so the user just
      // sees the new viewport with its listings.
      clearGeocode()
    }

    // Update the location-confirmation toast so the user sees a quick
    // "Showing {label}" pill, mirroring URL-driven navigations.
    setMobileView('map')
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
          zoomControlOptions={{ position: ControlPosition.RIGHT_CENTER }}
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
            mapInstanceRef={mapInstanceRef}
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

          {/* Mobile-only popup hanging below the selected listing marker.
              Desktop relies on the right-column list-card highlight instead. */}
          {selectedListing && (
            <AdvancedMarker
              position={{ lat: selectedListing.latitude, lng: selectedListing.longitude }}
              anchorPoint={AdvancedMarkerAnchorPoint.TOP}
              zIndex={1100}
            >
              <div
                className="md:hidden mt-7"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <PropertyPreviewCard
                  listing={selectedListing}
                  signal={dealSignals.get(selectedListing.id)}
                  onClose={() => setSelectedListing(null)}
                />
              </div>
            </AdvancedMarker>
          )}

          {/* Off-market geocoded popup — hangs below the drop pin on all
              viewports (no right-column duplicate exists for off-market lookups). */}
          {(dropPin || isGeocoding) && dropPin && (
            <AdvancedMarker
              position={dropPin}
              anchorPoint={AdvancedMarkerAnchorPoint.TOP}
              zIndex={1100}
            >
              <div
                className="mt-7"
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

          {/* "You are here" marker — Google-Maps-style blue dot with a soft halo. */}
          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={500}>
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute w-9 h-9 rounded-full"
                  style={{ backgroundColor: 'rgba(66, 133, 244, 0.18)' }}
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: '#4285F4',
                    border: '2.5px solid #fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  }}
                />
              </div>
            </AdvancedMarker>
          )}

          {/* Fit the camera to a 2-mile radius around the user's location.
              Runs once after the map mounts so the framing adapts to the actual
              container size (mobile vs. desktop split). */}
          {userLocation && paramZoom === null && (
            <FitToRadius
              center={userLocation}
              radiusMiles={GEOLOCATION_RADIUS_MILES}
              onFitted={onBoundsChanged}
            />
          )}

          {needsGeocode && apiKey && (
            <LabelGeocoder
              label={locationLabel!}
              apiKey={apiKey}
              onResolved={onBoundsChanged}
            />
          )}
        </Map>
      </APIProvider>

      <MapMarkerLegend />

      {/* Search bar — top-left of map. Mirrors the homepage AddressAutocomplete
          (searchMode='location'): accepts addresses, cities, states, and ZIPs.
          Hidden while the filters panel is open so its close button (top-right)
          stays reachable on narrow viewports where the two would otherwise
          overlap. The container also yields ~18rem on the right so the
          collapsed Filters button is never covered. */}
      {!filtersOpen && (
        <div className="absolute top-3 left-3 z-10 pointer-events-auto flex flex-col gap-2 items-start">
          <MapSearchBar onSelect={handleSearchSelect} />
          {/* Save-default-location — only authenticated users see this. Saves the
              current map center's ZIP to the user's account so subsequent visits
              land on the same view. */}
          {user && (
            <button
              type="button"
              onClick={handleSaveDefaultLocation}
              disabled={savingDefault}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-heading)',
                border: '1px solid var(--border-default)',
              }}
              aria-label="Save current map view as my default location"
            >
              {savingDefault ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Bookmark size={11} />
              )}
              Save view as default
            </button>
          )}
        </div>
      )}

      {/* Save-default-location confirmation toast */}
      {savedDefaultToast && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 max-w-[90vw]">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Check size={12} style={{ color: 'var(--status-positive)' }} />
            {savedDefaultToast}
          </div>
        </div>
      )}

      <FilterPanel
        filters={filters}
        onChange={updateFilters}
        totalCount={totalCount}
        isLoading={isLoading}
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen((p) => !p)}
      />

      {/* Neighborhood Intelligence Card */}
      {selectedNeighborhood && (
        <NeighborhoodCard
          neighborhood={selectedNeighborhood}
          onClose={() => setSelectedNeighborhood(null)}
        />
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
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
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 transition-opacity">
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

      {/* Location label confirmation toast (URL navigation OR search-bar selection) */}
      {showLabel && activeLabel && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 max-w-[90vw]">
          <div
            className="px-4 py-2 rounded-lg text-sm font-medium shadow-lg truncate"
            style={{
              backgroundColor: 'var(--surface-card)',
              color: 'var(--text-heading)',
              border: '1px solid var(--border-default)',
            }}
          >
            Showing {activeLabel}
          </div>
        </div>
      )}

      {/* Listing count badge — stacked below Filters (top-right). Hidden when
          the filter panel is open or while loading (counter returns after fetch). */}
      {totalCount > 0 && !isLoading && !filtersOpen && (
        <div className="absolute top-14 right-3 z-10 max-w-[min(90vw,18rem)]">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded shadow-lg"
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.7)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            <Home size={12} />
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
        sortBy={filters.sort_by}
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
