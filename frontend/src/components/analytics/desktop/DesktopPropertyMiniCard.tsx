'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Camera, Home } from 'lucide-react'

/**
 * DesktopPropertyMiniCard Component
 * 
 * Enhanced desktop version of the property mini card with larger
 * photo area, better spacing, and improved visual hierarchy.
 */

interface DesktopPropertyMiniCardProps {
  address: string
  location: string
  price: number
  priceLabel?: string
  specs: string
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
  onExpand?: () => void
  showExpandButton?: boolean
}

export function DesktopPropertyMiniCard({
  address,
  location,
  price,
  priceLabel = 'List Price',
  specs,
  thumbnailUrl,
  photos = [],
  photoCount,
  onExpand,
  showExpandButton = true
}: DesktopPropertyMiniCardProps) {
  const photoList = photos.length > 0 ? photos : (thumbnailUrl ? [thumbnailUrl] : [])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const totalPhotos = photoCount || photoList.length

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
    <div className="desktop-property-mini">
      {/* Property Info */}
      <div className="desktop-property-mini-info">
        <h2 className="desktop-property-mini-address">{address}</h2>
        <p className="desktop-property-mini-location">{location}</p>
        
        <div className="desktop-property-mini-price-row">
          <span className="desktop-property-mini-price">{formatCurrency(price)}</span>
          <span className="desktop-property-mini-price-label">{priceLabel}</span>
        </div>
        
        <p className="desktop-property-mini-specs">{specs}</p>
      </div>

      {/* Photo Thumbnail */}
      <div className="desktop-property-thumb group">
        {photoList.length > 0 ? (
          <>
            <img 
              src={photoList[currentPhotoIndex]} 
              alt={`Property photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Photo Counter */}
            <div className="thumb-count">
              <Camera className="w-2.5 h-2.5 inline mr-1" />
              {currentPhotoIndex + 1}/{totalPhotos}
            </div>

            {/* Navigation Arrows */}
            {photoList.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </button>
              </>
            )}
          </>
        ) : (
          <div className="property-thumb-placeholder">
            <Home className="w-8 h-8 text-white/20" />
          </div>
        )}
      </div>

      {/* Expand Button */}
      {showExpandButton && onExpand && (
        <button
          onClick={onExpand}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-white/10 hover:border-teal/30 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>
      )}
    </div>
  )
}

export default DesktopPropertyMiniCard
