'use client'

import React from 'react'
import { Camera, ChevronRight } from 'lucide-react'
import { PropertyMiniData } from './types'

/**
 * PropertyMiniCard Component
 * 
 * A compact property card showing address, price, and specs.
 * Used in the analytics header to remind users which property they're analyzing.
 * 
 * Features:
 * - Photo carousel with navigation arrows
 * - Photo count badge
 * - Address and location
 * - Price with label
 * - Specs (beds, baths, sqft)
 * - Expandable for more details
 * - Light/Dark theme support
 */

interface PropertyMiniCardProps {
  data: PropertyMiniData
  photos?: string[]
  onExpand?: () => void
  showExpandButton?: boolean
}

export function PropertyMiniCard({ 
  data, 
  photos = [],
  onExpand,
  showExpandButton = true 
}: PropertyMiniCardProps) {
  // Use provided photos array or create one from thumbnail
  const photoList = photos.length > 0 ? photos : (data.thumbnailUrl ? [data.thumbnailUrl] : [])
  const totalPhotos = data.photoCount || photoList.length

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  return (
    <div className="mb-4">
      {/* Full-Width Horizontal Scrolling Photo Carousel */}
      {photoList.length > 0 && (
        <div className="-mx-4">
          {/* Scrolling Container */}
          <div 
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-4 pb-3"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {photoList.map((photo, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 snap-start"
                style={{ 
                  width: 'clamp(200px, 65vw, 320px)',
                  minWidth: '200px'
                }}
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-300 dark:bg-navy-700">
                  <img 
                    src={photo} 
                    alt={`Property photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Photo Counter Badge - only on first photo */}
                  {idx === 0 && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-sm">
                      <Camera className="w-3.5 h-3.5" />
                      1/{totalPhotos}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* End spacer for proper scroll padding */}
            <div className="flex-shrink-0 w-2" />
          </div>
        </div>
      )}

      {/* Placeholder when no photos */}
      {photoList.length === 0 && (
        <div className="w-full aspect-[4/3] bg-neutral-200 dark:bg-white/[0.05] flex items-center justify-center rounded-xl mx-0">
          <Camera className="w-12 h-12 text-neutral-400 dark:text-white/20" />
        </div>
      )}

      {/* Property Info - Below Photos */}
      <div className="bg-neutral-100 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.06] rounded-2xl p-4 mt-3 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-navy-900 dark:text-white leading-tight">
              {data.address}
            </div>
            <div className="text-sm text-neutral-500 dark:text-white/50 mb-2">
              {data.location}
            </div>
            <div className="text-sm text-neutral-500 dark:text-white/50">
              {data.specs}
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-brand-500 dark:text-teal">
                {formatCurrency(data.price)}
              </span>
            </div>
            <span className="text-xs text-neutral-400 dark:text-white/40 uppercase">
              {data.priceLabel}
            </span>
            
            {/* Save Button */}
            {showExpandButton && onExpand && (
              <button
                onClick={onExpand}
                className="mt-2 px-3 py-1.5 bg-neutral-200 dark:bg-white/[0.05] border border-neutral-300 dark:border-white/10 rounded-lg flex items-center gap-1.5 hover:bg-neutral-300 dark:hover:bg-white/[0.1] transition-colors text-sm text-neutral-600 dark:text-white/70"
              >
                <span>⊡</span> Save
              </button>
            )}
          </div>
        </div>
      </div>
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
    <div className="flex items-center justify-between bg-neutral-100 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06] rounded-xl px-3 py-2 mb-3 transition-colors">
      <div>
        <div className="text-[0.75rem] font-semibold text-navy-900 dark:text-white truncate max-w-[180px]">
          {address}
        </div>
        <div className="text-[0.6rem] text-neutral-500 dark:text-white/50">{specs}</div>
      </div>
      <div className="text-[0.85rem] font-bold text-brand-500 dark:text-teal">
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
    <div className="sticky top-0 z-50 bg-white/95 dark:bg-navy-800/95 backdrop-blur border-b border-neutral-200 dark:border-white/[0.06] px-4 py-2 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-500 dark:text-white/60 hover:text-navy-900 dark:hover:text-white"
          >
            ←
          </button>
          <div>
            <div className="text-[0.72rem] font-semibold text-navy-900 dark:text-white truncate max-w-[160px]">
              {address}
            </div>
            {strategy && (
              <div className="text-[0.6rem] text-brand-500 dark:text-teal">{strategy}</div>
            )}
          </div>
        </div>
        <div className="text-[0.85rem] font-bold text-brand-500 dark:text-teal">
          {formatCurrency(price)}
        </div>
      </div>
    </div>
  )
}

export default PropertyMiniCard
