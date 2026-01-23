'use client'

/**
 * IQ Verdict Page
 * Route: /verdict?address=...
 * 
 * Shows the IQ Verdict with ranked strategy recommendations after analysis.
 * Fetches real property data from the API including photos, beds, baths, sqft, and price.
 * 
 * IMPORTANT: All calculations are done by the backend API.
 * This page does NOT perform any financial calculations locally.
 */

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQVerdictScreen, 
  IQProperty, 
  IQStrategy,
  IQAnalysisResult,
  STRATEGY_ROUTE_MAP,
} from '@/components/iq-verdict'
import { parseAddressString } from '@/utils/formatters'
import { useAuth } from '@/context/AuthContext'

// Backend analysis response type
interface BackendAnalysisResponse {
  deal_score: number
  deal_verdict: string
  verdict_description: string
  discount_percent: number
  strategies: Array<{
    id: string
    name: string
    metric: string
    metric_label: string
    metric_value: number
    score: number
    rank: number
    badge: string | null
  }>
  purchase_price: number  // Recommended purchase price (95% of breakeven)
  breakeven_price: number
  list_price: number
}

// Helper to get strategy icon
function getStrategyIcon(strategyId: string): string {
  const icons: Record<string, string> = {
    'long-term-rental': '🏠',
    'short-term-rental': '🏨',
    'brrrr': '🔄',
    'fix-and-flip': '🔨',
    'house-hack': '🏡',
    'wholesale': '📋',
  }
  return icons[strategyId] || '📊'
}

// Map IQ strategy IDs to worksheet route segments
const WORKSHEET_ROUTES: Record<string, string> = {
  'long-term-rental': 'ltr',
  'short-term-rental': 'str',
  'brrrr': 'brrrr',
  'fix-and-flip': 'flip',
  'house-hack': 'househack',
  'wholesale': 'wholesale',
}

// Sample photos for fallback
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
]

function VerdictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, setShowAuthModal } = useAuth()

  const addressParam = searchParams.get('address') || ''
  
  // State for property data and analysis
  const [property, setProperty] = useState<IQProperty | null>(null)
  const [analysis, setAnalysis] = useState<IQAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

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

        // #region agent log
        console.log('[DEBUG] Starting fetch for address:', decodeURIComponent(addressParam));
        // #endregion
        
        // Fetch property data from Next.js API route which proxies to backend
        const response = await fetch('/api/v1/properties/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: decodeURIComponent(addressParam) })
        })

        // #region agent log
        console.log('[DEBUG] Fetch response:', { status: response.status, ok: response.ok, statusText: response.statusText });
        // #endregion

        if (!response.ok) {
          // #region agent log
          const errorBody = await response.text().catch(() => 'Could not read body');
          console.error('[DEBUG] Response NOT OK:', { status: response.status, errorBody: errorBody.substring(0, 500) });
          // #endregion
          throw new Error('Failed to fetch property data')
        }

        const data = await response.json()
        
        // #region agent log
        console.log('[DEBUG] Data parsed successfully:', { hasZpid: !!data.zpid, hasValuations: !!data.valuations, zpid: data.zpid });
        // #endregion

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

        // Parse address from URL parameter as fallback when API data is incomplete
        // This ensures city/state/zip are preserved even if API doesn't return them
        const parsedAddress = parseAddressString(addressParam)

        // Build IQProperty from API data with enriched data for dynamic scoring
        const propertyData: IQProperty = {
          id: data.property_id,
          zpid: data.zpid,
          address: data.address?.street || parsedAddress.street || decodeURIComponent(addressParam),
          city: data.address?.city || parsedAddress.city,
          state: data.address?.state || parsedAddress.state,
          zip: data.address?.zip_code || parsedAddress.zip,
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
        
        // Fetch analysis from backend API (all calculations done server-side)
        // Use same fallback logic as worksheet to ensure consistency
        const listPriceForCalc = propertyData.price
        const rentForCalc = propertyData.monthlyRent || (listPriceForCalc * 0.007) // 0.7% rule
        const taxesForCalc = propertyData.propertyTaxes || (listPriceForCalc * 0.012) // ~1.2%
        const insuranceForCalc = propertyData.insurance || (listPriceForCalc * 0.01) // 1%
        
        console.log('[IQ Verdict] Calculation inputs:', {
          list_price: listPriceForCalc,
          monthly_rent: rentForCalc,
          property_taxes: taxesForCalc,
          insurance: insuranceForCalc,
          provided: {
            rent: propertyData.monthlyRent,
            taxes: propertyData.propertyTaxes,
            insurance: propertyData.insurance,
          }
        })
        
        try {
          const analysisResponse = await fetch('/api/v1/analysis/verdict', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              list_price: listPriceForCalc,
              monthly_rent: rentForCalc,
              property_taxes: taxesForCalc,
              insurance: insuranceForCalc,
              bedrooms: propertyData.beds,
              bathrooms: propertyData.baths,
              sqft: propertyData.sqft,
              arv: propertyData.arv,
              average_daily_rate: propertyData.averageDailyRate,
              occupancy_rate: propertyData.occupancyRate,
            }),
          })
          
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json()
            
            // Log the full response for debugging
            console.log('[IQ Verdict] Backend response:', analysisData)
            
            // Convert backend response to frontend IQAnalysisResult format
            const analysisResult: IQAnalysisResult = {
              analyzedAt: new Date().toISOString(),
              dealScore: analysisData.deal_score,
              dealVerdict: analysisData.deal_verdict as IQAnalysisResult['dealVerdict'],
              verdictDescription: analysisData.verdict_description,
              discountPercent: analysisData.discount_percent,
              purchasePrice: analysisData.purchase_price,
              breakevenPrice: analysisData.breakeven_price,
              listPrice: analysisData.list_price,
              // Include inputs used for transparency
              inputsUsed: analysisData.inputs_used,
              strategies: analysisData.strategies.map((s: BackendAnalysisResponse['strategies'][0]) => ({
                id: s.id as IQStrategy['id'],
                name: s.name,
                icon: getStrategyIcon(s.id),
                metric: s.metric,
                metricLabel: s.metric_label,
                metricValue: s.metric_value,
                score: s.score,
                rank: s.rank,
                badge: s.badge as IQStrategy['badge'],
              })),
            }
            setAnalysis(analysisResult)
          } else {
            console.error('Failed to fetch analysis from backend')
          }
        } catch (analysisErr) {
          console.error('Error fetching analysis:', analysisErr)
        }
      } catch (err) {
        // #region agent log
        console.error('[DEBUG] CATCH ERROR:', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
        // #endregion
        console.error('Error fetching property:', err)
        setError(err instanceof Error ? err.message : 'Failed to load property')
        
        // Parse address from URL parameter to preserve city/state/zip in fallback
        const parsedFallback = parseAddressString(addressParam)
        
        // Create fallback property from address param
        const fallbackProperty: IQProperty = {
          address: parsedFallback.street || 'Unknown Address',
          city: parsedFallback.city,
          state: parsedFallback.state,
          zip: parsedFallback.zip,
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

  // Analysis is now fetched from backend API (stored in state)
  // No local calculations are performed

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleViewStrategy = useCallback(async (strategy: IQStrategy) => {
    if (!property) return
    
    // Require authentication for worksheets
    if (!isAuthenticated) {
      // Store intended destination for after login
      localStorage.setItem('pendingStrategy', strategy.id)
      localStorage.setItem('pendingAddress', addressParam)
      setShowAuthModal('login')
      return
    }
    
    setIsNavigating(true)
    
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setShowAuthModal('login')
        setIsNavigating(false)
        return
      }
      
      // Build full address
      const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
      const fullAddress = [
        property.address,
        property.city,
        stateZip
      ].filter(Boolean).join(', ')
      
      // Save property to get an ID for the worksheet
      const saveResponse = await fetch('/api/v1/properties/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          address_street: property.address,
          address_city: property.city,
          address_state: property.state,
          address_zip: property.zip,
          full_address: fullAddress,
          status: 'watching',
          property_data_snapshot: {
            zpid: property.zpid,
            street: property.address,
            city: property.city,
            state: property.state,
            zipCode: property.zip,
            listPrice: property.price,
            monthlyRent: property.monthlyRent,
            propertyTaxes: property.propertyTaxes,
            insurance: property.insurance,
            bedrooms: property.beds,
            bathrooms: property.baths,
            sqft: property.sqft,
            arv: property.arv || property.price,
            averageDailyRate: property.averageDailyRate,
            occupancyRate: property.occupancyRate,
          },
        }),
      })
      
      let propertyId: string | null = null
      
      if (saveResponse.ok) {
        const data = await saveResponse.json()
        propertyId = data.id
      } else if (saveResponse.status === 409 || saveResponse.status === 400) {
        // Property already exists, fetch the list to find it
        const listResponse = await fetch('/api/v1/properties/saved', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        
        if (listResponse.ok) {
          const properties = await listResponse.json()
          const existing = properties.find((p: { address_street: string; full_address?: string }) => 
            p.address_street === property.address || 
            p.full_address?.includes(property.address)
          )
          if (existing) {
            propertyId = existing.id
          }
        }
      } else if (saveResponse.status === 401) {
        setShowAuthModal('login')
        setIsNavigating(false)
        return
      }
      
      if (propertyId) {
        // Navigate to the worksheet
        const worksheetRoute = WORKSHEET_ROUTES[strategy.id] || 'ltr'
        router.push(`/worksheet/${propertyId}/${worksheetRoute}`)
      } else {
        throw new Error('Could not save property')
      }
    } catch (err) {
      console.error('Failed to navigate to worksheet:', err)
      setIsNavigating(false)
      // Fallback to property details page
      const zpid = property.zpid || 'unknown'
      const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
      const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
      router.push(`/property/${zpid}?address=${encodeURIComponent(fullAddress)}`)
    }
  }, [property, isAuthenticated, addressParam, setShowAuthModal, router])

  const handleCompareAll = useCallback(() => {
    if (!property) return
    // Build full address with city, state zip (no comma between state and zip)
    // Format: "street, city, state zip" - required by backend address parser
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [
      property.address,
      property.city,
      stateZip
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

  // Navigating to worksheet state
  if (isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading worksheet...</p>
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
