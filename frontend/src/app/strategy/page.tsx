'use client'

/**
 * StrategyIQ Page — Financial Deep-Dive (Page 2 of 2)
 * Route: /strategy?address=...
 * 
 * Full financial breakdown, benchmarks, data quality, and next steps.
 * Navigated from VerdictIQ page via "Show Me the Numbers" CTA.
 * 
 * Design: VerdictIQ 3.3 — True black base, Inter typography, Slate text hierarchy
 */

import { useCallback, useEffect, useState, useMemo, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { api } from '@/lib/api-client'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import { usePropertyData } from '@/hooks/usePropertyData'
import { parseAddressString } from '@/utils/formatters'
import {
  canonicalizeAddressForIdentity,
  isInitialOverrideEligible,
  isLikelyFullAddress,
  readDealMakerOverrides,
  writeDealMakerOverrides,
} from '@/utils/addressIdentity'
import { getConditionAdjustment } from '@/utils/property-adjustments'
import { calculateMortgagePayment } from '@/utils/calculations'
import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import { IQEstimateSelector, type IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'
import {
  buildVerdictAnalysisPayload,
  buildVerdictBaseFromPropertyResponse,
  type VerdictPayloadBase,
} from '@/utils/verdictPayload'
import { AuthGate } from '@/components/auth/AuthGate'
import { MarketAnchorNote } from '@/components/iq-verdict/MarketAnchorNote'
import {
  parseStrategyWorksheetSection,
  strategyWorksheetAnchorId,
} from '@/components/iq-verdict/strategyWorksheetSection'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { VideoModal } from '@/components/ui/VideoModal'
import { DealMakerWorksheet } from '@/components/deal-maker/DealMakerWorksheet'
import type {
  StrategyType,
  AnyStrategyState,
  AnyStrategyMetrics,
  LTRDealMakerState,
  LTRDealMakerMetrics,
  STRDealMakerState,
  STRMetrics,
  BRRRRDealMakerState,
  BRRRRMetrics,
  FlipDealMakerState,
  FlipFinancingType,
  FlipMetrics,
  HouseHackDealMakerState,
  HouseHackLoanType,
  HouseHackMetrics,
  WholesaleDealMakerState,
  WholesaleMetrics,
} from '@/components/deal-maker/types'
import {
  DEFAULT_STR_DEAL_MAKER_STATE,
  DEFAULT_BRRRR_DEAL_MAKER_STATE,
  DEFAULT_FLIP_DEAL_MAKER_STATE,
  DEFAULT_HOUSEHACK_DEAL_MAKER_STATE,
  DEFAULT_WHOLESALE_DEAL_MAKER_STATE,
} from '@/components/deal-maker/types'
import type { InlineDealMakerValues } from '@/components/strategy/InlineDealMakerPanel'

// Types from existing verdict system
interface BackendAnalysisResponse {
  deal_score: number
  deal_verdict: string
  verdict_description: string
  discount_percent: number
  strategies: Array<{
    id: string; name: string; metric: string; metric_label: string;
    metric_value: number; score: number; rank: number; badge: string | null;
    cap_rate?: number; cash_on_cash?: number; dscr?: number;
    monthly_cash_flow?: number; annual_cash_flow?: number;
    breakdown?: Record<string, number>;
  }>
  purchase_price: number
  income_value: number
  list_price: number
  return_factors?: {
    capRate?: number
    cashOnCash?: number
    dscr?: number
    annualRoi?: number
  }
  opportunity_factors?: {
    dealGap?: number
    motivation?: number
    motivationLabel?: string
    buyerMarket?: string
  }
  opportunity?: { score?: number }
  [key: string]: any
}

function formatCurrency(v: number): string {
  return `$${Math.round(v).toLocaleString()}`
}

const colors = {
  brand: {
    blue: 'var(--accent-sky)',
    teal: 'var(--accent-sky)',
    gold: 'var(--status-warning)',
  },
  text: {
    primary: 'var(--text-heading)',
    body: 'var(--text-body)',
  },
  background: {
    cardUp: 'var(--surface-card)',
    card: 'var(--surface-card)',
  },
  status: {
    positive: 'var(--status-positive)',
    negative: 'var(--status-negative)',
  },
  accentBg: {
    green: 'var(--color-green-dim)',
    red: 'var(--color-red-dim)',
    gold: 'var(--color-gold-dim)',
  },
  ui: {
    border: 'var(--border-subtle)',
  },
} as const

function toStrategyType(backendId: string): StrategyType {
  const map: Record<string, StrategyType> = {
    'long-term-rental': 'ltr',
    'short-term-rental': 'str',
    'brrrr': 'brrrr',
    'fix-and-flip': 'flip',
    'house-hack': 'house_hack',
    'wholesale': 'wholesale',
  }
  return map[backendId] || 'ltr'
}

function StrategyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading: sessionLoading } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()

  const addressParam = searchParams.get('address') || ''
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  const strategyParam = searchParams.get('strategy')
  const worksheetSectionParam = parseStrategyWorksheetSection(searchParams.get('section'))
  const { fetchProperty } = usePropertyData()
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(() => {
    if (!addressParam) return true
    const canonical = canonicalizeAddressForIdentity(addressParam)
    return !queryClient.getQueryData(['property-search', canonical])
  })
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(strategyParam)
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null, realtor: null },
  })
  const [sourceOverrides, setSourceOverrides] = useState<{ price?: number; monthlyRent?: number }>({})
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [showDealGapVideo, setShowDealGapVideo] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recalcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolvedAddressRef = useRef(addressParam)
  /** After first successful property load, refetches skip full-page loader (DealMaker sliders / session echo). */
  const hasLoadedPropertyRef = useRef(false)

  useEffect(() => {
    hasLoadedPropertyRef.current = false
  }, [addressParam])

  // Overrides from sessionStorage (Verdict / DealMaker page) — drives initial API fetch.
  const [initialOverrides, setInitialOverrides] = useState<Record<string, any> | null>(null)
  // Inline slider overrides — local-only, never re-triggers API fetch.
  const [inlineOverrides, setInlineOverrides] = useState<Record<string, any>>({})
  // Merged view used by all downstream calculations.
  const dealMakerOverrides = useMemo(() => {
    if (!initialOverrides && Object.keys(inlineOverrides).length === 0) return null
    return { ...(initialOverrides ?? {}), ...inlineOverrides }
  }, [initialOverrides, inlineOverrides])

  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    const loadOverrides = () => {
      try {
        const parsed = readDealMakerOverrides(addressParam)
        if (!(parsed?.timestamp && Date.now() - parsed.timestamp < 3600000)) return
        if (isInitialOverrideEligible(parsed)) {
          console.log('[StrategyIQ] Loaded eligible DealMaker overrides from sessionStorage:', parsed)
          setInitialOverrides(parsed)
          const storedListPrice = typeof parsed.listPrice === 'number' ? parsed.listPrice : null
          if (storedListPrice != null && storedListPrice > 0) {
            setSourceOverrides((prev) => ({ ...prev, price: storedListPrice }))
          }
          if (!strategyParam && typeof parsed.strategy === 'string' && parsed.strategy) {
            setSelectedStrategyId(parsed.strategy)
          }
        } else if (parsed?.origin === 'source_selection') {
          const srcPatch: Record<string, number> = {}
          if (typeof parsed.listPrice === 'number' && parsed.listPrice > 0) srcPatch.price = parsed.listPrice
          if (typeof parsed.monthlyRent === 'number' && parsed.monthlyRent > 0) srcPatch.monthlyRent = parsed.monthlyRent
          if (Object.keys(srcPatch).length > 0) {
            setSourceOverrides((prev) => ({ ...prev, ...srcPatch }))
          }
        }
      } catch (e) {
        console.warn('[StrategyIQ] Failed to read sessionStorage:', e)
      }
    }
    loadOverrides()
    // Do not subscribe to dealMakerOverridesUpdated: this page writes session on slider change;
    // re-loading would setInitialOverrides and retrigger full fetch + loading flash. Initial read on mount is enough.
  }, [addressParam, strategyParam])

  const savePropertySnapshot = useMemo(() => {
    if (!addressParam || !propertyInfo) return undefined
    const addr = propertyInfo.address || {}
    return {
      street: addr.street ?? (addressParam.split(',')[0]?.trim() || ''),
      city: addr.city ?? '',
      state: addr.state ?? '',
      zipCode: addr.zip_code ?? addr.zip ?? '',
      bedrooms: propertyInfo.details?.bedrooms,
      bathrooms: propertyInfo.details?.bathrooms,
      sqft: propertyInfo.details?.square_footage,
      listPrice: propertyInfo.price,
      zpid: propertyInfo.zpid,
    }
  }, [addressParam, propertyInfo])

  const resolvedAddress = (propertyInfo?.address?.full_address || addressParam).trim()
  resolvedAddressRef.current = resolvedAddress

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (recalcDebounceRef.current) clearTimeout(recalcDebounceRef.current)
    }
  }, [resolvedAddress])

  const { isSaved, isSaving, save, toggle } = useSaveProperty({
    displayAddress: resolvedAddress,
    propertySnapshot: savePropertySnapshot,
  })

  // Scroll to top on mount — prevents opening mid-page after navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const hasRecordedAnalysisRef = useRef(false)

  useEffect(() => {
    if (
      !isLoading &&
      data &&
      addressParam &&
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
  }, [isLoading, data, addressParam, isAuthenticated, isPro, queryClient])

  const toPayloadBase = useCallback((propInfo: any): VerdictPayloadBase => {
    const v = propInfo?.valuations || propInfo || {}
    return {
      listPrice: propInfo?.price ?? 1,
      monthlyRent: propInfo?.monthlyRent ?? 0,
      propertyTaxes: propInfo?.propertyTaxes ?? 0,
      insurance: propInfo?.insurance ?? 0,
      bedrooms: propInfo?.details?.bedrooms || 3,
      bathrooms: propInfo?.details?.bathrooms || 2,
      sqft: propInfo?.details?.square_footage || 1500,
      arv: propInfo?.arv ?? null,
      averageDailyRate: propInfo?.averageDailyRate ?? null,
      occupancyRate: propInfo?.occupancyRate ?? null,
      isListed: propInfo?._isListed ?? undefined,
      zestimate: v.zestimate ?? undefined,
      currentValueAvm: v.current_value_avm ?? undefined,
      taxAssessedValue: v.tax_assessed_value ?? undefined,
      listingStatus: propInfo?.listing?.listing_status ?? propInfo?.listingStatus ?? undefined,
      daysOnMarket: propInfo?.listing?.days_on_market ?? undefined,
      sellerType: propInfo?.listing?.seller_type ?? undefined,
      isForeclosure: propInfo?.listing?.is_foreclosure || false,
      isBankOwned: propInfo?.listing?.is_bank_owned || false,
      isFsbo: propInfo?.listing?.is_fsbo || false,
      marketTemperature: propInfo?.market?.market_stats?.market_temperature || undefined,
    }
  }, [])

  // Debounced backend recalculation — calls verdict API with all current overrides
  const recalcVerdict = useCallback(async (
    propInfo: any,
    overrides: Record<string, any> | null,
    srcOverrides: { price?: number; monthlyRent?: number },
  ) => {
    if (!propInfo) return
    try {
      setIsRecalculating(true)
      const payload = buildVerdictAnalysisPayload(toPayloadBase(propInfo), overrides, srcOverrides)
      const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', payload)
      setData(analysis)
    } catch (err) {
      console.error('[StrategyIQ] Recalculation failed:', err)
    } finally {
      setIsRecalculating(false)
    }
  }, [toPayloadBase])

  useEffect(() => {
    async function fetchData() {
      if (!addressParam) { setError('No address'); setIsLoading(false); return }

      let fetchAddr = addressParam
      if (!isLikelyFullAddress(fetchAddr) && typeof window !== 'undefined') {
        const activeAddr = sessionStorage.getItem('dealMaker_activeAddress')
        // Match the full street segment (before first comma) rather than just
        // a prefix, so "1451 NW 10th St" doesn't wrongly match "1451 SW 10th St"
        const inputStreet = fetchAddr.split(',')[0].trim().toLowerCase()
        const activeStreet = activeAddr?.split(',')[0].trim().toLowerCase()
        if (
          activeAddr &&
          isLikelyFullAddress(activeAddr) &&
          inputStreet === activeStreet
        ) {
          fetchAddr = activeAddr
        }
      }

      const canonical = canonicalizeAddressForIdentity(fetchAddr)
      const hasCachedProperty = !!queryClient.getQueryData(['property-search', canonical])
      const showBlockingLoader = !hasCachedProperty && !hasLoadedPropertyRef.current
      try {
        if (showBlockingLoader) setIsLoading(true)
        const propData = await fetchProperty(fetchAddr)
        const baseDefaults = buildVerdictBaseFromPropertyResponse(propData, {
          condition: conditionParam ? Number(conditionParam) : null,
          location: locationParam ? Number(locationParam) : null,
        })
        let price = baseDefaults.listPrice
        let monthlyRent = baseDefaults.monthlyRent
        let propertyTaxes = baseDefaults.propertyTaxes
        let insuranceVal = baseDefaults.insurance

        if (dealMakerOverrides) {
          if (dealMakerOverrides.listPrice != null && dealMakerOverrides.listPrice > 0) {
            price = dealMakerOverrides.listPrice
          } else if (dealMakerOverrides.buyPrice != null || dealMakerOverrides.purchasePrice != null) {
            price = dealMakerOverrides.buyPrice ?? dealMakerOverrides.purchasePrice
          }
          if (dealMakerOverrides.monthlyRent != null) monthlyRent = dealMakerOverrides.monthlyRent
          if (dealMakerOverrides.propertyTaxes != null) propertyTaxes = dealMakerOverrides.propertyTaxes
          if (dealMakerOverrides.insurance != null) insuranceVal = dealMakerOverrides.insurance
        }

        const isListed = !!baseDefaults.isListed && price > 0
        const enrichedPropInfo = { ...propData, price, monthlyRent, propertyTaxes, insurance: insuranceVal, _isListed: isListed }
        setPropertyInfo(enrichedPropInfo)

        const rentalStats = propData.rentals?.rental_stats
        setIqSources({
          value: {
            iq: propData.valuations?.value_iq_estimate ?? null,
            zillow: propData.valuations?.zestimate ?? null,
            rentcast: propData.valuations?.rentcast_avm ?? null,
            redfin: propData.valuations?.redfin_estimate ?? null,
            realtor: propData.valuations?.realtor_estimate ?? null,
          },
          rent: {
            iq: rentalStats?.iq_estimate ?? propData.rentals?.monthly_rent_ltr ?? null,
            zillow: rentalStats?.zillow_estimate ?? null,
            rentcast: rentalStats?.rentcast_estimate ?? null,
            redfin: rentalStats?.redfin_estimate ?? null,
            realtor: rentalStats?.realtor_estimate ?? null,
          },
        })

        const payload = buildVerdictAnalysisPayload(toPayloadBase(enrichedPropInfo), dealMakerOverrides, sourceOverrides)
        const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', payload)
        setData(analysis)
        hasLoadedPropertyRef.current = true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (showBlockingLoader) setIsLoading(false)
      }
    }
    fetchData()
  // Inline slider changes merge into dealMakerOverrides but must NOT refetch property + full-page loader — use debounced recalcVerdict only.
  // sourceOverrides changes are handled by recalcVerdict from IQ selector, not a full refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps
  }, [addressParam, conditionParam, locationParam, initialOverrides, toPayloadBase, fetchProperty])

  const handleBack = useCallback(() => {
    router.push(`/verdict?address=${encodeURIComponent(resolvedAddress)}`)
  }, [router, resolvedAddress])

  const handleStrategyChange = useCallback((strategyId: string) => {
    setSelectedStrategyId(strategyId)
    const merged = { ...(initialOverrides ?? {}), ...inlineOverrides }
    recalcVerdict(propertyInfo, merged, sourceOverrides)
  }, [initialOverrides, inlineOverrides, propertyInfo, sourceOverrides, recalcVerdict])

  // Trigger debounced backend recalculation when sliders change
  const scheduleRecalc = useCallback((nextOverrides: Record<string, any>, nextSourceOverrides?: { price?: number; monthlyRent?: number }) => {
    if (recalcDebounceRef.current) clearTimeout(recalcDebounceRef.current)
    recalcDebounceRef.current = setTimeout(() => {
      const merged = { ...(initialOverrides ?? {}), ...nextOverrides }
      recalcVerdict(propertyInfo, merged, nextSourceOverrides ?? sourceOverrides)
    }, 500)
  }, [initialOverrides, propertyInfo, sourceOverrides, recalcVerdict])

  const handleInlineSliderChange = useCallback((field: keyof InlineDealMakerValues, value: number) => {
    const FIELD_MAP: Record<keyof InlineDealMakerValues, { key: string; toOverride?: (v: number) => number }> = {
      buyPrice: { key: 'purchasePrice' },
      downPayment: { key: 'downPayment', toOverride: (v) => v * 100 },
      closingCosts: { key: 'closingCosts', toOverride: (v) => v * 100 },
      interestRate: { key: 'interestRate' },
      loanTerm: { key: 'loanTerm' },
      rehabBudget: { key: 'rehabBudget' },
      marketValue: { key: 'listPrice' },
      arv: { key: 'arv' },
      monthlyRent: { key: 'monthlyRent' },
      vacancyRate: { key: 'vacancyRate', toOverride: (v) => v * 100 },
      propertyTaxes: { key: 'propertyTaxes' },
      insurance: { key: 'insurance' },
      managementRate: { key: 'managementRate', toOverride: (v) => v * 100 },
    }
    const mapping = FIELD_MAP[field]
    const overrideValue = mapping.toOverride ? mapping.toOverride(value) : value
    if (field === 'marketValue') {
      setSourceOverrides((prev) => ({ ...prev, price: value }))
    }
    setInlineOverrides((prev) => {
      const next = { ...prev, [mapping.key]: overrideValue }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        try { writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'dealmaker_edit' }) } catch { /* ignore */ }
      }, 300)
      scheduleRecalc(next)
      return next
    })
  }, [scheduleRecalc])

  useEffect(() => {
    if (isLoading || sessionLoading || !data || !worksheetSectionParam) return
    const id = strategyWorksheetAnchorId(worksheetSectionParam)
    const delay = isAuthenticated ? 400 : 550
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, delay)
    return () => window.clearTimeout(t)
  }, [isLoading, sessionLoading, data, worksheetSectionParam, isAuthenticated])

  if (isLoading) {
    return <IQLoadingLogo />
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-xl font-bold" style={{ color: colors.text.primary }}>{error || 'Unable to load'}</p>
          <button onClick={handleBack} className="mt-4 px-6 py-2 bg-[var(--accent-sky)] text-[var(--text-inverse)] rounded-full font-bold">
            Back to Verdict
          </button>
        </div>
      </div>
    )
  }

  // Strategy selection — user-chosen > URL param > long-term-rental default
  // Default to Long-Term Rental because Target Buy is calculated using that model;
  // other strategies may show a loss at the Target Buy price.
  const sortedStrategies = data.strategies?.length
    ? [...data.strategies].sort((a, b) => b.score - a.score)
    : []
  const topStrategy = selectedStrategyId
    ? sortedStrategies.find(s => s.id === selectedStrategyId) || sortedStrategies[0] || null
    : sortedStrategies.find(s => s.id === 'long-term-rental') || sortedStrategies[0] || null
  const topStrategyName = topStrategy?.name || 'Long-Term Rental'
  const recommendedStrategyName = sortedStrategies[0]?.name || 'Long-Term Rental'
  const activeStrategyId = topStrategy?.id || 'long-term-rental'
  const currentStrategyType = toStrategyType(activeStrategyId)

  // Score — capped at 95 (no deal is 100% certain)
  const verdictScore = Math.min(95, Math.max(0, data.deal_score ?? (data as any).dealScore ?? 0))

  // All financial values are backend-authoritative — sourced from the verdict API response.
  // When sliders change, a debounced backend recalc fires and updates `data`.
  const listPrice = data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? 0
  const targetPrice = data.purchase_price ?? (data as any).purchasePrice ?? Math.round(listPrice * 0.85)
  const parsed = parseAddressString(addressParam)

  // Strategy-specific financial breakdown from backend
  const bd = topStrategy?.breakdown as Record<string, number> | undefined
  const inputsUsed = (data.inputs_used ?? (data as any).inputsUsed ?? {}) as Record<string, number | undefined>

  // All derived financials come from the backend breakdown
  const monthlyRent = bd?.monthly_rent ?? propertyInfo?.monthlyRent ?? 0
  const propertyTaxes = bd?.property_taxes ?? propertyInfo?.propertyTaxes ?? 0
  const insurance = bd?.insurance ?? propertyInfo?.insurance ?? 0
  // Prefer explicit DealMaker/session rehab so sliders win over stale breakdown during debounce;
  // backend `rehab_cost` of 0 must not block a user-entered budget (use `??` only after override check).
  const rehabCost =
    dealMakerOverrides != null && dealMakerOverrides.rehabBudget != null
      ? dealMakerOverrides.rehabBudget
      : (bd?.rehab_cost ??
        (conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0))

  const rate = bd?.interest_rate != null
    ? bd.interest_rate / 100
    : (inputsUsed.interest_rate ?? 0.06)
  const downPaymentPct = bd?.down_payment_pct != null
    ? bd.down_payment_pct / 100
    : (inputsUsed.down_payment_pct ?? 0.20)
  const closingCostsPct = bd?.closing_costs_pct != null
    ? bd.closing_costs_pct / 100
    : (inputsUsed.closing_costs_pct ?? 0.03)
  const loanTermYears = bd?.loan_term_years ?? inputsUsed.loan_term_years ?? 30
  const vacancyPct = bd?.vacancy_rate != null
    ? bd.vacancy_rate / 100
    : (inputsUsed.vacancy_rate ?? 0.05)
  const mgmtPct = bd?.management_pct != null
    ? bd.management_pct / 100
    : (inputsUsed.management_pct ?? 0.08)
  const maintPct = bd?.maintenance_pct != null
    ? bd.maintenance_pct / 100
    : (inputsUsed.maintenance_pct ?? 0.05)
  const reservesPct = bd?.reserves_pct != null
    ? bd.reserves_pct / 100
    : (inputsUsed.capex_pct ?? 0.05)

  const downPayment = bd?.down_payment ?? targetPrice * downPaymentPct
  const closingCosts = bd?.closing_costs ?? targetPrice * closingCostsPct
  // BRRRR backend breakdown uses refinance loan for `loan_amount` / debt service (post-refi model).
  // This page always renders the LTR-style worksheet, so show acquisition P&I tied to Target Buy.
  const purchaseLoanAmount = Math.max(0, targetPrice - downPayment)
  let loanAmount =
    activeStrategyId === 'brrrr'
      ? purchaseLoanAmount
      : (bd?.loan_amount ?? purchaseLoanAmount)
  let monthlyPI = bd?.monthly_payment ?? 0
  if (activeStrategyId === 'brrrr') {
    monthlyPI = calculateMortgagePayment(loanAmount, rate * 100, loanTermYears)
  }
  const annualRent = bd?.annual_gross_rent ?? monthlyRent * 12
  const vacancyLoss = bd?.vacancy_loss ?? annualRent * vacancyPct
  const effectiveIncome = bd?.effective_income ?? annualRent - vacancyLoss
  const mgmt = bd?.management ?? annualRent * mgmtPct
  const maint = bd?.maintenance ?? annualRent * maintPct
  const reserves = bd?.reserves ?? annualRent * reservesPct
  const totalExpenses = bd?.total_operating_expenses ?? propertyTaxes + insurance + mgmt + maint + reserves
  const noi = bd?.noi ?? effectiveIncome - totalExpenses
  const annualDebt =
    activeStrategyId === 'brrrr' ? monthlyPI * 12 : (bd?.annual_debt_service ?? monthlyPI * 12)
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  const isFlipOrWholesale = activeStrategyId === 'fix-and-flip' || activeStrategyId === 'wholesale'

  const totalCashNeeded = downPayment + closingCosts + rehabCost
  const dealGapPct = listPrice ? ((listPrice - targetPrice) / listPrice) * 100 : 0
  const strategyDscr =
    activeStrategyId === 'brrrr' && annualDebt > 0
      ? noi / annualDebt
      : (topStrategy?.dscr ?? null)

  // Rental strategies: derive all metrics from breakdown values so the metrics
  // bar, summary cards, and breakdown section stay internally consistent.
  // Flip/wholesale use backend strategy-level metrics (different economics model).
  const strategyCashFlow = isFlipOrWholesale
    ? (topStrategy?.monthly_cash_flow ?? monthlyCashFlow)
    : monthlyCashFlow
  const strategyAnnualCashFlow = isFlipOrWholesale
    ? (topStrategy?.annual_cash_flow ?? annualCashFlow)
    : annualCashFlow
  const capRateVal = isFlipOrWholesale
    ? ((topStrategy as { cap_rate?: number; capRate?: number })?.capRate ?? topStrategy?.cap_rate ?? null)
    : (targetPrice > 0 ? (noi / targetPrice) * 100 : null)
  const cocVal = isFlipOrWholesale
    ? ((topStrategy as { cash_on_cash?: number; cashOnCash?: number })?.cashOnCash ?? topStrategy?.cash_on_cash ?? null)
    : (totalCashNeeded > 0 ? (annualCashFlow / totalCashNeeded) * 100 : null)
  const benchmarks = isFlipOrWholesale
    ? [
        { metric: 'ROI', value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—', target: '20%', status: (cocVal !== null && cocVal >= 20) ? 'good' : 'poor' },
        { metric: 'Profit', value: formatCurrency(strategyAnnualCashFlow), target: '+$30K', status: strategyAnnualCashFlow >= 30000 ? 'good' : 'poor' },
      ]
    : [
        { metric: 'Cap Rate', value: capRateVal !== null ? `${capRateVal.toFixed(1)}%` : '—', target: '6.0%', status: (capRateVal !== null && capRateVal >= 6.0) ? 'good' : 'poor' },
        { metric: 'Cash-on-Cash', value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—', target: '8.0%', status: (cocVal !== null && cocVal >= 8.0) ? 'good' : 'poor' },
        { metric: 'Monthly Cash Flow', value: formatCurrency(strategyCashFlow), target: '+$300', status: strategyCashFlow >= 300 ? 'good' : 'poor' },
        ...(strategyDscr != null ? [{ metric: 'DSCR', value: strategyDscr.toFixed(2), target: '1.25', status: strategyDscr >= 1.25 ? 'good' : 'poor' }] : []),
      ]

  const worksheetState: AnyStrategyState = (() => {
    const io = inlineOverrides as Record<string, number | undefined>
    const arvVal = io.arv ?? bd?.arv ?? data?.inputs_used?.arv ?? listPrice

    switch (currentStrategyType) {
      case 'str': {
        const adr = bd?.adr ?? DEFAULT_STR_DEAL_MAKER_STATE.averageDailyRate
        const occRate = bd?.occupancy_rate != null ? bd.occupancy_rate / 100 : DEFAULT_STR_DEAL_MAKER_STATE.occupancyRate
        return {
          buyPrice: io.purchasePrice ?? targetPrice,
          downPaymentPercent: io.downPayment != null ? io.downPayment / 100 : downPaymentPct,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          loanType: '30-year' as const,
          interestRate: io.interestRate ?? rate,
          loanTermYears: io.loanTerm ?? loanTermYears,
          rehabBudget: io.rehabBudget ?? rehabCost,
          arv: arvVal,
          furnitureSetupCost: io.furnitureSetupCost ?? bd?.furniture_setup ?? DEFAULT_STR_DEAL_MAKER_STATE.furnitureSetupCost,
          averageDailyRate: io.averageDailyRate ?? adr,
          occupancyRate: io.occupancyRate ?? occRate,
          cleaningFeeRevenue: io.cleaningFeeRevenue ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningFeeRevenue,
          avgLengthOfStayDays: io.avgLengthOfStayDays ?? DEFAULT_STR_DEAL_MAKER_STATE.avgLengthOfStayDays,
          platformFeeRate: io.platformFeeRate ?? (bd?.platform_fees_pct != null ? bd.platform_fees_pct / 100 : DEFAULT_STR_DEAL_MAKER_STATE.platformFeeRate),
          strManagementRate: io.strManagementRate ?? (bd?.management_pct != null ? bd.management_pct / 100 : DEFAULT_STR_DEAL_MAKER_STATE.strManagementRate),
          cleaningCostPerTurnover: io.cleaningCostPerTurnover ?? DEFAULT_STR_DEAL_MAKER_STATE.cleaningCostPerTurnover,
          suppliesMonthly: io.suppliesMonthly ?? (bd?.supplies != null ? bd.supplies / 12 : DEFAULT_STR_DEAL_MAKER_STATE.suppliesMonthly),
          additionalUtilitiesMonthly: io.additionalUtilitiesMonthly ?? (bd?.utilities != null ? bd.utilities / 12 : DEFAULT_STR_DEAL_MAKER_STATE.additionalUtilitiesMonthly),
          maintenanceRate: io.maintenanceRate ?? maintPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: 0,
        } satisfies STRDealMakerState
      }

      case 'brrrr':
        return {
          purchasePrice: io.purchasePrice ?? targetPrice,
          buyDiscountPct: io.buyDiscountPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.buyDiscountPct,
          downPaymentPercent: io.downPayment != null ? io.downPayment / 100 : downPaymentPct,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          hardMoneyRate: io.hardMoneyRate ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.hardMoneyRate,
          rehabBudget: io.rehabBudget ?? rehabCost,
          contingencyPct: io.contingencyPct ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.contingencyPct,
          holdingPeriodMonths: io.holdingPeriodMonths ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingPeriodMonths,
          holdingCostsMonthly: io.holdingCostsMonthly ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.holdingCostsMonthly,
          arv: arvVal,
          postRehabMonthlyRent: io.monthlyRent ?? monthlyRent,
          postRehabRentIncreasePct: DEFAULT_BRRRR_DEAL_MAKER_STATE.postRehabRentIncreasePct,
          refinanceLtv: io.refinanceLtv ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceLtv,
          refinanceInterestRate: io.refinanceInterestRate ?? (bd?.interest_rate != null ? bd.interest_rate / 100 : DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceInterestRate),
          refinanceTermYears: bd?.loan_term_years ?? DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceTermYears,
          refinanceClosingCostsPct: DEFAULT_BRRRR_DEAL_MAKER_STATE.refinanceClosingCostsPct,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: io.monthlyHoa ?? 0,
        } satisfies BRRRRDealMakerState

      case 'flip':
        return {
          purchasePrice: io.purchasePrice ?? targetPrice,
          purchaseDiscountPct: io.purchaseDiscountPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.purchaseDiscountPct,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          financingType: (inlineOverrides.financingType as FlipFinancingType) ?? 'hardMoney',
          hardMoneyLtv: io.hardMoneyLtv ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyLtv,
          hardMoneyRate: io.hardMoneyRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.hardMoneyRate,
          loanPoints: io.loanPoints ?? DEFAULT_FLIP_DEAL_MAKER_STATE.loanPoints,
          rehabBudget: io.rehabBudget ?? rehabCost,
          contingencyPct: io.contingencyPct ?? DEFAULT_FLIP_DEAL_MAKER_STATE.contingencyPct,
          rehabTimeMonths: io.rehabTimeMonths ?? bd?.holding_months ?? DEFAULT_FLIP_DEAL_MAKER_STATE.rehabTimeMonths,
          arv: arvVal,
          holdingCostsMonthly: io.holdingCostsMonthly ?? ((propertyTaxes / 12) + (insurance / 12) + 200),
          daysOnMarket: io.daysOnMarket ?? DEFAULT_FLIP_DEAL_MAKER_STATE.daysOnMarket,
          sellingCostsPct: io.sellingCostsPct ?? (bd?.selling_costs_pct != null ? bd.selling_costs_pct / 100 : DEFAULT_FLIP_DEAL_MAKER_STATE.sellingCostsPct),
          capitalGainsRate: io.capitalGainsRate ?? DEFAULT_FLIP_DEAL_MAKER_STATE.capitalGainsRate,
        } satisfies FlipDealMakerState

      case 'house_hack': {
        const totalBeds = bd?.total_bedrooms ?? propertyInfo?.details?.bedrooms ?? 4
        const rentPerRoom = bd?.rent_per_room ?? (monthlyRent / Math.max(totalBeds, 1))
        return {
          purchasePrice: io.purchasePrice ?? targetPrice,
          totalUnits: io.totalUnits ?? totalBeds,
          ownerOccupiedUnits: io.ownerOccupiedUnits ?? 1,
          ownerUnitMarketRent: rentPerRoom,
          loanType: (inlineOverrides.loanType as HouseHackLoanType) ?? 'fha',
          downPaymentPercent: io.downPayment != null ? io.downPayment / 100 : (bd?.down_payment_pct != null ? bd.down_payment_pct / 100 : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.downPaymentPercent),
          interestRate: io.interestRate ?? (bd?.interest_rate != null ? bd.interest_rate / 100 : DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.interestRate),
          loanTermYears: io.loanTerm ?? (bd?.loan_term_years ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.loanTermYears),
          pmiRate: io.pmiRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.pmiRate,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          avgRentPerUnit: io.avgRentPerUnit ?? rentPerRoom,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          currentHousingPayment: io.currentHousingPayment ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.currentHousingPayment,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: io.monthlyHoa ?? 0,
          utilitiesMonthly: io.utilitiesMonthly ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.utilitiesMonthly,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          capexRate: io.capexRate ?? DEFAULT_HOUSEHACK_DEAL_MAKER_STATE.capexRate,
        } satisfies HouseHackDealMakerState
      }

      case 'wholesale': {
        const contractPrice = io.purchasePrice ?? targetPrice
        return {
          arv: arvVal,
          estimatedRepairs: io.rehabBudget ?? rehabCost,
          squareFootage: propertyInfo?.details?.square_footage ?? 1500,
          contractPrice,
          earnestMoney: io.earnestMoney ?? bd?.emd ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.earnestMoney,
          inspectionPeriodDays: io.inspectionPeriodDays ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.inspectionPeriodDays,
          daysToClose: io.daysToClose ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.daysToClose,
          assignmentFee: io.assignmentFee ?? bd?.assignment_fee ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.assignmentFee,
          marketingCosts: io.marketingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.marketingCosts,
          closingCosts: io.closingCosts ?? DEFAULT_WHOLESALE_DEAL_MAKER_STATE.closingCosts,
        } satisfies WholesaleDealMakerState
      }

      case 'ltr':
      default:
        return {
          buyPrice: io.purchasePrice ?? targetPrice,
          downPaymentPercent: io.downPayment != null ? io.downPayment / 100 : downPaymentPct,
          closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
          interestRate: io.interestRate ?? rate,
          loanTermYears: io.loanTerm ?? loanTermYears,
          rehabBudget: io.rehabBudget ?? rehabCost,
          arv: arvVal,
          monthlyRent: io.monthlyRent ?? monthlyRent,
          otherIncome: 0,
          vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
          maintenanceRate: io.maintenanceRate ?? maintPct,
          managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
          annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
          annualInsurance: io.insurance ?? insurance,
          monthlyHoa: 0,
        } satisfies LTRDealMakerState
    }
  })()

  const worksheetMetrics = (() => {
    switch (currentStrategyType) {
      case 'str': {
        const strState = worksheetState as STRDealMakerState
        const adr = strState.averageDailyRate
        const occ = strState.occupancyRate
        const annualRevenue = bd?.annual_gross_revenue ?? adr * 365 * occ
        const nightsOcc = Math.round(365 * occ)
        const turnovers = Math.ceil(nightsOcc / strState.avgLengthOfStayDays)
        return {
          cashNeeded: totalCashNeeded,
          totalInvestmentWithFurniture: totalCashNeeded + strState.furnitureSetupCost,
          downPaymentAmount: downPayment,
          closingCostsAmount: closingCosts,
          loanAmount,
          monthlyPayment: monthlyPI,
          grossNightlyRevenue: adr,
          monthlyGrossRevenue: annualRevenue / 12,
          annualGrossRevenue: annualRevenue,
          revPAR: adr * occ,
          numberOfTurnovers: turnovers,
          nightsOccupied: nightsOcc,
          monthlyExpenses: {
            mortgage: monthlyPI, taxes: propertyTaxes / 12, insurance: insurance / 12,
            hoa: 0, utilities: (bd?.utilities ?? 0) / 12, maintenance: (bd?.maintenance ?? 0) / 12,
            management: (bd?.management ?? 0) / 12, platformFees: (bd?.platform_fees ?? 0) / 12,
            cleaning: strState.cleaningCostPerTurnover * turnovers / 12,
            supplies: strState.suppliesMonthly,
          },
          totalMonthlyExpenses: totalExpenses / 12,
          totalAnnualExpenses: totalExpenses,
          monthlyCashFlow: strategyCashFlow,
          annualCashFlow: strategyAnnualCashFlow,
          noi,
          capRate: capRateVal ?? 0,
          cocReturn: cocVal ?? 0,
          breakEvenOccupancy: adr > 0 ? (totalExpenses + monthlyPI * 12) / (adr * 365) : 0,
          equityCreated: 0,
          dealScore: 0,
          dealGrade: 'C' as const,
          profitQuality: 'C' as const,
        } satisfies STRMetrics
      }

      case 'brrrr': {
        const brState = worksheetState as BRRRRDealMakerState
        const initialDown = brState.purchasePrice * brState.downPaymentPercent
        const initialClosing = brState.purchasePrice * brState.closingCostsPercent
        const totalRehabCost = brState.rehabBudget * (1 + brState.contingencyPct)
        const holdCosts = brState.holdingCostsMonthly * brState.holdingPeriodMonths
        const cashPhase1 = initialDown + initialClosing
        const cashPhase2 = totalRehabCost + holdCosts
        const allIn = brState.purchasePrice + totalRehabCost + holdCosts
        const refiLoan = brState.arv * brState.refinanceLtv
        const refiClosing = refiLoan * brState.refinanceClosingCostsPct
        const cashOut = Math.max(0, refiLoan - (brState.purchasePrice - initialDown) - refiClosing)
        const totalInvested = cashPhase1 + cashPhase2
        const cashLeftInDeal = Math.max(0, totalInvested - cashOut)
        const capitalRecycled = totalInvested > 0 ? ((totalInvested - cashLeftInDeal) / totalInvested) * 100 : 0
        const refiPayment = calculateMortgagePayment(refiLoan, brState.refinanceInterestRate * 100, brState.refinanceTermYears)
        const annualRentBrrrr = brState.postRehabMonthlyRent * 12
        const effIncome = annualRentBrrrr * (1 - brState.vacancyRate)
        const opex = propertyTaxes + insurance + annualRentBrrrr * (brState.managementRate + brState.maintenanceRate)
        const estNoi = effIncome - opex
        const postRefiAnnualCF = estNoi - refiPayment * 12
        const minCashForCoc = Math.max(cashLeftInDeal, totalInvested * 0.10)
        const postRefiCoc = cashLeftInDeal <= 0 ? (postRefiAnnualCF > 0 ? 999 : 0) : (postRefiAnnualCF / minCashForCoc) * 100
        return {
          initialLoanAmount: brState.purchasePrice - initialDown,
          initialDownPayment: initialDown,
          initialClosingCosts: initialClosing,
          cashRequiredPhase1: cashPhase1,
          totalRehabCost,
          holdingCosts: holdCosts,
          cashRequiredPhase2: cashPhase2,
          allInCost: allIn,
          estimatedNoi: estNoi,
          estimatedCapRate: brState.purchasePrice > 0 ? (estNoi / brState.purchasePrice) * 100 : 0,
          refinanceLoanAmount: refiLoan,
          refinanceClosingCosts: refiClosing,
          cashOutAtRefinance: cashOut,
          newMonthlyPayment: refiPayment,
          totalCashInvested: totalInvested,
          cashLeftInDeal,
          capitalRecycledPct: capitalRecycled,
          infiniteRoiAchieved: cashLeftInDeal <= 0,
          equityPosition: brState.arv - refiLoan,
          equityPct: brState.arv > 0 ? ((brState.arv - refiLoan) / brState.arv) * 100 : 0,
          postRefiMonthlyCashFlow: postRefiAnnualCF / 12,
          postRefiAnnualCashFlow: postRefiAnnualCF,
          postRefiCashOnCash: postRefiCoc,
          dealScore: 0,
          dealGrade: 'C' as const,
        } satisfies BRRRRMetrics
      }

      case 'flip': {
        const fState = worksheetState as FlipDealMakerState
        const fLoan = fState.financingType !== 'cash' ? fState.purchasePrice * fState.hardMoneyLtv : 0
        const fDown = fState.purchasePrice - fLoan
        const fClosing = fState.purchasePrice * fState.closingCostsPercent
        const pointsCost = fLoan * (fState.loanPoints / 100)
        const totalRehab = fState.rehabBudget * (1 + fState.contingencyPct)
        const domMonths = fState.daysOnMarket / 30
        const holdMonths = fState.rehabTimeMonths + domMonths
        const interestCosts = fState.financingType !== 'cash' ? fLoan * fState.hardMoneyRate * (holdMonths / 12) : 0
        const totalHolding = fState.holdingCostsMonthly * holdMonths + interestCosts
        const totalProject = fState.purchasePrice + fClosing + totalRehab + totalHolding + pointsCost
        const sellingCosts = fState.arv * fState.sellingCostsPct
        const grossProfit = fState.arv - totalProject - sellingCosts
        const capGainsTax = Math.max(0, grossProfit) * fState.capitalGainsRate
        const netProfit = grossProfit - capGainsTax
        const cashRequired = fDown + fClosing + pointsCost + totalRehab + totalHolding
        const fRoi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0
        const annRoi = holdMonths > 0 ? fRoi * (12 / holdMonths) : 0
        const mao = fState.arv * 0.70 - fState.rehabBudget
        return {
          loanAmount: fLoan, downPayment: fDown, closingCosts: fClosing, loanPointsCost: pointsCost,
          cashAtPurchase: fDown + fClosing + pointsCost,
          totalRehabCost: totalRehab,
          holdingPeriodMonths: holdMonths, totalHoldingCosts: totalHolding, interestCosts,
          grossSaleProceeds: fState.arv, sellingCosts, netSaleProceeds: fState.arv - sellingCosts,
          totalProjectCost: totalProject, grossProfit, capitalGainsTax: capGainsTax, netProfit,
          cashRequired, roi: fRoi, annualizedRoi: annRoi,
          profitMargin: fState.arv > 0 ? (netProfit / fState.arv) * 100 : 0,
          maxAllowableOffer: mao, meets70PercentRule: fState.purchasePrice <= mao,
          dealScore: 0, dealGrade: 'C' as const,
        } satisfies FlipMetrics
      }

      case 'house_hack': {
        const hState = worksheetState as HouseHackDealMakerState
        const hLoan = hState.purchasePrice * (1 - hState.downPaymentPercent)
        const hPI = calculateMortgagePayment(hLoan, hState.interestRate * 100, hState.loanTermYears)
        const hPmi = hLoan * hState.pmiRate / 12
        const hTaxes = hState.annualPropertyTax / 12
        const hIns = hState.annualInsurance / 12
        const hPiti = hPI + hPmi + hTaxes + hIns + hState.monthlyHoa
        const hDown = hState.purchasePrice * hState.downPaymentPercent
        const hClosing = hState.purchasePrice * hState.closingCostsPercent
        const rentedUnits = Math.max(0, hState.totalUnits - hState.ownerOccupiedUnits)
        const grossRental = hState.avgRentPerUnit * rentedUnits
        const effectiveRental = grossRental * (1 - hState.vacancyRate)
        const monthlyMaint = effectiveRental * hState.maintenanceRate
        const monthlyCapex = effectiveRental * hState.capexRate
        const monthlyOpex = hState.utilitiesMonthly + monthlyMaint + monthlyCapex
        const netRental = effectiveRental - monthlyOpex
        const effectiveCost = hPiti - netRental
        return {
          loanAmount: hLoan, monthlyPrincipalInterest: hPI, monthlyPmi: hPmi,
          monthlyTaxes: hTaxes, monthlyInsurance: hIns, monthlyPITI: hPiti,
          downPayment: hDown, closingCosts: hClosing, cashToClose: hDown + hClosing,
          rentedUnits, grossRentalIncome: grossRental, effectiveRentalIncome: effectiveRental,
          monthlyMaintenance: monthlyMaint, monthlyCapex, monthlyOperatingExpenses: monthlyOpex,
          netRentalIncome: netRental,
          effectiveHousingCost: effectiveCost,
          housingCostSavings: hState.currentHousingPayment - effectiveCost,
          housingOffsetPercent: hPiti > 0 ? (netRental / hPiti) * 100 : 0,
          livesForFree: effectiveCost <= 0,
          annualCashFlow: netRental * 12 - hPiti * 12,
          cashOnCashReturn: (hDown + hClosing) > 0 ? ((netRental - hPiti) * 12 / (hDown + hClosing)) * 100 : 0,
          fullRentalIncome: hState.avgRentPerUnit * hState.totalUnits,
          fullRentalCashFlow: (hState.avgRentPerUnit * hState.totalUnits * (1 - hState.vacancyRate) - monthlyOpex - hPiti) * 12,
          fullRentalCoCReturn: 0,
          dealScore: 0, dealGrade: 'C' as const,
        } satisfies HouseHackMetrics
      }

      case 'wholesale': {
        const wState = worksheetState as WholesaleDealMakerState
        const mao = wState.arv * 0.70 - wState.estimatedRepairs
        const endBuyerPrice = wState.contractPrice + wState.assignmentFee
        const endBuyerAllIn = endBuyerPrice + wState.estimatedRepairs
        const endBuyerProfit = wState.arv - endBuyerAllIn
        const cashAtRisk = wState.earnestMoney + wState.marketingCosts + wState.closingCosts
        const netProfit = wState.assignmentFee - wState.marketingCosts - wState.closingCosts
        const wRoi = cashAtRisk > 0 ? (netProfit / cashAtRisk) * 100 : 0
        const annROI = wState.daysToClose > 0 ? wRoi * (365 / wState.daysToClose) : 0
        const viability: 'strong' | 'moderate' | 'tight' | 'notViable' =
          wState.contractPrice <= mao * 0.9 ? 'strong' :
          wState.contractPrice <= mao ? 'moderate' :
          wState.contractPrice <= mao * 1.05 ? 'tight' : 'notViable'
        return {
          maxAllowableOffer: mao,
          contractVsMAO: wState.contractPrice - mao,
          meets70PercentRule: wState.contractPrice <= mao,
          endBuyerPrice, endBuyerAllIn, endBuyerProfit,
          endBuyerROI: endBuyerAllIn > 0 ? (endBuyerProfit / endBuyerAllIn) * 100 : 0,
          totalCashAtRisk: cashAtRisk,
          grossProfit: wState.assignmentFee, netProfit,
          roi: wRoi, annualizedROI: annROI,
          dealViability: viability,
          dealScore: 0, dealGrade: 'C' as const,
        } satisfies WholesaleMetrics
      }

      case 'ltr':
      default:
        return {
          cashNeeded: totalCashNeeded,
          dealGap: dealGapPct / 100,
          annualProfit: strategyAnnualCashFlow,
          capRate: capRateVal ?? 0,
          cocReturn: cocVal ?? 0,
          monthlyPayment: monthlyPI,
          loanAmount,
          equityCreated: 0,
          grossMonthlyIncome: monthlyRent,
          totalMonthlyExpenses: totalExpenses / 12,
        } satisfies LTRDealMakerMetrics
    }
  })() as AnyStrategyMetrics

  const handleWorksheetUpdate = (key: string, value: number | string) => {
    const fieldMap: Record<string, keyof InlineDealMakerValues> = {
      buyPrice: 'buyPrice',
      downPaymentPercent: 'downPayment',
      closingCostsPercent: 'closingCosts',
      interestRate: 'interestRate',
      loanTermYears: 'loanTerm',
      rehabBudget: 'rehabBudget',
      arv: 'arv',
      monthlyRent: 'monthlyRent',
      vacancyRate: 'vacancyRate',
      annualPropertyTax: 'propertyTaxes',
      annualInsurance: 'insurance',
      managementRate: 'managementRate',
      purchasePrice: 'buyPrice',
      postRehabMonthlyRent: 'monthlyRent',
      contractPrice: 'buyPrice',
      estimatedRepairs: 'rehabBudget',
    }
    const mapped = fieldMap[key]
    if (mapped) {
      handleInlineSliderChange(mapped, typeof value === 'number' ? value : parseFloat(value))
    } else {
      setInlineOverrides((prev) => {
        const next = { ...prev, [key]: value }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          try { writeDealMakerOverrides(resolvedAddressRef.current, next, { origin: 'dealmaker_edit' }) } catch { /* ignore */ }
        }, 300)
        scheduleRecalc(next)
        return next
      })
    }
  }

  const handlePDFDownload = (theme: 'light' | 'dark' = 'light') => {
    if (!isAuthenticated) {
      openAuthModal('login')
      return
    }
    if (!isPro) {
      alert('Full Report download is a Pro feature. Visit Pricing to upgrade.')
      return
    }
    setIsExporting('pdf')
    try {
      const propertyId = propertyInfo?.property_id || propertyInfo?.zpid || 'general'
      const params = new URLSearchParams({
        address: addressParam,
        strategy: activeStrategyId,
        theme,
        propertyId,
      })
      params.set('purchase_price', String(targetPrice))
      params.set('monthly_rent', String(monthlyRent))
      params.set('interest_rate', String(rate * 100))
      params.set('down_payment_pct', String(downPaymentPct * 100))
      params.set('property_taxes', String(propertyTaxes))
      params.set('insurance', String(insurance))
      const reportBase = IS_CAPACITOR ? WEB_BASE_URL : ''
      const url = `${reportBase}/api/report?${params}`
      window.open(url, '_blank')
    } catch (err) {
      console.error('PDF report failed:', err)
    } finally {
      setIsExporting(null)
    }
  }

  const handleExcelDownload = async () => {
    const propertyId = propertyInfo?.property_id || propertyInfo?.zpid
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
        address: addressParam,
        strategy: activeStrategyId,
      })
      params.set('purchase_price', String(targetPrice))
      params.set('monthly_rent', String(monthlyRent))
      params.set('interest_rate', String(rate * 100))
      params.set('down_payment_pct', String(downPaymentPct * 100))
      params.set('property_taxes', String(propertyTaxes))
      params.set('insurance', String(insurance))
      // Wholesale-specific: pass AMV and rent for the deal proforma
      if (activeStrategyId === 'wholesale') {
        params.set('amv', String(listPrice))
        params.set('monthly_rent', String(monthlyRent))
      }
      const url = `/api/v1/proforma/property/${propertyId}/excel?${params}`

      const headers: Record<string, string> = {}
      const csrfMatch = document.cookie.split('; ').find(c => c.startsWith('csrf_token='))
      if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch.split('=')[1]

      const response = await fetch(url, { headers, credentials: 'include' })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const detail = typeof errorData.detail === 'string' ? errorData.detail : ''
        if (response.status === 401) {
          throw new Error('Please sign in to download the worksheet.')
        }
        if (response.status === 403) {
          throw new Error('Pro subscription required. Upgrade to download the worksheet.')
        }
        if (response.status === 404) {
          throw new Error(detail || 'Property not found.')
        }
        throw new Error(detail || 'Failed to generate Excel report.')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      const addressSlug = addressParam.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30) || 'property'
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
  }

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        background:
          'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)',
      }}
    >
      {/* Header and property bar are provided by AppHeader in layout */}

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto">

        {/* Deal Gap Price Cards + Scale Bar — synced with Verdict page */}
        {listPrice > 0 && targetPrice > 0 && (() => {
          const incomeVal = dealMakerOverrides?.incomeValue ?? data?.income_value ?? (data as any)?.incomeValue ?? listPrice
          const isListedProp = !!propertyInfo?.listingStatus && ['FOR_SALE', 'PENDING', 'FOR_RENT'].includes(propertyInfo.listingStatus)
          const pLabel = isListedProp ? 'Asking' : 'Market'
          return (
          <section className="px-[1px] sm:px-5 pt-6 pb-2">
            {/* Three price metric cards */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch mb-6">
              {[
                { label: 'Target Buy', value: targetPrice, sub: 'Positive Cashflow', color: 'var(--accent-sky)', dominant: true },
                { label: 'Income Value', value: incomeVal, sub: 'Breakeven', color: 'var(--status-warning)', dominant: false },
                { label: 'Market Price', value: listPrice, sub: 'Market Value or List Price', color: 'var(--status-negative)', dominant: false },
              ].map((card, i) => (
                <div key={i} className={`rounded-xl py-3 px-3 sm:px-2 text-center ${card.dominant ? 'sm:flex-[1.2]' : 'sm:flex-1'}`} style={{
                  background: 'var(--surface-card)',
                  border: `1px solid ${card.color}`,
                  boxShadow: `0 0 30px ${card.color}70, 0 0 60px ${card.color}35, inset 0 0 20px ${card.color}15`,
                  transition: 'all 0.3s ease',
                }}>
                  <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-body)' }}>{card.label}</p>
                  <p className="tabular-nums mb-0.5 font-bold text-[18px] sm:text-[20px]" style={{ color: card.color }}>{formatCurrency(card.value)}</p>
                  <p className="text-[10px] sm:text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{card.sub}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <MarketAnchorNote isListed={isListedProp} />
            </div>

            <div className="flex items-center justify-start mb-1">
              <button
                type="button"
                onClick={() => setShowDealGapVideo(true)}
                className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold transition-colors"
                style={{ color: 'var(--accent-sky)', background: 'transparent', border: 'none', padding: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                What is Deal Gap?
              </button>
            </div>

            <div className="relative" style={{ paddingTop: 20 }}>
              {(() => {
                const markers = [
                  { label: 'TARGET', price: targetPrice, dotColor: 'var(--accent-sky)' },
                  { label: 'INCOME', price: incomeVal, dotColor: 'var(--status-warning)' },
                  { label: 'MARKET', price: listPrice, dotColor: 'var(--status-negative)' },
                ].filter(m => m.price > 0).sort((a, b) => a.price - b.price)

                const allPrices = markers.map(m => m.price)
                const scaleMin = Math.min(...allPrices) * 0.95
                const scaleMax = Math.max(...allPrices) * 1.05
                const range = scaleMax - scaleMin
                const pos = (v: number) => Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

                const targetBuyPos = targetPrice > 0 ? pos(targetPrice) : null
                const marketPos = listPrice > 0 ? pos(listPrice) : null
                const incomePos = incomeVal > 0 ? pos(incomeVal) : null

                const priceGapPct = listPrice > 0 && incomeVal > 0
                  ? ((incomeVal - listPrice) / listPrice) * 100
                  : 0
                const isPositiveIncomeCase = incomeVal > listPrice && priceGapPct > 0.1

                const dealBracketLeft = targetBuyPos != null && marketPos != null ? Math.min(targetBuyPos, marketPos) : 0
                const dealBracketPct = listPrice > 0 && targetPrice > 0
                  ? ((listPrice - targetPrice) / listPrice) * 100
                  : 0
                const effectiveDisplayPct = -dealBracketPct
                const isDealGain = dealBracketPct < 0.5 && isPositiveIncomeCase
                const dealBracketRight = isDealGain && incomePos != null
                  ? incomePos
                  : (targetBuyPos != null && marketPos != null ? Math.max(targetBuyPos, marketPos) : 0)
                const showDealBracket = isDealGain
                  ? (dealBracketRight - dealBracketLeft) >= 3
                  : (dealBracketRight - dealBracketLeft) >= 3 && Math.abs(dealBracketPct) > 0.1
                const dealDisplayPct = isDealGain
                  ? ((incomeVal - targetPrice) / listPrice) * 100
                  : effectiveDisplayPct

                const priceGapLeft = incomePos != null && marketPos != null ? Math.min(incomePos, marketPos) : 0
                const priceGapRight = incomePos != null && marketPos != null ? Math.max(incomePos, marketPos) : 0
                const priceGap = listPrice > 0 && incomeVal > 0
                  ? ((incomeVal - listPrice) / listPrice) * 100
                  : 0
                const showPriceGap = incomePos != null && marketPos != null && Math.abs(priceGap) > 0.1 && (priceGapRight - priceGapLeft) >= 3

                const bracketLabel = 'DEAL GAP'
                const bracketColor = isDealGain ? 'var(--status-positive)' : 'var(--accent-sky)'
                const sweetSpotLeft = marketPos != null && incomePos != null ? Math.min(marketPos, incomePos) : 0
                const sweetSpotWidth = marketPos != null && incomePos != null ? Math.abs(incomePos - marketPos) : 0
                const tbMarketOverlap = targetBuyPos != null && marketPos != null && Math.abs(targetBuyPos - marketPos) < 3
                const fmtPrice = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`

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
                          style={{ color: bracketColor }}
                        >
                          {bracketLabel} &nbsp;{dealDisplayPct >= 0 ? '+' : ''}{dealDisplayPct.toFixed(1)}%
                        </p>
                        <div className="flex items-start">
                          <div style={{ width: 1, height: 14, background: bracketColor, flexShrink: 0 }} />
                          <div style={{ height: 1, background: bracketColor, flex: 1 }} />
                          <div style={{ width: 1, height: 14, background: bracketColor, flexShrink: 0 }} />
                        </div>
                      </div>
                    )}

                    {/* Bar with proportionally-positioned dots and optional Sweet Spot zone */}
                    <div className="relative rounded-full" style={{
                      height: 22,
                      background: 'linear-gradient(90deg, rgba(10,30,60,0.95) 0%, rgba(30,80,140,0.85) 35%, rgba(56,160,220,0.7) 50%, rgba(30,80,140,0.85) 65%, rgba(10,30,60,0.95) 100%)',
                      border: '1.5px solid rgba(56,189,248,0.5)',
                      boxShadow: 'inset 0 0 12px rgba(56,189,248,0.25), 0 0 16px rgba(56,189,248,0.15)',
                    }}>
                      {isPositiveIncomeCase && sweetSpotWidth > 0 && (
                        <div
                          className="absolute rounded-full sweet-spot-pulse"
                          style={{
                            left: `${sweetSpotLeft}%`,
                            width: `${sweetSpotWidth}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, rgba(52,211,153,0.1), rgba(52,211,153,0.3), rgba(52,211,153,0.1))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          <span style={{
                            color: '#ffffff',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            whiteSpace: 'nowrap',
                          }}>
                            SWEET SPOT
                          </span>
                        </div>
                      )}
                      {markers.map((m, i) => {
                        const isRing = tbMarketOverlap && m.label === 'TARGET'
                        return (
                          <div key={i} className="absolute rounded-full"
                            style={{
                              width: isRing ? 24 : 18,
                              height: isRing ? 24 : 18,
                              top: '50%',
                              left: `${pos(m.price)}%`,
                              transform: 'translate(-50%, -50%)',
                              background: isRing ? 'transparent' : m.dotColor,
                              border: isRing ? `2px solid ${m.dotColor}` : 'none',
                              boxShadow: `0 0 8px ${m.dotColor}90`,
                              zIndex: isRing ? 0 : 1,
                            }}
                          />
                        )
                      })}
                    </div>

                    {/* Price labels below dots (grouped when overlapping) */}
                    <div className="relative" style={{ height: 18, marginTop: 4 }}>
                      {(() => {
                        const groups: { labels: string[]; price: number; colors: string[]; left: number }[] = []
                        markers.forEach(m => {
                          const p = pos(m.price)
                          const existing = groups.find(g => Math.abs(g.left - p) < 3)
                          if (existing) { existing.labels.push(m.label); existing.colors.push(m.dotColor) }
                          else { groups.push({ labels: [m.label], price: m.price, colors: [m.dotColor], left: p }) }
                        })
                        return groups.map((g, i) => (
                          <div key={i} className="absolute text-center" style={{ left: `${g.left}%`, transform: 'translateX(-50%)', top: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                              {g.labels.map((l, j) => (
                                <span key={j}>
                                  {j > 0 && <span style={{ color: 'var(--text-muted)' }}> / </span>}
                                  <span style={{ color: g.colors[j] }}>{l}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>

                    {showPriceGap && (
                      <div
                        className="relative mt-0"
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
                          PRICE GAP &nbsp;{priceGap >= 0 ? '+' : ''}{priceGap.toFixed(1)}%
                        </p>
                      </div>
                    )}

                  </>
                )
              })()}
            </div>
          </section>
          )
        })()}

        {/* Next Steps — accordion, closed by default */}
        <section className="px-[1px] sm:px-5" style={{ paddingTop: 8, paddingBottom: 8 }}>
          <details>
            <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <span style={{ color: 'var(--accent-sky)', margin: 0, fontSize: '0.85rem', fontWeight: 500, fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em' }}>Next Steps?</span>
                <svg width="18" height="18" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0, transition: 'transform 0.3s ease' }} className="details-chevron">
                  <circle cx="11" cy="11" r="10" stroke="var(--accent-sky)" strokeWidth="1.5" />
                  <path d="M7.5 9.5L11 13L14.5 9.5" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </summary>
            <div style={{ paddingTop: 12 }}>
              <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 20, lineHeight: 1.55 }}>
                Follow these steps to move forward with your property deal:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { num: '1', text: <><strong style={{ color: 'var(--text-heading)' }}>Review Deal Terms</strong> – Check the down payment, financing, interest rate, and other details to understand the deal.</> },
                  { num: '2', text: <><strong style={{ color: 'var(--text-heading)' }}>Adjust the Numbers</strong> – Use the DealMaker tab to tweak parameters and see real-time changes.</> },
                  { num: '3', text: <><strong style={{ color: 'var(--text-heading)' }}>Download Reports</strong> – Get the full property report and Excel worksheet below for deeper insight.</> },
                  { num: '4', text: <><strong style={{ color: 'var(--text-heading)' }}>Use Appraiser to Set Your Values</strong> – Visit the Appraiser tab to confirm value, set the ARV and create your own appraisal report.</> },
                  ...(dealGapPct > 20
                    ? [
                        {
                          num: '5',
                          text: (
                            <>
                              <strong style={{ color: 'var(--text-heading)' }}>Stress-test structure, not just price</strong> – If the Deal Gap is wide, model a lower interest rate, larger down payment, shorter loan term, or seller financing (including low- or zero-rate carry) in the worksheet below.
                            </>
                          ),
                        },
                        {
                          num: '6',
                          text: (
                            <>
                              <strong style={{ color: 'var(--text-heading)' }}>Verify income and value anchors</strong> – Use the IQ Estimate selector when you sign in to swap value or rent sources; small changes there move Income Value and Target Buy.
                            </>
                          ),
                        },
                      ]
                    : []),
                ].map((step) => (
                  <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: 30, height: 30, borderRadius: '50%',
                      background: 'var(--color-sky-dim)', border: '1px solid var(--accent-sky)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--accent-sky)', flexShrink: 0,
                    }}>
                      {step.num}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--text-body)', paddingTop: 4 }}>
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </details>
          <style>{`
            details summary::-webkit-details-marker { display: none; }
            details[open] .details-chevron { transform: rotate(180deg); }
          `}</style>
        </section>

        {/* Financial Breakdown — requires free (logged-in) tier */}
        <AuthGate feature="view the full strategy breakdown" mode="section">
        <section className="px-[1px] sm:px-5 pt-2 pb-6">

          {/* Strategy Tabs — outside card container */}
          {sortedStrategies.length > 1 && (() => {
            const STRATEGY_DISPLAY = [
              { id: 'long-term-rental', label: 'Long\nRental', color: '#0465f2' },
              { id: 'short-term-rental', label: 'Short\nRental', color: '#8b5cf6' },
              { id: 'brrrr', label: 'BRRRR', color: '#f97316' },
              { id: 'fix-and-flip', label: 'Fix &\nFlip', color: '#ec4899' },
              { id: 'house-hack', label: 'House\nHack', color: '#0EA5E9' },
              { id: 'wholesale', label: 'Whole\nSale', color: '#84cc16' },
            ]
            const available = STRATEGY_DISPLAY.filter(s => sortedStrategies.some(ss => ss.id === s.id))
            return (
              <div className="mb-4 grid grid-cols-6 gap-2">
                {available.map((s) => {
                  const isActive = s.id === activeStrategyId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStrategyChange(s.id)}
                      className="aspect-square rounded-xl text-[9.5px] sm:text-sm font-bold leading-tight transition-all duration-200 flex items-center justify-center whitespace-pre-line text-center"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${s.color}, ${s.color}CC)`
                          : `${s.color}12`,
                        color: isActive ? '#fff' : s.color,
                        border: `1.5px solid ${isActive ? s.color : `${s.color}60`}`,
                        boxShadow: isActive
                          ? `0 0 16px ${s.color}45, 0 2px 8px rgba(0,0,0,0.3)`
                          : `0 1px 4px rgba(0,0,0,0.15)`,
                        transform: isActive ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            )
          })()}

          {/* Key Metrics Bar — own container */}
          <div
            className="rounded-xl px-4 sm:px-5 py-3 mb-4 relative"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {isRecalculating && (
              <div className="absolute top-1 right-2 flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-[var(--accent-sky)] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-medium" style={{ color: 'var(--accent-sky)' }}>Recalculating</span>
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-2">
              {[
                { label: 'Buy Price', value: formatCurrency(targetPrice) },
                { label: 'Cash Needed', value: formatCurrency(totalCashNeeded) },
                { label: 'Deal Gap', value: `${dealGapPct >= 0 ? '-' : '+'}${Math.abs(dealGapPct).toFixed(1)}%`, highlight: true, negative: dealGapPct > 0 },
                { label: 'Annual Profit', value: formatCurrency(strategyAnnualCashFlow), highlight: true, negative: strategyAnnualCashFlow < 0 },
                { label: 'CAP Rate', value: capRateVal !== null ? `${capRateVal.toFixed(1)}%` : '—', negative: capRateVal !== null && capRateVal < 0 },
                { label: 'COC Return', value: cocVal !== null ? `${cocVal.toFixed(1)}%` : '—', negative: cocVal !== null && cocVal < 0 },
              ].map((m, i) => (
                <div key={i} className="flex flex-col text-center items-center py-0.5 sm:py-1">
                  <span className="text-[10px] sm:text-xs uppercase tracking-wider" style={{ color: 'var(--text-body)' }}>{m.label}</span>
                  <span
                    className="text-[13px] sm:text-base font-semibold tabular-nums"
                    style={{ color: m.negative ? 'var(--status-negative)' : m.highlight ? 'var(--accent-sky)' : 'var(--text-heading)' }}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown — DealMaker Worksheet */}
          <DealMakerWorksheet
            strategyType={currentStrategyType}
            state={worksheetState}
            metrics={worksheetMetrics}
            listPrice={listPrice}
            updateState={handleWorksheetUpdate}
            isCalculating={isRecalculating}
            propertyAddress={resolvedAddress}
            flushWithinParent
          />

          {/* IQ Estimate Source Selector */}
          {!isFlipOrWholesale &&
            (iqSources.value.iq != null || iqSources.value.zillow != null || iqSources.value.rentcast != null || iqSources.value.redfin != null || iqSources.value.realtor != null ||
              iqSources.rent.iq != null || iqSources.rent.zillow != null || iqSources.rent.rentcast != null || iqSources.rent.realtor != null) && (
              <div className="px-4 sm:px-6 -mt-16">
                <IQEstimateSelector
                  sources={iqSources}
                  onSourceChange={(type, _sourceId, _value) => {
                    if (_value == null) return
                    const patch = type === 'value' ? { price: _value } : { monthlyRent: _value }
                    const nextSrcOverrides = { ...sourceOverrides, ...patch }
                    setSourceOverrides(prev => ({ ...prev, ...patch }))
                    try {
                      if (type === 'value') {
                        writeDealMakerOverrides(resolvedAddress, {
                          price: _value,
                          listPrice: _value,
                        }, { origin: 'source_selection' })
                      } else {
                        writeDealMakerOverrides(resolvedAddress, {
                          monthlyRent: _value,
                        }, { origin: 'source_selection' })
                      }
                    } catch { /* ignore */ }
                    const merged = { ...(initialOverrides ?? {}), ...inlineOverrides }
                    recalcVerdict(propertyInfo, merged, nextSrcOverrides)
                  }}
                />
              </div>
          )}

          {/* The Bottom Line */}
          <div className="mt-7 p-5 rounded-xl border" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card-hover)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.brand.blue }}>The Bottom Line</p>
            <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
              {isFlipOrWholesale ? (
                strategyAnnualCashFlow >= 0 ? (
                  <>At {formatCurrency(targetPrice)}, this {topStrategyName.toLowerCase()} deal projects an estimated <strong style={{ color: colors.status.positive, fontWeight: 600 }}>profit of {formatCurrency(strategyAnnualCashFlow)}</strong>. Verify rehab costs, ARV, and timeline with your own due diligence.</>
                ) : (
                  <>At the current numbers, this {topStrategyName.toLowerCase()} deal <strong style={{ color: colors.text.primary, fontWeight: 600 }}>doesn&apos;t pencil out</strong>. You&apos;d need a lower purchase price or higher ARV to make the numbers work.</>
                )
              ) : strategyCashFlow >= 0 ? (
                <>At the Profit Entry Point of {formatCurrency(targetPrice)}, this property would <strong style={{ color: colors.status.positive, fontWeight: 600 }}>generate about {formatCurrency(Math.round(strategyCashFlow))}/mo in cash flow</strong> as a {topStrategyName.toLowerCase()}. The numbers work — verify the assumptions with your own due diligence before making an offer.</>
              ) : (
                <>Even at the discounted Profit Entry Point of {formatCurrency(targetPrice)}, this property would <strong style={{ color: colors.text.primary, fontWeight: 600 }}>cost you about {formatCurrency(Math.abs(Math.round(strategyCashFlow)))}/mo out of pocket</strong> as a {topStrategyName.toLowerCase()}. That doesn&apos;t mean it&apos;s a bad investment — but it means your returns come from appreciation and equity, not cashflow. Consider whether that fits your strategy.</>
              )}
            </p>
          </div>

        </section>

        {/* Benchmarks — same width and rounded corners as Try Another Strategy card above */}
        <section className="px-[1px] sm:px-5 py-8 border-t" style={{ borderColor: colors.ui.border }}>
          <div className="w-full rounded-[14px] p-5" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card-hover)' }}>
            <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>Investor Benchmarks</p>
            <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>How Does This Stack Up?</h2>
            <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}>
              We compare this deal against the numbers experienced investors actually look for. Green means this deal meets or beats the benchmark.
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: colors.ui.border }}>
                  <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: 'var(--text-heading)' }}>Metric</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: 'var(--text-heading)' }}>This Deal</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: 'var(--text-heading)' }}>Target</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: colors.ui.border }}>
                    <td className="py-3 text-sm font-medium" style={{ color: colors.text.primary }}>{b.metric}</td>
                    <td className="py-3 text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{b.value}</td>
                    <td className="py-3 text-sm font-medium tabular-nums" style={{ color: 'var(--text-body)' }}>{b.target}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          color: b.status === 'good' ? colors.status.positive : colors.status.negative,
                          background: b.status === 'good' ? colors.accentBg.green : colors.accentBg.red,
                        }}>{b.status === 'good' ? 'Good' : 'Below'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        </AuthGate>

        {/* Save CTA — adapt for logged-in vs anonymous; future: scan limit → Pro upgrade */}
        <section className="px-[1px] sm:px-5 py-10 text-center border-t" style={{ borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 12 }}>You screened it. You proved it.</p>
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: colors.text.primary, letterSpacing: '-0.5px', lineHeight: 1.25 }}>Now Save It.</h2>
          <p className="text-[15px] mb-7 mx-auto max-w-md" style={{ color: colors.text.body, lineHeight: 1.6 }}>
            Save to your DealVaultIQ and we&apos;ll keep the numbers fresh and alert you if anything changes.
          </p>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => (isSaved ? toggle() : save()).catch((err) => console.error('Save to DealVault failed:', err))}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: colors.brand.teal }}
              >
                {isSaving ? 'Saving…' : isSaved ? 'Saved to DealVault ✓' : 'Save to DealVaultIQ'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-[var(--text-inverse)] transition-all mb-4"
                style={{ background: colors.brand.teal }}
              >
                Create Free Account
              </button>
              <p className="text-xs" style={{ color: 'var(--text-body)' }}>No credit card · 3 free scans per month</p>
            </>
          )}
        </section>

      </div>

      <VideoModal
        open={showDealGapVideo}
        onClose={() => setShowDealGapVideo(false)}
        src="/videos/what-is-dealgapiq.mp4"
        title="What is Deal Gap?"
      />
    </div>
  )
}

export default function StrategyPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <StrategyContent />
    </Suspense>
  )
}
