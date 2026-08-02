'use client'

/**
 * My Deal Map — user-specific saved-property pin layer for every DealGapIQ map.
 *
 * Pins use a house + upward sparkle glyph (distinct from Map Search price pills).
 * Selecting a pin shows TARGET / INCOME / MARKET DealGapIQ anchors plus details.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdvancedMarker, AdvancedMarkerAnchorPoint, useMap } from '@vis.gl/react-google-maps'
import { Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  useSavedPropertyMapPins,
  type SavedPropertyMapPin,
} from '@/hooks/useSavedProperties'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'

function isFiniteCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  )
}

function formatPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n).toLocaleString()}`
}

function formatFullAddress(pin: SavedPropertyMapPin): string {
  if (pin.full_address?.trim()) return pin.full_address.trim()
  return [pin.address_street, pin.address_city, [pin.address_state, pin.address_zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined') return null
  const Geocoder = (window as Window & { google?: typeof google }).google?.maps?.Geocoder
  if (!Geocoder) return null
  try {
    const geocoder = new Geocoder()
    const { results } = await geocoder.geocode({
      address,
      componentRestrictions: { country: 'us' },
    })
    const loc = results?.[0]?.geometry?.location
    if (!loc) return null
    return { lat: loc.lat(), lng: loc.lng() }
  } catch {
    return null
  }
}

/** House silhouette with an upward sparkle — My Deal Map pin glyph. */
export function MyDealHouseSparkleIcon({
  size = 28,
  selected = false,
}: {
  size?: number
  selected?: boolean
}) {
  const fill = selected ? 'var(--accent-sky)' : '#0FA4E9'
  const stroke = '#FFFFFF'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      style={{
        filter: selected
          ? 'drop-shadow(0 2px 6px rgba(15,164,233,0.55))'
          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
      }}
    >
      <circle cx="16" cy="16" r="15" fill={fill} stroke={stroke} strokeWidth="2" />
      {/* House */}
      <path
        d="M9 16.5L16 11l7 5.5V22.5a1 1 0 01-1 1h-3.5v-4h-5v4H10a1 1 0 01-1-1V16.5z"
        fill={stroke}
      />
      {/* Upward sparkle */}
      <path
        d="M23.5 6.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z"
        fill="#FDE68A"
        stroke="#FBBF24"
        strokeWidth="0.4"
      />
      <path d="M26.5 10.5l.35.9.9.35-.9.35-.35.9-.35-.9-.9-.35.9-.35.35-.9z" fill="#FDE68A" />
    </svg>
  )
}

