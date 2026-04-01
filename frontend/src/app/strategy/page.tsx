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
import { buildDealMakerSessionKey, canonicalizeAddressForIdentity, isLikelyFullAddress, writeDealMakerOverrides } from '@/utils/addressIdentity'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { tw } from '@/components/iq-verdict/verdict-design-tokens'
import { IQEstimateSelector, type IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'
import { AuthGate } from '@/components/auth/AuthGate'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { VideoModal } from '@/components/ui/VideoModal'
import { DealMakerWorksheet } from '@/components/deal-maker/DealMakerWorksheet'
import type { LTRDealMakerState, LTRDealMakerMetrics } from '@/components/deal-maker/types'
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

function StrategyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useSession()
  const { isPro } = useSubscription()
  const { openAuthModal } = useAuthModal()

  const addressParam = searchParams.get('address') || ''
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  const strategyParam = searchParams.get('strategy')
  const { fetchProperty } = usePropertyData()
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
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
        const canonicalAddress = canonicalizeAddressForIdentity(addressParam)
        const sessionKey = buildDealMakerSessionKey(canonicalAddress)
        const stored = sessionStorage.getItem(sessionKey)
        if (!stored) return
        const parsed = JSON.parse(stored)
        if (!(parsed.timestamp && Date.now() - parsed.timestamp < 3600000)) return
        console.log('[StrategyIQ] Loaded DealMaker overrides from sessionStorage:', parsed)
        setInitialOverrides(parsed)
        if (typeof parsed.listPrice === 'number' && parsed.listPrice > 0) {
          setSourceOverrides((prev) => ({ ...prev, price: parsed.listPrice }))
        }
        if (!strategyParam && parsed.strategy) {
          setSelectedStrategyId(parsed.strategy)
        }
      } catch (e) {
        console.warn('[StrategyIQ] Failed to read sessionStorage:', e)
      }
    }
    loadOverrides()
    window.addEventListener('dealMakerOverridesUpdated', loadOverrides)
    return () => window.removeEventListener('dealMakerOverridesUpdated', loadOverrides)
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

  // Build the backend verdict API payload from current property info + overrides.
  // Converts session-stored percentage values (e.g. 20 for 20%) to backend decimal (0.20).
  const buildVerdictPayload = useCallback((
    propInfo: any,
    overrides: Record<string, any> | null,
    srcOverrides: { price?: number; monthlyRent?: number },
  ) => {
    const v = propInfo?.valuations || propInfo || {}
    let price = propInfo?.price ?? 1
    let rent = propInfo?.monthlyRent ?? 0
    let taxes = propInfo?.propertyTaxes ?? 0
    let ins = propInfo?.insurance ?? 0

    if (srcOverrides.price != null) price = srcOverrides.price
    if (srcOverrides.monthlyRent != null) rent = srcOverrides.monthlyRent

    const payload: Record<string, any> = {
      list_price: price,
      monthly_rent: rent,
      property_taxes: taxes,
      insurance: ins,
      bedrooms: propInfo?.details?.bedrooms || 3,
      bathrooms: propInfo?.details?.bathrooms || 2,
      sqft: propInfo?.details?.square_footage || 1500,
      is_listed: propInfo?._isListed ?? undefined,
      zestimate: v.zestimate ?? undefined,
      current_value_avm: v.current_value_avm ?? undefined,
      tax_assessed_value: v.tax_assessed_value ?? undefined,
    }

    if (overrides) {
      if (overrides.purchasePrice != null || overrides.buyPrice != null) {
        payload.purchase_price = overrides.purchasePrice ?? overrides.buyPrice
      }
      if (overrides.downPayment != null) payload.down_payment_pct = overrides.downPayment / 100
      if (overrides.closingCosts != null) payload.closing_costs_pct = overrides.closingCosts / 100
      if (overrides.interestRate != null) {
        const raw = overrides.interestRate
        payload.interest_rate = raw <= 1 ? raw : raw / 100
      }
      if (overrides.loanTerm != null) payload.loan_term_years = overrides.loanTerm
      if (overrides.vacancyRate != null) payload.vacancy_rate = overrides.vacancyRate / 100
      if (overrides.managementRate != null) payload.management_pct = overrides.managementRate / 100
      if (overrides.rehabBudget != null) payload.rehab_cost = overrides.rehabBudget
      if (overrides.arv != null) payload.arv = overrides.arv
      if (overrides.monthlyRent != null) payload.monthly_rent = overrides.monthlyRent
      if (overrides.propertyTaxes != null) payload.property_taxes = overrides.propertyTaxes
      if (overrides.insurance != null) payload.insurance = overrides.insurance
    }

    return payload
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
      const payload = buildVerdictPayload(propInfo, overrides, srcOverrides)
      const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', payload)
      setData(analysis)
    } catch (err) {
      console.error('[StrategyIQ] Recalculation failed:', err)
    } finally {
      setIsRecalculating(false)
    }
  }, [buildVerdictPayload])

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

      try {
        setIsLoading(true)
        const propData = await fetchProperty(fetchAddr)
        const v = propData.valuations || {}
        let price = v.value_iq_estimate
          ?? v.market_price
          ?? v.zestimate
          ?? v.current_value_avm
          ?? (v.tax_assessed_value ? Math.round(v.tax_assessed_value / 0.75) : null)
          ?? 1
        let monthlyRent = propData.rentals?.monthly_rent_ltr || 0
        let propertyTaxes = propData.taxes?.annual_tax_amount || 0
        let insuranceVal = propData.expenses?.insurance_annual || 0

        if (conditionParam) {
          const cond = getConditionAdjustment(Number(conditionParam))
          price += cond.pricePremium
        }
        if (locationParam) {
          const loc = getLocationAdjustment(Number(locationParam))
          monthlyRent = Math.round(monthlyRent * loc.rentMultiplier)
        }

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

        const listingStatus = propData.listing?.listing_status
        const isListed = listingStatus && !['OFF_MARKET', 'SOLD', 'FOR_RENT', 'OTHER'].includes(String(listingStatus)) && price > 0
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

        const payload = buildVerdictPayload(enrichedPropInfo, dealMakerOverrides, sourceOverrides)
        const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', payload)
        setData(analysis)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- api.post is a stable module-level reference; initialOverrides only (not inline slider changes)
  }, [addressParam, conditionParam, locationParam, initialOverrides])

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
        try { writeDealMakerOverrides(resolvedAddressRef.current, next) } catch { /* ignore */ }
      }, 300)
      scheduleRecalc(next)
      return next
    })
  }, [scheduleRecalc])

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

  // Strategy selection — user-chosen > URL param > highest score
  const sortedStrategies = data.strategies?.length
    ? [...data.strategies].sort((a, b) => b.score - a.score)
    : []
  const topStrategy = selectedStrategyId
    ? sortedStrategies.find(s => s.id === selectedStrategyId) || sortedStrategies[0] || null
    : sortedStrategies[0] || null
  const topStrategyName = topStrategy?.name || 'Long-Term Rental'
  const recommendedStrategyName = sortedStrategies[0]?.name || 'Long-Term Rental'
  const activeStrategyId = topStrategy?.id || 'ltr'

  // Score — capped at 95 (no deal is 100% certain)
  const verdictScore = Math.min(95, Math.max(0, data.deal_score ?? (data as any).dealScore ?? 0))

  // All financial values are backend-authoritative — sourced from the verdict API response.
  // When sliders change, a debounced backend recalc fires and updates `data`.
  const listPrice = data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? 0
  const targetPrice = data.purchase_price ?? (data as any).purchasePrice ?? Math.round(listPrice * 0.85)
  const parsed = parseAddressString(addressParam)

  // Strategy-specific financial breakdown from backend
  const bd = topStrategy?.breakdown as Record<string, number> | undefined

  // All derived financials come from the backend breakdown
  const monthlyRent = bd?.monthly_rent ?? propertyInfo?.monthlyRent ?? 0
  const propertyTaxes = bd?.property_taxes ?? propertyInfo?.propertyTaxes ?? 0
  const insurance = bd?.insurance ?? propertyInfo?.insurance ?? 0
  const rehabCost = bd?.rehab_cost ?? dealMakerOverrides?.rehabBudget
    ?? (conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0)

  const rate = (bd?.interest_rate ?? 6) / 100
  const downPaymentPct = (bd?.down_payment_pct ?? 20) / 100
  const closingCostsPct = (bd?.closing_costs_pct ?? 3) / 100
  const loanTermYears = bd?.loan_term_years ?? 30
  const vacancyPct = (bd?.vacancy_rate ?? 5) / 100
  const mgmtPct = (bd?.management_pct ?? 8) / 100
  const maintPct = (bd?.maintenance_pct ?? 5) / 100
  const reservesPct = (bd?.reserves_pct ?? 5) / 100

  const downPayment = bd?.down_payment ?? targetPrice * downPaymentPct
  const closingCosts = bd?.closing_costs ?? targetPrice * closingCostsPct
  const loanAmount = bd?.loan_amount ?? targetPrice - downPayment
  const monthlyPI = bd?.monthly_payment ?? 0
  const annualRent = bd?.annual_gross_rent ?? monthlyRent * 12
  const vacancyLoss = bd?.vacancy_loss ?? annualRent * vacancyPct
  const effectiveIncome = bd?.effective_income ?? annualRent - vacancyLoss
  const mgmt = bd?.management ?? annualRent * mgmtPct
  const maint = bd?.maintenance ?? annualRent * maintPct
  const reserves = bd?.reserves ?? annualRent * reservesPct
  const totalExpenses = bd?.total_operating_expenses ?? propertyTaxes + insurance + mgmt + maint + reserves
  const noi = bd?.noi ?? effectiveIncome - totalExpenses
  const annualDebt = bd?.annual_debt_service ?? monthlyPI * 12
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  const isFlipOrWholesale = activeStrategyId === 'fix-and-flip' || activeStrategyId === 'wholesale'

  const totalCashNeeded = downPayment + closingCosts + rehabCost
  const dealGapPct = listPrice ? ((listPrice - targetPrice) / listPrice) * 100 : 0
  const strategyDscr = topStrategy?.dscr ?? null

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

  const worksheetState: LTRDealMakerState = (() => {
    const io = inlineOverrides as Record<string, number | undefined>
    return {
      buyPrice: io.purchasePrice ?? targetPrice,
      downPaymentPercent: io.downPayment != null ? io.downPayment / 100 : downPaymentPct,
      closingCostsPercent: io.closingCosts != null ? io.closingCosts / 100 : closingCostsPct,
      interestRate: io.interestRate ?? rate,
      loanTermYears: io.loanTerm ?? loanTermYears,
      rehabBudget: io.rehabBudget ?? rehabCost,
      arv: io.arv ?? bd?.arv ?? data?.inputs_used?.arv ?? listPrice,
      monthlyRent: io.monthlyRent ?? monthlyRent,
      otherIncome: 0,
      vacancyRate: io.vacancyRate != null ? io.vacancyRate / 100 : vacancyPct,
      maintenanceRate: maintPct,
      managementRate: io.managementRate != null ? io.managementRate / 100 : mgmtPct,
      annualPropertyTax: io.propertyTaxes ?? propertyTaxes,
      annualInsurance: io.insurance ?? insurance,
      monthlyHoa: 0,
    }
  })()

  const worksheetMetrics: LTRDealMakerMetrics = {
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
  }

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
      maintenanceRate: 'managementRate',
    }
    const mapped = fieldMap[key]
    if (mapped) {
      handleInlineSliderChange(mapped, typeof value === 'number' ? value : parseFloat(value))
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
                  { label: 'Target Buy', price: targetPrice, dotColor: 'var(--accent-sky)' },
                  { label: 'Income Value', price: incomeVal, dotColor: 'var(--status-warning)' },
                  { label: pLabel, price: listPrice, dotColor: 'var(--status-negative)' },
                ].filter(m => m.price > 0).sort((a, b) => a.price - b.price)

                const allPrices = markers.map(m => m.price)
                const scaleMin = Math.min(...allPrices) * 0.95
                const scaleMax = Math.max(...allPrices) * 1.05
                const range = scaleMax - scaleMin
                const pos = (v: number) => Math.min(96, Math.max(2, ((v - scaleMin) / range) * 100))

                const targetBuyPos = targetPrice > 0 ? pos(targetPrice) : null
                const marketPos = listPrice > 0 ? pos(listPrice) : null
                const incomePos = incomeVal > 0 ? pos(incomeVal) : null

                const dealBracketLeft = targetBuyPos != null && marketPos != null ? Math.min(targetBuyPos, marketPos) : 0
                const dealBracketRight = targetBuyPos != null && marketPos != null ? Math.max(targetBuyPos, marketPos) : 0
                const dealBracketPct = listPrice > 0 && targetPrice > 0
                  ? ((listPrice - targetPrice) / listPrice) * 100
                  : 0
                const showDealBracket = targetBuyPos != null && marketPos != null && Math.abs(dealBracketPct) > 0.1 && (dealBracketRight - dealBracketLeft) >= 3

                const priceGapLeft = incomePos != null && marketPos != null ? Math.min(incomePos, marketPos) : 0
                const priceGapRight = incomePos != null && marketPos != null ? Math.max(incomePos, marketPos) : 0
                const priceGap = listPrice > 0 && incomeVal > 0
                  ? ((incomeVal - listPrice) / listPrice) * 100
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
                          DEAL GAP &nbsp;-{dealBracketPct.toFixed(1)}%
                        </p>
                        <div className="flex items-start">
                          <div style={{ width: 1, height: 14, background: 'var(--accent-sky)', flexShrink: 0 }} />
                          <div style={{ height: 1, background: 'var(--accent-sky)', flex: 1 }} />
                          <div style={{ width: 1, height: 14, background: 'var(--accent-sky)', flexShrink: 0 }} />
                        </div>
                      </div>
                    )}

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
                          style={{ color: 'var(--status-warning)', marginBottom: 0 }}
                        >
                          PRICE GAP &nbsp;{priceGap.toFixed(1)}%
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
            const STRATEGY_DISPLAY: { id: string; label: string }[] = [
              { id: 'ltr', label: 'Long-term' },
              { id: 'str', label: 'Short-term' },
              { id: 'brrrr', label: 'BRRRR' },
              { id: 'fix-and-flip', label: 'Fix & Flip' },
              { id: 'house-hack', label: 'House Hack' },
              { id: 'wholesale', label: 'Wholesale' },
            ]
            const available = STRATEGY_DISPLAY.filter(s => sortedStrategies.some(ss => ss.id === s.id))
            return (
              <div className="mb-4 flex gap-2">
                {available.map((s) => {
                  const isActive = s.id === activeStrategyId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStrategyChange(s.id)}
                      className="flex-1 py-2.5 rounded-full text-[12px] sm:text-sm font-bold tracking-wide transition-all"
                      style={{
                        background: isActive ? colors.brand.teal : 'transparent',
                        color: isActive ? 'var(--text-inverse)' : colors.brand.teal,
                        border: `1.5px solid ${colors.brand.teal}`,
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
              opacity: isRecalculating ? 0.7 : 1,
              transition: 'opacity 0.2s ease',
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
                <div key={i} className="flex justify-between sm:flex-col sm:text-center items-center sm:items-stretch py-0.5 sm:py-1">
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
            strategyType="ltr"
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
                    const nextSrcOverrides = { ...sourceOverrides }
                    if (type === 'value') {
                      nextSrcOverrides.price = _value
                      setSourceOverrides(nextSrcOverrides)
                      try {
                        writeDealMakerOverrides(resolvedAddress, {
                          price: _value,
                          listPrice: _value,
                        })
                      } catch { /* ignore */ }
                    } else {
                      nextSrcOverrides.monthlyRent = _value
                      setSourceOverrides(nextSrcOverrides)
                      try {
                        writeDealMakerOverrides(resolvedAddress, {
                          monthlyRent: _value,
                        })
                      } catch { /* ignore */ }
                    }
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
