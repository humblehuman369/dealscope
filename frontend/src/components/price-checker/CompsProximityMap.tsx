'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps'
import { MapPin, Maximize2, X, Plus, Minus, School, BarChart3, Layers } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────

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

interface NearbyProperty {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

interface SchoolResult {
  placeId: string
  name: string
  lat: number
  lng: number
  types: string[]
  vicinity: string
  distanceMi: number
}

interface NeighborhoodStats {
  medianHomeValue: string | null
  avgHouseholdIncome: string | null
  populationDensity: string | null
  walkScore: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
}

const METERS_PER_MILE = 1609.34

function haversineMi(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function inferSchoolLevel(name: string, types: string[]): string {
  const n = name.toLowerCase()
  if (n.includes('high') || n.includes('senior')) return 'High'
  if (n.includes('middle') || n.includes('junior')) return 'Middle'
  if (n.includes('elementary') || n.includes('primary')) return 'Elementary'
  if (types.includes('secondary_school')) return 'High'
  if (types.includes('primary_school')) return 'Elementary'
  return 'School'
}

// ─── Custom zoom control ─────────────────────────────────────────────

function ZoomControls() {
  const map = useMap()

  const zoom = useCallback((delta: number) => {
    if (!map) return
    const cur = map.getZoom() ?? 14
    map.setZoom(cur + delta)
  }, [map])

  const btnClass =
    'w-9 h-9 flex items-center justify-center transition-colors hover:brightness-125'
  const btnStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface-card)',
    color: 'var(--text-heading)',
    border: '1px solid var(--border-default)',
  }

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex flex-col rounded-lg overflow-hidden shadow-lg"
      style={{ border: '1px solid var(--border-default)' }}
    >
      <button type="button" onClick={() => zoom(1)} className={btnClass} style={btnStyle} aria-label="Zoom in">
        <Plus size={16} />
      </button>
      <div style={{ height: 1, backgroundColor: 'var(--border-default)' }} />
      <button type="button" onClick={() => zoom(-1)} className={btnClass} style={btnStyle} aria-label="Zoom out">
        <Minus size={16} />
      </button>
    </div>
  )
}

// ─── Nearby properties layer ─────────────────────────────────────────

function NearbyPropertiesLayer({
  center,
  enabled,
}: {
  center: google.maps.LatLngLiteral | null
  enabled: boolean
}) {
  const map = useMap()
  const [properties, setProperties] = useState<NearbyProperty[]>([])
  const [selected, setSelected] = useState<NearbyProperty | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (!enabled || !map || !center || fetched.current) return
    fetched.current = true

    const svc = new google.maps.places.PlacesService(map)
    const request: google.maps.places.PlaceSearchRequest = {
      location: center,
      radius: 0.5 * METERS_PER_MILE,
      type: 'street_address' as string,
      keyword: 'residential house home',
    }

    svc.nearbySearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return
      const mapped: NearbyProperty[] = results
        .filter(r => r.geometry?.location && r.place_id)
        .slice(0, 30)
        .map(r => ({
          placeId: r.place_id!,
          name: r.name ?? '',
          address: r.vicinity ?? r.name ?? '',
          lat: r.geometry!.location!.lat(),
          lng: r.geometry!.location!.lng(),
        }))
      setProperties(mapped)
    })
  }, [enabled, map, center])

  useEffect(() => {
    if (!enabled) fetched.current = false
  }, [enabled])

  if (!enabled || properties.length === 0) return null

  return (
    <>
      {properties.map(p => (
        <Marker
          key={p.placeId}
          position={{ lat: p.lat, lng: p.lng }}
          title={p.address}
          onClick={() => setSelected(p)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#94A3B8',
            fillOpacity: 0.7,
            strokeColor: '#fff',
            strokeWeight: 1.5,
            labelOrigin: new google.maps.Point(0, 0),
          }}
        />
      ))}

      {selected && (
        <PropertyInfoPopup property={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}

function PropertyInfoPopup({
  property,
  onClose,
}: {
  property: NearbyProperty
  onClose: () => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="background:var(--surface-card);color:var(--text-heading);padding:10px 14px;border-radius:10px;min-width:180px;font-family:system-ui,sans-serif;">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${property.address}</div>
          ${property.name && property.name !== property.address ? `<div style="font-size:11px;color:var(--text-secondary);">${property.name}</div>` : ''}
        </div>
      `,
      position: { lat: property.lat, lng: property.lng },
      pixelOffset: new google.maps.Size(0, -12),
    })
    infoWindow.open(map)
    infoWindow.addListener('closeclick', onClose)
    return () => infoWindow.close()
  }, [map, property, onClose])

  return null
}

// ─── Schools layer ───────────────────────────────────────────────────

function SchoolsLayer({
  center,
  enabled,
}: {
  center: google.maps.LatLngLiteral | null
  enabled: boolean
}) {
  const map = useMap()
  const [schools, setSchools] = useState<SchoolResult[]>([])
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    if (!enabled || !map || !center || fetched.current) return
    fetched.current = true

    const svc = new google.maps.places.PlacesService(map)
    const request: google.maps.places.PlaceSearchRequest = {
      location: center,
      radius: 1 * METERS_PER_MILE,
      type: 'school',
    }

    svc.nearbySearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return
      const mapped: SchoolResult[] = results
        .filter(r => r.geometry?.location && r.place_id)
        .slice(0, 20)
        .map(r => {
          const lat = r.geometry!.location!.lat()
          const lng = r.geometry!.location!.lng()
          return {
            placeId: r.place_id!,
            name: r.name ?? 'Unknown School',
            lat,
            lng,
            types: r.types ?? [],
            vicinity: r.vicinity ?? '',
            distanceMi: haversineMi(center.lat, center.lng, lat, lng),
          }
        })
      setSchools(mapped)
    })
  }, [enabled, map, center])

  useEffect(() => {
    if (!enabled) fetched.current = false
  }, [enabled])

  if (!enabled || schools.length === 0) return null

  return (
    <>
      {schools.map(s => (
        <Marker
          key={s.placeId}
          position={{ lat: s.lat, lng: s.lng }}
          title={s.name}
          onClick={() => setSelectedSchool(s)}
          icon={{
            path: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm0 12.55L6 12.5V10l6 3.25L18 10v2.5l-6 3.05z',
            fillColor: '#F59E0B',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 1.5,
            scale: 1.1,
            anchor: new google.maps.Point(12, 21),
          }}
        />
      ))}

      {selectedSchool && (
        <SchoolInfoPopup school={selectedSchool} onClose={() => setSelectedSchool(null)} />
      )}
    </>
  )
}

function SchoolInfoPopup({
  school,
  onClose,
}: {
  school: SchoolResult
  onClose: () => void
}) {
  const map = useMap()
  const level = inferSchoolLevel(school.name, school.types)

  useEffect(() => {
    if (!map) return
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="background:var(--surface-card);color:var(--text-heading);padding:10px 14px;border-radius:10px;min-width:200px;font-family:system-ui,sans-serif;">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${school.name}</div>
          <div style="font-size:11px;color:var(--text-secondary);display:flex;gap:8px;">
            <span>${level}</span>
            <span>·</span>
            <span>${school.distanceMi.toFixed(2)} mi</span>
          </div>
        </div>
      `,
      position: { lat: school.lat, lng: school.lng },
      pixelOffset: new google.maps.Size(0, -14),
    })
    infoWindow.open(map)
    infoWindow.addListener('closeclick', onClose)
    return () => infoWindow.close()
  }, [map, school, level, onClose])

  return null
}

