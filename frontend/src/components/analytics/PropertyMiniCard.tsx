'use client'

import React from 'react'
import { ChevronDown, Camera, ChevronRight } from 'lucide-react'
import { PropertyMiniData } from './types'

/**
 * PropertyMiniCard Component
 * 
 * A compact property card showing address, price, and specs.
 * Used in the analytics header to remind users which property they're analyzing.
 * 
 * Features:
 * - Property thumbnail (optional)
 * - Photo count badge
 * - Address and location
 * - Price with label
 * - Specs (beds, baths, sqft)
 * - Expandable for more details
 */

interface PropertyMiniCardProps {
  data: PropertyMiniData
  onExpand?: () => void
  showExpandButton?: boolean
}

export function PropertyMiniCard({ 
  data, 
  onExpand,
  showExpandButton = true 
}: PropertyMiniCardProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 flex gap-3 mb-4">
      {/* Thumbnail */}
      {data.thumbnailUrl && (
        <div className="w-20 h-20 rounded-xl bg-navy-700 relative overflow-hidden flex-shrink-0">
          <img 
            src={data.thumbnailUrl} 
            alt="Property" 
            className="w-full h-full object-cover"
          />
          {data.photoCount && (
            <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[0.55rem] px-1.5 py-0.5 rounded flex items-center gap-1">
              <Camera className="w-2.5 h-2.5" />
              {data.photoCount}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[0.85rem] font-bold text-white leading-tight truncate">
          {data.address}
        </div>
        <div className="text-[0.72rem] text-white/50 mb-2 truncate">
          {data.location}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[1rem] font-bold text-teal">
            {formatCurrency(data.price)}
          </span>
          <span className="text-[0.6rem] text-white/40 uppercase">
            {data.priceLabel}
          </span>
        </div>
        <div className="text-[0.68rem] text-white/50 mt-1">
          {data.specs}
        </div>
      </div>

      {/* Expand Button */}
      {showExpandButton && onExpand && (
        <button
          onClick={onExpand}
          className="flex-shrink-0 self-center w-7 h-7 bg-white/[0.05] border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/[0.1] transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-white/60" />
        </button>
      )}
    </div>
  )
}

/**
 * PropertyMiniCardCompact Component
 * 
 * Even more compact version for tight spaces.
 */

interface PropertyMiniCardCompactProps {
  address: string
  price: number
  specs: string
}

export function PropertyMiniCardCompact({ address, price, specs }: PropertyMiniCardCompactProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2 mb-3">
      <div>
        <div className="text-[0.75rem] font-semibold text-white truncate max-w-[180px]">
          {address}
        </div>
        <div className="text-[0.6rem] text-white/50">{specs}</div>
      </div>
      <div className="text-[0.85rem] font-bold text-teal">
        {formatCurrency(price)}
      </div>
    </div>
  )
}

/**
 * PropertyStickyHeader Component
 * 
 * A sticky header version that appears when scrolling.
 */

interface PropertyStickyHeaderProps {
  address: string
  price: number
  strategy?: string
  onBack: () => void
}

export function PropertyStickyHeader({ address, price, strategy, onBack }: PropertyStickyHeaderProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="sticky top-0 z-50 bg-navy-800/95 backdrop-blur border-b border-white/[0.06] px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
          >
            ←
          </button>
          <div>
            <div className="text-[0.72rem] font-semibold text-white truncate max-w-[160px]">
              {address}
            </div>
            {strategy && (
              <div className="text-[0.6rem] text-teal">{strategy}</div>
            )}
          </div>
        </div>
        <div className="text-[0.85rem] font-bold text-teal">
          {formatCurrency(price)}
        </div>
      </div>
    </div>
  )
}

export default PropertyMiniCard
