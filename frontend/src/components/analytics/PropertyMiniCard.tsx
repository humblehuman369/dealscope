'use client'

import React, { useState } from 'react'
import { ChevronDown, Camera, ChevronRight, ChevronLeft } from 'lucide-react'
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const totalPhotos = data.photoCount || photoList.length

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === 0 ? photoList.length - 1 : prev - 1))
  }

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === photoList.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="mb-4">
      {/* Full-Width Photo Carousel - First Section */}
      {photoList.length > 0 && (
        <div className="relative group -mx-4">
          {/* Large Photo Container */}
          <div className="w-full aspect-[16/10] bg-neutral-300 dark:bg-navy-700 relative overflow-hidden">
            <img 
              src={photoList[currentPhotoIndex]} 
              alt={`Property photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-200"
            />
            
            {/* Photo Counter Badge */}
            <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-sm">
              <Camera className="w-3.5 h-3.5" />
              {currentPhotoIndex + 1}/{totalPhotos}
            </div>

            {/* Navigation Arrows */}
            {photoList.length > 1 && (
              <>
                {/* Left Arrow */}
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* Dot Indicators */}
            {photoList.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photoList.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentPhotoIndex(idx)
                    }}
                    aria-label={`Go to photo ${idx + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentPhotoIndex 
                        ? 'bg-white w-4' 
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
                {photoList.length > 8 && (
                  <span className="text-white/70 text-xs ml-1">+{photoList.length - 8}</span>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {photoList.length > 1 && (
            <div className="flex gap-1 mt-1 px-0 overflow-x-auto scrollbar-hide">
              {photoList.slice(0, 6).map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPhotoIndex(idx)}
                  aria-label={`View photo ${idx + 1}`}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all ${
                    idx === currentPhotoIndex 
                      ? 'ring-2 ring-[#4dd0e1] opacity-100' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={photo} 
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Placeholder when no photos */}
      {photoList.length === 0 && (
        <div className="w-full aspect-[16/10] bg-neutral-200 dark:bg-white/[0.05] flex items-center justify-center -mx-4">
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
