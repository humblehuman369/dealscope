'use client'

import { ImageGallerySkeleton } from './ImageGallery'
import { PropertyHeaderSkeleton } from './PropertyHeader'
import { KeyFactsGridSkeleton } from './KeyFactsGrid'
import { PropertyDescriptionSkeleton } from './PropertyDescription'
import { PropertyFeaturesSkeleton } from './PropertyFeatures'
import { TaxHistorySkeleton } from './TaxHistory'
import { NearbySchoolsSkeleton } from './NearbySchools'
import { ListingInfoSkeleton } from './ListingInfo'
import { LocationMapSkeleton } from './LocationMap'
import { PriceHistorySkeleton } from './PriceHistory'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

/**
 * PropertyDetailsSkeleton
 * 
 * Full page loading skeleton for the property details page.
 * Matches the dark fintech theme of the live components.
 */
export function PropertyDetailsSkeleton() {
  return (
    <div
      className="min-h-screen pb-24 font-['Inter',sans-serif]"
      style={{ backgroundColor: colors.background.base }}
    >
      <style>{`.num { font-variant-numeric: tabular-nums; }`}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-3 w-24 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
          <div className="h-3 w-3 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
          <div className="h-3 w-40 rounded animate-pulse" style={{ backgroundColor: colors.background.cardUp }} />
        </div>

        {/* Full Width Image Gallery */}
        <ImageGallerySkeleton />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            <PropertyHeaderSkeleton />
            <KeyFactsGridSkeleton />
            <PropertyDescriptionSkeleton />
            <PropertyFeaturesSkeleton />
            <TaxHistorySkeleton />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            <NearbySchoolsSkeleton />
            <ListingInfoSkeleton />
            <LocationMapSkeleton />
            <PriceHistorySkeleton />
          </div>
        </div>
      </div>

      {/* Action Bar Skeleton */}
      <div
        className="fixed bottom-0 left-0 right-0 py-4 px-6 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(12,18,32,0.95)',
          borderTop: `1px solid ${colors.ui.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className={`h-12 rounded-full animate-pulse ${i === 2 ? 'w-40' : 'w-24'}`}
              style={{ backgroundColor: colors.background.cardUp }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PropertyDetailsSkeleton
