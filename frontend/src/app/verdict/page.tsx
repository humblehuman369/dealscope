'use client'

/**
 * IQ Verdict Page
 * Route: /verdict?address=... OR /verdict?propertyId=...
 * 
 * Shows the IQ Verdict with ranked strategy recommendations after analysis.
 * Fetches real property data from the API including photos, beds, baths, sqft, and price.
 * 
 * IMPORTANT: All calculations are done by the backend API.
 * This page does NOT perform any financial calculations locally.
 * 
 * ARCHITECTURE:
 * - For SAVED properties (propertyId param): Loads from dealMakerStore
 *   The DealMakerRecord contains all the assumptions and metrics from Deal Maker
 * - For UNSAVED properties (address param): Uses URL params for overrides (legacy mode)
 */

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  VerdictIQCombined,
  IQProperty, 
  IQStrategy,
  IQAnalysisResult,
} from '@/components/iq-verdict'
import { parseAddressString } from '@/utils/formatters'
import { useAuth } from '@/context/AuthContext'
import { useProgressiveProfiling } from '@/hooks/useProgressiveProfiling'
import { ProgressiveProfilingPrompt } from '@/components/profile/ProgressiveProfilingPrompt'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'

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

// Sample photos for fallback
const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
]

function VerdictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Auth context available for future use
  useAuth()

  // Check for saved property mode (when coming from Deal Maker with a propertyId)
  const propertyIdParam = searchParams.get('propertyId')
  const addressParam = searchParams.get('address') || ''
  
  // Deal Maker Store (for saved properties)
  const dealMakerStore = useDealMakerStore()
  const { hasRecord } = useDealMakerReady()
  
  // Determine if we're in "saved property mode" (use store) or "legacy mode" (use URL params)
  const isSavedPropertyMode = !!propertyIdParam
  
  // Check for Deal Maker override values
  // Priority: URL params > sessionStorage (for toolbar navigation)
  const urlPurchasePrice = searchParams.get('purchasePrice')
  const urlMonthlyRent = searchParams.get('monthlyRent')
  const urlPropertyTaxes = searchParams.get('propertyTaxes')
  const urlInsurance = searchParams.get('insurance')
  const urlArv = searchParams.get('arv')
  const urlZpid = searchParams.get('zpid')
  
  // Load sessionStorage data synchronously to avoid race conditions
  // This function is called during render, so we use a try/catch
  const getSessionData = useCallback(() => {
    if (typeof window === 'undefined' || !addressParam || urlPurchasePrice) {
      return null
    }
    
    try {
      const sessionKey = `dealMaker_${encodeURIComponent(addressParam)}`
      const stored = sessionStorage.getItem(sessionKey)
      if (stored) {
        const data = JSON.parse(stored)
        // Check if data is recent (within last hour)
        if (data.timestamp && Date.now() - data.timestamp < 3600000) {
          console.log('[IQ Verdict] Loaded Deal Maker values from sessionStorage:', data)
          return data
        }
      }
    } catch (e) {
      console.warn('Failed to load sessionStorage:', e)
    }
    return null
  }, [addressParam, urlPurchasePrice])
  
  // Use state to trigger re-render when sessionStorage is available (client-side only)
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Get session data (only on client)
  const sessionData = isClient ? getSessionData() : null
  
  // Use URL params if available, otherwise fall back to sessionStorage
  const overridePurchasePrice = urlPurchasePrice || (sessionData?.purchasePrice ? String(sessionData.purchasePrice) : null)
  const overrideMonthlyRent = urlMonthlyRent || (sessionData?.monthlyRent ? String(sessionData.monthlyRent) : null)
  const overridePropertyTaxes = urlPropertyTaxes || (sessionData?.propertyTaxes ? String(sessionData.propertyTaxes) : null)
  const overrideInsurance = urlInsurance || (sessionData?.insurance ? String(sessionData.insurance) : null)
  const overrideArv = urlArv || (sessionData?.arv ? String(sessionData.arv) : null)
  const overrideZpid = urlZpid || sessionData?.zpid || null
  
  // Has any overrides (from URL or session)
  const hasLegacyOverrides = !!(overridePurchasePrice || overrideMonthlyRent)
  
  // State for property data and analysis
  const [property, setProperty] = useState<IQProperty | null>(null)
  const [analysis, setAnalysis] = useState<IQAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasTrackedAnalysis, setHasTrackedAnalysis] = useState(false)

  // Progressive profiling hook
  const {
    showPrompt,
    currentQuestion,
    trackAnalysis,
    handleAnswer,
    handleSkip,
    handleClose,
  } = useProgressiveProfiling()

  // Load from dealMakerStore for saved properties
  // Check both hasRecord AND if the loaded record is for the correct property
  // This handles navigation between different saved properties
  useEffect(() => {
    if (isSavedPropertyMode && propertyIdParam) {
      const isWrongProperty = dealMakerStore.propertyId !== propertyIdParam
      if (!hasRecord || isWrongProperty) {
        dealMakerStore.loadRecord(propertyIdParam)
      }
    }
  }, [isSavedPropertyMode, propertyIdParam, hasRecord, dealMakerStore])
  
  // Fetch property data from API (or use store data for saved properties)
  useEffect(() => {
    async function fetchPropertyData() {
      // For saved property mode, wait for store to load then use that data
      if (isSavedPropertyMode) {
        if (!hasRecord) {
          // Still loading from store
          return
        }
        
        // Use data from the dealMakerStore
        const record = dealMakerStore.record!
        // We need to fetch property details still, but use store values for calculations
        // The propertyId should be used to load from saved properties API
        // For now, continue to regular flow but use store values as overrides
      }
      
      if (!addressParam && !isSavedPropertyMode) {
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
        // Priority for calculation values:
        // 1. DealMakerStore (for saved properties) - has locked assumptions from Deal Maker
        // 2. URL param overrides (legacy mode for unsaved properties)
        // 3. Property data from API
        
        let listPriceForCalc: number
        let rentForCalc: number
        let taxesForCalc: number
        let insuranceForCalc: number
        let arvForCalc: number | null
        
        if (isSavedPropertyMode && hasRecord && dealMakerStore.record) {
          // Use values from DealMakerRecord (single source of truth for saved properties)
          const record = dealMakerStore.record
          listPriceForCalc = record.buy_price
          rentForCalc = record.monthly_rent
          taxesForCalc = record.annual_property_tax
          insuranceForCalc = record.annual_insurance
          arvForCalc = record.arv
          
          console.log('[IQ Verdict] Using DealMakerStore values:', {
            list_price: listPriceForCalc,
            monthly_rent: rentForCalc,
            property_taxes: taxesForCalc,
            insurance: insuranceForCalc,
            arv: arvForCalc,
            source: 'dealMakerStore',
          })
        } else {
          // Legacy mode: use URL param overrides or property data
          listPriceForCalc = overridePurchasePrice 
            ? parseFloat(overridePurchasePrice) 
            : propertyData.price
          rentForCalc = overrideMonthlyRent 
            ? parseFloat(overrideMonthlyRent) 
            : (propertyData.monthlyRent || (listPriceForCalc * 0.007)) // 0.7% rule
          taxesForCalc = overridePropertyTaxes 
            ? parseFloat(overridePropertyTaxes) 
            : (propertyData.propertyTaxes || (listPriceForCalc * 0.012)) // ~1.2%
          insuranceForCalc = overrideInsurance 
            ? parseFloat(overrideInsurance) 
            : (propertyData.insurance || (listPriceForCalc * 0.01)) // 1%
          arvForCalc = overrideArv 
            ? parseFloat(overrideArv) 
            : (propertyData.arv ?? null)
          
          console.log('[IQ Verdict] Using legacy override values:', {
            list_price: listPriceForCalc,
            monthly_rent: rentForCalc,
            property_taxes: taxesForCalc,
            insurance: insuranceForCalc,
            arv: arvForCalc,
            source: hasLegacyOverrides ? 'urlParams' : 'propertyData',
          })
        }
        
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
              arv: arvForCalc,
              average_daily_rate: propertyData.averageDailyRate,
              occupancy_rate: propertyData.occupancyRate,
            }),
          })
          
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json()
            
            // Log the full response for debugging
            console.log('[IQ Verdict] Backend response:', analysisData)
            
            // Convert backend response to frontend IQAnalysisResult format
            // Backend now returns camelCase for new fields via Pydantic alias_generator
            const analysisResult: IQAnalysisResult = {
              analyzedAt: new Date().toISOString(),
              dealScore: analysisData.deal_score ?? analysisData.dealScore,
              dealVerdict: (analysisData.deal_verdict ?? analysisData.dealVerdict) as IQAnalysisResult['dealVerdict'],
              verdictDescription: analysisData.verdict_description ?? analysisData.verdictDescription,
              discountPercent: analysisData.discount_percent ?? analysisData.discountPercent,
              purchasePrice: analysisData.purchase_price ?? analysisData.purchasePrice,
              breakevenPrice: analysisData.breakeven_price ?? analysisData.breakevenPrice,
              listPrice: analysisData.list_price ?? analysisData.listPrice,
              // Include inputs used for transparency
              inputsUsed: analysisData.inputs_used ?? analysisData.inputsUsed,
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
              // NEW: Grade-based display fields (backend returns camelCase)
              opportunity: analysisData.opportunity,
              opportunityFactors: analysisData.opportunity_factors ?? analysisData.opportunityFactors,
              returnRating: analysisData.return_rating ?? analysisData.returnRating,
              returnFactors: analysisData.return_factors ?? analysisData.returnFactors,
            }
            setAnalysis(analysisResult)
          } else {
            console.error('Failed to fetch analysis from backend')
          }
        } catch (analysisErr) {
          console.error('Error fetching analysis:', analysisErr)
        }
      } catch (err) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressParam, isSavedPropertyMode, hasRecord, dealMakerStore.record, isClient])

  // Analysis is now fetched from backend API (stored in state)
  // No local calculations are performed

  // Track analysis completion for progressive profiling
  // This triggers after analysis is loaded (not during loading state)
  useEffect(() => {
    if (analysis && !hasTrackedAnalysis && !isLoading) {
      // Delay slightly to let the verdict screen render first
      const timer = setTimeout(() => {
        trackAnalysis()
        setHasTrackedAnalysis(true)
      }, 1500) // Show prompt 1.5s after verdict loads
      
      return () => clearTimeout(timer)
    }
  }, [analysis, hasTrackedAnalysis, isLoading, trackAnalysis])

  // Navigation handlers - MUST be defined before any early returns to follow Rules of Hooks
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // Navigate to Deal Maker with property data
  const handleNavigateToDealMaker = useCallback(() => {
    if (!property) return
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    
    const url = propertyIdParam
      ? `/deal-maker/${encodedAddress}?propertyId=${propertyIdParam}`
      : `/deal-maker/${encodedAddress}`
    router.push(url)
  }, [property, propertyIdParam, router])

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
    <>
      <VerdictIQCombined
        property={property}
        analysis={analysis}
        onNavigateToDealMaker={handleNavigateToDealMaker}
        savedPropertyId={propertyIdParam || undefined}
      />

      {/* Progressive Profiling Prompt - Shows after analysis completion */}
      {showPrompt && currentQuestion && (
        <ProgressiveProfilingPrompt
          question={currentQuestion}
          onAnswer={handleAnswer}
          onSkip={handleSkip}
          onClose={handleClose}
        />
      )}
    </>
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
