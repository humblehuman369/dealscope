'use client'

import { useState } from 'react'
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
import { FileText, Share2, Search } from 'lucide-react'
import Link from 'next/link'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
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
  const [showSearchModal, setShowSearchModal] = useState(false)

  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  const [shareMessage, setShareMessage] = useState<string | null>(null)

  // Handle share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${property.address.streetAddress} - InvestIQ`,
          text: `Check out this property: ${fullAddress}`,
          url: window.location.href
        })
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      setShareMessage('Link copied!')
      setTimeout(() => setShareMessage(null), 2000)
    }
  }

  return (
    <div
      className="min-h-screen pb-24 font-['Inter',sans-serif]"
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

      {/* Toast Message */}
      {shareMessage && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 text-white text-sm font-medium rounded-lg shadow-lg z-50 animate-fade-in"
          style={{ backgroundColor: colors.background.cardUp }}
        >
          {shareMessage}
        </div>
      )}

      {/* Fixed Action Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 py-4 px-6 z-50 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(12,18,32,0.95)',
          borderTop: `1px solid ${colors.ui.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
          {/* Search New Property */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors hover:bg-white/5"
            style={{ border: `1px solid ${colors.ui.border}`, color: colors.text.body }}
          >
            <Search size={18} />
            <span className="text-sm font-medium hidden sm:inline">Search</span>
          </button>

          {/* Analyze Property Button - Primary CTA */}
          <Link
            href={`/property?address=${encodeURIComponent(fullAddress)}`}
            className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full text-white font-bold transition-all hover:brightness-110"
            style={{
              backgroundColor: colors.brand.blueDeep,
              boxShadow: colors.shadow.ctaBtn,
            }}
          >
            <FileText size={18} />
            <span className="text-sm font-bold">Analyze Property</span>
          </Link>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full transition-colors hover:bg-white/5"
            style={{ border: `1px solid ${colors.ui.border}`, color: colors.text.body }}
          >
            <Share2 size={18} />
            <span className="text-sm font-medium hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Search Modal */}
      <SearchPropertyModal 
        isOpen={showSearchModal} 
        onClose={() => setShowSearchModal(false)} 
      />
    </div>
  )
}
