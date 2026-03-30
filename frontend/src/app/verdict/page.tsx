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

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQProperty, 
  IQStrategy,
  IQAnalysisResult,
} from '@/components/iq-verdict'
import { getDealGapTier } from '@/components/iq-verdict/types'
import { IQEstimateSelector, type IQEstimateSources, type DataSourceId } from '@/components/iq-verdict/IQEstimateSelector'
import { parseAddressString } from '@/utils/formatters'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import { usePropertyData } from '@/hooks/usePropertyData'
import { fetchPropertyPhotos } from '@/services/photoService'
import { PropertyPhotoGallery } from '@/components/property-details'
import {
  buildDealMakerSessionKey,
  canonicalizeAddressForIdentity,
  isLikelyFullAddress,
  readDealMakerOverrides,
  writeDealMakerOverrides,
} from '@/utils/addressIdentity'
import { PriceTarget } from '@/lib/priceUtils'
import { ScoreMethodologySheet } from '@/components/iq-verdict/ScoreMethodologySheet'
import { InfoPopover } from '@/components/ui/InfoPopover'
import { VideoModal } from '@/components/ui/VideoModal'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'
import { ProGate } from '@/components/ProGate'
import { trackEvent } from '@/lib/eventTracking'
import { useAuthModal } from '@/hooks/useAuthModal'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'

// Backend analysis response — handles both snake_case and camelCase from Pydantic
interface BackendAnalysisResponse {
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
  deal_factors?: Array<{ type: string; text: string }>
  dealFactors?: Array<{ type: string; text: string }>
  discount_bracket_label?: string; discountBracketLabel?: string
  // Allow additional camelCase fields from alias generator
  [key: string]: unknown
}

function InsightItem({ num, title, detail, delay = 0 }: { num: string; title: ReactNode; detail?: ReactNode; delay?: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300 + delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(6px)',
        transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          minWidth: 28,
          height: 28,
          borderRadius: '50%',
          background: 'var(--color-sky-dim)',
          border: '1px solid var(--accent-sky)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent-sky)',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: 'var(--text-heading)' }}>{title}</p>
        {detail && (
          <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 400, lineHeight: 1.45, color: 'var(--text-secondary)' }}>{detail}</p>
        )}
      </div>
    </div>
  )
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

function VerdictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()

  // Check for saved property mode (when coming from Deal Maker with a propertyId)
  const propertyIdParam = searchParams.get('propertyId')
  const addressParam = searchParams.get('address') || ''
  const cityParam = searchParams.get('city') || undefined
  const stateParam = searchParams.get('state') || undefined
  const zipCodeParam = searchParams.get('zip_code') || undefined
  
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
  const urlMarketValue = searchParams.get('marketValue')
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
      const data = readDealMakerOverrides(addressParam)
      // Check if data is recent (within last hour)
      const ts = data?.timestamp
      if (typeof ts === 'number' && !Number.isNaN(ts) && Date.now() - ts < 3600000) {
        console.log('[IQ Verdict] Loaded Deal Maker values from sessionStorage:', data)
        return data
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
  
  // Use URL params only for purchasePrice — sessionStorage purchasePrice is auto-written
  // by this page's own analysis output, so reading it back creates a feedback loop where
  // the previous Target Buy becomes the next analysis's purchase_price override.
  // DealMaker always navigates here with URL params; saved-property mode uses dealMakerStore directly.
  const overridePurchasePrice = urlPurchasePrice || null
  const overrideMonthlyRent = urlMonthlyRent ?? (sessionData?.monthlyRent != null ? String(sessionData.monthlyRent) : null)
  const overridePropertyTaxes = urlPropertyTaxes ?? (sessionData?.propertyTaxes != null ? String(sessionData.propertyTaxes) : null)
  const overrideInsurance = urlInsurance ?? (sessionData?.insurance != null ? String(sessionData.insurance) : null)
  const overrideArv = urlArv ?? (sessionData?.arv != null ? String(sessionData.arv) : null)
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
  const [propertyPhotos, setPropertyPhotos] = useState<string[]>([])
  const backendFullAddressRef = useRef('')
  
  const [activePriceTarget, setActivePriceTarget] = useState<PriceTarget>('targetBuy')
  const [showMethodologySheet, setShowMethodologySheet] = useState(false)
  const [methodologyScoreType, setMethodologyScoreType] = useState<'verdict' | 'profit'>('verdict')
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // IQ Estimate 3-value sources (populated from API response)
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
  })
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(true)
  const [isDealGapDetailsOpen, setIsDealGapDetailsOpen] = useState(false)
  const [showDealGapVideo, setShowDealGapVideo] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)

  // Stores the static analysis inputs so the verdict can be re-calculated
  // when the user switches data source without re-fetching property data
  const analysisInputsRef = useRef<Record<string, any> | null>(null)
  const hasRecordedAnalysisRef = useRef(false)

  // Reset recording flag when user navigates to a different property (new address or propertyId)
  useEffect(() => {
    hasRecordedAnalysisRef.current = false
  }, [addressParam, propertyIdParam])

  // Analytics: verdict page view (when user landed with a property context)
  useEffect(() => {
    if (addressParam || propertyIdParam) {
      trackEvent('verdict_viewed', {
        has_address: !!addressParam,
        has_property_id: !!propertyIdParam,
      })
    }
  }, [addressParam, propertyIdParam])

  // Record one analysis for Starter usage when verdict loads (address or saved property)
  useEffect(() => {
    if (
      !isLoading &&
      property &&
      analysis &&
      (addressParam || propertyIdParam) &&
      isAuthenticated &&
      !isPro &&
      !hasRecordedAnalysisRef.current
    ) {
      hasRecordedAnalysisRef.current = true
      api
        .post('/api/v1/billing/usage/record-analysis')
        .then(() => queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] }))
        .catch(() => {})
    }
  }, [isLoading, property, analysis, addressParam, propertyIdParam, isAuthenticated, isPro, queryClient])

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
        const data = await fetchProperty(addressParam, {
          city: cityParam,
          state: stateParam,
          zip_code: zipCodeParam,
        })

        // IQ Estimate rent: monthly_rent_ltr is already the IQ Estimate (avg of Zillow + RentCast)
        const monthlyRent = data.rentals?.monthly_rent_ltr || 0

        // Market Price: when listed = List Price; when off-market = API market_price or same fallback as backend
        const isListed =
          data.listing?.listing_status &&
          data.listing.listing_status !== 'OFF_MARKET' &&
          data.listing.listing_status !== 'SOLD' &&
          data.listing.listing_status !== 'FOR_RENT' &&
          data.listing.listing_status !== 'OTHER'
        const iqValueEstimate = data.valuations?.value_iq_estimate ?? null
        const zestimate = data.valuations?.zestimate ?? null
        const currentAvm = data.valuations?.current_value_avm ?? null
        const taxAssessed = data.valuations?.tax_assessed_value ?? null
        const listPrice = data.listing?.list_price ?? null
        const apiMarketPrice = data.valuations?.market_price ?? null

        // Listed → list price; off-market → IQ Estimate (default Data Source).
        // Sequential fallbacks ensure the app remains functional
        // when the primary source is unavailable.
        const price =
          (isListed && listPrice != null && listPrice > 0 ? listPrice : null) ??
          (iqValueEstimate != null && iqValueEstimate > 0 ? iqValueEstimate : null) ??
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

        // Prefer backend-resolved full address to avoid URL/address drift in UI.
        const backendFullAddress = data.address?.full_address || ''
        backendFullAddressRef.current = backendFullAddress
        const parsedAddress = parseAddressString(backendFullAddress || addressParam)

        // Build IQProperty from API data with enriched data for dynamic scoring
        const propertyData: IQProperty = {
          id: data.property_id,
          zpid: data.zpid ?? undefined,
          address: data.address?.street || parsedAddress.street || backendFullAddress || addressParam,
          city: data.address?.city || parsedAddress.city,
          state: data.address?.state || parsedAddress.state,
          zip: data.address?.zip_code || parsedAddress.zip,
          beds: data.details?.bedrooms || FALLBACK_PROPERTY.beds,
          baths: data.details?.bathrooms || FALLBACK_PROPERTY.baths,
          sqft: data.details?.square_footage || FALLBACK_PROPERTY.sqft,
          price: Math.round(price),
          zestimate: zestimate != null && zestimate > 0 ? Math.round(zestimate) : undefined,
          imageUrl: undefined, // Set when photo API returns real photos
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
          latitude: data.address?.latitude ?? undefined,
          longitude: data.address?.longitude ?? undefined,
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
            realtor: data.valuations?.realtor_estimate ?? null,
          },
          rent: {
            iq: rentalStats?.iq_estimate ?? data.rentals?.monthly_rent_ltr ?? null,
            zillow: rentalStats?.zillow_estimate ?? null,
            rentcast: rentalStats?.rentcast_estimate ?? null,
            redfin: rentalStats?.redfin_estimate ?? null,
            realtor: rentalStats?.realtor_estimate ?? null,
          },
        })

        // Store property info to sessionStorage so global AppHeader can access it
        try {
          const stateZip = [propertyData.state, propertyData.zip].filter(Boolean).join(' ')
          const fullAddress = [propertyData.address, propertyData.city, stateZip].filter(Boolean).join(', ')
          writeDealMakerOverrides(fullAddress || addressParam, {
            zpid: propertyData.zpid,
            beds: propertyData.beds,
            baths: propertyData.baths,
            sqft: propertyData.sqft,
            price: propertyData.price,
            listingStatus: propertyData.listingStatus || null,
          })
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
          listPriceForCalc = urlMarketValue
            ? parseFloat(urlMarketValue)
            : propertyData.price
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

        const analysisData = await analysisPromise

        // Diagnostic logging — traces exact key formats from backend
        console.log('[IQ Verdict] Raw backend response:', JSON.stringify(analysisData).slice(0, 500))
        console.log('[IQ Verdict] Backend response keys:', Object.keys(analysisData))
          
        try {
          const analysisResult = parseAnalysisResponse(analysisData, data?.property_id || propertyData?.id)
          setAnalysis(analysisResult)

          // Single source of truth: persist backend list_price, income_value, purchase_price
          // to the same key Strategy reads (dealMaker_${canonicalAddress}) so both pages
          // show the same Market, Target Buy, and Income Value when navigating Verdict → Strategy.
          const backendListPrice = analysisData.list_price ?? analysisData.listPrice
          const backendIncomeValue = analysisData.income_value ?? analysisData.incomeValue
          const backendPurchasePrice = analysisData.purchase_price ?? analysisData.purchasePrice
          // Persist to sessionStorage so Strategy page (and toolbar nav) get same values
          try {
            const stateZip = [propertyData.state, propertyData.zip].filter(Boolean).join(' ')
            const parts = [propertyData.address, propertyData.city, stateZip].filter(Boolean)
            const canonicalAddress = canonicalizeAddressForIdentity(parts.join(', '))
            if (canonicalAddress) {
              const sessionKey = buildDealMakerSessionKey(canonicalAddress)
              const existing = sessionStorage.getItem(sessionKey)
              const parsed = existing ? JSON.parse(existing) : {}
              if (backendListPrice != null) parsed.listPrice = isListed ? backendListPrice : propertyData.price
              if (backendIncomeValue != null) parsed.incomeValue = backendIncomeValue
              if (backendPurchasePrice != null) parsed.purchasePrice = backendPurchasePrice
              parsed.timestamp = Date.now()
              parsed.canonicalAddress = canonicalAddress
              // For saved properties, write full Deal Maker overrides so Strategy recalculates with adjusted values
              if (isSavedPropertyMode && dealMakerStore.record) {
                const record = dealMakerStore.record
                parsed.address = canonicalAddress
                parsed.purchasePrice = record.buy_price
                parsed.buyPrice = record.buy_price
                parsed.monthlyRent = record.monthly_rent
                parsed.propertyTaxes = record.annual_property_tax
                parsed.insurance = record.annual_insurance
                parsed.arv = record.arv
                parsed.rehabBudget = record.rehab_budget
                // Keep parsed.listPrice from backendListPrice (set above) — backend analysis is single source of truth
                parsed.downPayment = Math.round((record.down_payment_pct ?? 0.2) * 100)
                parsed.closingCosts = Math.round((record.closing_costs_pct ?? 0.03) * 100)
                parsed.interestRate = Math.round((record.interest_rate ?? 0.06) * 1000) / 10
                parsed.loanTerm = record.loan_term_years ?? 30
                parsed.vacancyRate = Math.round((record.vacancy_rate ?? 0.05) * 100)
                parsed.managementRate = Math.round((record.management_pct ?? 0) * 100)
              }
              writeDealMakerOverrides(canonicalAddress, parsed)
            }
          } catch {
            // Ignore storage errors
          }

          // For listed properties, the backend list_price is the authoritative asking price.
          // For off-market, the price from the cascade (IQ Estimate default) is kept so the
          // Data Sources selector drives Market Price.
          if (isListed && backendListPrice != null && backendListPrice > 0) {
            setProperty((prev) => {
              if (!prev) return null
              return { ...prev, price: Math.round(backendListPrice) } as IQProperty
            })
            try {
              const stateZip = [propertyData.state, propertyData.zip].filter(Boolean).join(' ')
              const fullAddress = [propertyData.address, propertyData.city, stateZip].filter(Boolean).join(', ')
              writeDealMakerOverrides(fullAddress || addressParam, {
                listPrice: backendListPrice,
                price: Math.round(backendListPrice),
              })
            } catch {
              // Ignore storage errors
            }
          }

          // Phase 2: non-blocking photo fetch — do not await; update property when done
          if (propertyData.zpid) {
            fetchPropertyPhotos(String(propertyData.zpid), { propertyId: propertyData.id }).then((result) => {
              if (result.status === 'success' && result.photos.length > 0) {
                setPropertyPhotos(result.photos)
                setProperty((prev) => (prev ? { ...prev, imageUrl: result.photos[0] } : null))
              }
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
          imageUrl: undefined,
        }
        setProperty(fallbackProperty)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPropertyData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressParam, isSavedPropertyMode, hasRecord, dealMakerStore.record, isClient,
      overridePurchasePrice, overrideMonthlyRent, overridePropertyTaxes, overrideInsurance, overrideArv, urlMarketValue])

  // Parse backend analysis response into IQAnalysisResult
  const parseAnalysisResponse = useCallback(
    (analysisData: Record<string, any>, propertyId?: string): IQAnalysisResult => ({
      propertyId: propertyId || property?.id,
      analyzedAt: new Date().toISOString(),
      dealScore: 0,
      dealVerdict: 'pass' as IQAnalysisResult['dealVerdict'],
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
      dealFactors: (analysisData.deal_factors ?? analysisData.dealFactors ?? []).map((f: any) => ({
        type: f.type as 'positive' | 'warning' | 'info',
        text: f.text as string,
      })),
      discountBracketLabel: (analysisData.discount_bracket_label ?? analysisData.discountBracketLabel ?? '') as string,
      dealNarrative: (analysisData.deal_narrative ?? analysisData.dealNarrative ?? null) as string | null,
    }),
    [property?.id],
  )

  // Re-run verdict analysis when the user switches data sources
  const recalculateVerdict = useCallback(
    async (overrides: { list_price?: number; monthly_rent?: number }) => {
      const base = analysisInputsRef.current
      if (!base) return
      try {
        // Drop stale purchase_price so the backend computes a fresh Target Buy
        // from the updated list_price / monthly_rent via calculate_buy_price().
        const merged: Record<string, any> = { ...base, ...overrides }
        const { purchase_price: _drop, ...body } = merged
        const result = await api.post<Record<string, any>>('/api/v1/analysis/verdict', body)
        setAnalysis(parseAnalysisResponse(result))
      } catch (err) {
        console.error('[IQ Verdict] Recalculation failed:', err)
      }
    },
    [parseAnalysisResponse],
  )

  // Auto-redirect to DealMaker page if navigated with openDealMaker=1
  useEffect(() => {
    if (!isLoading && property && analysis && searchParams.get('openDealMaker') === '1') {
      const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
      const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
      router.replace(`/deal-maker?address=${encodeURIComponent(fullAddress)}&from=verdict`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, property, analysis])

  // Navigation handlers - MUST be defined before any early returns to follow Rules of Hooks
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  // Navigate to Deal Maker page with property data
  const handleNavigateToDealMaker = useCallback(() => {
    if (!property) return
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    router.push(`/deal-maker?address=${encodeURIComponent(fullAddress)}&from=verdict`)
  }, [property, router])

  // Navigate to property details page - requires a Zillow zpid
  // Property page requires address query param for backend fetch
  const handlePropertyClick = useCallback(() => {
    if (!property) return
    // Build address for query param
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const fullAddress = [property.address, property.city, stateZip].filter(Boolean).join(', ')
    const encodedAddress = encodeURIComponent(fullAddress)
    
    const zpid = property.zpid
    if (zpid) {
      router.push(`/property/${zpid}?address=${encodedAddress}`)
    } else {
      // Fallback: no zpid, try search instead
      router.push(`/search?q=${encodedAddress}`)
    }
  }, [property, router])

  // Export — opens the HTML report in a new tab with auto-print for Save-as-PDF
  const handleExport = useCallback((theme: 'light' | 'dark' = 'light') => {
    const propertyId = analysis?.propertyId || 'general'
    const params = new URLSearchParams({
      address: addressParam || '',
      strategy: 'ltr',
      theme,
      propertyId: String(propertyId),
    })
    const reportBase = IS_CAPACITOR ? WEB_BASE_URL : ''
    window.open(`${reportBase}/api/report?${params}`, '_blank')
  }, [analysis?.propertyId, addressParam])

  const handlePDFDownload = useCallback((theme: 'light' | 'dark' = 'light') => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    if (!isPro) {
      alert('Full Report download is a Pro feature. Visit Pricing to upgrade.')
      return
    }
    setIsExporting('pdf')
    handleExport(theme)
    setIsExporting(null)
  }, [handleExport, isAuthenticated, isPro, openAuthModal])

  const handleExcelDownload = useCallback(async () => {
    const propertyId = property?.zpid || propertyIdParam
    if (!propertyId) {
      alert('Property data is still loading. Please wait a moment and try again.')
      return
    }
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    if (!isPro) {
      alert('Excel worksheet download is a Pro feature. Visit Pricing to upgrade.')
      return
    }
    setIsExporting('excel')
    try {
      const params = new URLSearchParams({
        address: addressParam || '',
        strategy: 'ltr',
      })
      const pp = analysis?.purchasePrice ?? (property ? Math.round(property.price * 0.95) : null)
      if (pp != null) params.set('purchase_price', String(pp))
      if (property?.monthlyRent != null) params.set('monthly_rent', String(property.monthlyRent))
      const url = `/api/v1/proforma/property/${propertyId}/excel?${params}`
      const headers: Record<string, string> = {}
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]
      const response = await fetch(url, { headers, credentials: 'include' })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = typeof errorData.detail === 'string' ? errorData.detail : ''
        if (response.status === 401) throw new Error('Please sign in to download the worksheet.')
        if (response.status === 403) throw new Error('Pro subscription required. Upgrade to download the worksheet.')
        if (response.status === 404) throw new Error(detail || 'Property not found.')
        throw new Error(detail || 'Failed to generate Excel report.')
      }
      const contentDisposition = response.headers.get('Content-Disposition')
      const addressSlug = (addressParam || '').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) || 'property'
      let filename = `DealGapIQ_Proforma_${addressSlug}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Excel download failed:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate worksheet. Please try again.')
    } finally {
      setIsExporting(null)
    }
  }, [addressParam, analysis?.purchasePrice, property, propertyIdParam, isAuthenticated, isPro, openAuthModal])

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
    const zpid = property.zpid
    
    switch (tab) {
      case 'analyze':
        // Already on analyze page - no action needed
        break
      case 'details':
        // Navigate to property details page - requires address query param
        if (zpid) {
          router.push(`/property/${zpid}?address=${encodedAddress}`)
        }
        break
      case 'price-checker':
        // Navigate to PriceCheckerIQ page (include zpid when available for reliable comps)
        const compsQuery = new URLSearchParams({ address: fullAddress })
        if (zpid) compsQuery.set('zpid', String(zpid))
        if (property.latitude != null) compsQuery.set('lat', String(property.latitude))
        if (property.longitude != null) compsQuery.set('lng', String(property.longitude))
        router.push(`/price-intel?${compsQuery.toString()}`)
        break
      case 'dashboard':
        router.push('/search')
        break
    }
  }, [property, router])

  // Loading state — pulsating IQ logo until data arrives
  if (isLoading) {
    return <IQLoadingLogo />
  }

  // Error state with no property fallback
  if (!property || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-red-dim)' }}>
            <svg className="w-8 h-8 text-[var(--status-negative)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
            {error || 'Unable to load property'}
          </h2>
          <p className="max-w-md" style={{ color: 'var(--text-body)' }}>
            We couldn&apos;t fetch the property data. Please try again or search for a different address.
          </p>
          {error && error !== 'Unable to load property' && (
            <p className="max-w-md text-sm opacity-80" style={{ color: 'var(--text-secondary)' }}>
              {error}
              {(error === 'Failed to fetch' ||
                error.toLowerCase().includes('network request failed') ||
                error.toLowerCase().includes('allows this origin in cors')) && (
                <span className="block mt-2">Check your connection and that the API backend is reachable. If you use a separate frontend URL (e.g. Vercel), ensure the backend allows your origin in CORS.</span>
              )}
            </p>
          )}
          <button
            onClick={handleBack}
            className="mt-4 px-6 py-2 bg-[var(--accent-sky)] text-[var(--text-inverse)] rounded-full font-bold hover:bg-[var(--accent-sky-light)] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Derived values for display
  const purchasePrice = analysis.purchasePrice || Math.round(property.price * 0.95)
  const incomeValue = analysis.incomeValue || property.price
  const wholesalePrice = Math.round((analysis.listPrice || property.price) * 0.70)
  const monthlyRent = property.monthlyRent || 0
  const isListed = !!property.listingStatus && ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(property.listingStatus)
  const priceLabel = isListed ? 'Asking' : 'Market'
  const of = analysis.opportunityFactors
  // Deal Gap: discount from market/asking to Target Buy price.
  // Positive = discount needed, zero = deal works at market price.
  const rawDealGap = property.price > 0 && purchasePrice > 0
    ? ((property.price - purchasePrice) / property.price) * 100
    : 0
  const dealGapPct = analysis.dealGapPercent ?? rawDealGap
  // Price Gap: how far income value sits above (positive) or below (negative) market
  const priceGapPct = property.price > 0 && incomeValue > 0
    ? ((incomeValue - property.price) / property.price) * 100
    : 0
  const isPositiveIncomeCase = incomeValue > property.price && priceGapPct > 0.1
  // When income exceeds market, display the price gap % as the deal gap (positive).
  // Otherwise use the target-buy-to-market discount (negated for user-facing sign).
  const effectiveDisplayPct = isPositiveIncomeCase ? priceGapPct : -dealGapPct
  const dealGapDisplay = `${effectiveDisplayPct >= 0 ? '+' : ''}${effectiveDisplayPct.toFixed(1)}%`
  const discountAmount = Math.max(0, property.price - purchasePrice)
  // Probability of achieving discount derived from Deal Gap %
  // Based on investor discount bracket distribution: 0% gap → ~95%, 30%+ → ~5%
  const probability = Math.max(5, Math.min(95, Math.round(95 - dealGapPct * 3)))
  const probabilityTail = probability > 50
    ? 'This is well within reach.'
    : probability >= 20
      ? 'Achievable with the right approach.'
      : "You'll need leverage, timing, or a motivated seller."
  const isOffMarket = !isListed
  const tier = getDealGapTier(-effectiveDisplayPct, isListed)
  const sourceKeys: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin', 'realtor']
  const dataSourceCount = sourceKeys.filter((sourceKey) => {
    const valueHasSource = iqSources.value[sourceKey] != null
    const rentHasSource = iqSources.rent[sourceKey] != null
    return valueHasSource || rentHasSource
  }).length
  const hasDataSources = dataSourceCount > 0
  const analysisTimeSeconds = 4.2

  const fmtShort = (v: number) => `$${Math.round(v).toLocaleString()}`

  const navigateToStrategy = (section?: 'purchase' | 'income' | 'rehab') => {
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const parts = [property.address, property.city, stateZip].filter(Boolean)
    let fullAddress = parts.map((p) => String(p).trim().replace(/\s+/g, ' ')).join(', ')

    if (!isLikelyFullAddress(fullAddress) && backendFullAddressRef.current) {
      fullAddress = backendFullAddressRef.current
    }

    const params = new URLSearchParams({ address: fullAddress })
    if (conditionParam) params.set('condition', conditionParam)
    if (locationParam) params.set('location', locationParam)
    if (section) params.set('section', section)
    
    router.push(`/strategy?${params.toString()}`)
  }

  /** Comps tab in nav — PriceCheckerIQ at /price-intel (same params as AnalysisNav "Comps" link). */
  const navigateToComps = () => {
    if (!property) return
    const stateZip = [property.state, property.zip].filter(Boolean).join(' ')
    const parts = [property.address, property.city, stateZip].filter(Boolean)
    let fullAddress = parts.map((p) => String(p).trim().replace(/\s+/g, ' ')).join(', ')

    if (!isLikelyFullAddress(fullAddress) && backendFullAddressRef.current) {
      fullAddress = backendFullAddressRef.current
    }

    const compsQuery = new URLSearchParams({ address: fullAddress })
    const zpid = property.zpid
    if (zpid) compsQuery.set('zpid', String(zpid))
    if (property.latitude != null) compsQuery.set('lat', String(property.latitude))
    if (property.longitude != null) compsQuery.set('lng', String(property.longitude))

    router.push(`/price-intel?${compsQuery.toString()}`)
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--surface-base)]" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
        {/* Header and property bar are provided by AppHeader in layout */}

        {/* Centered single-column container */}
        <div className="w-full px-0 sm:px-8 lg:px-12 xl:px-16 mx-auto">
          {/* Full-width photo gallery */}
          <section className="mx-0 sm:mx-5 mt-6">
            {property.zpid ? (
              <PropertyPhotoGallery
                zpid={String(property.zpid)}
                initialImages={propertyPhotos}
                hideThumbnails
              />
            ) : property.imageUrl ? (
              <div className="rounded-[14px] overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <img
                  src={property.imageUrl}
                  alt={`Property at ${property.address}`}
                  className="w-full object-cover"
                  style={{ height: 400 }}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
          </section>

          {/* Main verdict content */}
          <section
            className="mx-0 sm:mx-5 mt-4 px-3 sm:px-5 py-6 rounded-none sm:rounded-2xl"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card-hover)',
            }}
          >
            {/* Investment Overview — 3 price cards */}
            <div>
              <h2
                className="w-full font-bold leading-tight"
                style={{
                  color: 'var(--text-heading)',
                  marginBottom: 16,
                  fontSize: 'clamp(18px, 2vw, 24px)',
                }}
              >
                Investment Overview
              </h2>
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
                {([
                  {
                    label: 'Profit Zone',
                    value: purchasePrice,
                    color: 'var(--accent-sky)',
                    copy: 'The price you should aim to pay to create positive cash flow.',
                    linkLabel: 'PROFIT ZONE',
                    strategySection: 'purchase' as const,
                  },
                  {
                    label: 'Break-Even Line',
                    value: incomeValue,
                    color: 'var(--status-warning)',
                    copy: 'The break-even price\u2014where rent covers all costs.',
                    linkLabel: 'BREAK-EVEN LINE',
                    strategySection: 'income' as const,
                  },
                  {
                    label: 'Market Reality',
                    value: property.price,
                    color: 'var(--status-negative)',
                    copy: 'The current list price or, for off-market properties, the estimated value based on comparable sales.',
                    linkLabel: 'MARKET REALITY',
                    linkSuffix: 'in Comps',
                    linkToComps: true,
                  },
                ] as const).map((card) => (
                  <div
                    key={card.label}
                    className="rounded-xl py-4 px-4 text-center sm:flex-1 flex flex-col"
                    style={{
                      background: 'var(--surface-card)',
                      border: `1px solid ${card.color}`,
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <p className="text-sm font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-heading)' }}>{card.label}</p>
                    <p className="tabular-nums mb-2 font-bold leading-none" style={{ color: card.color, fontSize: 'clamp(22px, 1.94vw, 28px)' }}>{fmtShort(card.value)}</p>
                    <p className="leading-snug text-left flex-1" style={{ color: 'var(--text-body)', fontSize: 'clamp(13px, 1.1vw, 16px)' }}>{card.copy}</p>
                    <button
                      onClick={'linkToComps' in card ? navigateToComps : () => navigateToStrategy(card.strategySection)}
                      className="mt-3 px-4 py-1.5 rounded-full text-sm font-semibold transition-all hover:opacity-80 cursor-pointer"
                      style={{ color: card.color, background: 'transparent', border: `1.5px solid ${card.color}` }}
                    >
                      Improve {card.linkLabel} {'linkSuffix' in card ? card.linkSuffix : 'in Strategy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Sources Accordion */}
            {hasDataSources && (
              <div
                className="mt-[3px] rounded-xl overflow-hidden"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsDataSourcesOpen((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between"
                  style={{ color: 'var(--text-heading)' }}
                  aria-expanded={isDataSourcesOpen}
                  aria-controls="verdict-data-sources-panel"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] sm:text-[14px] font-bold uppercase tracking-wide">Data Sources</span>
                    <span className="text-[10px] sm:text-[12px]" style={{ color: 'var(--text-label)' }}>
                      {dataSourceCount} source{dataSourceCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${isDataSourcesOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isDataSourcesOpen && (
                  <div id="verdict-data-sources-panel" className="px-3 pb-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <IQEstimateSelector
                      sources={iqSources}
                      highlightIntro
                      showHeader={false}
                      compact
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
                        try {
                          const stateZip = [property?.state, property?.zip].filter(Boolean).join(' ')
                          const fullAddress = [property?.address, property?.city, stateZip].filter(Boolean).join(', ')
                          if (type === 'value') {
                            writeDealMakerOverrides(fullAddress || addressParam, {
                              price: _value,
                              listPrice: _value,
                            })
                          } else {
                            writeDealMakerOverrides(fullAddress || addressParam, {
                              monthlyRent: _value,
                            })
                          }
                        } catch {
                          // Ignore storage errors
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Price scale bar (Deal Gap / Price Gap) */}
            <div className="mt-7 relative" style={{ paddingTop: 0 }}>
              {(() => {
                const markers = [
                  { label: 'Target Buy', price: purchasePrice, dotColor: 'var(--accent-sky)' },
                  { label: 'Income Value', price: incomeValue, dotColor: 'var(--status-warning)' },
                  { label: priceLabel, price: property.price, dotColor: 'var(--status-negative)' },
                ].filter(m => m.price > 0).sort((a, b) => a.price - b.price)

                const allPrices = markers.map(m => m.price)
                const scaleMin = Math.min(...allPrices) * 0.95
                const scaleMax = Math.max(...allPrices) * 1.05
                const range = scaleMax - scaleMin
                const pos = (v: number) => Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

                const targetBuyPos = purchasePrice > 0 ? pos(purchasePrice) : null
                const marketPos = property.price > 0 ? pos(property.price) : null
                const incomePos = incomeValue > 0 ? pos(incomeValue) : null

                // In positive-income case the target-buy-to-market span collapses to ~0.
                // Use the market-to-income span instead so the bracket stays visible.
                const useIncomeBracket = isPositiveIncomeCase && incomePos != null && marketPos != null
                const dealBracketLeft = useIncomeBracket
                  ? Math.min(marketPos!, incomePos!)
                  : (targetBuyPos != null && marketPos != null ? Math.min(targetBuyPos, marketPos) : 0)
                const dealBracketRight = useIncomeBracket
                  ? Math.max(marketPos!, incomePos!)
                  : (targetBuyPos != null && marketPos != null ? Math.max(targetBuyPos, marketPos) : 0)
                const dealBracketPct = useIncomeBracket
                  ? priceGapPct
                  : (property.price > 0 && purchasePrice > 0
                    ? ((property.price - purchasePrice) / property.price) * 100
                    : 0)
                const showDealBracket = (dealBracketRight - dealBracketLeft) >= 3 && Math.abs(dealBracketPct) > 0.1

                const priceGapLeft = incomePos != null && marketPos != null ? Math.min(incomePos, marketPos) : 0
                const priceGapRight = incomePos != null && marketPos != null ? Math.max(incomePos, marketPos) : 0
                const priceGap = property.price > 0 && incomeValue > 0
                  ? ((incomeValue - property.price) / property.price) * 100
                  : 0
                const showPriceGap = incomePos != null && marketPos != null && Math.abs(priceGap) > 0.1 && (priceGapRight - priceGapLeft) >= 3

                return (
                  <>
                    {showDealBracket && (
                      <div
                        className="relative mb-1"
                        style={{
                          marginLeft: `${dealBracketLeft}%`,
                          width: `${dealBracketRight - dealBracketLeft}%`,
                        }}
                      >
                        <p
                          className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mb-0.5"
                          style={{ color: 'var(--accent-sky)' }}
                        >
                          DEAL GAP &nbsp;{effectiveDisplayPct >= 0 ? '+' : ''}{effectiveDisplayPct.toFixed(1)}%
                        </p>
                        <div className="flex items-start">
                          <div style={{ width: 1, height: 14, background: 'var(--accent-sky)', flexShrink: 0 }} />
                          <div style={{ height: 1, background: 'var(--accent-sky)', flex: 1 }} />
                          <div style={{ width: 1, height: 14, background: 'var(--accent-sky)', flexShrink: 0 }} />
                        </div>
                      </div>
                    )}

                    {/* Bar with proportionally-positioned dots */}
                    <div className="relative rounded-full" style={{
                      height: 22,
                      background: 'linear-gradient(90deg, rgba(10,30,60,0.95) 0%, rgba(30,80,140,0.85) 35%, rgba(56,160,220,0.7) 50%, rgba(30,80,140,0.85) 65%, rgba(10,30,60,0.95) 100%)',
                      border: '1.5px solid rgba(56,189,248,0.5)',
                      boxShadow: 'inset 0 0 12px rgba(56,189,248,0.25), 0 0 16px rgba(56,189,248,0.15)',
                    }}>
                      {markers.map((m, i) => (
                        <div key={i} className="absolute rounded-full"
                          style={{
                            width: 18,
                            height: 18,
                            top: '50%',
                            left: `${pos(m.price)}%`,
                            transform: 'translate(-50%, -50%)',
                            background: m.dotColor,
                            boxShadow: `0 0 8px ${m.dotColor}90`,
                          }}
                        />
                      ))}
                    </div>

                    {showPriceGap && (
                      <div
                        className="relative mt-1"
                        style={{
                          marginLeft: `${priceGapLeft}%`,
                          width: `${priceGapRight - priceGapLeft}%`,
                        }}
                      >
                        <div className="flex items-end">
                          <div style={{ width: 1, height: 14, background: 'var(--status-warning)', flexShrink: 0 }} />
                          <div style={{ height: 1, background: 'var(--status-warning)', flex: 1 }} />
                          <div style={{ width: 1, height: 14, background: 'var(--status-warning)', flexShrink: 0 }} />
                        </div>
                        <p
                          className="text-center text-[16px] sm:text-[20px] font-bold whitespace-nowrap tabular-nums mt-0.5"
                          style={{ color: 'var(--status-warning)', marginBottom: 8 }}
                        >
                          PRICE GAP &nbsp;{priceGap.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Deal Gap Summary — two-column layout with video */}
            <div
              className="mt-6 rounded-xl px-5 py-4"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="flex flex-col md:flex-row md:gap-6">
                {/* Left column: headline, verdict, links */}
                <div className="flex-1 min-w-0">
                  {/* Headline metric + tier badge */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <span style={{ fontFamily: "var(--font-source-sans), 'Source Sans 3', sans-serif", fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 600, lineHeight: 1 }}>
                        <span style={{ color: 'var(--accent-sky)' }}>The</span>{' '}
                        <span style={{ color: 'var(--text-heading)' }}>DealGap</span>
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: 'clamp(26px, 3vw, 36px)',
                          fontWeight: 800,
                          color: 'var(--accent-sky)',
                          lineHeight: 1,
                        }}
                      >
                        {dealGapDisplay}
                      </span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        borderRadius: 999,
                        border: '1px solid var(--border-focus)',
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-heading)',
                        background: 'var(--surface-card)',
                      }}
                    >
                      {tier.label}
                    </span>
                  </div>

                  {/* Verdict copy */}
                  <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--text-body)', maxWidth: 520 }}>
                    {effectiveDisplayPct > 0
                      ? 'This deal cash flows at current terms. Confirm your numbers in Strategy before you move.'
                      : 'The market price exceeds breakeven. Negotiation or creative terms are needed to make this work.'}
                  </p>

                  {/* Action links */}
                  <div className="flex items-center gap-4 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowDealGapVideo(true)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                      style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      What is DealGapIQ?
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDealGapDetailsOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                      style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
                    >
                      {isDealGapDetailsOpen ? 'Hide details' : 'How this was calculated'}
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isDealGapDetailsOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Right column: video thumbnail + CTA */}
                <div className="flex flex-col items-center gap-3 mt-4 md:mt-0 flex-shrink-0" style={{ width: 220 }}>
                  <button
                    type="button"
                    onClick={() => setShowDealGapVideo(true)}
                    className="relative w-full rounded-lg overflow-hidden group"
                    style={{
                      aspectRatio: '16/9',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-subtle)',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <video
                      src="/videos/what-is-dealgapiq.mp4"
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ pointerEvents: 'none' }}
                    />
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 transition-colors"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full transition-transform group-hover:scale-110"
                        style={{
                          width: 40,
                          height: 40,
                          background: 'linear-gradient(135deg, var(--accent-brand-blue), var(--accent-sky))',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
                          <polygon points="6,3 20,12 6,21" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.01em' }}>
                        What is DealGapIQ?
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateToStrategy()}
                    className="w-full px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap"
                    style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
                  >
                    Continue to Strategy
                  </button>
                </div>
              </div>

              {/* Expandable details — full width below both columns */}
              {isDealGapDetailsOpen && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p
                    style={{
                      margin: '0 0 12px',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: 'var(--text-secondary)',
                      maxWidth: 620,
                    }}
                  >
                    {effectiveDisplayPct > 0
                      ? 'A positive DealGap means the asking price falls below your Target Buy — this deal cash flows at current terms. That\u2019s rare. Confirm your numbers in the Strategy tab before you move.'
                      : 'A negative DealGap means the Market Price is higher than Income Value needed to produce a positive cash flow. To make this deal work requires negotiation and/or creative terms. See the breakdown in the Strategy tab and use Dealmaker to craft the optimal deal.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleShowMethodology}
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: 'var(--text-body)', background: 'transparent', border: 'none', padding: 0 }}
                  >
                    <span style={{ fontSize: 12 }}>ⓘ</span>
                    How Deal Gap works
                  </button>
                </div>
              )}

              <VideoModal
                open={showDealGapVideo}
                onClose={() => setShowDealGapVideo(false)}
                src="/videos/what-is-dealgapiq.mp4"
                title="What is DealGapIQ?"
              />
            </div>
          </section>

          {/* Key Insights card */}
          <div className="mx-0 sm:mx-5 mt-4">
            <div
              className="rounded-none sm:rounded-[14px] overflow-hidden"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ padding: '20px 24px 20px' }}>
                <h3
                  style={{
                    margin: '0 0 16px',
                    fontSize: 16,
                    color: 'var(--text-heading)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Key Insights
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <InsightItem
                    num="1"
                    delay={0}
                    title={isOffMarket
                      ? <span><strong style={{ color: 'var(--accent-sky)' }}>Off-market</strong> — not listed for sale</span>
                      : <span><strong style={{ color: 'var(--accent-sky)' }}>Actively listed</strong> — competing buyers</span>
                    }
                    detail={isOffMarket
                      ? "You'd need to make an off-market offer. Confirm the owner's interest first."
                      : 'Speed and terms matter when competing with other buyers.'
                    }
                  />
                  <InsightItem
                    num="2"
                    delay={80}
                    title={
                      <span>
                        Target buy: <strong style={{ color: 'var(--accent-sky)' }}>{fmtShort(purchasePrice)}</strong> ({dealGapDisplay} gap)
                      </span>
                    }
                    detail={`A ${fmtShort(discountAmount)} discount below market value for positive cash flow.`}
                  />
                  <InsightItem
                    num="3"
                    delay={160}
                    title={
                      <span>
                        <strong style={{ color: 'var(--accent-sky)' }}>{probability}%</strong> of investors land this discount
                      </span>
                    }
                    detail={probabilityTail}
                  />

                  {showAllInsights && (
                    <>
                      <InsightItem
                        num="4"
                        delay={0}
                        title={<span>Repairs <strong style={{ color: 'var(--accent-sky)' }}>not included</strong> in initial analysis</span>}
                        detail="Use DealMaker to add a rehab budget and see the impact on returns."
                      />
                      <InsightItem
                        num="5"
                        delay={0}
                        title={
                          <span>
                            Assumes <strong style={{ color: 'var(--accent-sky)' }}>20% down · 6.0% · 30yr</strong>
                          </span>
                        }
                        detail="Edit financing terms in DealMaker to match your actual loan scenario."
                      />
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllInsights((prev) => !prev)}
                  className="flex items-center gap-1.5 mt-3 text-[12px] font-semibold transition-colors"
                  style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
                >
                  {showAllInsights ? 'Show less' : 'Show all insights'}
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${showAllInsights ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Market Snapshot removed — deal factors now displayed in left column */}

          {/* Top Action Buttons — same as Strategy page */}
          <section className="px-3 sm:px-5 pb-6">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleNavigateToDealMaker}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap"
                style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                <span>Change Terms</span>
              </button>
              <button
                onClick={() => handlePDFDownload('light')}
                disabled={isExporting === 'pdf'}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--border-focus)', color: 'var(--accent-sky)' }}
              >
                {isExporting === 'pdf' ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                )}
                <span>{isExporting === 'pdf' ? 'Generating...' : 'Download PDF'}</span>
                {!isPro && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)', lineHeight: 1 }}>Pro</span>}
              </button>
              <button
                onClick={handleExcelDownload}
                disabled={isExporting === 'excel'}
                className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                style={{ background: 'var(--surface-card)', border: '1px solid var(--border-focus)', color: 'var(--accent-sky)' }}
              >
                {isExporting === 'excel' ? (
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                )}
                <span>{isExporting === 'excel' ? 'Generating...' : 'Download Excel'}</span>
                {!isPro && <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider" style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)', lineHeight: 1 }}>Pro</span>}
              </button>
            </div>
          </section>

          {/* div-e gradient divider */}
          <div className="mx-0 sm:mx-5" style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--accent-sky) 15%, var(--status-positive) 50%, var(--status-negative) 85%, transparent)', boxShadow: 'var(--shadow-card)' }} />

          {/* CTA → Strategy — copy adapts to Deal Gap tier */}
          <section className="px-3 sm:px-5 py-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--accent-sky)' }}>
              {dealGapPct <= 10 ? 'This deal passed the screen' : dealGapPct <= 20 ? 'This deal needs a closer look' : `The numbers don't work at ${isListed ? 'asking price' : 'Zestimate'}`}
            </p>
            <h2 className="text-[1.35rem] font-bold leading-snug mb-3" style={{ color: 'var(--text-heading)' }}>
              {dealGapPct <= 10 ? 'Now Prove It.' : dealGapPct <= 20 ? 'Find the Angle.' : 'See What Would Work.'}
            </h2>
            <p className="text-[0.95rem] leading-relaxed mx-auto mb-7" style={{ color: 'var(--text-body)' }}>
              {dealGapPct <= 10
                ? 'Get a full financial breakdown across 6 investment strategies — what you\'d pay, what you\'d earn, and whether the numbers actually work.'
                : dealGapPct <= 20
                ? 'The Deal Gap is larger than a typical negotiated discount, but the right strategy and terms could make it work. See the full financial breakdown to find the approach that fits.'
                : 'See exactly how far off the numbers are — and find the price or strategy that would make this deal work. Consider waiting for a price reduction or adjusting your assumptions.'}
            </p>
            <button onClick={() => navigateToStrategy()} className="inline-flex items-center gap-2 px-7 py-3 sm:px-9 sm:py-4 rounded-full font-bold text-[0.8rem] sm:text-[1.04rem] text-[var(--text-inverse)] transition-all"
              style={{ background: 'var(--accent-sky)', boxShadow: 'var(--shadow-card)' }}>
              Show Me the Numbers
              <svg className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div className="flex justify-center gap-6 mt-5">
              {['Try it Free', 'No signup needed', '60 seconds'].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" fill="none" stroke="var(--accent-sky)" viewBox="0 0 24 24" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span className="text-xs sm:text-[0.94rem] font-medium" style={{ color: 'var(--text-body)' }}>{f}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Trust Strip */}
          <div className="px-3 sm:px-5 py-5 text-center border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-body)' }}>
              DealGap IQ analyzes <span className="font-semibold" style={{ color: 'var(--accent-sky)' }}>rental income, expenses, market conditions</span> and <span className="font-semibold" style={{ color: 'var(--accent-sky)' }}>comparable sales</span> to calculate every Deal Gap. No guesswork — just data.
            </p>
          </div>
        </div>
      </div>

      {/* Deal Gap Methodology Sheet */}
      <ScoreMethodologySheet
        isOpen={showMethodologySheet}
        onClose={() => setShowMethodologySheet(false)}
        currentScore={undefined}
        currentGrade={`${effectiveDisplayPct >= 0 ? '+' : ''}${effectiveDisplayPct.toFixed(1)}% Deal Gap — ${tier.label}`}
        scoreType={methodologyScoreType}
      />

    </>
  )
}

export default function VerdictPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <VerdictContent />
    </Suspense>
  )
}