function MyDealPinCard({
  pin,
  onClose,
}: {
  pin: SavedPropertyMapPin
  onClose: () => void
}) {
  const router = useRouter()
  const address = formatFullAddress(pin)
  const title = pin.nickname?.trim() || pin.address_street

  const openAnalysis = () => {
    const canonical = canonicalizeAddressForIdentity(address)
    const params = new URLSearchParams({ address: canonical })
    if (pin.address_city) params.set('city', pin.address_city)
    if (pin.address_state) params.set('state', pin.address_state)
    if (pin.address_zip) params.set('zip_code', pin.address_zip)
    router.push(`/discovery?${params.toString()}`)
  }

  const anchors = [
    { label: 'TARGET', value: pin.target_price, color: 'var(--accent-sky)' },
    { label: 'INCOME', value: pin.income_value, color: 'var(--status-warning)' },
    { label: 'MARKET', value: pin.market_price, color: 'var(--status-negative)' },
  ] as const

  return (
    <div
      className="w-[240px] rounded-xl overflow-hidden shadow-xl"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-heading)',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={12} style={{ color: 'var(--accent-sky)' }} aria-hidden />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: 'var(--accent-sky)' }}
            >
              My Deal
            </span>
          </div>
          <p className="text-sm font-semibold truncate">{title}</p>
          {pin.nickname ? (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {pin.address_street}
            </p>
          ) : (
            <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
              {[pin.address_city, pin.address_state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--hover-overlay)] shrink-0"
          aria-label="Close"
        >
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 px-3 py-2.5">
        {anchors.map((a) => (
          <div key={a.label} className="text-center min-w-0">
            <div
              className="text-[9px] font-bold uppercase tracking-[0.06em] mb-0.5"
              style={{ color: a.color }}
            >
              {a.label}
            </div>
            <div className="text-xs font-semibold tabular-nums truncate">{formatPrice(a.value)}</div>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between gap-2 px-3 py-2 text-[11px]"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <span className="truncate capitalize">{pin.status.replace(/_/g, ' ')}</span>
        {pin.deal_gap_pct != null && Number.isFinite(pin.deal_gap_pct) ? (
          <span className="font-semibold tabular-nums" style={{ color: 'var(--accent-sky)' }}>
            Gap {pin.deal_gap_pct > 0 ? '+' : ''}
            {pin.deal_gap_pct.toFixed(1)}%
          </span>
        ) : pin.best_strategy ? (
          <span className="truncate uppercase font-medium">{pin.best_strategy}</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={openAnalysis}
        className="w-full py-2.5 text-xs font-semibold transition-colors hover:brightness-110"
        style={{
          background: 'var(--accent-sky)',
          color: 'var(--text-inverse)',
        }}
      >
        Open Analysis
      </button>
    </div>
  )
}

export function MyDealLayerToggle({
  active,
  onClick,
  count,
  loading,
}: {
  active: boolean
  onClick: () => void
  count?: number
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--accent-sky)' : 'var(--surface-elevated)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent-sky)' : 'var(--border-default)'}`,
      }}
      title="Show your saved properties on the map"
      aria-pressed={active}
      aria-label="My Deal Map layer"
    >
      <MyDealHouseSparkleIcon size={16} selected={active} />
      <span className="hidden sm:inline">My Deals</span>
      {loading ? (
        <span className="opacity-80">…</span>
      ) : typeof count === 'number' && count > 0 ? (
        <span className="tabular-nums opacity-90">{count}</span>
      ) : null}
    </button>
  )
}

interface MyDealMapLayerProps {
  /** When false, pins are hidden (toggle off). */
  enabled: boolean
  /** Optional z-index base for markers. */
  zIndexBase?: number
  /** Called when a pin is selected (so host maps can clear their own selection). */
  onPinSelect?: (pin: SavedPropertyMapPin | null) => void
}

/**
 * Renders My Deal Map pins inside an existing Google Map context
 * (`APIProvider` + `Map` from `@vis.gl/react-google-maps`).
 */
export function MyDealMapLayer({
  enabled,
  zIndexBase = 400,
  onPinSelect,
}: MyDealMapLayerProps) {
  const map = useMap()
  const { isAuthenticated } = useSession()
  const { data: pins = [], isLoading, isFetching } = useSavedPropertyMapPins(
    enabled && isAuthenticated,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { lat: number; lng: number }>>(
    {},
  )
  const geocodingRef = useRef<Set<string>>(new Set())
  const backfillRef = useRef<Set<string>>(new Set())

  // Geocode pins missing coordinates; persist when successful so next load is free.
  useEffect(() => {
    if (!enabled || !isAuthenticated || !map) return
    let cancelled = false

    const run = async () => {
      for (const pin of pins) {
        if (cancelled) return
        if (isFiniteCoord(pin.latitude, pin.longitude)) continue
        if (resolvedCoords[pin.id]) continue
        if (geocodingRef.current.has(pin.id)) continue

        const address = formatFullAddress(pin)
        if (!address || address.length < 5) continue

        geocodingRef.current.add(pin.id)
        const coords = await geocodeAddress(address)
        geocodingRef.current.delete(pin.id)
        if (!coords || cancelled) continue

        setResolvedCoords((prev) => ({ ...prev, [pin.id]: coords }))

        if (!backfillRef.current.has(pin.id)) {
          backfillRef.current.add(pin.id)
          api
            .patch(`/api/v1/properties/saved/${pin.id}`, {
              latitude: coords.lat,
              longitude: coords.lng,
            })
            .catch(() => {
              /* best-effort backfill */
            })
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [enabled, isAuthenticated, map, pins, resolvedCoords])

  const positionedPins = useMemo(() => {
    return pins
      .map((pin) => {
        const coords = isFiniteCoord(pin.latitude, pin.longitude)
          ? { lat: pin.latitude as number, lng: pin.longitude as number }
          : resolvedCoords[pin.id]
        if (!coords) return null
        return { pin, ...coords }
      })
      .filter((p): p is { pin: SavedPropertyMapPin; lat: number; lng: number } => p != null)
  }, [pins, resolvedCoords])

  const selected = useMemo(
    () => positionedPins.find((p) => p.pin.id === selectedId) ?? null,
    [positionedPins, selectedId],
  )

  const handleSelect = useCallback(
    (pin: SavedPropertyMapPin | null) => {
      setSelectedId(pin?.id ?? null)
      onPinSelect?.(pin)
    },
    [onPinSelect],
  )

  useEffect(() => {
    if (!enabled) {
      setSelectedId(null)
      onPinSelect?.(null)
    }
  }, [enabled, onPinSelect])

  if (!enabled || !isAuthenticated || !map) return null

  return (
    <>
      {positionedPins.map(({ pin, lat, lng }) => {
        const isSelected = pin.id === selectedId
        return (
          <AdvancedMarker
            key={pin.id}
            position={{ lat, lng }}
            zIndex={isSelected ? zIndexBase + 50 : zIndexBase}
            anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM}
            title={pin.nickname || pin.address_street}
            onClick={() => handleSelect(isSelected ? null : pin)}
          >
            <button
              type="button"
              className="p-0 bg-transparent border-none cursor-pointer"
              aria-label={`My Deal: ${pin.nickname || pin.address_street}`}
            >
              <MyDealHouseSparkleIcon size={isSelected ? 34 : 28} selected={isSelected} />
            </button>
          </AdvancedMarker>
        )
      })}

      {selected && (
        <AdvancedMarker
          position={{ lat: selected.lat, lng: selected.lng }}
          zIndex={zIndexBase + 100}
          anchorPoint={AdvancedMarkerAnchorPoint.TOP}
        >
          <div className="mt-2">
            <MyDealPinCard pin={selected.pin} onClose={() => handleSelect(null)} />
          </div>
        </AdvancedMarker>
      )}

      {/* Quiet loading affordance when first enabling with no pins yet */}
      {(isLoading || isFetching) && positionedPins.length === 0 && null}
    </>
  )
}
