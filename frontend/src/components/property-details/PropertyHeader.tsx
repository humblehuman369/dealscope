'use client'

import { useMemo } from 'react'
import { Bed, Bath, Square, Calendar, Clock } from 'lucide-react'
import { PropertyData } from './types'
import { formatCurrency, formatNumber } from './utils'
import { getPriceLabel } from '@/lib/priceUtils'

interface PropertyHeaderProps {
  property: PropertyData
}

/**
 * PropertyHeader Component
 * 
 * Displays the main property information including address,
 * price, and key stats (beds, baths, sqft, year built).
 * Dark fintech theme with radial gradient hero depth.
 */
export function PropertyHeader({ property }: PropertyHeaderProps) {
  const priceLabel = useMemo(() => getPriceLabel(property.isOffMarket, property.listingStatus), [property.isOffMarket, property.listingStatus])
  return (
    <div
      className="rounded-[14px] p-5 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-base)',
        border: `1px solid var(--border-subtle)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Subtle radial gradient for hero depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 70% 0%, var(--color-sky-dim) 0%, transparent 60%)' }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-heading)' }}>
            {property.address.streetAddress}, {property.address.city}, {property.address.state} {property.address.zipcode}
          </h1>
          {property.address.neighborhood && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {property.address.neighborhood} · {property.address.county}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--accent-sky)' }}>
            {formatCurrency(property.price)}
          </div>
          <div
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-label)' }}
          >
            {priceLabel}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div
        className="relative flex flex-wrap items-center gap-4 sm:gap-6 py-3"
        style={{ borderTop: `1px solid var(--border-subtle)` }}
      >
        <div className="flex items-center gap-2">
          <Bed size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-heading)' }}>{property.bedrooms}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>beds</span>
        </div>
        <div className="flex items-center gap-2">
          <Bath size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-heading)' }}>{property.bathrooms}</span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>baths</span>
        </div>
        <div className="flex items-center gap-2">
          <Square size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-heading)' }}>
            {formatNumber(property.livingArea)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>sqft</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-heading)' }}>
            {property.yearBuilt}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>built</span>
        </div>
        {property.daysOnZillow !== undefined && (
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-sky-dim)' }}
          >
            <Clock size={14} style={{ color: 'var(--accent-sky)' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--accent-sky)' }}>
              {property.daysOnZillow} days on market
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PropertyHeaderSkeleton
 * Loading state for the property header
 */
export function PropertyHeaderSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-7 w-3/4 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          <div className="h-4 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
        </div>
        <div className="text-left sm:text-right">
          <div className="h-7 w-32 rounded animate-pulse mb-1" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3" style={{ borderTop: `1px solid var(--border-subtle)` }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--surface-elevated)' }} />
        ))}
      </div>
    </div>
  )
}
