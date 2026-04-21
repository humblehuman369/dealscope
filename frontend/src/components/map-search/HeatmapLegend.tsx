'use client'

import React from 'react'

const METRIC_LABELS: Record<string, string> = {
  AirbnbCoc: 'Airbnb CoC Return',
  TraditionalCoc: 'Traditional CoC',
  OccupancyRate: 'Occupancy Rate',
  AirbnbRental: 'Airbnb Rental Income',
  TraditionalRental: 'Traditional Rental',
  listingPrice: 'Listing Price',
}

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
}

export function HeatmapLegend({ isActive, metricType }: HeatmapLegendProps) {
  if (!isActive) return null

  return (
    <div
      className="absolute bottom-20 right-4 z-10 w-56 rounded-xl shadow-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {METRIC_LABELS[metricType] ?? metricType}
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1">
          {COLOR_SCALE.map((item) => (
            <div key={item.color} className="flex-1 text-center">
              <div className="h-3 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] mt-0.5 block" style={{ color: 'var(--text-secondary)' }}>
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
