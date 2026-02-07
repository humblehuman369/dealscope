'use client'

import React, { useState } from 'react'
import { ChevronRight, ChevronLeft, Camera, Home } from 'lucide-react'
import { ListingStatusBadgeCompact } from '../ListingStatusBadge'
import { formatCurrency } from '@/utils/formatters'

// Listing status types
type ListingStatus = 'FOR_SALE' | 'FOR_RENT' | 'OFF_MARKET' | 'SOLD' | 'PENDING' | 'OTHER'
type SellerType = 'Agent' | 'FSBO' | 'Foreclosure' | 'BankOwned' | 'Auction' | 'NewConstruction' | 'Unknown'

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
  // Listing status props
  listingStatus?: ListingStatus
  isOffMarket?: boolean
  sellerType?: SellerType
  isForeclosure?: boolean
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
  showExpandButton = true,
  // Listing status props
  listingStatus,
  isOffMarket,
  sellerType,
  isForeclosure
}: DesktopPropertyMiniCardProps) {
  const photoList = photos.length > 0 ? photos : (thumbnailUrl ? [thumbnailUrl] : [])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const totalPhotos = photoCount || photoList.length

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === 0 ? photoList.length - 1 : prev - 1))
  }

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPhotoIndex((prev) => (prev === photoList.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="desktop-property-card">
      {/* Full-Width Photo Carousel */}
      <div className="desktop-photo-carousel group">
        {photoList.length > 0 ? (
          <>
            {/* Main Photo */}
            <div className="desktop-photo-main">
              <img 
                src={photoList[currentPhotoIndex]} 
                alt={`Property photo ${currentPhotoIndex + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Photo Counter Badge */}
              <div className="desktop-photo-counter">
                <Camera className="w-3 h-3" />
                <span>{currentPhotoIndex + 1}/{totalPhotos}</span>
              </div>

              {/* Navigation Arrows */}
              {photoList.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="desktop-photo-nav desktop-photo-nav-left"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="desktop-photo-nav desktop-photo-nav-right"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {photoList.length > 1 && (
              <div className="desktop-photo-thumbnails">
                {photoList.slice(0, 6).map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(idx); }}
                    className={`desktop-thumb-item ${idx === currentPhotoIndex ? 'active' : ''}`}
                  >
                    <img src={photo} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                {photoList.length > 6 && (
                  <div className="desktop-thumb-more">+{photoList.length - 6}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="desktop-photo-placeholder">
            <Home className="w-12 h-12 text-white/20" />
            <span className="text-white/30 text-sm mt-2">No photos available</span>
          </div>
        )}
      </div>

      {/* Property Info Bar */}
      <div className="desktop-property-info-bar">
        <div className="desktop-property-details">
          {/* Listing Status Badge */}
          <ListingStatusBadgeCompact
            listingStatus={listingStatus}
            isOffMarket={isOffMarket}
            sellerType={sellerType}
            isForeclosure={isForeclosure}
            className="mb-1"
          />
          <h2 className="desktop-property-mini-address">{address}</h2>
          <p className="desktop-property-mini-location">{location}</p>
          <p className="desktop-property-mini-specs">{specs}</p>
        </div>
        
        <div className="desktop-property-price-block">
          <span className="desktop-property-mini-price">{formatCurrency(price)}</span>
          <span className="desktop-property-mini-price-label">{priceLabel}</span>
        </div>

        {/* Expand Button */}
        {showExpandButton && onExpand && (
          <button
            onClick={onExpand}
            className="desktop-expand-btn"
            aria-label="View more"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default DesktopPropertyMiniCard
