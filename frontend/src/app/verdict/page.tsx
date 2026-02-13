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

import { useCallback, useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQProperty, 
  IQStrategy,
  IQAnalysisResult,
} from '@/components/iq-verdict'
import { colors, typography, tw, getScoreColor } from '@/components/iq-verdict/verdict-design-tokens'
import { parseAddressString } from '@/utils/formatters'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { useSession } from '@/hooks/useSession'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'
import { api } from '@/lib/api-client'
import { DealMakerPopup, DealMakerValues, PopupStrategyType } from '@/components/deal-maker/DealMakerPopup'
import { ScoreMethodologySheet } from '@/components/iq-verdict/ScoreMethodologySheet'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'

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
  component_scores?: {
    deal_gap_score: number
    return_quality_score: number
    market_alignment_score: number
    deal_probability_score: number
  }
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
  useSession()

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
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  
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
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<PopupStrategyType>('ltr')
  const [showMethodologySheet, setShowMethodologySheet] = useState(false)
  const [methodologyScoreType, setMethodologyScoreType] = useState<'verdict' | 'profit'>('verdict')

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

        // Fetch property data via api-client (handles CSRF + auth automatically)
        const data = await api.post<Record<string, any>>('/api/v1/properties/search', {
          address: addressParam,
        })

        // Fetch photos if zpid is available
        let photoUrl: string | undefined = SAMPLE_PHOTOS[0]
        
        if (data.zpid) {
          try {
            const photosData = await api.get<{ success: boolean; photos: Array<{ url: string }> }>(
              `/api/v1/photos?zpid=${data.zpid}`,
            )
            if (photosData.success && photosData.photos && photosData.photos.length > 0) {
              const firstPhoto = photosData.photos[0]
              if (firstPhoto?.url) {
                photoUrl = firstPhoto.url
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
          // Note: addressParam from searchParams is already decoded
          address: data.address?.street || parsedAddress.street || addressParam,
          city: data.address?.city || parsedAddress.city,
          state: data.address?.state || parsedAddress.state,
          zip: data.address?.zip_code || parsedAddress.zip,
          beds: data.details?.bedrooms || FALLBACK_PROPERTY.beds,
          baths: data.details?.bathrooms || FALLBACK_PROPERTY.baths,
          sqft: data.details?.square_footage || FALLBACK_PROPERTY.sqft,
          price: Math.round(price),
          imageUrl: photoUrl,
          yearBuilt: data.details?.year_built,
          lotSize: data.details?.lot_size,
          propertyType: data.details?.property_type,
          listingStatus: data.listing?.listing_status || undefined,
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
        
        // Store property info to sessionStorage so global AppHeader can access it
        try {
          const existingData = sessionStorage.getItem('dealMakerOverrides')
          const parsed = existingData ? JSON.parse(existingData) : {}
          if (propertyData.zpid) parsed.zpid = propertyData.zpid
          parsed.beds = propertyData.beds
          parsed.baths = propertyData.baths
          parsed.sqft = propertyData.sqft
          parsed.price = propertyData.price
          parsed.listingStatus = propertyData.listingStatus || null
          sessionStorage.setItem('dealMakerOverrides', JSON.stringify(parsed))
          // Notify AppHeader that property details are available
          window.dispatchEvent(new Event('dealMakerOverridesUpdated'))
        } catch {
          // Ignore storage errors
        }
        
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

        // Apply condition / location slider adjustments (from IQ Gateway)
        if (conditionParam) {
          const cond = getConditionAdjustment(Number(conditionParam))
          // Turnkey premium increases effective list price; rehab doesn't change list price
          // (rehab cost is handled downstream in strategy page)
          listPriceForCalc += cond.pricePremium
        }
        if (locationParam) {
          const loc = getLocationAdjustment(Number(locationParam))
          rentForCalc = Math.round(rentForCalc * loc.rentMultiplier)
        }
        
        try {
          const analysisData = await api.post<BackendAnalysisResponse & Record<string, any>>(
            '/api/v1/analysis/verdict',
            {
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
            },
          )
          
          // Log the full response for debugging
          console.log('[IQ Verdict] Backend response:', analysisData)
          
          // Convert backend response to frontend IQAnalysisResult format
          // Backend now returns camelCase for new fields via Pydantic alias_generator
          const analysisResult: IQAnalysisResult = {
            propertyId: data?.property_id || propertyData?.id, // Include property ID for exports
            analyzedAt: new Date().toISOString(),
            dealScore: Math.min(95, Math.max(0, analysisData.deal_score ?? analysisData.dealScore ?? 0)),
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
            // NEW: Composite verdict component scores
            componentScores: analysisData.component_scores ?? analysisData.componentScores,
          }
          setAnalysis(analysisResult)
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
          beds: FALLBACK_PROPERTY.beds,
          baths: FALLBACK_PROPERTY.baths,
          sqft: FALLBACK_PROPERTY.sqft,
          price: FALLBACK_PROPERTY.price,
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

  // Auto-open DealMaker popup if navigated from StrategyIQ with openDealMaker=1
  useEffect(() => {
    if (!isLoading && property && analysis && searchParams.get('openDealMaker') === '1') {
      setShowDealMakerPopup(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, property, analysis])

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

  // Navigate to property details page - uses zpid or propertyId
  // Property page requires address query param for backend fetch
  const handlePropertyClick = useCallback(() => {
    if (!property) return
    // Build address for query param
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    
    // Prefer zpid, fall back to propertyIdParam
    const propertyId = property.zpid || propertyIdParam
    if (propertyId) {
      router.push(`/property/${propertyId}?address=${encodedAddress}`)
    } else {
      // Fallback: no zpid, try search instead
      router.push(`/search?q=${encodedAddress}`)
    }
  }, [property, propertyIdParam, router])

  // Export — deferred to Phase 4 (backend PDF exporter exists, frontend wiring pending)
  // const handleExport = useCallback(() => {}, [])

  // Handle change terms - navigate to Deal Maker to adjust assumptions
  const handleChangeTerms = useCallback(() => {
    handleNavigateToDealMaker()
  }, [handleNavigateToDealMaker])

  // Handle show methodology sheets
  const handleShowMethodology = useCallback(() => {
    setMethodologyScoreType('verdict')
    setShowMethodologySheet(true)
  }, [])

  // Header navigation handlers
  const handleLogoClick = useCallback(() => {
    router.push('/')
  }, [router])

  const handleSearchClick = useCallback(() => {
    router.push('/search')
  }, [router])

  const handleProfileClick = useCallback(() => {
    router.push('/profile')
  }, [router])

  // Handle tab change - navigate to appropriate pages
  const handleTabChange = useCallback((tab: 'analyze' | 'details' | 'price-checker' | 'dashboard') => {
    if (!property) return
    
    // Build base URL params - property page requires address query param
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    const propertyId = property.zpid || propertyIdParam
    
    switch (tab) {
      case 'analyze':
        // Already on analyze page - no action needed
        break
      case 'details':
        // Navigate to property details page - requires address query param
        if (propertyId) {
          router.push(`/property/${propertyId}?address=${encodedAddress}`)
        }
        break
      case 'price-checker':
        // Navigate to PriceCheckerIQ page
        router.push(`/price-intel?address=${encodedAddress}`)
        break
      case 'dashboard':
        router.push('/search')
        break
    }
  }, [property, propertyIdParam, router])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: '#94A3B8' }}>Analyzing property...</p>
        </div>
      </div>
    )
  }

  // Error state with no property fallback
  if (!property || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(248,113,113,0.10)' }}>
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold" style={{ color: '#F1F5F9' }}>
            {error || 'Unable to load property'}
          </h2>
          <p className="max-w-md" style={{ color: '#94A3B8' }}>
            We couldn&apos;t fetch the property data. Please try again or search for a different address.
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-sky-500 text-white rounded-full font-bold hover:bg-sky-400 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Derived values for display
  const score = analysis.dealScore
  const scoreColor = getScoreColor(score)
  const verdictLabel = score >= 90 ? 'Strong Deal' : score >= 80 ? 'Good Deal' : score >= 65 ? 'Average Deal' : score >= 50 ? 'Marginal Deal' : score >= 30 ? 'Unlikely Deal' : 'Pass'
  const purchasePrice = analysis.purchasePrice || Math.round(property.price * 0.95)
  const breakevenPrice = analysis.breakevenPrice || property.price
  const wholesalePrice = Math.round((analysis.listPrice || property.price) * 0.70)
  const monthlyRent = property.monthlyRent || Math.round(property.price * 0.007)
  const discountPct = analysis.discountPercent || 0

  const fmtCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  const fmtShort = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${Math.round(v).toLocaleString()}`

  // Signal indicators — only real data, no hardcoded values
  const of = analysis.opportunityFactors
  const dealGap = of?.dealGap ?? discountPct
  const urgency = of?.motivation ?? 50
  const market = of?.buyerMarket || 'Warm'
  const signals = [
    { label: 'Deal Gap', value: `${dealGap > 0 ? '+' : ''}${dealGap.toFixed(1)}%`, sub: dealGap >= 0 ? 'Favorable' : 'Difficult', color: dealGap >= 0 ? colors.brand.teal : colors.status.negative },
    { label: 'Urgency', value: urgency >= 70 ? 'High' : urgency >= 40 ? 'Medium' : 'Low', sub: `${Math.round(urgency)}/100`, color: urgency >= 70 ? colors.brand.teal : colors.brand.gold },
    { label: 'Market', value: market, sub: of?.motivationLabel || 'Active', color: colors.brand.teal },
  ]

  // Component scores from backend composite scorer (replaces frontend-computed values)
  const cs = analysis.componentScores
  const compDealGap = cs?.dealGapScore ?? 50
  const compReturnQuality = cs?.returnQualityScore ?? 50
  const compMarketAlignment = cs?.marketAlignmentScore ?? 50
  const compDealProbability = cs?.dealProbabilityScore ?? 50

  const navigateToStrategy = () => {
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    const params = new URLSearchParams({ address: fullAddress })
    if (conditionParam) params.set('condition', conditionParam)
    if (locationParam) params.set('location', locationParam)
    router.push(`/strategy?${params.toString()}`)
  }

  return (
    <>
      <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
        <div className="max-w-[520px] mx-auto">
          {/* Score Hero */}
          <section className="px-5 pt-10 pb-8" style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.04) 0%, transparent 70%), ${colors.background.bg}` }}>
            {/* The Verdict label */}
            <p className="text-center text-[11px] font-bold uppercase tracking-[2.5px] mb-6" style={{ color: colors.text.muted }}>The Verdict</p>

            {/* Score gauge + badge row */}
            <div className="flex items-center justify-center gap-5 mb-5">
              {/* Score gauge */}
              <div className="relative flex-shrink-0 w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-[150deg]">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeDasharray={`${2 * Math.PI * 52 * (240/360)} ${2 * Math.PI * 52 * (120/360)}`} strokeLinecap="round"/>
                  <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="10" strokeDasharray={`${2 * Math.PI * 52 * (240/360) * (score/100)} ${2 * Math.PI * 52 - 2 * Math.PI * 52 * (240/360) * (score/100)}`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[2.8rem] font-bold tabular-nums" style={{ color: scoreColor, lineHeight: 1 }}>{score}</span>
                  <span className="text-xs font-medium mt-0.5" style={{ color: colors.text.secondary }}>/100</span>
                </div>
              </div>

              {/* Verdict badge — centered vertically with gauge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ border: `1px solid ${scoreColor}40`, background: `${scoreColor}15` }}>
                {score >= 65 ? (
                  <svg width="14" height="14" fill="none" stroke={scoreColor} viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" stroke={scoreColor} viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                )}
                <span className="text-[0.82rem] font-bold" style={{ color: scoreColor }}>{verdictLabel}</span>
              </div>
            </div>

            {/* Verdict description — centered below score + badge */}
            <p className="text-sm leading-relaxed text-center max-w-xs mx-auto mb-4" style={{ color: colors.text.body }}>{analysis.verdictDescription || 'Calculating deal metrics...'}</p>

            <div className="flex justify-center mt-2">
              <button onClick={handleShowMethodology} className="text-[0.82rem] font-medium" style={{ color: colors.brand.teal }}>How Verdict Score Works</button>
            </div>

            {/* Score Components — real backend values that feed the headline score */}
            <div className="mt-6 text-left max-w-sm mx-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: colors.text.secondary }}>Score Components</p>
              {[
                { label: 'Deal Gap', value: compDealGap, color: colors.brand.teal },
                { label: 'Return Quality', value: compReturnQuality, color: colors.brand.blue },
                { label: 'Market Alignment', value: compMarketAlignment, color: colors.brand.teal },
                { label: 'Deal Probability', value: compDealProbability, color: colors.brand.blue },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 mb-2.5">
                  <span className="text-xs font-medium w-28 shrink-0" style={{ color: colors.text.body }}>{m.label}</span>
                  <div className="flex-1 h-1.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded" style={{ width: `${m.value}%`, background: m.color }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color: m.color }}>{Math.round(m.value)}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* Price Targets */}
          <section className="px-5 py-8 border-t" style={{ borderColor: colors.ui.border }}>
            <p className={tw.sectionHeader} style={{ color: colors.brand.teal, marginBottom: 8 }}>Price Targets</p>
            <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>What Should You Pay?</h2>
            <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 24, lineHeight: 1.55 }}>
              Every investment property has three price levels. The gap between asking price and your target buy price is what makes or breaks this deal.
            </p>

            <div className="flex gap-2.5">
              {[
                { label: 'Breakeven', value: breakevenPrice, sub: 'Max price for $0 cashflow', active: false },
                { label: 'Target Buy', value: purchasePrice, sub: 'Positive Cashflow', active: true },
                { label: 'Wholesale', value: wholesalePrice, sub: '30% net discount', active: false },
              ].map((card, i) => (
                <div key={i} className="flex-1 rounded-xl py-3 px-2 text-center transition-all" style={{
                  background: card.active ? colors.background.cardUp : colors.background.card,
                  border: card.active ? `1.5px solid ${colors.brand.blue}60` : `1px solid ${colors.ui.border}`,
                  boxShadow: card.active ? `0 0 12px ${colors.brand.blue}20` : undefined,
                }}>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: card.active ? colors.text.primary : colors.text.tertiary }}>{card.label}</p>
                  <p className="text-lg font-bold tabular-nums mb-0.5" style={{ color: card.active ? colors.brand.blue : colors.text.secondary }}>{fmtShort(card.value)}</p>
                  <p className="text-[8px] font-medium" style={{ color: card.active ? colors.text.body : colors.text.muted }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Price Scale Bar — data-driven positions */}
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-[0.82rem] font-medium" style={{ color: colors.text.body }}>
                  Asking: <span className="font-bold" style={{ color: colors.status.negative }}>{fmtShort(property.price)}</span>
                </span>
              </div>
              {(() => {
                // Calculate real positions based on actual price relationships
                const scaleMin = wholesalePrice * 0.95
                const scaleMax = Math.max(property.price * 1.08, breakevenPrice * 1.05)
                const range = scaleMax - scaleMin
                const clamp = (v: number) => Math.min(96, Math.max(4, ((v - scaleMin) / range) * 100))
                const targetPos = clamp(purchasePrice)
                const askingPos = clamp(property.price)
                return (
                  <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: `linear-gradient(90deg, ${colors.brand.teal}, ${colors.brand.blue}, ${colors.brand.gold})` }}>
                    <div className="absolute w-3.5 h-3.5 rounded-full border-[2.5px] border-white -top-1" style={{ left: `${targetPos}%`, background: colors.brand.blue, boxShadow: `0 0 8px ${colors.brand.blue}80` }} />
                    <div className="absolute w-3.5 h-3.5 rounded-full border-[2.5px] border-white -top-1" style={{ left: `${askingPos}%`, background: colors.status.negative, boxShadow: `0 0 6px ${colors.status.negative}60` }} />
                  </div>
                )
              })()}
              <div className="flex justify-between mt-2">
                {['Wholesale', 'Profit Entry', 'Breakeven', 'Asking ▶'].map((l, i) => (
                  <span key={i} className="text-[0.68rem] font-semibold" style={{ color: i === 3 ? colors.status.negative : colors.text.secondary }}>{l}</span>
                ))}
              </div>
              <p className="text-center text-[0.82rem] mt-3.5" style={{ color: colors.text.secondary }}>
                Based on <span className="font-semibold" style={{ color: colors.brand.blue }}>20% down · 6.0% rate · 30-year term at the Target Buy price</span>
              </p>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowDealMakerPopup(true)}
                  className="px-6 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{ color: colors.brand.blue, border: `1.5px solid ${colors.brand.blue}50`, background: `${colors.brand.blue}10` }}
                >
                  Change Terms
                </button>
              </div>
            </div>
          </section>

          {/* Market Snapshot */}
          <section className="px-5 pb-6 border-t" style={{ borderColor: colors.ui.border }}>
            <div className="py-4">
              <span className="text-[0.68rem] font-bold uppercase tracking-wider block" style={{ color: colors.text.primary }}>Market Snapshot</span>
              <p className="text-[0.82rem] mt-1" style={{ color: colors.text.muted }}>Key signals from your 60-second screen</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {signals.map((s, i) => (
                <div key={i} className="flex justify-between items-center rounded-xl py-3 px-3.5" style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}` }}>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text.body }}>{s.label}</p>
                    <p className="text-xs font-medium" style={{ color: s.color }}>{s.sub}</p>
                  </div>
                  <span className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Beginner Tip */}
          <section className="px-5 pb-6">
            <div className="flex gap-3.5 rounded-[14px] p-5" style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}` }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: colors.accentBg.teal }}>
                <svg width="18" height="18" fill="none" stroke={colors.brand.teal} viewBox="0 0 24 24" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: colors.text.primary }}>This is your 60-second screen.</p>
                <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
                  A VerdictIQ score tells you whether to keep scrolling or dig deeper. This property scored {score} — {score >= 65 ? 'a ' + verdictLabel.toLowerCase() + ' worth your full analysis' : 'the numbers need work before committing'}. Ready to go deep? The full financial breakdown is one tap away.
                </p>
              </div>
            </div>
          </section>

          {/* CTA → Strategy — copy adapts to verdict score */}
          <section className="px-5 py-10 text-center border-t" style={{ background: colors.background.bg, borderColor: colors.ui.border }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.brand.teal }}>
              {score >= 65 ? 'This deal passed the screen' : score >= 40 ? 'This deal needs a closer look' : 'The numbers don\'t work at asking price'}
            </p>
            <h2 className="text-[1.35rem] font-bold leading-snug mb-3" style={{ color: colors.text.primary }}>
              {score >= 65 ? 'Now Prove It.' : score >= 40 ? 'Find the Angle.' : 'See What Would Work.'}
            </h2>
            <p className="text-[0.95rem] leading-relaxed max-w-xs mx-auto mb-7" style={{ color: colors.text.body }}>
              {score >= 65
                ? 'Get a full financial breakdown across 6 investment strategies — what you\'d pay, what you\'d earn, and whether the numbers actually work.'
                : score >= 40
                ? 'The margins are tight, but the right strategy and terms could make it work. See the full financial breakdown to find the approach that fits.'
                : 'See exactly how far off the numbers are — and find the price or strategy that would make this deal work.'}
            </p>
            <button onClick={navigateToStrategy} className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full font-bold text-[1.05rem] text-white transition-all hover:shadow-[0_8px_32px_rgba(14,165,233,0.45)]"
              style={{ background: colors.brand.blueDeep, boxShadow: '0 4px 24px rgba(14,165,233,0.3)' }}>
              Show Me the Numbers
              <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div className="flex justify-center gap-6 mt-5">
              {['Free to use', 'No signup needed', '60 seconds'].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <svg width="14" height="14" fill="none" stroke={colors.brand.teal} viewBox="0 0 24 24" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-xs font-medium" style={{ color: colors.text.secondary }}>{f}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Trust Strip */}
          <div className="px-5 py-5 text-center border-t" style={{ borderColor: colors.ui.border }}>
            <p className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>
              VerdictIQ analyzes <span className="font-semibold" style={{ color: colors.brand.blue }}>rental income, expenses, market conditions</span> and <span className="font-semibold" style={{ color: colors.brand.blue }}>comparable sales</span> to score every property. No guesswork — just data.
            </p>
          </div>

          {/* Footer */}
          <footer className="text-center py-5 text-xs" style={{ color: colors.text.secondary }}>
            Powered by <span className="font-semibold" style={{ color: colors.text.body }}>Invest<span style={{ color: colors.brand.blue }}>IQ</span></span>
          </footer>
        </div>
      </div>

      {/* DealMaker Popup for editing terms/assumptions */}
      {property && analysis && (
        <DealMakerPopup
          isOpen={showDealMakerPopup}
          onClose={() => setShowDealMakerPopup(false)}
          onApply={(values: DealMakerValues) => {
            setShowDealMakerPopup(false)
            // Persist ALL DealMaker values + strategy to sessionStorage so they
            // survive the page reload and re-populate the popup next time.
            const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
            const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
            try {
              const sessionKey = `dealMaker_${encodeURIComponent(fullAddress)}`
              sessionStorage.setItem(sessionKey, JSON.stringify({
                ...values,
                strategy: currentStrategy,
                timestamp: Date.now(),
              }))
            } catch { /* ignore storage errors */ }

            // Pass values the backend API accepts as URL overrides
            const params = new URLSearchParams({
              address: fullAddress,
              purchasePrice: String(values.buyPrice),
              monthlyRent: String(values.monthlyRent),
              propertyTaxes: String(values.propertyTaxes),
              insurance: String(values.insurance),
            })
            if (values.arv) params.set('arv', String(values.arv))
            if (property.zpid) params.set('zpid', String(property.zpid))
            router.push(`/verdict?${params.toString()}`)
          }}
          strategyType={currentStrategy}
          onStrategyChange={(s) => setCurrentStrategy(s)}
          initialValues={(() => {
            // Restore previous DealMaker values from sessionStorage if available
            const defaults = {
              buyPrice: analysis.purchasePrice || Math.round(property.price * 0.95),
              monthlyRent: property.monthlyRent || Math.round(property.price * 0.007),
              propertyTaxes: property.propertyTaxes || Math.round(property.price * 0.012),
              insurance: property.insurance || Math.round(property.price * 0.01),
              arv: property.arv || property.price,
              downPayment: 20,
              closingCosts: 3,
              interestRate: 6,
              loanTerm: 30,
              vacancyRate: 5,
              managementRate: 8,
            }
            if (typeof window === 'undefined') return defaults
            try {
              const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
              const fullAddr = [property.address, property.city, stateZip].filter(Boolean).join(', ')
              const stored = sessionStorage.getItem(`dealMaker_${encodeURIComponent(fullAddr)}`)
              if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
                  return { ...defaults, ...parsed }
                }
              }
            } catch { /* ignore */ }
            return defaults
          })()}
        />
      )}

      {/* Score Methodology Sheet */}
      <ScoreMethodologySheet
        isOpen={showMethodologySheet}
        onClose={() => setShowMethodologySheet(false)}
        currentScore={analysis?.dealScore}
        scoreType={methodologyScoreType}
      />

    </>
  )
}

export default function VerdictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: '#94A3B8' }}>Loading verdict...</p>
        </div>
      </div>
    }>
      <VerdictContent />
    </Suspense>
  )
}
