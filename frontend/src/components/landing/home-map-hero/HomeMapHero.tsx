'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  ColorScheme,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { ChevronDown, Loader2 } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { MapBounds } from '@/hooks/useMapSearch'
import { MapSearchBar, type MapSearchSelection } from '@/components/map-search/MapSearchBar'
import { clusterListings, type ListingCluster } from '@/components/map-search/mapClustering'
import { markerColorForCategory } from '@/lib/dealSignal'
import { trackEvent } from '@/lib/eventTracking'
import { HERO_PRESETS, HERO_SEARCH_PROMPTS, type HeroPreset } from './presets'
import { useHeroMapSearch } from './useHeroMapSearch'
import { PropertyPeekPanel } from './PropertyPeekPanel'
import heroMapStyles from './home-map-style.json'
import './home-map-hero.css'

export interface HeroGeo {
  lat: number
  lng: number
  city: string
  /** State or region code from geo headers, e.g. "FL". */
  region?: string
}

/** Fallback when Vercel geo headers are missing (local dev, bots). */
export const DEFAULT_HERO_GEO: HeroGeo = {
  lat: 26.3683,
  lng: -80.1289,
  city: 'Boca Raton',
  region: 'FL',
}

/** Same Map ID as Search & Discover. Cloud IDs must be verified before use. */
const MAP_ID = 'DEMO_MAP_ID'
const DEFAULT_ZOOM = 13
/** Cluster any overlapping pins on first load — the 80-pin Search & Discover
 *  threshold would never fire here. */
const HERO_CLUSTER_MIN = 2
const PIN_DROP_STAGGER_MS = 30
const US_BOUNDS = { north: 72, south: 17, east: -65, west: -165 }

function compactPrice(price: number | null): string {
  if (price == null) return '—'
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  if (price >= 1_000) return `$${Math.round(price / 1_000)}K`
  return `$${price}`
}

function validCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

const STICKY_NAV_OFFSET = 80

function scrollPastHero() {
  const hero = document.getElementById('home-hero')
  const next = hero?.nextElementSibling
  if (!(next instanceof HTMLElement)) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const top = next.getBoundingClientRect().top + window.scrollY - STICKY_NAV_OFFSET
  window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
}

interface Props {
  geo?: HeroGeo
}

