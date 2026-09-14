'use client'

import { formatMoneyExact } from '@/lib/verdictCopy'

export const GAP_LABEL_CLOSE_PCT = 14

export type GapMarkerId = 'target' | 'income' | 'market'
export type GapLabelStack = 'above' | 'below'

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
  { id: 'target', name: 'Target', color: 'var(--status-positive)', priceKey: 'targetBuy' },
  { id: 'income', name: 'Income', color: 'var(--status-income-value)', priceKey: 'incomeValue' },
  { id: 'market', name: 'Market', color: 'var(--status-negative)', priceKey: 'listPrice' },
]

/** Place the three prices on a min-to-max track. Close labels stack above the bar. */
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

  const sorted = [...raw].sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name))
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].pct - sorted[i - 1].pct) < GAP_LABEL_CLOSE_PCT) {
      sorted[i].stack = sorted[i - 1].stack === 'below' ? 'above' : 'below'
    }
  }
  return raw
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
  const markers = placeGapMarkers({ listPrice, incomeValue, targetBuy })
  if (markers.length === 0) return null

  return (
    <div className="relative mx-1 mt-1 mb-1" style={{ minHeight: 88 }}>
      <div
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
              'linear-gradient(90deg, var(--status-positive) 0%, var(--status-income-value) 14%, var(--status-negative) 100%)',
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
              className="absolute left-1/2 whitespace-nowrap text-[13px] tabular-nums"
              style={{
                color: 'var(--text-secondary)',
                fontVariantNumeric: 'tabular-nums',
                top: marker.stack === 'above' ? -28 : 26,
                transform:
                  marker.pct < 8
                    ? 'translateX(0%)'
                    : marker.pct > 92
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
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
