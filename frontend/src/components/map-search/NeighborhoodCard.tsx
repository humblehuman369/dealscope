'use client'

import React from 'react'
import { X, TrendingUp, MapPin, Star, Home, BarChart3 } from 'lucide-react'
import type { NeighborhoodOverview } from '@/lib/api'

interface NeighborhoodCardProps {
  neighborhood: NeighborhoodOverview
  onClose: () => void
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return n >= 1000
    ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`
    : `$${n.toFixed(0)}`
}

function MetricRow({ label, value, suffix }: { label: string; value?: number | null; suffix?: string }) {
  if (value == null) return null
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
        {typeof value === 'number' && suffix === '%' ? `${value.toFixed(1)}%` : fmt(value)}
        {suffix && suffix !== '%' ? ` ${suffix}` : ''}
      </span>
    </div>
  )
}

export function NeighborhoodCard({ neighborhood: n, onClose }: NeighborhoodCardProps) {
  const strategy = n.recommended_strategy
  const strategyLabel = strategy === 'airbnb' ? 'Airbnb' : strategy === 'traditional' ? 'Traditional' : strategy || '—'

  return (
    <div
      className="absolute bottom-4 right-4 z-20 w-80 rounded-xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={14} style={{ color: 'var(--accent-sky)' }} className="shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>
              {n.name || 'Neighborhood'}
            </h3>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {n.city}, {n.state}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:opacity-70 shrink-0">
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Top row: MashMeter + Strategy */}
        <div className="flex gap-2">
          {n.mashmeter != null && (
            <div
              className="flex-1 rounded-lg p-2 text-center"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <div className="flex items-center justify-center gap-1">
                <Star size={12} className="text-yellow-500" />
                <span className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
                  {n.mashmeter}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>MashMeter</span>
            </div>
          )}
          <div
            className="flex-1 rounded-lg p-2 text-center"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <div className="flex items-center justify-center gap-1">
              <Home size={12} style={{ color: 'var(--accent-sky)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                {strategyLabel}
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Best Strategy</span>
          </div>
        </div>

        {/* Scores row */}
        {(n.walkscore != null || n.transitscore != null || n.bikescore != null) && (
          <div className="flex gap-2">
            {[
              { label: 'Walk', value: n.walkscore },
              { label: 'Transit', value: n.transitscore },
              { label: 'Bike', value: n.bikescore },
            ]
              .filter((s) => s.value != null)
              .map((s) => (
                <div
                  key={s.label}
                  className="flex-1 rounded-lg py-1 text-center"
                  style={{ backgroundColor: 'var(--surface-elevated)' }}
                >
                  <span className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>{s.value}</span>
                  <span className="text-[9px] block" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
          </div>
        )}

        {/* Investment metrics */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1 mb-1">
            <BarChart3 size={12} style={{ color: 'var(--accent-sky)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Investment Metrics
            </span>
          </div>
          <MetricRow label="Median Price" value={n.median_price} />
          <MetricRow label="Price / sqft" value={n.price_per_sqft} />
          <MetricRow label="Airbnb Cap Rate" value={n.airbnb_cap_rate} suffix="%" />
          <MetricRow label="Traditional Cap Rate" value={n.traditional_cap_rate} suffix="%" />
          <MetricRow label="Airbnb Income" value={n.airbnb_rental_income} suffix="/mo" />
          <MetricRow label="Avg Occupancy" value={n.avg_occupancy} suffix="%" />
          <MetricRow label="Avg DOM" value={n.avg_days_on_market} suffix="days" />
          <MetricRow label="Properties" value={n.num_of_properties} />
          <MetricRow label="Airbnb Properties" value={n.num_of_airbnb_properties} />
        </div>

        {/* Sold trends */}
        {(n.sold_last_month != null || n.sold_last_year != null) && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp size={12} style={{ color: 'var(--accent-sky)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Sales Activity
              </span>
            </div>
            <MetricRow label="Sold (last month)" value={n.sold_last_month} />
            <MetricRow label="Sold (last year)" value={n.sold_last_year} />
            <MetricRow label="Avg Sale Price (1yr)" value={n.sale_price_trend_1yr} />
          </div>
        )}
      </div>
    </div>
  )
}

export default NeighborhoodCard