// ─── Neighborhood stats overlay ──────────────────────────────────────

function NeighborhoodStatsPanel({
  center,
  visible,
  onClose,
}: {
  center: google.maps.LatLngLiteral | null
  visible: boolean
  onClose: () => void
}) {
  const [stats, setStats] = useState<NeighborhoodStats | null>(null)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (!visible || !center || fetched.current) return
    fetched.current = true
    setLoading(true)

    fetchCensusData(center.lat, center.lng)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [visible, center])

  if (!visible) return null

  const rows: { label: string; value: string | null }[] = [
    { label: 'Median Home Value', value: stats?.medianHomeValue ?? null },
    { label: 'Avg Household Income', value: stats?.avgHouseholdIncome ?? null },
    { label: 'Population Density', value: stats?.populationDensity ?? null },
    { label: 'Walk Score', value: stats?.walkScore ?? null },
  ]

  return (
    <div
      className="absolute top-4 left-4 z-20 w-64 rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={14} style={{ color: 'var(--accent-sky)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>Neighborhood Stats</span>
        </div>
        <button type="button" onClick={onClose} className="p-0.5 rounded hover:bg-white/10 transition-colors" aria-label="Close stats">
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-sky)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          rows.map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
              <span className="text-xs font-semibold" style={{ color: r.value ? 'var(--text-heading)' : 'var(--text-secondary)' }}>
                {r.value ?? 'Unavailable'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

async function fetchCensusData(lat: number, lng: number): Promise<NeighborhoodStats> {
  const base: NeighborhoodStats = {
    medianHomeValue: null,
    avgHouseholdIncome: null,
    populationDensity: null,
    walkScore: null,
  }

  try {
    const fccRes = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat.toFixed(6)}&longitude=${lng.toFixed(6)}&format=json`,
    )
    const fcc = await fccRes.json()
    const stateFips = fcc?.State?.FIPS
    const countyFips = fcc?.County?.FIPS?.slice(2)
    const tractCode = fcc?.Block?.FIPS?.slice(5, 11)

    if (!stateFips || !countyFips || !tractCode) return base

    const vars = 'B25077_001E,B19013_001E,B01003_001E'
    const censusUrl = `https://api.census.gov/data/2022/acs/acs5?get=${vars}&for=tract:${tractCode}&in=state:${stateFips}+county:${countyFips}`
    const censusRes = await fetch(censusUrl)
    const censusData = await censusRes.json()

    if (!Array.isArray(censusData) || censusData.length < 2) return base

    const [, row] = censusData
    const medVal = Number(row[0])
    const income = Number(row[1])
    const pop = Number(row[2])

    if (Number.isFinite(medVal) && medVal > 0) {
      base.medianHomeValue = `$${medVal.toLocaleString()}`
    }
    if (Number.isFinite(income) && income > 0) {
      base.avgHouseholdIncome = `$${income.toLocaleString()}`
    }
    if (Number.isFinite(pop) && pop > 0) {
      base.populationDensity = `${pop.toLocaleString()} (tract)`
    }
  } catch {
    // Census API unavailable — keep nulls
  }

  return base
}

