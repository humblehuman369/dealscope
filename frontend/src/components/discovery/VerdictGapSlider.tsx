'use client'

import { useLayoutEffect, useRef, useState } from 'react'

import { V1_NUM } from '@/components/workflow/v1-style'
import { formatMoneyExact } from '@/lib/verdictCopy'

export const GAP_LABEL_MIN_GAP_PX = 16

export type GapMarkerId = 'target' | 'income' | 'market'
export type GapLabelStack = 'above' | 'below'
export type GapLabelAlign = 'start' | 'center' | 'end'

export interface GapMarkerInput {
  listPrice: number
  incomeValue: number
  targetBuy: number
}

export interface PlacedGapMarker {
  id: GapMarkerId
  name: string
  price: number
  color: string
  pct: number
  stack: GapLabelStack
}

const MARKERS: {
  id: GapMarkerId
  name: string
  color: string
  priceKey: keyof GapMarkerInput
}[] = [
  { id: 'target', name: 'Target', color: 'var(--accent-sky)', priceKey: 'targetBuy' },
  { id: 'income', name: 'Income', color: 'var(--status-warning)', priceKey: 'incomeValue' },
  { id: 'market', name: 'Market', color: 'var(--status-negative)', priceKey: 'listPrice' },
]

export function gapLabelAlign(pct: number): GapLabelAlign {
  if (pct < 8) return 'start'
  if (pct > 92) return 'end'
  return 'center'
}

export function gapLabelRangePx(
  pct: number,
  width: number,
  trackWidth: number,
): { left: number; right: number } {
  const anchor = (pct / 100) * trackWidth
  const align = gapLabelAlign(pct)
  if (align === 'start') return { left: anchor, right: anchor + width }
  if (align === 'end') return { left: anchor - width, right: anchor }
  return { left: anchor - width / 2, right: anchor + width / 2 }
}

function rangesCloserThan(
  a: { left: number; right: number },
  b: { left: number; right: number },
  minGapPx: number,
): boolean {
  const gap = a.left <= b.left ? b.left - a.right : a.left - b.right
  return gap < minGapPx
}

/** Place the three prices on a min-to-max track. Stacking is a separate pixel pass. */
export function placeGapMarkers(input: GapMarkerInput): PlacedGapMarker[] {
  const raw: PlacedGapMarker[] = []
  for (const marker of MARKERS) {
    const price = input[marker.priceKey]
    if (!Number.isFinite(price) || price <= 0) continue
    raw.push({
      id: marker.id,
      name: marker.name,
      price,
      color: marker.color,
      pct: 0,
      stack: 'below',
    })
  }
  if (raw.length === 0) return []

  const prices = raw.map((marker) => marker.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min

  for (const marker of raw) {
    marker.pct = span === 0 ? 50 : ((marker.price - min) / span) * 100
  }
  return raw
}

/**
 * When two labels would overlap or sit closer than `minGapPx`, lift the
 * middle marker (by position) above the bar — the mockup treatment.
 */
export function stackGapLabelsByPixels(
  markers: PlacedGapMarker[],
  labelWidths: Partial<Record<GapMarkerId, number>>,
  trackWidth: number,
  minGapPx = GAP_LABEL_MIN_GAP_PX,
): PlacedGapMarker[] {
  const next = markers.map((marker) => ({ ...marker, stack: 'below' as GapLabelStack }))
  if (next.length < 2 || !(trackWidth > 0)) return next

  const sorted = [...next].sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name))
  const ranges = sorted.map((marker) => {
    const width = labelWidths[marker.id]
    if (!(width && width > 0)) return null
    return gapLabelRangePx(marker.pct, width, trackWidth)
  })

  let collide = false
  for (let i = 1; i < sorted.length; i++) {
    const prev = ranges[i - 1]
    const curr = ranges[i]
    if (prev && curr && rangesCloserThan(prev, curr, minGapPx)) {
      collide = true
      break
    }
  }
  if (!collide) return next

  const middle = sorted[Math.floor((sorted.length - 1) / 2)]
  const target = next.find((marker) => marker.id === middle.id)
  if (target) target.stack = 'above'
  return next
}

function labelTransform(pct: number): string {
  const align = gapLabelAlign(pct)
  if (align === 'start') return 'translateX(0%)'
  if (align === 'end') return 'translateX(-100%)'
  return 'translateX(-50%)'
}

function describeGap(markers: PlacedGapMarker[], dealGapDisplayPct: number): string {
  if (markers.length === 0) return 'Price scale unavailable.'
  const bits = markers
    .slice()
    .sort((a, b) => a.pct - b.pct)
    .map((marker) => `${marker.name} ${formatMoneyExact(marker.price)}`)
  const gap = `${dealGapDisplayPct >= 0 ? '+' : ''}${dealGapDisplayPct.toFixed(1)} percent`
  return `Gap bar. ${bits.join(', ')}. The deal gap is ${gap}.`
}

export function VerdictGapSlider({
  listPrice,
  incomeValue,
  targetBuy,
  dealGapDisplayPct,
}: GapMarkerInput & { dealGapDisplayPct: number }) {
  const placed = placeGapMarkers({ listPrice, incomeValue, targetBuy })
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<Partial<Record<GapMarkerId, HTMLElement | null>>>({})
  const [markers, setMarkers] = useState(placed)

  useLayoutEffect(() => {
    const nextPlaced = placeGapMarkers({ listPrice, incomeValue, targetBuy })
    const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0
    const widths: Partial<Record<GapMarkerId, number>> = {}
    for (const marker of nextPlaced) {
      const width = labelRefs.current[marker.id]?.getBoundingClientRect().width
      if (width && width > 0) widths[marker.id] = width
    }
    setMarkers(stackGapLabelsByPixels(nextPlaced, widths, trackWidth))
  }, [listPrice, incomeValue, targetBuy])

  if (markers.length === 0) return null

  return (
    <div className="relative mx-1 mt-1 mb-1" style={{ minHeight: 88 }}>
      <div
        ref={trackRef}
        className="relative mx-4"
        style={{ height: 10, marginTop: 36, marginBottom: 32 }}
        role="img"
        aria-label={describeGap(markers, dealGapDisplayPct)}
      >
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
          style={{
            height: 10,
            background:
              'linear-gradient(90deg, var(--accent-sky) 0%, var(--status-warning) 14%, var(--status-negative) 100%)',
          }}
        />
        {markers.map((marker) => (
          <span
            key={marker.id}
            className="absolute"
            style={{
              left: `${marker.pct}%`,
              top: '50%',
              width: 22,
              height: 22,
              marginTop: -11,
              marginLeft: -11,
              borderRadius: 999,
              background: marker.color,
              border: '3px solid var(--surface-card)',
            }}
          >
            <small
              ref={(node) => {
                labelRefs.current[marker.id] = node
              }}
              className="absolute left-1/2 whitespace-nowrap text-[13px] tabular-nums"
              style={{
                color: marker.color,
                ...V1_NUM,
                top: marker.stack === 'above' ? -28 : 26,
                transform: labelTransform(marker.pct),
              }}
            >
              {marker.name} {formatMoneyExact(marker.price)}
            </small>
          </span>
        ))}
      </div>
    </div>
  )
}
