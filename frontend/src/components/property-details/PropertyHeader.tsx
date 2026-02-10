'use client'

import { useMemo } from 'react'
import { Bed, Bath, Square, Calendar, Clock } from 'lucide-react'
import { PropertyData } from './types'
import { formatCurrency, formatNumber } from './utils'
import { getPriceLabel } from '@/lib/priceUtils'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

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
        backgroundColor: colors.background.card,
        border: `1px solid ${colors.ui.border}`,
        boxShadow: colors.shadow.card,
      }}
    >
      {/* Subtle radial gradient for hero depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 70% 0%, rgba(56,189,248,0.04) 0%, transparent 60%)' }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: colors.text.primary }}>
            {property.address.streetAddress}, {property.address.city}, {property.address.state} {property.address.zipcode}
          </h1>
          {property.address.neighborhood && (
            <p className="text-xs mt-1" style={{ color: colors.text.tertiary }}>
              {property.address.neighborhood} · {property.address.county}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-bold tabular-nums" style={{ color: colors.brand.blue }}>
            {formatCurrency(property.price)}
          </div>
          <div
            className="text-[10px] font-bold uppercase tracking-[0.08em]"
            style={{ color: colors.text.tertiary }}
          >
            {priceLabel}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div
        className="relative flex flex-wrap items-center gap-4 sm:gap-6 py-3"
        style={{ borderTop: `1px solid ${colors.ui.border}` }}
      >
        <div className="flex items-center gap-2">
          <Bed size={18} style={{ color: colors.text.tertiary }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{property.bedrooms}</span>
          <span className="text-xs" style={{ color: colors.text.secondary }}>beds</span>
        </div>
        <div className="flex items-center gap-2">
          <Bath size={18} style={{ color: colors.text.tertiary }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{property.bathrooms}</span>
          <span className="text-xs" style={{ color: colors.text.secondary }}>baths</span>
        </div>
        <div className="flex items-center gap-2">
          <Square size={18} style={{ color: colors.text.tertiary }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>
            {formatNumber(property.livingArea)}
          </span>
          <span className="text-xs" style={{ color: colors.text.secondary }}>sqft</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: colors.text.tertiary }} />
          <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>
            {property.yearBuilt}
          </span>
          <span className="text-xs" style={{ color: colors.text.secondary }}>built</span>
        </div>
        {property.daysOnZillow !== undefined && (
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: colors.accentBg.blue }}
          >
            <Clock size={14} style={{ color: colors.brand.blue }} />
            <span className="text-xs font-semibold" style={{ color: colors.brand.blue }}>
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
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-7 w-3/4 rounded animate-pulse mb-2" style={{ backgroundColor: colors.background.cardUp }} />
          <div className="h-4 w-1/2 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        </div>
        <div className="text-left sm:text-right">
          <div className="h-7 w-32 rounded animate-pulse mb-1" style={{ backgroundColor: colors.background.cardUp }} />
          <div className="h-3 w-16 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3" style={{ borderTop: `1px solid ${colors.ui.border}` }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-20 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        ))}
      </div>
    </div>
  )
}