// ─── MapMarkers (shared between inline + modal) ─────────────────────

function MapMarkers({
  subject,
  comps,
  activeView,
  showNearbyProperties,
  showSchools,
  showStats,
  onCloseStats,
}: CompsProximityMapProps & {
  showNearbyProperties: boolean
  showSchools: boolean
  showStats: boolean
  onCloseStats: () => void
}) {
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
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
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

      <NearbyPropertiesLayer center={subjectPos} enabled={showNearbyProperties} />
      <SchoolsLayer center={subjectPos} enabled={showSchools} />
      <ZoomControls />
      <NeighborhoodStatsPanel center={subjectPos} visible={showStats} onClose={onCloseStats} />
    </>
  )
}

// ─── Fullscreen modal ────────────────────────────────────────────────

function FullscreenMapModal({
  subject,
  comps,
  activeView,
  center,
  onClose,
}: CompsProximityMapProps & {
  center: google.maps.LatLngLiteral
  onClose: () => void
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
  const validComps = useMemo(
    () => comps.filter(c => isFiniteCoord(c.latitude, c.longitude)),
    [comps],
  )
  const compColor = activeView === 'sale' ? '#0EA5E9' : '#38bdf8'

  const [showNearby, setShowNearby] = useState(false)
  const [showSchools, setShowSchools] = useState(false)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ backgroundColor: 'var(--surface-base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-card)' }}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Proximity Map</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335] inline-block" />
              <span style={{ color: 'var(--text-heading)' }}>Subject</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: compColor }} />
              <span style={{ color: 'var(--text-heading)' }}>
                {activeView === 'sale' ? 'Sale' : 'Rent'} Comps ({validComps.length})
              </span>
            </span>
          </div>

          {/* Layer toggles */}
          <div className="flex items-center gap-1">
            <LayerToggle active={showNearby} onClick={() => setShowNearby(v => !v)} label="Nearby Properties" icon={<Layers size={14} />} />
            <LayerToggle active={showSchools} onClick={() => setShowSchools(v => !v)} label="Schools" icon={<School size={14} />} />
            <LayerToggle active={showStats} onClick={() => setShowStats(v => !v)} label="Stats" icon={<BarChart3 size={14} />} />
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-heading)' }}
            aria-label="Close fullscreen map"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0 relative">
        <APIProvider apiKey={apiKey} libraries={['places']}>
          <Map
            defaultCenter={center}
            defaultZoom={14}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <MapMarkers
              subject={subject}
              comps={comps}
              activeView={activeView}
              showNearbyProperties={showNearby}
              showSchools={showSchools}
              showStats={showStats}
              onCloseStats={() => setShowStats(false)}
            />
          </Map>
        </APIProvider>
      </div>
    </div>,
    document.body,
  )
}

function LayerToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--accent-sky)' : 'var(--surface-elevated)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent-sky)' : 'var(--border-default)'}`,
      }}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ─── Main export ─────────────────────────────────────────────────────

const cardBorderGlow =
  'border border-[rgba(14,165,233,0.25)] shadow-[0_0_30px_rgba(14,165,233,0.08),0_0_60px_rgba(14,165,233,0.04)]'

export function CompsProximityMap({ subject, comps, activeView, hideHeader = false, className }: CompsProximityMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasSubject = isFiniteCoord(subject.latitude, subject.longitude)
  const validComps = comps.filter(c => isFiniteCoord(c.latitude, c.longitude))
  const hasAnyPoints = hasSubject || validComps.length > 0
  const [modalOpen, setModalOpen] = useState(false)

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
    <div className={`relative ${className ?? 'h-56'}`}>
      <APIProvider apiKey={apiKey} libraries={['places']}>
        <Map
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="cooperative"
          disableDefaultUI
          zoomControl={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapMarkers
            subject={subject}
            comps={comps}
            activeView={activeView}
            showNearbyProperties={false}
            showSchools={false}
            showStats={false}
            onCloseStats={() => {}}
          />
        </Map>
      </APIProvider>

      {/* Expand button */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg shadow-lg transition-colors hover:brightness-125"
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-heading)',
        }}
        aria-label="Expand map to fullscreen"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  )

  const modal = modalOpen ? (
    <FullscreenMapModal
      subject={subject}
      comps={comps}
      activeView={activeView}
      center={center}
      onClose={() => setModalOpen(false)}
    />
  ) : null

  if (hideHeader) {
    return (
      <>
        {mapContent}
        {modal}
      </>
    )
  }

  return (
    <>
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
      {modal}
    </>
  )
}
