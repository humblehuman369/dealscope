'use client'

import React from 'react'
import { Map, X } from 'lucide-react'

const METRIC_OPTIONS = [
  { value: 'AirbnbCoc', label: 'Airbnb CoC Return' },
  { value: 'TraditionalCoc', label: 'Traditional CoC' },
  { value: 'OccupancyRate', label: 'Occupancy Rate' },
  { value: 'AirbnbRental', label: 'Airbnb Rental Income' },
  { value: 'TraditionalRental', label: 'Traditional Rental' },
  { value: 'listingPrice', label: 'Listing Price' },
]

const COLOR_SCALE = [
  { color: '#2D6A4F', label: 'Highest' },
  { color: '#52B788', label: 'High' },
  { color: '#95D5B2', label: 'Above avg' },
  { color: '#F7B5A7', label: 'Below avg' },
  { color: '#F06B50', label: 'Low' },
  { color: '#D62828', label: 'Lowest' },
]

interface HeatmapLegendProps {
  isActive: boolean
  metricType: string
  onToggle: () => void
  onMetricChange: (metric: string) => void
}

export function HeatmapLegend({
  isActive,
  metricType,
  onToggle,
  onMetricChange,
}: HeatmapLegendProps) {
  if (!isActive) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-20 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors"
        style={{
          backgroundColor: 'var(--surface-card)',
          color: 'var(--text-body)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Map size={14} />
        Heatmap
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-20 right-4 z-10 w-56 rounded-xl shadow-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-1.5">
          <Map size={14} style={{ color: 'var(--accent-sky)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
            Investment Heatmap
          </span>
        </div>
        <button onClick={onToggle} className="p-0.5 rounded hover:opacity-70">
          <X size={14} style={{ color: 'var(--text-secondary)' }} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <select
          value={metricType}
          onChange={(e) => onMetricChange(e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg text-xs"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-body)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {COLOR_SCALE.map((item) => (
            <div key={item.color} className="flex-1 text-center">
              <div
                className="h-3 rounded-sm"
                style={{ backgroundColor: `#${item.color.replace('#', '')}` }}
              />
              <span className="text-[9px] mt-0.5 block" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeatmapLegend
