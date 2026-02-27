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

import { useCallback, useEffect, useRef, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQProperty, 
  IQStrategy,
  IQAnalysisResult,
} from '@/components/iq-verdict'
import { PropertyAddressBar } from '@/components/iq-verdict/PropertyAddressBar'
import { VerdictScoreCard, VerdictScoreExplainer } from '@/components/iq-verdict/VerdictScoreCard'
import { getDealVerdict } from '@/components/iq-verdict/types'
import { IQEstimateSelector, type IQEstimateSources, type DataSourceId } from '@/components/iq-verdict/IQEstimateSelector'
import { colors, typography, tw, cardGlow } from '@/components/iq-verdict/verdict-design-tokens'
import { parseAddressString } from '@/utils/formatters'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { useSession } from '@/hooks/useSession'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'
import { api } from '@/lib/api-client'
import { usePropertyData } from '@/hooks/usePropertyData'
import { DealMakerPopup, DealMakerValues, PopupStrategyType } from '@/components/deal-maker/DealMakerPopup'
import { PriceTarget } from '@/lib/priceUtils'
import { ScoreMethodologySheet } from '@/components/iq-verdict/ScoreMethodologySheet'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'
import { AnalysisNav } from '@/components/navigation/AnalysisNav'
import { ProGate } from '@/components/ProGate'

// Backend analysis response — handles both snake_case and camelCase from Pydantic
interface BackendAnalysisResponse {
  // Core fields (snake_case from Pydantic field names, camelCase from alias generator)
  deal_score?: number; dealScore?: number
  deal_verdict?: string; dealVerdict?: string
  verdict_description?: string; verdictDescription?: string
  discount_percent?: number; discountPercent?: number
  strategies: Array<{
    id: string; name: string; metric: string
    metric_label?: string; metricLabel?: string
    metric_value?: number; metricValue?: number
    score: number; rank: number; badge: string | null
  }>
  purchase_price?: number; purchasePrice?: number
  income_value?: number; incomeValue?: number
  list_price?: number; listPrice?: number
  // Component scores — deprecated, kept for backward compat
  deal_gap_score?: number; dealGapScore?: number
  return_quality_score?: number; returnQualityScore?: number
  market_alignment_score?: number; marketAlignmentScore?: number
  deal_probability_score?: number; dealProbabilityScore?: number
  // New: deal factors + discount bracket
  deal_factors?: Array<{ type: string; text: string }>
  dealFactors?: Array<{ type: string; text: string }>
  discount_bracket_label?: string; discountBracketLabel?: string
  // Allow additional camelCase fields from alias generator
  [key: string]: unknown
}

/**
 * Bulletproof component score extraction.
 * Handles ALL four backend response shapes:
 *   1. Flat camelCase:  { dealGapScore: 80 }
 *   2. Flat snake_case: { deal_gap_score: 80 }
 *   3. Nested camelCase: { componentScores: { dealGapScore: 80 } }
 *   4. Nested snake_case: { component_scores: { deal_gap_score: 80 } }
 * Returns clean numbers (0 fallback) regardless of backend version.
 */
function extractComponentScores(data: Record<string, unknown>): {
  dealGap: number
  returnQuality: number
  marketAlignment: number
  dealProbability: number
} {
  const nested = (data.componentScores ?? data.component_scores) as Record<string, unknown> | undefined

  const result = {
    dealGap: Number(
      data.dealGapScore ?? data.deal_gap_score
      ?? nested?.dealGapScore ?? nested?.deal_gap_score ?? 0
    ),
    returnQuality: Number(
      data.returnQualityScore ?? data.return_quality_score
      ?? nested?.returnQualityScore ?? nested?.return_quality_score ?? 0
    ),
    marketAlignment: Number(
      data.marketAlignmentScore ?? data.market_alignment_score
      ?? nested?.marketAlignmentScore ?? nested?.market_alignment_score ?? 0
    ),
    dealProbability: Number(
      data.dealProbabilityScore ?? data.deal_probability_score
      ?? nested?.dealProbabilityScore ?? nested?.deal_probability_score ?? 0
    ),
  }

  console.log('[IQ Verdict] extractComponentScores result:', result)
  return result
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
  
  // Shared property data cache (React Query) — prevents redundant API calls
  // when navigating between Verdict ↔ Strategy for the same property
  const { fetchProperty } = usePropertyData()

  // State for property data and analysis
  const [property, setProperty] = useState<IQProperty | null>(null)
  const [analysis, setAnalysis] = useState<IQAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<PopupStrategyType>('ltr')
  const [activePriceTarget, setActivePriceTarget] = useState<PriceTarget>('targetBuy')
  const [showMethodologySheet, setShowMethodologySheet] = useState(false)
  const [methodologyScoreType, setMethodologyScoreType] = useState<'verdict' | 'profit'>('verdict')

  // IQ Estimate 3-value sources (populated from API response)
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null },
  })

  // Stores the static analysis inputs so the verdict can be re-calculated
  // when the user switches data source without re-fetching property data
  const analysisInputsRef = useRef<Record<string, any> | null>(null)

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

        // Fetch property data (React Query cache — shared with Strategy page)
        const data = await fetchProperty(addressParam)

        // Start photo fetch in parallel (resolved later after property data is built)
        const photoPromise = data.zpid
          ? api.get<{ success: boolean; photos: Array<{ url: string }> }>(
              `/api/v1/photos?zpid=${data.zpid}`,
            ).catch((err: unknown) => {
              console.warn('Failed to fetch photos, using fallback:', err)
              return null
            })
          : Promise.resolve(null)

        // IQ Estimate rent: monthly_rent_ltr is already the IQ Estimate (avg of Zillow + RentCast)
        const monthlyRent = data.rentals?.monthly_rent_ltr || 0

        // Market Price: when listed = List Price; when off-market = API market_price or same fallback as backend
        const isListed =
          data.listing?.listing_status &&
          data.listing.listing_status !== 'OFF_MARKET' &&
          data.listing.listing_status !== 'SOLD' &&
          data.listing.listing_status !== 'FOR_RENT' &&
          data.listing.listing_status !== 'OTHER'
        const zestimate = data.valuations?.zestimate ?? null
        const currentAvm = data.valuations?.current_value_avm ?? null
        const taxAssessed = data.valuations?.tax_assessed_value ?? null
        const listPrice = data.listing?.list_price ?? null
        const apiMarketPrice = data.valuations?.market_price ?? null

        // Market price: listed price or Zestimate (primary source for off-market).
        // Sequential fallbacks (no blending) ensure the app remains functional
        // when the primary source is unavailable.
        const price =
          (isListed && listPrice != null && listPrice > 0 ? listPrice : null) ??
          (apiMarketPrice != null && apiMarketPrice > 0 ? apiMarketPrice : null) ??
          (zestimate != null && zestimate > 0 ? zestimate : null) ??
          (currentAvm != null && currentAvm > 0 ? currentAvm : null) ??
          (taxAssessed != null && taxAssessed > 0 ? Math.round(taxAssessed / 0.75) : null) ??
          1

        // Get property taxes from API data
        const propertyTaxes = data.taxes?.annual_tax_amount 
          || data.taxes?.tax_amount 
          || null

        // Get insurance estimate if available
        const insurance = data.expenses?.insurance_annual || null

        // Get STR data if available (use null checks to properly handle 0 values)
        const averageDailyRate = data.rentals?.average_daily_rate ?? null
        const occupancyRate = data.rentals?.occupancy_rate ?? null

        // Get ARV if available (for flip/BRRRR strategies)
        const arv = data.valuations?.arv ?? null

        // Parse address from URL parameter as fallback when API data is incomplete
        // This ensures city/state/zip are preserved even if API doesn't return them
        const parsedAddress = parseAddressString(addressParam)

        // Build IQProperty from API data with enriched data for dynamic scoring
        const propertyData: IQProperty = {
          id: data.property_id,
          zpid: data.zpid ?? undefined,
          // Note: addressParam from searchParams is already decoded
          address: data.address?.street || parsedAddress.street || addressParam,
          city: data.address?.city || parsedAddress.city,
          state: data.address?.state || parsedAddress.state,
          zip: data.address?.zip_code || parsedAddress.zip,
          beds: data.details?.bedrooms || FALLBACK_PROPERTY.beds,
          baths: data.details?.bathrooms || FALLBACK_PROPERTY.baths,
          sqft: data.details?.square_footage || FALLBACK_PROPERTY.sqft,
          price: Math.round(price),
          zestimate: zestimate != null && zestimate > 0 ? Math.round(zestimate) : undefined,
          imageUrl: SAMPLE_PHOTOS[0], // Placeholder until photo promise resolves
          yearBuilt: data.details?.year_built ?? undefined,
          lotSize: data.details?.lot_size ?? undefined,
          propertyType: (data.details?.property_type ?? undefined) as IQProperty['propertyType'],
          listingStatus: data.listing?.listing_status || undefined,
          // Enriched data for dynamic scoring
          monthlyRent: monthlyRent,
          propertyTaxes,
          insurance,
          averageDailyRate: averageDailyRate ?? undefined,
          // Use null check (not truthy check) to properly handle 0% occupancy
          occupancyRate: occupancyRate != null ? occupancyRate / 100 : undefined,
          arv: arv ?? undefined,
        }

        setProperty(propertyData)

        // Populate IQ Estimate 3-value sources from API response
        const rentalStats = data.rentals?.rental_stats
        setIqSources({
          value: {
            iq: data.valuations?.value_iq_estimate ?? null,
            zillow: data.valuations?.zestimate ?? null,
            rentcast: data.valuations?.rentcast_avm ?? null,
            redfin: data.valuations?.redfin_estimate ?? null,
          },
          rent: {
            iq: rentalStats?.iq_estimate ?? data.rentals?.monthly_rent_ltr ?? null,
            zillow: rentalStats?.zillow_estimate ?? null,
            rentcast: rentalStats?.rentcast_estimate ?? null,
            redfin: rentalStats?.redfin_estimate ?? null,
          },
        })

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
          // list_price stays as market price; purchase_price override is sent separately
          const record = dealMakerStore.record
          listPriceForCalc = propertyData.price
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
          // list_price stays as the original market/asking price
          listPriceForCalc = propertyData.price
          rentForCalc = overrideMonthlyRent 
            ? parseFloat(overrideMonthlyRent) 
            : (propertyData.monthlyRent || 0)
          taxesForCalc = overridePropertyTaxes 
            ? parseFloat(overridePropertyTaxes) 
            : (propertyData.propertyTaxes || 0)
          insuranceForCalc = overrideInsurance 
            ? parseFloat(overrideInsurance) 
            : (propertyData.insurance || 0)
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
        
        // Fire analysis + photo resolution in parallel (both depend on property
        // search response, but not on each other)
        // Send user's purchase price override separately so the backend
        // keeps list_price as market/asking price for deal gap calculation
        const purchasePriceOverride = overridePurchasePrice
          ? parseFloat(overridePurchasePrice)
          : (isSavedPropertyMode && hasRecord && dealMakerStore.record)
            ? dealMakerStore.record.buy_price
            : undefined

        const analysisBody = {
          list_price: listPriceForCalc,
          purchase_price: purchasePriceOverride,
          monthly_rent: rentForCalc,
          property_taxes: taxesForCalc,
          insurance: insuranceForCalc,
          bedrooms: propertyData.beds,
          bathrooms: propertyData.baths,
          sqft: propertyData.sqft,
          arv: arvForCalc,
          average_daily_rate: propertyData.averageDailyRate,
          occupancy_rate: propertyData.occupancyRate,
          is_listed: isListed,
          zestimate: zestimate ?? undefined,
          current_value_avm: currentAvm ?? undefined,
          tax_assessed_value: taxAssessed ?? undefined,
          listing_status: data.listing?.listing_status || undefined,
          days_on_market: data.listing?.days_on_market ?? undefined,
          seller_type: data.listing?.seller_type || undefined,
          is_foreclosure: data.listing?.is_foreclosure || false,
          is_bank_owned: data.listing?.is_bank_owned || false,
          is_fsbo: data.listing?.is_fsbo || false,
          market_temperature: data.market?.market_stats?.market_temperature || undefined,
        }
        analysisInputsRef.current = analysisBody

        const analysisPromise = api.post<BackendAnalysisResponse & Record<string, any>>(
          '/api/v1/analysis/verdict',
          analysisBody,
        )

        const [analysisData, photosResult] = await Promise.all([
          analysisPromise,
          photoPromise,
        ])

        // Update property photo if we got a real one
        if (photosResult?.success && photosResult.photos?.length > 0 && photosResult.photos[0]?.url) {
          propertyData.imageUrl = photosResult.photos[0].url
          setProperty({ ...propertyData })
        }
          
        // Diagnostic logging — traces exact key formats from backend
        console.log('[IQ Verdict] Raw backend response:', JSON.stringify(analysisData).slice(0, 500))
        console.log('[IQ Verdict] Backend response keys:', Object.keys(analysisData))
        console.log('[IQ Verdict] dealScore:', (analysisData as any).dealScore ?? (analysisData as any).deal_score)
          
        try {
          const analysisResult = parseAnalysisResponse(analysisData, data?.property_id || propertyData?.id)
          setAnalysis(analysisResult)

          // Single source of truth: persist backend list_price, income_value, purchase_price
          // to the same key Strategy reads (dealMaker_${canonicalAddress}) so both pages
          // show the same Market, Target Buy, and Income Value when navigating Verdict → Strategy.
          const backendListPrice = analysisData.list_price ?? analysisData.listPrice
          const backendIncomeValue = analysisData.income_value ?? analysisData.incomeValue
          const backendPurchasePrice = analysisData.purchase_price ?? analysisData.purchasePrice
          if (backendListPrice != null || backendIncomeValue != null || backendPurchasePrice != null) {
            try {
              const stateZip = [propertyData.state, propertyData.zip].filter(Boolean).join(' ')
              const parts = [propertyData.address, propertyData.city, stateZip].filter(Boolean)
              const canonicalAddress = parts.map((p) => String(p).trim().replace(/\s+/g, ' ')).join(', ')
              if (canonicalAddress) {
                const sessionKey = `dealMaker_${encodeURIComponent(canonicalAddress)}`
                const existing = sessionStorage.getItem(sessionKey)
                const parsed = existing ? JSON.parse(existing) : {}
                if (backendListPrice != null) parsed.listPrice = backendListPrice
                if (backendIncomeValue != null) parsed.incomeValue = backendIncomeValue
                if (backendPurchasePrice != null) parsed.purchasePrice = backendPurchasePrice
                parsed.timestamp = Date.now()
                parsed.canonicalAddress = canonicalAddress
                sessionStorage.setItem(sessionKey, JSON.stringify(parsed))
              }
            } catch {
              // Ignore storage errors
            }
          }

          // Use backend list_price as displayed Market (single source of truth)
          if (backendListPrice != null && backendListPrice > 0) {
            setProperty((prev) => {
              if (!prev) return null
              return { ...prev, price: Math.round(backendListPrice) } as IQProperty
            })
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
  }, [addressParam, isSavedPropertyMode, hasRecord, dealMakerStore.record, isClient,
      overridePurchasePrice, overrideMonthlyRent, overridePropertyTaxes, overrideInsurance, overrideArv])

  // Parse backend analysis response into IQAnalysisResult
  const parseAnalysisResponse = useCallback(
    (analysisData: Record<string, any>, propertyId?: string): IQAnalysisResult => ({
      propertyId: propertyId || property?.id,
      analyzedAt: new Date().toISOString(),
      dealScore: Math.min(95, Math.max(0, analysisData.deal_score ?? analysisData.dealScore ?? 0)),
      dealVerdict: (analysisData.deal_verdict ?? analysisData.dealVerdict) as IQAnalysisResult['dealVerdict'],
      verdictDescription: (analysisData.verdict_description ?? analysisData.verdictDescription) as string,
      discountPercent: analysisData.discount_percent ?? analysisData.discountPercent,
      purchasePrice: analysisData.purchase_price ?? analysisData.purchasePrice,
      incomeValue: analysisData.income_value ?? analysisData.incomeValue,
      listPrice: analysisData.list_price ?? analysisData.listPrice,
      incomeGapPercent: analysisData.income_gap_percent ?? analysisData.incomeGapPercent ?? (() => {
        const lp = analysisData.list_price ?? analysisData.listPrice
        const iv = analysisData.income_value ?? analysisData.incomeValue
        return lp != null && iv != null && lp > 0 ? Math.round(((lp - iv) / lp) * 1000) / 10 : undefined
      })(),
      incomeGapAmount: analysisData.income_gap_amount ?? analysisData.incomeGapAmount,
      dealGapPercent: analysisData.deal_gap_percent ?? analysisData.dealGapPercent ?? (() => {
        const lp = analysisData.list_price ?? analysisData.listPrice
        const pp = analysisData.purchase_price ?? analysisData.purchasePrice
        return lp != null && pp != null && lp > 0 ? Math.round(((lp - pp) / lp) * 1000) / 10 : undefined
      })(),
      dealGapAmount: analysisData.deal_gap_amount ?? analysisData.dealGapAmount,
      inputsUsed: analysisData.inputs_used ?? analysisData.inputsUsed,
      strategies: (analysisData.strategies ?? []).map((s: any) => ({
        id: s.id as IQStrategy['id'],
        name: s.name,
        icon: getStrategyIcon(s.id),
        metric: s.metric,
        metricLabel: (s.metric_label ?? s.metricLabel ?? '') as string,
        metricValue: (s.metric_value ?? s.metricValue ?? 0) as number,
        score: s.score,
        rank: s.rank,
        badge: s.badge as IQStrategy['badge'],
      })),
      opportunity: analysisData.opportunity,
      opportunityFactors: (() => {
        const raw = analysisData.opportunity_factors ?? analysisData.opportunityFactors
        if (!raw) return undefined
        return {
          dealGap: raw.deal_gap ?? raw.dealGap,
          motivation: raw.motivation,
          motivationLabel: raw.motivation_label ?? raw.motivationLabel,
          daysOnMarket: raw.days_on_market ?? raw.daysOnMarket,
          buyerMarket: raw.buyer_market ?? raw.buyerMarket,
          distressedSale: raw.distressed_sale ?? raw.distressedSale,
        }
      })(),
      returnRating: analysisData.return_rating ?? analysisData.returnRating,
      returnFactors: analysisData.return_factors ?? analysisData.returnFactors,
      componentScores: (() => {
        const cs = extractComponentScores(analysisData as Record<string, unknown>)
        return {
          dealGapScore: cs.dealGap,
          returnQualityScore: cs.returnQuality,
          marketAlignmentScore: cs.marketAlignment,
          dealProbabilityScore: cs.dealProbability,
        }
      })(),
      dealFactors: (analysisData.deal_factors ?? analysisData.dealFactors ?? []).map((f: any) => ({
        type: f.type as 'positive' | 'warning' | 'info',
        text: f.text as string,
      })),
      discountBracketLabel: (analysisData.discount_bracket_label ?? analysisData.discountBracketLabel ?? '') as string,
    }),
    [property?.id],
  )

  // Re-run verdict analysis when the user switches data sources
  const recalculateVerdict = useCallback(
    async (overrides: { list_price?: number; monthly_rent?: number }) => {
      const base = analysisInputsRef.current
      if (!base) return
      try {
        const body = { ...base, ...overrides }
        const result = await api.post<Record<string, any>>('/api/v1/analysis/verdict', body)
        setAnalysis(parseAnalysisResponse(result))
      } catch (err) {
        console.error('[IQ Verdict] Recalculation failed:', err)
      }
    },
    [parseAnalysisResponse],
  )

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

  // Export — opens the HTML report in a new tab with auto-print for Save-as-PDF
  const handleExport = useCallback((theme: 'light' | 'dark' = 'light') => {
    const propertyId = analysis?.propertyId || 'general'
    const params = new URLSearchParams({
      address: addressParam || '',
      strategy: 'ltr',
      theme,
      propertyId: String(propertyId),
    })
    window.open(`/api/report?${params}`, '_blank')
  }, [analysis?.propertyId, addressParam])

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
  const verdictLabel = getDealVerdict(score)
  const purchasePrice = analysis.purchasePrice || Math.round(property.price * 0.95)
  const incomeValue = analysis.incomeValue || property.price
  const wholesalePrice = Math.round((analysis.listPrice || property.price) * 0.70)
  const monthlyRent = property.monthlyRent || 0
  const discountPct = analysis.discountPercent || 0
  const isListed = property.listingStatus && ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(property.listingStatus)
  const priceLabel = isListed ? 'Asking' : 'Market'
  const incomeGapPct = analysis.incomeGapPercent ?? (() => {
    const lp = analysis.listPrice ?? property.price
    return lp != null && lp > 0 && incomeValue != null ? Math.round(((lp - incomeValue) / lp) * 1000) / 10 : undefined
  })()

  // Deal gap (list vs target buy) — drives score; used in explainer
  const of = analysis.opportunityFactors
  const dealGap = property.price > 0
    ? Math.max(0, ((property.price - purchasePrice) / property.price) * 100)
    : 0

  const dealGapPct = analysis.dealGapPercent ?? (() => {
    const lp = analysis.listPrice ?? property?.price
    return lp != null && lp > 0 && purchasePrice != null ? Math.round(((lp - purchasePrice) / lp) * 1000) / 10 : undefined
  })()
  const verdictDealFactors = analysis.dealFactors ?? []
  const verdictBracketLabel = analysis.discountBracketLabel ?? ''

  // Short line under the score; detail is in VerdictScoreExplainer below
  const shortVerdictDescription = incomeGapPct != null && incomeGapPct > 0
    ? 'Negotiation is needed to reach your target return.'
    : incomeGapPct != null
      ? `At or below Income Value — the numbers can work at current ${priceLabel.toLowerCase()} price.`
      : (analysis.verdictDescription || 'Calculating deal metrics...')

  const fmtCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`
  const fmtShort = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${Math.round(v).toLocaleString()}`

  const navigateToStrategy = () => {
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const parts = [property.address, property.city, stateZip].filter(Boolean)
    const fullAddress = parts.map((p) => String(p).trim().replace(/\s+/g, ' ')).join(', ')
    const params = new URLSearchParams({ address: fullAddress })
    if (conditionParam) params.set('condition', conditionParam)
    if (locationParam) params.set('location', locationParam)
    // Pass current strategy so Strategy page shows the same one
    if (currentStrategy) params.set('strategy', currentStrategy)
    router.push(`/strategy?${params.toString()}`)
  }

  return (
    <>
      <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
        <AnalysisNav />

        {/* Property address bar — link to profile + expandable details */}
        {property && (
          <PropertyAddressBar
            address={property.address}
            city={property.city}
            state={property.state}
            zip={property.zip}
            beds={property.beds}
            baths={property.baths}
            sqft={property.sqft}
            price={property.price}
            listingStatus={property.listingStatus}
            zpid={property.zpid || propertyIdParam || undefined}
          />
        )}

        {/* Responsive container: mobile-first single column, desktop 2-column. Wide: left = Verdict + Score Components, right = Price Targets + Snapshot + CTA. */}
        <div className="max-w-[520px] lg:max-w-6xl xl:max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-0">
          {/* LEFT COLUMN (wide): Verdict + Score Components */}
          <div className="min-w-0 flex flex-col lg:pr-0">
            <VerdictScoreCard
              score={score}
              verdictLabel={verdictLabel}
              description={shortVerdictDescription}
              onHowItWorks={handleShowMethodology}
            />
            {/* IQ Estimate Source Selector — shows all 3 data sources for value & rent */}
            {(iqSources.value.iq != null || iqSources.value.zillow != null || iqSources.value.rentcast != null || iqSources.value.redfin != null ||
              iqSources.rent.iq != null || iqSources.rent.zillow != null || iqSources.rent.rentcast != null) && (
              <section className="px-5 pb-5">
                <IQEstimateSelector
                  sources={iqSources}
                  onSourceChange={(type, _sourceId, _value) => {
                    if (_value == null) return
                    setProperty((prev) => {
                      if (!prev) return prev
                      if (type === 'rent') return { ...prev, monthlyRent: _value } as IQProperty
                      if (type === 'value') return { ...prev, price: _value } as IQProperty
                      return prev
                    })
                    recalculateVerdict(
                      type === 'value'
                        ? { list_price: _value }
                        : { monthly_rent: _value },
                    )
                  }}
                />
              </section>
            )}

            {/* How the Verdict Score Works — unified explainer with Key Deal Factors */}
            <VerdictScoreExplainer
              priceGapPercent={incomeGapPct ?? undefined}
              dealGapPercent={dealGapPct != null ? dealGapPct : undefined}
              priceLabel={priceLabel}
              verdictLabel={verdictLabel}
              bracketLabel={verdictBracketLabel || undefined}
              dealFactors={verdictDealFactors}
              onHowItWorks={handleShowMethodology}
            />
          </div>

          {/* RIGHT COLUMN (wide): Price Targets + Market Snapshot + CTA — sticky sidebar with internal scroll */}
          <div className="min-w-0 lg:border-l lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto" style={{ borderColor: colors.ui.border }}>
          <section className="px-5 py-8 border-t lg:border-t-0 lg:pt-8" style={{ borderColor: colors.ui.border }}>

            <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>
              {score >= 70 ? 'What Should You Pay?' : 'What Would Make This Deal Work?'}
            </h2>
            <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 24, lineHeight: 1.55 }}>
              Every investment property has three price levels. The gap between is what makes or breaks this deal. Change Terms to improve the deal and close the gap.
            </p>

            <div className="flex gap-2.5 items-stretch">
              {[
                { label: 'Wholesale', value: wholesalePrice, sub: '30% net discount', active: false, dominant: false },
                { label: 'Target Buy', value: purchasePrice, sub: 'Positive Cashflow', active: true, dominant: true },
                { label: 'Income Value', value: incomeValue, sub: 'Price where income covers all costs', active: false, dominant: false },
              ].map((card, i) => (
                <div key={i} className={`rounded-xl py-3 px-2 text-center ${card.dominant ? 'flex-[1.2]' : 'flex-1'}`} style={{
                  background: card.active ? cardGlow.active.background : cardGlow.sm.background,
                  border: card.active ? cardGlow.active.border : cardGlow.sm.border,
                  boxShadow: card.active ? cardGlow.active.boxShadow : cardGlow.sm.boxShadow,
                  transition: cardGlow.sm.transition,
                }}>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: card.active ? colors.text.primary : colors.text.tertiary }}>{card.label}</p>
                  <p className={`tabular-nums mb-0.5 font-bold ${card.dominant ? 'text-xl' : 'text-lg'}`} style={{ color: card.active ? colors.brand.blue : colors.text.secondary }}>{fmtShort(card.value)}</p>
                  <p className="text-[8px] font-medium" style={{ color: card.active ? colors.text.body : colors.text.muted }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Price Scale Bar — proportional positions with legend */}
            <div className="mt-6 relative pt-8">
              {(() => {
                const markers = [
                  { label: 'Target Buy', price: purchasePrice, dotColor: colors.brand.blue },
                  { label: 'Income Value', price: incomeValue, dotColor: colors.brand.gold },
                  { label: priceLabel, price: property.price, dotColor: colors.status.negative },
                ].sort((a, b) => a.price - b.price)

                const allPrices = markers.map(m => m.price).filter(p => p > 0)
                const scaleMin = Math.min(...allPrices) * 0.95
                const scaleMax = Math.max(...allPrices) * 1.05
                const range = scaleMax - scaleMin
                const pos = (v: number) => Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

                const targetBuyPos = pos(purchasePrice)
                const marketPos = pos(property.price)
                const bracketLeft = Math.min(targetBuyPos, marketPos)
                const bracketRight = Math.max(targetBuyPos, marketPos)
                const showBracket = dealGap > 0 && (bracketRight - bracketLeft) >= 3

                const incomePos = pos(incomeValue)
                const priceGapLeft = Math.min(incomePos, marketPos)
                const priceGapRight = Math.max(incomePos, marketPos)
                const priceGap = property.price > 0
                  ? ((incomeValue - property.price) / property.price) * 100
                  : 0
                const showPriceGap = Math.abs(priceGap) > 0.1 && (priceGapRight - priceGapLeft) >= 3

                return (
                  <>
                    {showBracket && (
                      <div
                        className="absolute flex items-center"
                        style={{
                          left: `${bracketLeft}%`,
                          width: `${bracketRight - bracketLeft}%`,
                          top: '0.25rem',
                        }}
                      >
                        <div style={{ width: 1, height: 12, background: colors.brand.blue, flexShrink: 0 }} />
                        <div style={{ height: 1, background: colors.brand.blue, flex: 1 }} />
                        <span
                          className="text-[0.65rem] font-bold whitespace-nowrap px-1.5 tabular-nums"
                          style={{ color: colors.brand.blue }}
                        >
                          DEAL GAP &nbsp;-{Math.abs(dealGap).toFixed(1)}%
                        </span>
                        <div style={{ height: 1, background: colors.brand.blue, flex: 1 }} />
                        <div style={{ width: 1, height: 12, background: colors.brand.blue, flexShrink: 0 }} />
                      </div>
                    )}

                    {/* Bar with proportionally-positioned dots */}
                    <div className="relative h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${colors.brand.blue}30, ${colors.brand.gold}30, ${colors.status.negative}25)` }}>
                      {markers.map((m, i) => (
                        <div key={i} className="absolute w-3.5 h-3.5 rounded-full border-2 -top-[3px]"
                          style={{
                            left: `${pos(m.price)}%`,
                            transform: 'translateX(-50%)',
                            background: m.dotColor,
                            borderColor: colors.background.card,
                            boxShadow: `0 0 6px ${m.dotColor}60`,
                          }}
                        />
                      ))}
                    </div>

                    {showPriceGap && (
                      <div
                        className="relative flex items-center mt-2"
                        style={{
                          marginLeft: `${priceGapLeft}%`,
                          width: `${priceGapRight - priceGapLeft}%`,
                        }}
                      >
                        <div style={{ width: 1, height: 12, background: colors.brand.gold, flexShrink: 0 }} />
                        <div style={{ height: 1, background: colors.brand.gold, flex: 1 }} />
                        <span
                          className="text-[0.65rem] font-bold whitespace-nowrap px-1.5 tabular-nums"
                          style={{ color: colors.brand.gold }}
                        >
                          PRICE GAP &nbsp;{priceGap.toFixed(1)}%
                        </span>
                        <div style={{ height: 1, background: colors.brand.gold, flex: 1 }} />
                        <div style={{ width: 1, height: 12, background: colors.brand.gold, flexShrink: 0 }} />
                      </div>
                    )}

                    {/* Legend — sorted by price (matches left-to-right dot order) */}
                    <div className="flex justify-between mt-3">
                      {markers.map((m, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: m.dotColor }} />
                            <span className="text-[0.7rem] font-medium" style={{ color: m.dotColor }}>{m.label}</span>
                          </div>
                          <span className="text-[0.7rem] font-bold tabular-nums" style={{ color: colors.text.body }}>{fmtShort(m.price)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
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

          {/* Market Snapshot removed — deal factors now displayed in left column */}

          {/* 60-second screen callout */}
          <section className="px-5 pb-6">
            <div className="flex gap-3.5 rounded-[14px] p-5" style={{ background: cardGlow.lg.background, border: cardGlow.lg.border, boxShadow: cardGlow.lg.boxShadow, transition: cardGlow.lg.transition }}>
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: colors.accentBg.teal }}>
                <svg width="18" height="18" fill="none" stroke={colors.brand.teal} viewBox="0 0 24 24" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: colors.text.primary }}>This is your 60-second screen.</p>
                <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
                  {score >= 65
                    ? `A score of ${score} means the numbers are worth a closer look. The full financial breakdown — rent comps, expense detail, and strategy-by-strategy analysis — is one tap away.`
                    : `A score of ${score} means the numbers need work. The full financial breakdown — rent comps, expense detail, and strategy-by-strategy analysis — is one tap away.`}
                </p>
              </div>
            </div>
          </section>

          {/* Export Report Button — Pro only */}
          <section className="px-5 pb-6">
            <ProGate feature="Export Full Report" mode="inline">
              <button
                onClick={() => handleExport('light')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[12px] text-[0.85rem] font-semibold hover:opacity-90"
                style={{ background: cardGlow.sm.background, border: cardGlow.sm.border, boxShadow: cardGlow.sm.boxShadow, transition: cardGlow.sm.transition, color: colors.text.body }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Export Full Report
              </button>
            </ProGate>
          </section>

          {/* div-e gradient divider */}
          <div className="mx-5" style={{ height: 1, background: 'linear-gradient(90deg, transparent, #0EA5E9 15%, #34D399 50%, #F97066 85%, transparent)', boxShadow: '0 0 8px rgba(14,165,233,0.4), 0 0 20px rgba(14,165,233,0.15)' }} />

          {/* CTA → Strategy — copy adapts to verdict score */}
          <section className="px-5 py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: colors.brand.teal }}>
              {score >= 65 ? 'This deal passed the screen' : score >= 40 ? 'This deal needs a closer look' : `The numbers don't work at ${isListed ? 'asking price' : 'Zestimate'}`}
            </p>
            <h2 className="text-[1.35rem] font-bold leading-snug mb-3" style={{ color: colors.text.primary }}>
              {score >= 65 ? 'Now Prove It.' : score >= 40 ? 'Find the Angle.' : 'See What Would Work.'}
            </h2>
            <p className="text-[0.95rem] leading-relaxed mx-auto mb-7" style={{ color: colors.text.body }}>
              {score >= 65
                ? 'Get a full financial breakdown across 6 investment strategies — what you\'d pay, what you\'d earn, and whether the numbers actually work.'
                : score >= 40
                ? 'The Deal Gap is larger than a typical negotiated discount, but the right strategy and terms could make it work. See the full financial breakdown to find the approach that fits.'
                : 'See exactly how far off the numbers are — and find the price or strategy that would make this deal work. Consider waiting for a price reduction or adjusting your assumptions.'}
            </p>
            <button onClick={navigateToStrategy} className="inline-flex items-center gap-2 px-7 py-3 rounded-full font-bold text-[0.8rem] text-white transition-all hover:shadow-[0_8px_32px_rgba(14,165,233,0.45)]"
              style={{ background: colors.brand.blueDeep, boxShadow: '0 4px 24px rgba(14,165,233,0.3)' }}>
              Show Me the Numbers
              <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
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

          </div>{/* end right column */}

          {/* Trust Strip — full-width, spans both columns on desktop */}
          <div className="px-5 py-5 text-center border-t lg:col-span-2" style={{ borderColor: colors.ui.border }}>
            <p className="text-xs leading-relaxed" style={{ color: colors.text.secondary }}>
              DealGap IQ analyzes <span className="font-semibold" style={{ color: colors.brand.blue }}>rental income, expenses, market conditions</span> and <span className="font-semibold" style={{ color: colors.brand.blue }}>comparable sales</span> to score every property. No guesswork — just data.
            </p>
          </div>
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
          activePriceTarget={activePriceTarget}
          onPriceTargetChange={(target) => setActivePriceTarget(target)}
          initialValues={(() => {
            const targetBuyPrice = analysis.purchasePrice || Math.round(property.price * 0.95)
            const incomeVal = analysis.incomeValue || property.price
            const wholesaleVal = Math.round((analysis.listPrice || property.price) * 0.70)
            const buyPrice = activePriceTarget === 'breakeven' ? incomeVal
              : activePriceTarget === 'wholesale' ? wholesaleVal
              : targetBuyPrice
            const propertyValues = {
              buyPrice,
              monthlyRent: property.monthlyRent || 0,
              propertyTaxes: property.propertyTaxes || 0,
              insurance: property.insurance || 0,
              arv: property.arv || property.price,
            }
            if (typeof window === 'undefined') return propertyValues
            try {
              const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
              const fullAddr = [property.address, property.city, stateZip].filter(Boolean).join(', ')
              const stored = sessionStorage.getItem(`dealMaker_${encodeURIComponent(fullAddr)}`)
              if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
                  return { ...propertyValues, ...parsed }
                }
              }
            } catch { /* ignore */ }
            return propertyValues
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