export function HomeMapHero({ geo = DEFAULT_HERO_GEO }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const search = useHeroMapSearch()
  const [city, setCity] = useState(geo.city)
  const [selected, setSelected] = useState<MapListing | null>(null)
  const panRef = useRef<((lat: number, lng: number, zoom: number) => void) | null>(null)
  const fitClusterRef = useRef<((members: MapListing[]) => void) | null>(null)
  const [viewBounds, setViewBounds] = useState<MapBounds | null>(null)

  const listings = useMemo(
    () => search.listings.filter((l) => validCoord(l.latitude, l.longitude)),
    [search.listings],
  )

  const { singles, clusters } = useMemo(() => {
    if (!viewBounds) return { singles: [] as MapListing[], clusters: [] as ListingCluster[] }
    return clusterListings(listings, search.dealSignals, viewBounds, HERO_CLUSTER_MIN)
  }, [listings, search.dealSignals, viewBounds])

  const onBoundsChanged = useCallback(
    (b: MapBounds) => {
      setViewBounds(b)
      search.onBoundsChanged(b)
    },
    [search.onBoundsChanged],
  )

  // The pin with the best ZIP rent-to-price among unclustered pills.
  const bestId = useMemo(() => {
    let best: MapListing | null = null
    for (const l of singles) {
      const r = l.zip_rent_to_price
      if (r == null || r <= 0) continue
      if (!best || r > (best.zip_rent_to_price ?? 0)) best = l
    }
    return best?.id ?? null
  }, [singles])

  const onPreset = useCallback(
    (p: HeroPreset) => {
      setSelected(null)
      search.setPreset(p)
      trackEvent('hero_preset_click', { preset_id: p.id, expensive: p.expensive })
    },
    [search],
  )

  const onReveal = useCallback(() => {
    if (search.fetched && search.count != null) return
    trackEvent('hero_count_click', { preset_id: search.preset.id })
    search.reveal()
  }, [search])

  const onSelectPlace = useCallback((sel: MapSearchSelection) => {
    if (!sel.location) return
    const c = sel.components
    const label = c?.city || sel.formatted_address.split(',')[0] || 'this area'
    setCity(label)
    setSelected(null)
    panRef.current?.(sel.location.lat, sel.location.lng, Math.min(sel.zoom, 15))
    trackEvent('search_started', {
      search_type: sel.isStreetAddress ? 'address' : sel.placeTypes.includes('postal_code') ? 'zip' : 'city',
      state: c?.state || undefined,
      source: 'home_hero',
    })
  }, [])

  const onPin = useCallback(
    (l: MapListing) => {
      setSelected(l)
      trackEvent('hero_pin_click', {
        preset_id: search.preset.id,
        property_state: l.state ?? undefined,
        deal_type: search.dealSignals.get(l.id)?.category,
      })
    },
    [search.preset.id, search.dealSignals],
  )

  const onCluster = useCallback((cluster: ListingCluster) => {
    setSelected(null)
    fitClusterRef.current?.(cluster.listings)
  }, [])

  const countShown = search.fetched && search.count != null && !search.isLoading
  const noun = search.preset.noun
  const countLabel = countShown
    ? `${search.count!.toLocaleString()} ${noun} in ${city} right now`
    : `See how many ${noun} are in ${city}`

  if (!apiKey) {
    return (
      <section className="home-hero" id="home-hero">
        <div className="home-hero__fallback">Map is unavailable. Search any address below.</div>
      </section>
    )
  }

  return (
    <section className="home-hero" id="home-hero" aria-labelledby="home-hero-heading">
      <APIProvider apiKey={apiKey} libraries={['places', 'marker']}>
        <div className="home-hero__shell">
          <div className="home-hero__chrome">
            <h1 id="home-hero-heading" className="home-hero__tag">
              Find a Great Deal <span>& How to Close it.</span>
            </h1>
            <div className="home-hero__toolbar">
              <div className="home-hero__search">
                <MapSearchBar onSelect={onSelectPlace} placeholders={HERO_SEARCH_PROMPTS} />
              </div>
              <div className="home-hero__chips" role="group" aria-label="Deal type">
                {HERO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`home-hero__chip${search.preset.id === p.id ? ' home-hero__chip--on' : ''}`}
                    aria-pressed={search.preset.id === p.id}
                    onClick={() => onPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="home-hero__cred">Built by the founder of Foreclosure.com</p>
            </div>
          </div>

          <div className="home-hero__map">
            <Map
              defaultCenter={{ lat: geo.lat, lng: geo.lng }}
              defaultZoom={DEFAULT_ZOOM}
              mapId={MAP_ID}
              styles={heroMapStyles as google.maps.MapTypeStyle[]}
              colorScheme={ColorScheme.DARK}
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              minZoom={9}
              restriction={{ latLngBounds: US_BOUNDS, strictBounds: false }}
              clickableIcons={false}
              style={{ width: '100%', height: '100%' }}
            >
              <MapWiring
                onBoundsChanged={onBoundsChanged}
                panRef={panRef}
                fitClusterRef={fitClusterRef}
              />
              {clusters.map((cluster) => (
                <AdvancedMarker
                  key={`cluster-${cluster.key}`}
                  position={{ lat: cluster.lat, lng: cluster.lng }}
                  onClick={() => onCluster(cluster)}
                  zIndex={50}
                >
                  <div
                    className={`home-hero__cluster${cluster.count >= 100 ? ' home-hero__cluster--lg' : ''}`}
                    style={{ backgroundColor: markerColorForCategory(cluster.category, true) }}
                    title={`${cluster.count} listings — zoom in`}
                  >
                    {cluster.count}
                  </div>
                </AdvancedMarker>
              ))}
              {singles.map((l, i) => {
                const signal = search.dealSignals.get(l.id)
                const isSel = selected?.id === l.id
                const isBest = l.id === bestId
                return (
                  <AdvancedMarker
                    key={l.id}
                    position={{ lat: l.latitude, lng: l.longitude }}
                    onClick={() => onPin(l)}
                    zIndex={isSel ? 1000 : isBest ? 900 : undefined}
                  >
                    <div
                      className={`home-hero__pin${isSel ? ' home-hero__pin--sel' : ''}${isBest ? ' home-hero__pin--best' : ''}`}
                      style={{ animationDelay: `${Math.min(i, 10) * PIN_DROP_STAGGER_MS}ms` }}
                    >
                      {isBest && l.zip_rent_to_price != null && (
                        <span className="home-hero__best-tag">
                          Best rent-to-price · {(l.zip_rent_to_price * 100).toFixed(2)}%
                        </span>
                      )}
                      <span
                        className="home-hero__pin-lbl"
                        style={
                          !isSel && signal ? { borderColor: markerColorForCategory(signal.category, true) } : undefined
                        }
                      >
                        {compactPrice(l.price)}
                      </span>
                      <span className="home-hero__pin-dot" />
                    </div>
                  </AdvancedMarker>
                )
              })}
            </Map>

            <button
              type="button"
              className={`home-hero__count${countShown ? ' home-hero__count--shown' : ''}${search.isLoading ? ' home-hero__count--busy' : ''}`}
              onClick={onReveal}
              aria-live="polite"
            >
              {search.isLoading ? (
                <Loader2 size={14} className="home-hero__spin" aria-hidden="true" />
              ) : (
                <i aria-hidden="true" />
              )}
              <span>{countLabel}</span>
            </button>

            {search.notice && !search.isLoading && (
              <div className="home-hero__notice">{search.notice}</div>
            )}

            <PropertyPeekPanel
              listing={selected}
              signal={selected ? search.dealSignals.get(selected.id) : undefined}
              presetId={search.preset.id}
              onClose={() => setSelected(null)}
            />

            <button
              type="button"
              className="home-hero__skip"
              onClick={scrollPastHero}
              aria-label="Scroll past the map"
            >
              <ChevronDown size={22} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>
      </APIProvider>
    </section>
  )
}

/** Wires the map instance to the search hook and exposes a pan helper. */
function MapWiring({
  onBoundsChanged,
  panRef,
  fitClusterRef,
}: {
  onBoundsChanged: (b: MapBounds) => void
  panRef: React.MutableRefObject<((lat: number, lng: number, zoom: number) => void) | null>
  fitClusterRef: React.MutableRefObject<((members: MapListing[]) => void) | null>
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    panRef.current = (lat, lng, zoom) => {
      map.setCenter({ lat, lng })
      map.setZoom(zoom)
    }
    fitClusterRef.current = (members) => {
      const box = new google.maps.LatLngBounds()
      for (const m of members) {
        box.extend({ lat: m.latitude, lng: m.longitude })
      }
      map.fitBounds(box, 48)
    }
    const emitBounds = () => {
      const b = map.getBounds()
      if (!b) return
      const ne = b.getNorthEast()
      const sw = b.getSouthWest()
      onBoundsChanged({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() })
    }
    const listener = map.addListener('idle', emitBounds)
    emitBounds()
    return () => {
      google.maps.event.removeListener(listener)
      panRef.current = null
      fitClusterRef.current = null
    }
  }, [map, onBoundsChanged, panRef, fitClusterRef])

  return null
}
