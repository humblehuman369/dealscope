'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  APIProvider,
  AdvancedMarker,
  ColorScheme,
  Map,
  useMap,
} from '@vis.gl/react-google-maps'
import { Loader2 } from 'lucide-react'
import type { MapListing } from '@/lib/api'
import type { MapBounds } from '@/hooks/useMapSearch'
import { MapSearchBar, type MapSearchSelection } from '@/components/map-search/MapSearchBar'
import { markerColorForCategory } from '@/lib/dealSignal'
import { trackEvent } from '@/lib/eventTracking'
import { HERO_PRESETS, type HeroPreset } from './presets'
import { useHeroMapSearch } from './useHeroMapSearch'
import { PropertyPeekPanel } from './PropertyPeekPanel'
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
/**
 * Pins shown at once. The search returns up to 200; the hero shows the best
 * of them so the map reads as a curated view rather than a wall of prices.
 * Ranked by ZIP rent-to-price (best first), then the rest in the order the
 * search returned them.
 */
const MAX_VISIBLE_PINS = 60
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

interface Props {
  geo?: HeroGeo
}

export function HomeMapHero({ geo = DEFAULT_HERO_GEO }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const search = useHeroMapSearch()
  const [city, setCity] = useState(geo.city)
  const [selected, setSelected] = useState<MapListing | null>(null)
  const panRef = useRef<((lat: number, lng: number, zoom: number) => void) | null>(null)

  const listings = useMemo(() => {
    const valid = search.listings.filter((l) => validCoord(l.latitude, l.longitude))
    if (valid.length <= MAX_VISIBLE_PINS) return valid
    const ranked = [...valid].sort((a, b) => {
      const ra = a.zip_rent_to_price ?? -1
      const rb = b.zip_rent_to_price ?? -1
      return rb - ra
    })
    return ranked.slice(0, MAX_VISIBLE_PINS)
  }, [search.listings])

  // The pin with the best ZIP rent-to-price screen in view. This comes from
  // data already fetched, so it costs nothing extra and always shows.
  const bestId = useMemo(() => {
    let best: MapListing | null = null
    for (const l of listings) {
      const r = l.zip_rent_to_price
      if (r == null || r <= 0) continue
      if (!best || r > (best.zip_rent_to_price ?? 0)) best = l
    }
    return best?.id ?? null
  }, [listings])

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
        <Map
          defaultCenter={{ lat: geo.lat, lng: geo.lng }}
          defaultZoom={DEFAULT_ZOOM}
          mapId={MAP_ID}
          colorScheme={ColorScheme.DARK}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          minZoom={9}
          restriction={{ latLngBounds: US_BOUNDS, strictBounds: false }}
          clickableIcons={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapWiring onBoundsChanged={search.onBoundsChanged} panRef={panRef} />
          {listings.map((l, i) => {
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

        <div className="home-hero__glow" aria-hidden="true" />

        <div className="home-hero__topbar">
          <h1 id="home-hero-heading" className="home-hero__tag">
            Find the deal. <span>See the gap.</span>
          </h1>
          <div className="home-hero__search">
            <MapSearchBar
              onSelect={onSelectPlace}
              initialValue={geo.region ? `${geo.city}, ${geo.region}` : geo.city}
            />
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
        </div>

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

        <div className="home-hero__cred">Built by the founder of Foreclosure.com</div>

        <PropertyPeekPanel
          listing={selected}
          signal={selected ? search.dealSignals.get(selected.id) : undefined}
          presetId={search.preset.id}
          onClose={() => setSelected(null)}
        />
      </APIProvider>
    </section>
  )
}

/** Wires the map instance to the search hook and exposes a pan helper. */
function MapWiring({
  onBoundsChanged,
  panRef,
}: {
  onBoundsChanged: (b: MapBounds) => void
  panRef: React.MutableRefObject<((lat: number, lng: number, zoom: number) => void) | null>
}) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    panRef.current = (lat, lng, zoom) => {
      map.setCenter({ lat, lng })
      map.setZoom(zoom)
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
    }
  }, [map, onBoundsChanged, panRef])

  return null
}
