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

import { useCallback, useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSaveProperty } from '@/hooks/useSaveProperty'
import { api } from '@/lib/api-client'
import { WEB_BASE_URL, IS_CAPACITOR } from '@/lib/env'
import { usePropertyData } from '@/hooks/usePropertyData'
import { parseAddressString } from '@/utils/formatters'
import { buildDealMakerSessionKey, canonicalizeAddressForIdentity, writeDealMakerOverrides } from '@/utils/addressIdentity'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { tw, getAssessment } from '@/components/iq-verdict/verdict-design-tokens'
import { IQEstimateSelector, type IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'
import { AuthGate } from '@/components/auth/AuthGate'

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
    cardUp: 'var(--surface-base)',
    card: 'var(--surface-base)',
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

  // Read DealMaker/verdict snapshot from sessionStorage (Verdict writes listPrice, incomeValue, purchasePrice;
  // key uses canonical address so it matches when navigating Verdict → Strategy).
  const [dealMakerOverrides, setDealMakerOverrides] = useState<Record<string, any> | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    try {
      const canonicalAddress = canonicalizeAddressForIdentity(addressParam)
      const sessionKey = buildDealMakerSessionKey(canonicalAddress)
      const stored = sessionStorage.getItem(sessionKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
          console.log('[StrategyIQ] Loaded DealMaker overrides from sessionStorage:', parsed)
          setDealMakerOverrides(parsed)
          // If sessionStorage has a strategy and no URL param, use it
          if (!strategyParam && parsed.strategy) {
            setSelectedStrategyId(parsed.strategy)
          }
        }
      }
    } catch (e) {
      console.warn('[StrategyIQ] Failed to read sessionStorage:', e)
    }
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

  const { isSaved, isSaving, save, toggle } = useSaveProperty({
    displayAddress: resolvedAddress,
    propertySnapshot: savePropertySnapshot,
  })

  // Scroll to top on mount — prevents opening mid-page after navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!addressParam) { setError('No address'); setIsLoading(false); return }
      try {
        setIsLoading(true)
        const propData = await fetchProperty(addressParam)
        const v = propData.valuations || {}
        // Zestimate is primary source for off-market; sequential fallbacks prevent crashes
        let price = v.market_price
          ?? v.zestimate
          ?? v.current_value_avm
          ?? (v.tax_assessed_value ? Math.round(v.tax_assessed_value / 0.75) : null)
          ?? 1
        let monthlyRent = propData.rentals?.monthly_rent_ltr || 0
        let propertyTaxes = propData.taxes?.annual_tax_amount || 0
        let insuranceVal = propData.expenses?.insurance_annual || 0

        // Apply condition / location slider adjustments (from IQ Gateway)
        if (conditionParam) {
          const cond = getConditionAdjustment(Number(conditionParam))
          price += cond.pricePremium
        }
        if (locationParam) {
          const loc = getLocationAdjustment(Number(locationParam))
          monthlyRent = Math.round(monthlyRent * loc.rentMultiplier)
        }

        // Apply DealMaker/verdict overrides: listPrice from Verdict = Market (single source of truth);
        // buyPrice/purchasePrice only used as market when listPrice not set (e.g. after Deal Maker Apply).
        if (dealMakerOverrides) {
          if (dealMakerOverrides.listPrice != null && dealMakerOverrides.listPrice > 0) {
            price = dealMakerOverrides.listPrice
          } else if (dealMakerOverrides.buyPrice || dealMakerOverrides.purchasePrice) {
            price = dealMakerOverrides.buyPrice || dealMakerOverrides.purchasePrice
          }
          if (dealMakerOverrides.monthlyRent) monthlyRent = dealMakerOverrides.monthlyRent
          if (dealMakerOverrides.propertyTaxes) propertyTaxes = dealMakerOverrides.propertyTaxes
          if (dealMakerOverrides.insurance) insuranceVal = dealMakerOverrides.insurance
        }

        setPropertyInfo({ ...propData, price, monthlyRent, propertyTaxes, insurance: insuranceVal })

        // Populate IQ Estimate 3-value sources for the selector
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

        const listingStatus = propData.listing?.listing_status
        const isListed = listingStatus && !['OFF_MARKET', 'SOLD', 'FOR_RENT', 'OTHER'].includes(String(listingStatus)) && price > 0
        const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', {
          list_price: price,
          monthly_rent: monthlyRent,
          property_taxes: propertyTaxes,
          insurance: insuranceVal,
          bedrooms: propData.details?.bedrooms || 3,
          bathrooms: propData.details?.bathrooms || 2,
          sqft: propData.details?.square_footage || 1500,
          is_listed: isListed ?? undefined,
          zestimate: v.zestimate ?? undefined,
          current_value_avm: v.current_value_avm ?? undefined,
          tax_assessed_value: v.tax_assessed_value ?? undefined,
        })
        setData(analysis)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- api.post is a stable module-level reference
  }, [addressParam, conditionParam, locationParam, dealMakerOverrides])

  const handleBack = useCallback(() => {
    router.push(`/verdict?address=${encodeURIComponent(resolvedAddress)}`)
  }, [router, resolvedAddress])

  const handleOpenDealMaker = useCallback(() => {
    const params = new URLSearchParams({
      address: resolvedAddress,
      from: 'strategy',
    })
    if (selectedStrategyId) params.set('strategy', selectedStrategyId)
    router.push(`/deal-maker?${params.toString()}`)
  }, [router, resolvedAddress, selectedStrategyId])


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[var(--accent-sky)] border-t-transparent rounded-full animate-spin" />
          <p style={{ color: 'var(--text-heading)' }}>Loading strategy...</p>
        </div>
      </div>
    )
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

  // Same fallback as Verdict when no valuations (single source of truth)
  // Source selector override takes priority so switching providers recalculates instantly
  const listPriceFallback = 0
  const listPrice = sourceOverrides.price ?? data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? listPriceFallback
  // DealMaker/verdict overrides: purchasePrice from verdict or Deal Maker, then backend
  const targetPrice = dealMakerOverrides?.purchasePrice ?? dealMakerOverrides?.buyPrice
    ?? (sourceOverrides.price != null ? Math.round(sourceOverrides.price * 0.85) : null)
    ?? data.purchase_price ?? (data as any).purchasePrice ?? Math.round(listPrice * 0.85)
  const monthlyRent = dealMakerOverrides?.monthlyRent
    ?? sourceOverrides.monthlyRent ?? propertyInfo?.monthlyRent ?? 0
  const propertyTaxes = dealMakerOverrides?.propertyTaxes
    ?? propertyInfo?.propertyTaxes ?? 0
  const insurance = dealMakerOverrides?.insurance
    ?? propertyInfo?.insurance ?? 0
  const parsed = parseAddressString(addressParam)

  // Condition / location adjustments for display
  const rehabCost = dealMakerOverrides?.rehabBudget
    || (conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0)

  // Strategy-specific financial breakdown from backend — each strategy (LTR, BRRRR, STR, etc.)
  // returns its own breakdown with the correct financing terms and expense structure
  const bd = topStrategy?.breakdown as Record<string, number> | undefined

  // DealMaker overrides signal the user adjusted assumptions in real-time
  const hasDealMakerOverrides = !!(
    dealMakerOverrides?.downPayment || dealMakerOverrides?.closingCosts ||
    dealMakerOverrides?.interestRate || dealMakerOverrides?.loanTerm ||
    dealMakerOverrides?.vacancyRate || dealMakerOverrides?.managementRate
  )

  // Input percentages: DealMaker override > backend strategy breakdown > conservative default
  // Interest rate: backend and DealMaker sessionStorage use decimal (0.06 = 6%); Verdict sessionStorage uses percentage (6)
  const rawInterest = dealMakerOverrides?.interestRate ?? bd?.interest_rate ?? 6
  const rate = rawInterest <= 1 ? rawInterest : rawInterest / 100

  const downPaymentPct = (dealMakerOverrides?.downPayment ?? bd?.down_payment_pct ?? 20) / 100
  const closingCostsPct = (dealMakerOverrides?.closingCosts ?? bd?.closing_costs_pct ?? 3) / 100
  const loanTermYears = dealMakerOverrides?.loanTerm ?? bd?.loan_term_years ?? 30
  const vacancyPct = (dealMakerOverrides?.vacancyRate ?? bd?.vacancy_rate ?? 5) / 100
  const mgmtPct = (dealMakerOverrides?.managementRate ?? bd?.management_pct ?? 8) / 100
  const maintPct = (bd?.maintenance_pct ?? 5) / 100
  const reservesPct = (bd?.reserves_pct ?? 5) / 100

  // Derived financials: use backend breakdown when no user adjustments, recalculate otherwise
  const downPayment = !hasDealMakerOverrides && bd?.down_payment != null ? bd.down_payment : targetPrice * downPaymentPct
  const closingCosts = !hasDealMakerOverrides && bd?.closing_costs != null ? bd.closing_costs : targetPrice * closingCostsPct
  const loanAmount = !hasDealMakerOverrides && bd?.loan_amount != null ? bd.loan_amount : targetPrice - downPayment
  const term = loanTermYears * 12
  const monthlyRate = rate / 12
  const monthlyPICalc = monthlyRate > 0
    ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
    : loanAmount / term
  const monthlyPI = !hasDealMakerOverrides && bd?.monthly_payment != null ? bd.monthly_payment : monthlyPICalc
  const annualRent = monthlyRent * 12
  const vacancyLoss = !hasDealMakerOverrides && bd?.vacancy_loss != null ? bd.vacancy_loss : annualRent * vacancyPct
  const effectiveIncome = !hasDealMakerOverrides && bd?.effective_income != null ? bd.effective_income : annualRent - vacancyLoss
  const mgmt = !hasDealMakerOverrides && bd?.management != null ? bd.management : annualRent * mgmtPct
  const maint = !hasDealMakerOverrides && bd?.maintenance != null ? bd.maintenance : annualRent * maintPct
  const reserves = !hasDealMakerOverrides && bd?.reserves != null ? bd.reserves : annualRent * reservesPct
  const totalExpenses = !hasDealMakerOverrides && bd?.total_operating_expenses != null ? bd.total_operating_expenses : propertyTaxes + insurance + mgmt + maint + reserves
  const noi = !hasDealMakerOverrides && bd?.noi != null ? bd.noi : effectiveIncome - totalExpenses
  const annualDebt = !hasDealMakerOverrides && bd?.annual_debt_service != null ? bd.annual_debt_service : monthlyPI * 12
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  // Benchmarks — backend strategy metrics are authoritative; fall back to local calc
  // When DealMaker overrides change the underlying financials, use locally-derived values
  // API returns camelCase (capRate, cashOnCash); support both for compatibility
  const strategyCapRate = hasDealMakerOverrides
    ? (targetPrice > 0 ? noi / targetPrice * 100 : 0)
    : ((topStrategy as { cap_rate?: number; capRate?: number })?.capRate ?? topStrategy?.cap_rate ?? null)
  const totalCashNeeded = downPayment + closingCosts + rehabCost
  const dealGapPct = listPrice ? ((listPrice - targetPrice) / listPrice) * 100 : 0
  const strategyCoc = hasDealMakerOverrides
    ? (totalCashNeeded > 0 ? annualCashFlow / totalCashNeeded * 100 : 0)
    : ((topStrategy as { cash_on_cash?: number; cashOnCash?: number })?.cashOnCash ?? topStrategy?.cash_on_cash ?? null)
  const strategyDscr = hasDealMakerOverrides
    ? (annualDebt > 0 ? noi / annualDebt : 0)
    : (topStrategy?.dscr ?? null)
  const strategyCashFlow = hasDealMakerOverrides ? monthlyCashFlow : (topStrategy?.monthly_cash_flow ?? monthlyCashFlow)
  const strategyAnnualCashFlow = hasDealMakerOverrides ? annualCashFlow : (topStrategy?.annual_cash_flow ?? annualCashFlow)

  // Prefer backend values; fall back to local calc so cap rate and CoC always render when we have the numbers
  const capRateVal = strategyCapRate ?? (targetPrice > 0 ? noi / targetPrice * 100 : null)
  const cocVal = strategyCoc ?? (totalCashNeeded > 0 ? annualCashFlow / totalCashNeeded * 100 : null)

  const isFlipOrWholesale = activeStrategyId === 'fix-and-flip' || activeStrategyId === 'wholesale'
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
      // Include user adjustments so the report reflects what's on screen
      if (dealMakerOverrides?.buyPrice || dealMakerOverrides?.purchasePrice) {
        params.set('purchase_price', String(targetPrice))
      }
      if (dealMakerOverrides?.monthlyRent) params.set('monthly_rent', String(monthlyRent))
      if (dealMakerOverrides?.interestRate) params.set('interest_rate', String(rate * 100))
      if (dealMakerOverrides?.downPayment) params.set('down_payment_pct', String(downPaymentPct * 100))
      if (dealMakerOverrides?.propertyTaxes) params.set('property_taxes', String(propertyTaxes))
      if (dealMakerOverrides?.insurance) params.set('insurance', String(insurance))
      // Open the Vercel-hosted HTML report in a new tab
      // The report auto-triggers window.print() for Save as PDF
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
      // Always pass user-adjusted values so the export matches what's on screen
      if (dealMakerOverrides?.buyPrice || dealMakerOverrides?.purchasePrice) {
        params.set('purchase_price', String(targetPrice))
      }
      if (dealMakerOverrides?.monthlyRent) params.set('monthly_rent', String(monthlyRent))
      if (dealMakerOverrides?.interestRate) params.set('interest_rate', String(rate * 100))
      if (dealMakerOverrides?.downPayment) params.set('down_payment_pct', String(downPaymentPct * 100))
      if (dealMakerOverrides?.propertyTaxes) params.set('property_taxes', String(propertyTaxes))
      if (dealMakerOverrides?.insurance) params.set('insurance', String(insurance))
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
    <div className="min-h-screen bg-[var(--surface-base)]" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Header and property bar are provided by AppHeader in layout */}

      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 mx-auto">
        {/* Page Header + Actions */}
        <section className="px-5 pt-8 pb-0">
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>The Deep Dive</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>The math behind the score.</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 0, lineHeight: 1.55 }}>
            This {verdictScore} assumes an annual rental at the Target Buy price — {Math.round(downPaymentPct * 100)}% down, {(rate * 100).toFixed(1)}% rate, {loanTermYears}-year term. These are starting points. Hit{' '}
            <button
              onClick={handleOpenDealMaker}
              className="font-bold cursor-pointer hover:underline underline-offset-2 transition-colors"
              style={{ color: 'var(--accent-sky)', background: 'none', border: 'none', padding: 0, font: 'inherit' }}
            >Change Terms</button>
            {' '}to adjust any assumption and see how the deal shifts in real time.
          </p>

        </section>

        {/* IQ Estimate Source Selector */}
        {(iqSources.value.iq != null || iqSources.value.zillow != null || iqSources.value.rentcast != null || iqSources.value.redfin != null || iqSources.value.realtor != null ||
          iqSources.rent.iq != null || iqSources.rent.zillow != null || iqSources.rent.rentcast != null || iqSources.rent.realtor != null) && (
          <section className="px-5 pt-2 pb-4">
            <IQEstimateSelector
              sources={iqSources}
              onSourceChange={(type, _sourceId, _value) => {
                if (_value == null) return
                if (type === 'value') {
                  setSourceOverrides((prev) => ({ ...prev, price: _value }))
                  // Keep property bar header in sync with selected data source value
                  try {
                    writeDealMakerOverrides(resolvedAddress, {
                      price: _value,
                      listPrice: _value,
                    })
                  } catch {
                    // Ignore storage errors
                  }
                } else {
                  setSourceOverrides((prev) => ({ ...prev, monthlyRent: _value }))
                }
              }}
            />
          </section>
        )}

        {/* Financial Breakdown — requires free (logged-in) tier */}
        <AuthGate feature="view the full strategy breakdown" mode="section">
        <section className="px-5 py-6">

          {/* Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Left: Pay */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>What You'd Pay</span>
                </div>
              </div>
              {[
                ['Market Price', formatCurrency(listPrice), true],
                ['Target Buy', formatCurrency(targetPrice), false, colors.brand.blue],
                ['Loan Amount', formatCurrency(loanAmount), false],
                [`Down Payment (${Math.round(downPaymentPct * 100)}%)`, formatCurrency(downPayment)],
                [`Closing Costs (${Math.round(closingCostsPct * 100)}%)`, formatCurrency(closingCosts)],
                ...(rehabCost > 0 ? [['Rehab Budget', formatCurrency(rehabCost), false, colors.status.negative]] : []),
              ].map(([label, value, strike, color], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label as string}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: (color as string) || colors.text.primary, textDecoration: strike ? 'line-through' : undefined, ...(strike ? { color: 'var(--text-body)' } : {}) }}>{value as string}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 pb-2.5 mt-1.5" style={{ borderTop: `2px solid ${colors.brand.blue}`, borderBottom: `2px solid ${colors.brand.blue}` }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>Cash Needed</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{formatCurrency(downPayment + closingCosts + rehabCost)}</span>
              </div>

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>Your Loan Payment</span>
                </div>
              </div>
              {[
                ['Interest Rate', `${(rate * 100).toFixed(1)}%`],
                ['Loan Term', `${loanTermYears} years`],
                ['Monthly Payment', formatCurrency(monthlyPI)],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 pb-2.5 mt-1.5" style={{ borderTop: `2px solid ${colors.brand.blue}`, borderBottom: `2px solid ${colors.brand.blue}` }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>Annual Payment</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{formatCurrency(annualDebt)}</span>
              </div>

            </div>

            {/* Right: Costs + Earn */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.negative }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.status.negative }}>What It Costs</span>
                </div>
              </div>
              {[
                ['Property Tax', `${formatCurrency(propertyTaxes)}/yr`],
                ['Insurance', `${formatCurrency(insurance)}/yr`],
                [`Management (${Math.round(mgmtPct * 100)}%)`, `${formatCurrency(mgmt)}/yr`],
                [`Maintenance (${Math.round(maintPct * 100)}%)`, `${formatCurrency(maint)}/yr`],
                [`Reserves (${Math.round(reservesPct * 100)}%)`, `${formatCurrency(reserves)}/yr`],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 pb-2.5 mt-1.5" style={{ borderTop: `2px solid ${colors.status.negative}`, borderBottom: `2px solid ${colors.status.negative}` }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>Total Costs</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{formatCurrency(totalExpenses)}/yr</span>
              </div>

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.positive }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.status.positive }}>What You'd Earn</span>
                </div>
              </div>
              {[
                ['Monthly Rent', formatCurrency(monthlyRent)],
                ['Annual Gross', formatCurrency(annualRent)],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5">
                <span className="text-sm" style={{ color: colors.text.body }}>Vacancy Loss ({Math.round(vacancyPct * 100)}%)</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: colors.status.negative }}>({formatCurrency(vacancyLoss)})</span>
              </div>
              <div className="flex justify-between pt-2.5 pb-2.5 mt-1.5" style={{ borderTop: `2px solid ${colors.status.positive}`, borderBottom: `2px solid ${colors.status.positive}` }}>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>Effective Income</span>
                <span className="font-bold tabular-nums" style={{ color: 'var(--text-heading)', fontSize: '1.14rem' }}>{formatCurrency(effectiveIncome)}</span>
              </div>

            </div>
          </div>

          {/* Summary Cards — use per-strategy metrics when available */}
          {isFlipOrWholesale ? (
            /* Flip & Wholesale: Profit-oriented cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-10 pt-4">
              <div className="rounded-xl p-4" style={{ background: strategyAnnualCashFlow >= 0 ? colors.accentBg.green : colors.accentBg.red, border: `1px solid ${strategyAnnualCashFlow >= 0 ? 'var(--status-positive)' : 'var(--status-negative)'}` }}>
                <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>{activeStrategyId === 'wholesale' ? 'Assignment Fee' : 'Net Profit'}</p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-xs font-medium" style={{ color: strategyAnnualCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>Estimated</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: strategyAnnualCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>{formatCurrency(strategyAnnualCashFlow)}</p>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: colors.accentBg.green, border: '1px solid var(--status-positive)' }}>
                <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>ROI</p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-xs font-medium" style={{ color: colors.status.positive }}>Return</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: colors.status.positive }}>{cocVal !== null ? `${cocVal.toFixed(1)}%` : '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Rental strategies: NOI and Net Cash Flow — compact, always side-by-side, responsive */
            <>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 mt-6 sm:mt-8 md:mt-10 pt-2 sm:pt-4 w-full min-w-0">
                <div
                  className="min-w-0 p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl"
                  style={{
                    background: 'var(--surface-base)',
                    borderLeft: `3px solid ${colors.status.positive}`,
                    borderTop: '1px solid var(--status-positive)',
                    borderRight: '1px solid var(--status-positive)',
                    borderBottom: '1px solid var(--status-positive)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <p className="text-[11px] sm:text-[14px] font-bold uppercase tracking-wider truncate" style={{ color: colors.status.positive }}>NOI</p>
                  <p className="text-[10px] sm:text-[13px] font-medium mt-0.5 truncate" style={{ color: colors.text.body }}>Before Mortgage</p>
                  <p className="text-[17px] sm:text-[24px] md:text-[28px] font-extrabold tabular-nums mt-2 sm:mt-3 leading-tight" style={{ color: colors.status.positive }}>
                    <span className="truncate">{formatCurrency(noi)}</span>
                    <span className="text-[11px] sm:text-[14px] font-semibold opacity-70">/yr</span>
                  </p>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3" style={{ borderTop: '1px solid var(--status-positive)' }}>
                    <p className="text-[12px] sm:text-[16px] font-semibold tabular-nums truncate" style={{ color: colors.status.positive }}>
                      {formatCurrency(Math.round(noi / 12))}/mo
                    </p>
                  </div>
                </div>

                {(() => {
                  const netColor = strategyCashFlow >= 0 ? colors.status.positive : colors.status.negative
                  const netGreen = strategyCashFlow >= 0
                  return (
                    <div
                      className="min-w-0 p-3 sm:p-4 md:p-6 rounded-xl md:rounded-2xl"
                      style={{
                        background: 'var(--surface-base)',
                        borderLeft: `3px solid ${netColor}`,
                        borderTop: `1px solid ${netGreen ? 'var(--status-positive)' : 'var(--status-negative)'}`,
                        borderRight: `1px solid ${netGreen ? 'var(--status-positive)' : 'var(--status-negative)'}`,
                        borderBottom: `1px solid ${netGreen ? 'var(--status-positive)' : 'var(--status-negative)'}`,
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <p className="text-[11px] sm:text-[14px] font-bold uppercase tracking-wider truncate" style={{ color: netColor }}>Net Cash Flow</p>
                      <p className="text-[10px] sm:text-[13px] font-medium mt-0.5 truncate" style={{ color: colors.text.body }}>After Mortgage</p>
                      <p className="text-[17px] sm:text-[24px] md:text-[28px] font-extrabold tabular-nums mt-2 sm:mt-3 leading-tight" style={{ color: netColor }}>
                        <span className="truncate">{netGreen ? formatCurrency(strategyAnnualCashFlow) : `(${formatCurrency(Math.abs(strategyAnnualCashFlow))})`}</span>
                        <span className="text-[11px] sm:text-[14px] font-semibold opacity-70">/yr</span>
                      </p>
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3" style={{ borderTop: `1px solid ${netGreen ? 'var(--status-positive)' : 'var(--status-negative)'}` }}>
                        <p className="text-[12px] sm:text-[16px] font-semibold tabular-nums truncate" style={{ color: netColor }}>
                          {netGreen ? '' : '('}{formatCurrency(Math.abs(Math.round(strategyCashFlow)))}/mo{netGreen ? '' : ')'}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                {(() => {
                  const capAssess = capRateVal !== null ? getAssessment(capRateVal, 6.0) : null
                  return (
                    <div className="rounded-xl p-4" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-[18px] font-bold uppercase tracking-wider" style={{ color: colors.text.body }}>Cap Rate</p>
                        <p className="text-[18px] font-bold tabular-nums" style={{ color: colors.text.primary }}>
                          {capRateVal !== null ? `${capRateVal.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[11px]" style={{ color: colors.text.body }}>Target: 6.0%</p>
                        {capAssess && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: capAssess.color }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: capAssess.color }} />
                            {capAssess.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {(() => {
                  const cocAssess = cocVal !== null ? getAssessment(cocVal, 8.0) : null
                  return (
                    <div className="rounded-xl p-4" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-[18px] font-bold uppercase tracking-wider" style={{ color: colors.text.body }}>Cash-on-Cash</p>
                        <p className="text-[18px] font-bold tabular-nums" style={{ color: colors.text.primary }}>
                          {cocVal !== null ? `${cocVal.toFixed(1)}%` : '—'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[11px]" style={{ color: colors.text.body }}>Target: 8.0%</p>
                        {cocAssess && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: cocAssess.color }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cocAssess.color }} />
                            {cocAssess.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Action Buttons — always 3 across */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                <button
                  onClick={handleOpenDealMaker}
                  className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap"
                  style={{ background: colors.brand.teal, color: 'var(--text-inverse)' }}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  <span>Change Terms</span>
                </button>
                <button
                  onClick={() => handlePDFDownload('light')}
                  disabled={isExporting === 'pdf'}
                  className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                  style={{ background: colors.background.cardUp, border: `1px solid ${colors.brand.teal}`, color: colors.brand.teal }}
                >
                  {isExporting === 'pdf' ? (
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  )}
                  <span>{isExporting === 'pdf' ? 'Generating...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={handleExcelDownload}
                  disabled={isExporting === 'excel'}
                  className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                  style={{ background: colors.background.cardUp, border: `1px solid ${colors.brand.teal}`, color: colors.brand.teal }}
                >
                  {isExporting === 'excel' ? (
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                  )}
                  <span>{isExporting === 'excel' ? 'Generating...' : 'Download Excel'}</span>
                </button>
              </div>
            </>
          )}

          {/* The Bottom Line */}
          <div className="mt-7 p-5 rounded-xl border" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card-hover)' }}>
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

          {/* Try Another Strategy */}
          <div className="mt-7 flex gap-4 items-start rounded-[14px] p-5" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card-hover)' }}>
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: colors.accentBg.gold }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.brand.gold} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
            </div>
            <div>
              <p className="text-sm font-extrabold mb-1.5" style={{ color: colors.text.primary }}>Try a different strategy.</p>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: colors.text.body }}>This property scored well across multiple strategies. Tap one to see how the numbers change.</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedStrategies.map((s) => {
                  const isActive = s.id === activeStrategyId
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStrategyId(s.id)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all"
                      style={{
                        background: isActive ? colors.brand.teal : colors.background.cardUp,
                        border: `1px solid ${isActive ? colors.brand.teal : colors.ui.border}`,
                        color: isActive ? 'var(--text-inverse)' : colors.text.body,
                      }}
                    >
                      {s.name}
                      <span className="ml-1 opacity-60">{s.score}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benchmarks — same width and rounded corners as Try Another Strategy card above */}
        <section className="px-5 py-8 border-t" style={{ borderColor: colors.ui.border }}>
          <div className="w-full rounded-[14px] p-5" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card-hover)' }}>
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
        <section className="px-5 py-10 text-center border-t" style={{ borderColor: colors.ui.border }}>
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
    </div>
  )
}

export default function StrategyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[var(--accent-sky)] border-t-transparent rounded-full animate-spin" />
          <p style={{ color: 'var(--text-heading)' }}>Loading strategy...</p>
        </div>
      </div>
    }>
      <StrategyContent />
    </Suspense>
  )
}
