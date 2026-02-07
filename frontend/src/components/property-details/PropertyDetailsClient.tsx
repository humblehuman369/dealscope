'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { getAccessToken } from '@/lib/api'
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
import { Heart, FileText, Share2, Search } from 'lucide-react'
import Link from 'next/link'
import { SearchPropertyModal } from '@/components/SearchPropertyModal'
import { toast } from '@/components/feedback'

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
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)

  const fullAddress = `${property.address.streetAddress}, ${property.address.city}, ${property.address.state} ${property.address.zipcode}`

  // Handle save property
  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }

    if (isSaving || isSaved) return

    setIsSaving(true)
    try {
      const token = getAccessToken()
      if (!token) {
        openAuthModal('login')
        setIsSaving(false)
        return
      }

      const response = await fetch('/api/v1/properties/saved', {
        method: 'POST',
        credentials: 'include',
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
          zpid: property.zpid || null,
          external_property_id: property.zpid || null, // Use zpid as external ID if available
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
            // Listing status data for header display
            listingStatus: property.listingStatus,
            isOffMarket: property.isOffMarket,
            sellerType: property.sellerType,
            isForeclosure: property.isForeclosure,
            isBankOwned: property.isBankOwned,
            isAuction: property.isAuction,
            isNewConstruction: property.isNewConstruction,
            daysOnMarket: property.daysOnMarket,
            zestimate: property.zestimate,
          },
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        toast.success('Property saved to your portfolio')
        setSaveMessage('Saved!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else if (response.status === 409) {
        setIsSaved(true)
        toast.info('Property is already in your portfolio')
        setSaveMessage('Already saved!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else if (response.status === 400) {
        // Check if it's a duplicate error (backend may return 400 for duplicates)
        let errorData: { detail?: string }
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { detail: errorText }
        }
        const errorText = errorData.detail || JSON.stringify(errorData)
        if (errorText.includes('already in your saved list') || errorText.includes('already saved')) {
          setIsSaved(true)
          toast.info('Property is already in your portfolio')
          setSaveMessage('Already saved!')
          setTimeout(() => setSaveMessage(null), 3000)
        } else {
          toast.error(errorText || 'Failed to save property. Please try again.')
          setSaveMessage('Failed to save')
          setTimeout(() => setSaveMessage(null), 3000)
        }
      } else if (response.status === 401) {
        openAuthModal('login')
        toast.error('Please log in to save properties')
      } else {
        let errorData: { detail?: string; message?: string; code?: string } = { detail: 'Unknown error' }
        try {
          errorData = await response.json()
        } catch {
          // Response is not JSON, use default error
        }
        // Handle both FastAPI format (detail) and custom InvestIQ format (message)
        const errorMessage = errorData.detail || errorData.message || 'Failed to save property. Please try again.'
        toast.error(errorMessage)
        setSaveMessage('Failed to save')
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      toast.error('Network error. Please check your connection and try again.')
      setSaveMessage('Error saving property')
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }, [property, isAuthenticated, openAuthModal, isSaving, isSaved, fullAddress])

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
        {/* Back Button and Breadcrumb */}
        <nav className="flex items-center gap-3 mb-6" aria-label="Breadcrumb">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-teal-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
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
