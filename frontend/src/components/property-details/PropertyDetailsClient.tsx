'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ChevronRight } from 'lucide-react'
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
import { Heart, FileText, Share2, Search } from 'lucide-react'
import Link from 'next/link'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'

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
 */
export function PropertyDetailsClient({ property, initialStrategy }: PropertyDetailsClientProps) {
  const router = useRouter()
  const { isAuthenticated, setShowAuthModal } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  // Handle save property
  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      setShowAuthModal('login')
      return
    }

    if (isSaving || isSaved) return

    setIsSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setShowAuthModal('login')
        setIsSaving(false)
        return
      }

      const response = await fetch('/api/v1/properties/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address_street: property.address.streetAddress,
          address_city: property.address.city,
          address_state: property.address.state,
          address_zip: property.address.zipcode,
          full_address: fullAddress,
          status: 'watching',
          property_data_snapshot: {
            zpid: property.zpid,
            street: property.address.streetAddress,
            city: property.address.city,
            state: property.address.state,
            zipCode: property.address.zipcode,
            listPrice: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            sqft: property.livingArea,
            yearBuilt: property.yearBuilt,
            photos: property.images,
          },
        }),
      })

      if (response.ok || response.status === 409) {
        setIsSaved(true)
        setSaveMessage(response.status === 409 ? 'Already saved!' : 'Saved!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('Failed to save')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch {
      setSaveMessage('Error saving property')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }, [property, isAuthenticated, setShowAuthModal, isSaving, isSaved, fullAddress])

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
      setSaveMessage('Link copied!')
      setTimeout(() => setSaveMessage(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1426] pb-24 transition-colors">
      <style>{`.tabular-nums { font-variant-numeric: tabular-nums; }`}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6" aria-label="Breadcrumb">
          <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
            Property Details
          </span>
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate max-w-[200px] sm:max-w-none">
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
      {saveMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium rounded-lg shadow-lg z-50 animate-fade-in">
          {saveMessage}
        </div>
      )}

      {/* Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 z-50 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
          {/* Search New Property */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Search size={18} />
            <span className="text-sm font-medium hidden sm:inline">Search</span>
          </button>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border transition-colors ${
              isSaved 
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart 
              size={18} 
              className={isSaved ? 'fill-current' : ''} 
            />
            <span className="text-sm font-medium hidden sm:inline">
              {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Analyze Property Button - Primary CTA */}
          <Link
            href={`/property?address=${encodeURIComponent(fullAddress)}`}
            className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors shadow-sm"
          >
            <FileText size={18} />
            <span className="text-sm font-semibold">Analyze Property</span>
          </Link>

          {/* Share Button */}
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
