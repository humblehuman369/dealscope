'use client'

/**
 * IQ Verdict Page
 * Route: /verdict?address=...
 * 
 * Shows the IQ Verdict with ranked strategy recommendations after analysis.
 * Fetches real property data from the API including photos, beds, baths, sqft, and price.
 */

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQVerdictScreen, 
  IQProperty, 
  IQStrategy,
  calculateDynamicAnalysis,
  STRATEGY_ROUTE_MAP,
} from '@/components/iq-verdict'

// Sample photos for fallback
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
]

function VerdictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const addressParam = searchParams.get('address') || ''
  
  // State for property data
  const [property, setProperty] = useState<IQProperty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch property data from API
  useEffect(() => {
    async function fetchPropertyData() {
      if (!addressParam) {
        setError('No address provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch property data from Next.js API route which proxies to backend
        const response = await fetch('/api/v1/properties/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: decodeURIComponent(addressParam) })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch property data')
        }

        const data = await response.json()

        // Fetch photos if zpid is available
        let photoUrl: string | undefined = SAMPLE_PHOTOS[0]
        
        if (data.zpid) {
          try {
            const photosResponse = await fetch(`/api/v1/photos?zpid=${data.zpid}`)
            if (photosResponse.ok) {
              const photosData = await photosResponse.json()
              if (photosData.success && photosData.photos && photosData.photos.length > 0) {
                // Get first photo URL
                const firstPhoto = photosData.photos[0]
                if (firstPhoto?.url) {
                  photoUrl = firstPhoto.url
                }
              }
            }
          } catch (photoErr) {
            console.warn('Failed to fetch photos, using fallback:', photoErr)
          }
        }

        // Get monthly rent (used for estimating price if needed)
        const monthlyRentLTR = data.rentals?.monthly_rent_ltr || data.rentals?.average_rent || null
        const monthlyRent = monthlyRentLTR || 2500
        const estimatedValueFromRent = monthlyRent / 0.007

        // Get the best available price
        const price = data.valuations?.current_value_avm 
          || data.valuations?.zestimate 
          || data.valuations?.tax_assessed_value
          || data.valuations?.last_sale_price
          || estimatedValueFromRent

        // Get property taxes from API data
        const propertyTaxes = data.taxes?.annual_tax_amount 
          || data.taxes?.tax_amount 
          || null

        // Get insurance estimate if available
        const insurance = data.expenses?.insurance_annual || null

        // Get STR data if available (use null checks to properly handle 0 values)
        const averageDailyRate = data.rentals?.str_adr ?? data.rentals?.average_daily_rate ?? null
        const occupancyRate = data.rentals?.str_occupancy ?? data.rentals?.occupancy_rate ?? null

        // Get ARV if available (for flip/BRRRR strategies)
        const arv = data.valuations?.arv || data.valuations?.after_repair_value || null

        // Build IQProperty from API data with enriched data for dynamic scoring
        const propertyData: IQProperty = {
          id: data.property_id,
          address: data.address?.street || decodeURIComponent(addressParam).split(',')[0] || decodeURIComponent(addressParam),
          city: data.address?.city,
          state: data.address?.state,
          zip: data.address?.zip_code,
          beds: data.details?.bedrooms || 3,
          baths: data.details?.bathrooms || 2,
          sqft: data.details?.square_footage || 1500,
          price: Math.round(price),
          imageUrl: photoUrl,
          yearBuilt: data.details?.year_built,
          lotSize: data.details?.lot_size,
          propertyType: data.details?.property_type,
          // Enriched data for dynamic scoring
          monthlyRent: monthlyRentLTR,
          propertyTaxes,
          insurance,
          averageDailyRate,
          // Use null check (not truthy check) to properly handle 0% occupancy
          occupancyRate: occupancyRate != null ? occupancyRate / 100 : undefined,
          arv,
        }

        setProperty(propertyData)
      } catch (err) {
        console.error('Error fetching property:', err)
        setError(err instanceof Error ? err.message : 'Failed to load property')
        
        // Create fallback property from address param
        const fallbackProperty: IQProperty = {
          address: decodeURIComponent(addressParam).split(',')[0] || 'Unknown Address',
          beds: 3,
          baths: 2,
          sqft: 1500,
          price: 350000,
          imageUrl: SAMPLE_PHOTOS[0],
        }
        setProperty(fallbackProperty)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPropertyData()
  }, [addressParam])

  // Generate dynamic analysis from property data
  const analysis = property ? calculateDynamicAnalysis(property) : null

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleViewStrategy = useCallback((strategy: IQStrategy) => {
    if (!property) return
    // Build full address with city, state, zip
    const fullAddress = [
      property.address,
      property.city,
      property.state,
      property.zip
    ].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    const strategyId = STRATEGY_ROUTE_MAP[strategy.id]
    
    // Navigate to the property page with the selected strategy worksheet
    router.push(`/property?address=${encodedAddress}&strategy=${strategyId}`)
  }, [property, router])

  const handleCompareAll = useCallback(() => {
    if (!property) return
    // Build full address with city, state, zip
    const fullAddress = [
      property.address,
      property.city,
      property.state,
      property.zip
    ].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    router.push(`/compare?address=${encodedAddress}`)
  }, [property, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Analyzing property...</p>
        </div>
      </div>
    )
  }

  // Error state with no property fallback
  if (!property || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {error || 'Unable to load property'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            We couldn&apos;t fetch the property data. Please try again or search for a different address.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <IQVerdictScreen
      property={property}
      analysis={analysis}
      onViewStrategy={handleViewStrategy}
      onCompareAll={handleCompareAll}
    />
  )
}

export default function VerdictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading verdict...</p>
        </div>
      </div>
    }>
      <VerdictContent />
    </Suspense>
  )
}
