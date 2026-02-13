'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import {
  PropertyData,
  ImageGallery,
  PropertyHeader,
  KeyFactsGrid,
  PropertyDescription,
  PropertyFeatures,
  PriceHistory,
  TaxHistory,
  NearbySchools,
  ListingInfo,
  LocationMap,
} from './index'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface PropertyDetailsClientProps {
  property: PropertyData
  /** Optional initial strategy to highlight or auto-navigate to */
  initialStrategy?: string
}

/**
 * PropertyDetailsClient Component
 * 
 * Client component wrapper for property details with interactive features
 * like saving, sharing, and navigation to analysis.
 * 
 * Dark fintech theme — true black base, deep navy cards, four-tier Slate text hierarchy.
 */
export function PropertyDetailsClient({ property, initialStrategy }: PropertyDetailsClientProps) {
  const router = useRouter()
  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  return (
    <div
      className="min-h-screen pb-8 font-['Inter',sans-serif]"
      style={{ backgroundColor: colors.background.base }}
    >
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Button and Breadcrumb */}
        <nav className="flex items-center gap-3 mb-6" aria-label="Breadcrumb">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: colors.text.secondary }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: colors.brand.blue }}
          >
            Property Details
          </span>
          <ChevronRight size={12} style={{ color: colors.text.tertiary }} />
          <span
            className="text-[10px] uppercase tracking-wide truncate max-w-[200px] sm:max-w-none"
            style={{ color: colors.text.tertiary }}
          >
            {property.address.streetAddress}
          </span>
        </nav>

        {/* Full Width Image Gallery */}
        <ImageGallery 
          images={property.images} 
          totalPhotos={property.totalPhotos || property.images.length} 
          views={property.views}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8 space-y-6">
            <PropertyHeader property={property} />
            <KeyFactsGrid property={property} />
            
            {property.description && (
              <PropertyDescription description={property.description} />
            )}
            
            <PropertyFeatures
              interiorFeatures={property.interiorFeatures || []}
              exteriorFeatures={property.exteriorFeatures || []}
              appliances={property.appliances || []}
              construction={property.construction || []}
              roof={property.roof}
              foundation={property.foundation}
              isWaterfront={property.isWaterfront}
              waterfrontFeatures={property.waterfrontFeatures}
            />
            
            {property.taxHistory && property.taxHistory.length > 0 && (
              <TaxHistory history={property.taxHistory} />
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {property.schools && property.schools.length > 0 && (
              <NearbySchools schools={property.schools} />
            )}
            
            <ListingInfo property={property} />
            
            <LocationMap 
              latitude={property.latitude}
              longitude={property.longitude}
              address={fullAddress}
            />
            
            {property.priceHistory && property.priceHistory.length > 0 && (
              <PriceHistory history={property.priceHistory} />
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
