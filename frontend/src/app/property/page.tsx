'use client'

import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sun, Moon } from 'lucide-react'
import { 
  ResponsiveAnalyticsContainer,
  AnalyticsPageSkeleton,
  useAnalyticsViewMode,
  PropertyPremiumPage,
  StrategyId
} from '@/components/analytics'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

/**
 * Property Analytics Page
 * 
 * Fetches property data and displays the new analytics interface.
 * Supports both demo mode and real API data.
 * Supports both light and dark themes.
 * 
 * Now supports responsive desktop/mobile views:
 * - Desktop (>=1024px): Full 900px wide layout with enhanced components
 * - Mobile (<1024px): Compact mobile-optimized layout
 * 
 * NEW: Premium property landing page with strategy selection
 */

interface PropertyData {
  address: string
  city: string
  state: string
  zipCode: string
  listPrice: number
  monthlyRent: number
  averageDailyRate: number
  occupancyRate: number
  propertyTaxes: number
  insurance: number
  bedrooms: number
  bathrooms: number
  sqft: number
  arv: number
  thumbnailUrl?: string
  photos?: string[]
  photoCount?: number
}

// Sample photos for fallback
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=400&fit=crop'
]

function PropertyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address')
  const strategyParam = searchParams.get('strategy') as StrategyId | null
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, setShowAuthModal } = useAuth()
  const viewMode = useAnalyticsViewMode()
  
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId | null>(strategyParam)
  
  // Save property state
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProperty() {
      if (!addressParam) {
        setError('No address provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch from Next.js API route which proxies to backend
        const response = await fetch('/api/v1/properties/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: addressParam })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || 'Failed to fetch property data')
        }

        const data = await response.json()
        
        // Fetch photos if zpid is available
        let photos: string[] = SAMPLE_PHOTOS
        let photoCount = 5
        
        if (data.zpid) {
          try {
            const photosResponse = await fetch(`/api/v1/photos?zpid=${data.zpid}`)
            if (photosResponse.ok) {
              const photosData = await photosResponse.json()
              if (photosData.success && photosData.photos && photosData.photos.length > 0) {
                // Extract URL strings from photo objects
                photos = photosData.photos
                  .map((p: { url?: string }) => p.url)
                  .filter((url: string | undefined): url is string => !!url)
                photoCount = photos.length
              }
            }
          } catch (photoErr) {
            console.warn('Failed to fetch photos, using samples:', photoErr)
          }
        }
        
        // Get monthly rent first (used for estimating property value if needed)
        const monthlyRent = data.rentals?.monthly_rent_ltr || data.rentals?.average_rent || 2500
        
        // Estimate property value from rent if valuation data is missing
        // Using 1% rule inverse: Property Value = Monthly Rent / 0.007 (0.7% rent ratio)
        const estimatedValueFromRent = monthlyRent / 0.007
        
        // Get the best available valuation
        const listPrice = data.valuations?.current_value_avm 
          || data.valuations?.zestimate 
          || data.valuations?.tax_assessed_value
          || data.valuations?.last_sale_price
          || estimatedValueFromRent
        
        // Transform API response to our format
        const propertyData: PropertyData = {
          address: data.address?.street || addressParam.split(',')[0] || addressParam,
          city: data.address?.city || '',
          state: data.address?.state || '',
          zipCode: data.address?.zip_code || '',
          listPrice: Math.round(listPrice),
          monthlyRent: monthlyRent,
          averageDailyRate: data.rentals?.average_daily_rate || Math.round(monthlyRent / 30 * 1.5),
          occupancyRate: data.rentals?.occupancy_rate || 0.70,
          propertyTaxes: data.market?.property_taxes_annual || Math.round(listPrice * 0.012),
          insurance: Math.round(listPrice * 0.004),
          bedrooms: data.details?.bedrooms || 3,
          bathrooms: data.details?.bathrooms || 2,
          sqft: data.details?.square_footage || 1500,
          arv: data.valuations?.arv || Math.round(listPrice * 1.15),
          thumbnailUrl: photos[0],
          photos: photos,
          photoCount: photoCount
        }

        setProperty(propertyData)
      } catch (err) {
        console.error('Error fetching property:', err)
        
        // Use demo data as fallback
        const demoProperty: PropertyData = {
          address: addressParam.split(',')[0] || addressParam,
          city: 'Demo City',
          state: 'FL',
          zipCode: '33483',
          listPrice: 350000,
          monthlyRent: 2800,
          averageDailyRate: 195,
          occupancyRate: 0.72,
          propertyTaxes: 4200,
          insurance: 2100,
          bedrooms: 4,
          bathrooms: 2,
          sqft: 1850,
          arv: 425000,
          thumbnailUrl: SAMPLE_PHOTOS[0],
          photos: SAMPLE_PHOTOS,
          photoCount: 24
        }
        setProperty(demoProperty)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperty()
  }, [addressParam])

  // Handle strategy selection
  const handleSelectStrategy = (strategyId: StrategyId) => {
    setSelectedStrategy(strategyId)
    // Update URL with strategy param
    if (addressParam) {
      router.push(`/property?address=${encodeURIComponent(addressParam)}&strategy=${strategyId}`)
    }
  }

  // Handle back from strategy view
  const handleBackFromStrategy = () => {
    setSelectedStrategy(null)
    if (addressParam) {
      router.push(`/property?address=${encodeURIComponent(addressParam)}`)
    }
  }

  // Handle save property
  const handleSave = useCallback(async () => {
    // Require authentication
    if (!isAuthenticated) {
      setShowAuthModal('login')
      return
    }

    if (!property || isSaving) return

    // If already saved, show message
    if (isSaved) {
      setSaveMessage('Property already saved!')
      setTimeout(() => setSaveMessage(null), 2000)
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setShowAuthModal('login')
        return
      }

      const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`.trim()

      const response = await fetch(`${API_BASE_URL}/api/v1/saved-properties/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address_street: property.address,
          address_city: property.city,
          address_state: property.state,
          address_zip: property.zipCode,
          full_address: fullAddress,
          status: 'watching',
          property_data_snapshot: {
            listPrice: property.listPrice,
            monthlyRent: property.monthlyRent,
            averageDailyRate: property.averageDailyRate,
            occupancyRate: property.occupancyRate,
            propertyTaxes: property.propertyTaxes,
            insurance: property.insurance,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            sqft: property.sqft,
            arv: property.arv,
            photos: property.photos,
          },
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        setSaveMessage('Property saved!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else if (response.status === 409) {
        // Property already saved
        setIsSaved(true)
        setSaveMessage('Property already in your portfolio')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to save property:', response.status, errorData)
        const errorMessage = errorData.detail || `Failed to save (${response.status})`
        setSaveMessage(errorMessage)
        setTimeout(() => setSaveMessage(null), 5000)
      }
    } catch (err) {
      console.error('Error saving property:', err)
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setSaveMessage(`Failed to save: ${errorMessage}`)
      setTimeout(() => setSaveMessage(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }, [property, isAuthenticated, setShowAuthModal, isSaving, isSaved])

  // Handle share
  const handleShare = () => {
    if (navigator.share && property) {
      navigator.share({
        title: `InvestIQ - ${property.address}`,
        text: `Check out this property analysis: ${property.address}`,
        url: window.location.href
      }).catch(() => {
        // User cancelled or share failed
      })
    }
  }

  // Handle Generate LOI - Navigate to wholesale strategy where LOI can be generated
  const handleGenerateLOI = () => {
    // Navigate to wholesale strategy which has LOI generation
    handleSelectStrategy('wholesale')
  }

  if (isLoading) {
    return <AnalyticsPageSkeleton />
  }

  if (error && !property) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0b1426] flex flex-col items-center justify-center p-6 transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-navy-900 dark:text-white mb-4">Property Not Found</h1>
          <p className="text-neutral-500 dark:text-gray-400 mb-8">{error}</p>
          <Link 
            href="/search"
            className="px-6 py-3 bg-brand-500 dark:bg-[#4dd0e1] text-white dark:text-[#07172e] font-semibold rounded-xl hover:bg-brand-600 dark:hover:bg-[#3bc4d5] transition-colors"
          >
            Search for a Property
          </Link>
        </div>
      </div>
    )
  }

  if (!property) {
    return <AnalyticsPageSkeleton />
  }

  // Handle Try It Now - Navigate to search page
  const handleTryItNow = () => {
    router.push('/search')
  }

  // If no strategy is selected, show the premium property landing page
  if (!selectedStrategy) {
    return (
      <PropertyPremiumPage
        property={property}
        onBack={() => router.back()}
        onSelectStrategy={handleSelectStrategy}
        onSave={handleSave}
        onShare={handleShare}
        onGenerateLOI={handleGenerateLOI}
        onTryItNow={handleTryItNow}
        isSaved={isSaved}
        isSaving={isSaving}
        saveMessage={saveMessage}
      />
    )
  }

  // Strategy is selected - show the detailed analytics view
  // Desktop view uses the integrated header from DesktopStrategyAnalyticsContainer
  // Mobile view uses the separate header below
  if (viewMode === 'desktop') {
    return (
      <div className="min-h-screen overflow-safe transition-colors">
        <ResponsiveAnalyticsContainer
          property={property}
          onBack={handleBackFromStrategy}
          initialStrategy={selectedStrategy}
        />
      </div>
    )
  }

  // Mobile view with separate header
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0b1426] overflow-safe transition-colors">
      {/* Mobile Header */}
      <div className="header-blur sticky top-0 z-50">
        <div className="bg-white/95 dark:bg-[#07172e]/95 backdrop-blur-md border-b border-neutral-200 dark:border-white/5 px-4 py-3 safe-area-pt transition-colors">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={handleBackFromStrategy}
              className="flex items-center gap-2 text-neutral-600 dark:text-gray-400 hover:text-navy-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <Link href="/" className="text-lg font-bold text-navy-900 dark:text-white">
              Invest<span className="text-brand-500 dark:text-[#4dd0e1]">IQ</span>
            </Link>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-neutral-600" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Analytics Container */}
      <ResponsiveAnalyticsContainer
        property={property}
        onBack={handleBackFromStrategy}
        initialStrategy={selectedStrategy}
      />
    </div>
  )
}

export default function PropertyPage() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <PropertyContent />
    </Suspense>
  )
}
