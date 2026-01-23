'use client'

import React, { useState, useRef } from 'react'
import { Camera, ChevronLeft, ChevronRight, Heart, Share2 } from 'lucide-react'
import { ListingStatusBadge, ListingStatus, SellerType } from './ListingStatusBadge'

interface PropertyHeroProps {
  address: string
  location: string
  price: number
  priceLabel?: string
  specs: string
  photos?: string[]
  thumbnailUrl?: string
  photoCount?: number
  onSave?: () => void
  onShare?: () => void
  // Listing status props
  listingStatus?: ListingStatus
  isOffMarket?: boolean
  sellerType?: SellerType
  isForeclosure?: boolean
  isBankOwned?: boolean
  isAuction?: boolean
  isNewConstruction?: boolean
  daysOnMarket?: number
}

/**
 * PropertyHero - Immersive property showcase
 * 
 * Features:
 * - Large hero photo with swipe navigation
 * - Floating thumbnail strip
 * - Glass-morphism property info card
 * - Premium, world-class design
 */
export function PropertyHero({
  address,
  location,
  price,
  priceLabel = 'List Price',
  specs,
  photos = [],
  thumbnailUrl,
  photoCount,
  onSave,
  onShare,
  // Listing status props
  listingStatus,
  isOffMarket,
  sellerType,
  isForeclosure,
  isBankOwned,
  isAuction,
  isNewConstruction,
  daysOnMarket
}: PropertyHeroProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Build photo list
  const photoList = photos.length > 0 ? photos : (thumbnailUrl ? [thumbnailUrl] : [])
  const totalPhotos = photoCount || photoList.length
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(value)

  const scrollToPhoto = (index: number) => {
    if (scrollRef.current) {
      const scrollWidth = scrollRef.current.scrollWidth
      const photoWidth = scrollWidth / photoList.length
      scrollRef.current.scrollTo({
        left: photoWidth * index,
        behavior: 'smooth'
      })
      setActivePhotoIndex(index)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft
      const scrollWidth = scrollRef.current.scrollWidth
      const photoWidth = scrollWidth / photoList.length
      const newIndex = Math.round(scrollLeft / photoWidth)
      if (newIndex !== activePhotoIndex) {
        setActivePhotoIndex(newIndex)
      }
    }
  }

  return (
    <div className="property-hero">
      {/* Hero Photo Section */}
      <div className="property-hero-photos">
        {photoList.length > 0 ? (
          <>
            {/* Main Photo Carousel */}
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="property-hero-carousel"
            >
              {photoList.map((photo, idx) => (
                <div key={idx} className="property-hero-slide">
                  <img 
                    src={photo} 
                    alt={`Property photo ${idx + 1}`}
                    className="property-hero-image"
                  />
                </div>
              ))}
            </div>

            {/* Photo Counter Badge */}
            <div className="property-hero-counter">
              <Camera className="w-4 h-4" />
              <span>{activePhotoIndex + 1}/{totalPhotos}</span>
            </div>

            {/* Navigation Arrows (for desktop) */}
            {photoList.length > 1 && (
              <>
                <button 
                  className="property-hero-nav property-hero-nav-prev"
                  onClick={() => scrollToPhoto(Math.max(0, activePhotoIndex - 1))}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  className="property-hero-nav property-hero-nav-next"
                  onClick={() => scrollToPhoto(Math.min(photoList.length - 1, activePhotoIndex + 1))}
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {photoList.length > 1 && (
              <div className="property-hero-thumbs">
                {photoList.slice(0, 6).map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToPhoto(idx)}
                    className={`property-hero-thumb ${idx === activePhotoIndex ? 'active' : ''}`}
                    aria-label={`Go to photo ${idx + 1}`}
                  >
                    <img src={photo} alt="" />
                  </button>
                ))}
                {photoList.length > 6 && (
                  <div className="property-hero-thumb-more">
                    +{photoList.length - 6}
                  </div>
                )}
              </div>
            )}

            {/* Dot Indicators (mobile) */}
            {photoList.length > 1 && (
              <div className="property-hero-dots">
                {photoList.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToPhoto(idx)}
                    className={`property-hero-dot ${idx === activePhotoIndex ? 'active' : ''}`}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
                {photoList.length > 5 && (
                  <span className="property-hero-dot-more">+{photoList.length - 5}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="property-hero-placeholder">
            <Camera className="w-16 h-16 text-white/20" />
          </div>
        )}
      </div>

      {/* Glass Card with Property Info */}
      <div className="property-hero-card">
        <div className="property-hero-card-content">
          {/* Left: Address & Specs */}
          <div className="property-hero-info">
            {/* Listing Status Badge */}
            <ListingStatusBadge
              listingStatus={listingStatus}
              isOffMarket={isOffMarket}
              sellerType={sellerType}
              isForeclosure={isForeclosure}
              isBankOwned={isBankOwned}
              isAuction={isAuction}
              isNewConstruction={isNewConstruction}
              daysOnMarket={daysOnMarket}
              className="mb-2"
            />
            <h1 className="property-hero-address">{address}</h1>
            <p className="property-hero-location">{location}</p>
            <p className="property-hero-specs">{specs}</p>
          </div>
          
          {/* Right: Price & Actions */}
          <div className="property-hero-price-section">
            <div className="property-hero-price">{formatCurrency(price)}</div>
            <div className="property-hero-price-label">{priceLabel}</div>
            
            {/* Action Buttons */}
            <div className="property-hero-actions">
              {onSave && (
                <button onClick={onSave} className="property-hero-action" aria-label="Save property">
                  <Heart className="w-4 h-4" />
                </button>
              )}
              {onShare && (
                <button onClick={onShare} className="property-hero-action" aria-label="Share property">
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PropertyHero
