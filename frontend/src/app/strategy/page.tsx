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

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'
import { parseAddressString } from '@/utils/formatters'
import { getConditionAdjustment, getLocationAdjustment } from '@/utils/property-adjustments'
import { colors, typography, tw } from '@/components/iq-verdict/verdict-design-tokens'
import { PropertyAddressBar } from '@/components/iq-verdict/PropertyAddressBar'
import { AnalysisNav } from '@/components/navigation/AnalysisNav'

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

function normalizePercentMetric(value?: number): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  // Some payloads send ratios (0.0605), others already send percent (6.05).
  return Math.abs(value) <= 1 ? value * 100 : value
}


function StrategyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useSession()

  const addressParam = searchParams.get('address') || ''
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  const strategyParam = searchParams.get('strategy')
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(strategyParam)

  // Read DealMaker adjustments from sessionStorage (saved by Verdict page)
  const [dealMakerOverrides, setDealMakerOverrides] = useState<Record<string, any> | null>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !addressParam) return
    try {
      const sessionKey = `dealMaker_${encodeURIComponent(addressParam)}`
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

  // Scroll to top on mount — prevents opening mid-page after navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    async function fetchData() {
      if (!addressParam) { setError('No address'); setIsLoading(false); return }
      try {
        setIsLoading(true)
        const propData = await api.post<any>('/api/v1/properties/search', { address: addressParam })
        const v = propData.valuations || {}
        let price = v.market_price
          ?? (v.zestimate != null && v.current_value_avm != null ? Math.round((v.zestimate + v.current_value_avm) / 2) : null)
          ?? v.current_value_avm
          ?? v.zestimate
          ?? 350000
        let monthlyRent = propData.rentals?.monthly_rent_ltr || propData.rentals?.average_rent || Math.round(price * 0.007)
        let propertyTaxes = propData.taxes?.annual_tax_amount || Math.round(price * 0.012)
        let insuranceVal = propData.expenses?.insurance_annual || Math.round(price * 0.01)

        // Apply condition / location slider adjustments (from IQ Gateway)
        if (conditionParam) {
          const cond = getConditionAdjustment(Number(conditionParam))
          price += cond.pricePremium
        }
        if (locationParam) {
          const loc = getLocationAdjustment(Number(locationParam))
          monthlyRent = Math.round(monthlyRent * loc.rentMultiplier)
        }

        // Apply DealMaker overrides (saved from Verdict page)
        if (dealMakerOverrides) {
          if (dealMakerOverrides.buyPrice || dealMakerOverrides.purchasePrice) {
            price = dealMakerOverrides.buyPrice || dealMakerOverrides.purchasePrice
          }
          if (dealMakerOverrides.monthlyRent) monthlyRent = dealMakerOverrides.monthlyRent
          if (dealMakerOverrides.propertyTaxes) propertyTaxes = dealMakerOverrides.propertyTaxes
          if (dealMakerOverrides.insurance) insuranceVal = dealMakerOverrides.insurance
        }

        setPropertyInfo({ ...propData, price, monthlyRent, propertyTaxes, insurance: insuranceVal })

        const listingStatus = propData.listing?.listing_status
        const isListed = listingStatus && !['OFF_MARKET', 'SOLD', 'FOR_RENT'].includes(String(listingStatus)) && price > 0
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
    router.push(`/verdict?address=${encodeURIComponent(addressParam)}`)
  }, [router, addressParam])

  const handleOpenDealMaker = useCallback(() => {
    const params = new URLSearchParams({
      address: addressParam,
      openDealMaker: '1',
    })
    if (selectedStrategyId) params.set('strategy', selectedStrategyId)
    router.push(`/verdict?${params.toString()}`)
  }, [router, addressParam, selectedStrategyId])


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: colors.text.secondary }}>Loading strategy...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <p className="text-xl font-bold" style={{ color: colors.text.primary }}>{error || 'Unable to load'}</p>
          <button onClick={handleBack} className="mt-4 px-6 py-2 bg-sky-500 text-white rounded-full font-bold">
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
  const activeStrategyId = topStrategy?.id || 'ltr'

  // Score — capped at 95 (no deal is 100% certain)
  const verdictScore = Math.min(95, Math.max(0, data.deal_score ?? (data as any).dealScore ?? 0))

  const listPrice = data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? 350000
  // DealMaker overrides take priority, then backend data, then defaults
  const targetPrice = dealMakerOverrides?.buyPrice || dealMakerOverrides?.purchasePrice
    || data.purchase_price || (data as any).purchasePrice || Math.round(listPrice * 0.85)
  const monthlyRent = dealMakerOverrides?.monthlyRent
    || propertyInfo?.monthlyRent || Math.round(listPrice * 0.007)
  const propertyTaxes = dealMakerOverrides?.propertyTaxes
    || propertyInfo?.propertyTaxes || Math.round(listPrice * 0.012)
  const insurance = dealMakerOverrides?.insurance
    || propertyInfo?.insurance || Math.round(listPrice * 0.01)
  const parsed = parseAddressString(addressParam)

  // Condition / location adjustments for display
  const rehabCost = dealMakerOverrides?.rehabBudget
    || (conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0)

  // Financial calcs — use DealMaker values when available
  const downPaymentPct = (dealMakerOverrides?.downPayment || 20) / 100
  const closingCostsPct = (dealMakerOverrides?.closingCosts || 3) / 100
  const downPayment = targetPrice * downPaymentPct
  const closingCosts = targetPrice * closingCostsPct
  const loanAmount = targetPrice * (1 - downPaymentPct)
  const rate = (dealMakerOverrides?.interestRate || 6) / 100
  const loanTermYears = dealMakerOverrides?.loanTerm || 30
  const term = loanTermYears * 12
  const monthlyRate = rate / 12
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
  const vacancyPct = (dealMakerOverrides?.vacancyRate || 5) / 100
  const mgmtPct = (dealMakerOverrides?.managementRate || 8) / 100
  const maintPct = 0.05
  const reservesPct = 0.05
  const annualRent = monthlyRent * 12
  const vacancyLoss = annualRent * vacancyPct
  const effectiveIncome = annualRent - vacancyLoss
  const mgmt = annualRent * mgmtPct
  const maint = annualRent * maintPct
  const reserves = annualRent * reservesPct
  const totalExpenses = propertyTaxes + insurance + mgmt + maint + reserves
  const noi = effectiveIncome - totalExpenses
  const annualDebt = monthlyPI * 12
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  // Benchmarks — use per-strategy metrics from the backend, fall back to local calcs
  const strategyCapRate = topStrategy?.cap_rate ?? null
  const strategyCoc = topStrategy?.cash_on_cash ?? null
  const strategyDscr = topStrategy?.dscr ?? null
  const strategyCashFlow = topStrategy?.monthly_cash_flow ?? monthlyCashFlow
  const strategyAnnualCashFlow = topStrategy?.annual_cash_flow ?? annualCashFlow

  // Local calc benchmarks as fallback (always LTR style)
  const capRateLocal = normalizePercentMetric(data.return_factors?.capRate ?? (data as any).returnFactors?.capRate)
  const cocLocal = normalizePercentMetric(data.return_factors?.cashOnCash ?? (data as any).returnFactors?.cashOnCash)

  const capRateVal = strategyCapRate ?? capRateLocal
  const cocVal = strategyCoc ?? cocLocal

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

  // Confidence
  const of = data.opportunity_factors || (data as any).opportunityFactors
  const dealProb = of ? Math.min(100, Math.max(0, 50 + (of.dealGap || 0) * 5)) : 50
  const marketAlign = of?.motivation || 50
  const priceConf = (data.opportunity || (data as any).opportunity)?.score || 65

  const handlePDFDownload = (theme: 'light' | 'dark' = 'light') => {
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
      const url = `/api/report?${params}`
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
        throw new Error(errorData.detail || 'Failed to generate Excel report')
      }

      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'DealGapIQ_Strategy_Report.xlsx'
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
    <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <AnalysisNav />

      {/* Property address bar */}
      {propertyInfo && (
        <PropertyAddressBar
          address={propertyInfo.address?.street || parsed.street || addressParam}
          city={propertyInfo.address?.city || parsed.city}
          state={propertyInfo.address?.state || parsed.state}
          zip={propertyInfo.address?.zip_code || parsed.zip}
          beds={propertyInfo.details?.bedrooms || 3}
          baths={propertyInfo.details?.bathrooms || 2}
          sqft={propertyInfo.details?.square_footage || 1500}
          price={listPrice}
          listingStatus={propertyInfo.listing?.listing_status}
          zpid={propertyInfo.zpid}
        />
      )}

      <div className="max-w-[640px] lg:max-w-5xl mx-auto">
        {/* Page Header + Actions */}
        <section className="px-5 pt-8 pb-0">
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>The Deep Dive</p>
          {verdictScore >= 70 ? (
            <>
              <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>This Deal Passed the Screen.<br/>Here Are the Numbers.</h2>
              <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 0, lineHeight: 1.55 }}>
                Every dollar in and out — so you can see exactly whether this property pays for itself.
              </p>
            </>
          ) : (
            <>
              <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>Here&apos;s Why the Numbers Don&apos;t Work —<br/>and What Would Change Them.</h2>
              <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 0, lineHeight: 1.55 }}>
                Every dollar in and out so you can see exactly where the gap is and what it would take to make this deal work.
              </p>
            </>
          )}

          {/* Score + strategy badge — no VerdictIQ sub-brand; acknowledge when best strategy still loses money */}
          {(() => {
            const viewingBestStrategy = !selectedStrategyId || selectedStrategyId === sortedStrategies[0]?.id
            const bestIsNegative = viewingBestStrategy && (
              isFlipOrWholesale ? strategyAnnualCashFlow < 0 : strategyCashFlow < 0
            )
            const strategySuffix = (selectedStrategyId && selectedStrategyId !== sortedStrategies[0]?.id)
              ? ''
              : bestIsNegative
                ? ' — best available strategy'
                : ' recommended'
            return (
              <div className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: verdictScore >= 65 ? colors.accentBg.green : colors.accentBg.gold, border: `1px solid ${verdictScore >= 65 ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`, color: verdictScore >= 65 ? colors.status.positive : colors.brand.gold }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Score: {verdictScore} · {topStrategyName}{strategySuffix}
              </div>
            )
          })()}

          {/* Top Action Buttons — always 3 across */}
          <div className="grid grid-cols-3 gap-2 mt-5 mb-2">
            <button
              onClick={handleOpenDealMaker}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap"
              style={{ background: colors.brand.teal, color: '#fff' }}
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
              <span>{isExporting === 'pdf' ? 'Generating...' : 'Full Report'}</span>
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
              <span>{isExporting === 'excel' ? 'Generating...' : (() => {
                switch (activeStrategyId) {
                  case 'wholesale': return 'Deal Proforma'
                  case 'flip': return 'Flip Proforma'
                  case 'brrrr': return 'BRRRR Proforma'
                  case 'str': return 'STR Proforma'
                  case 'house_hack': return 'House Hack Proforma'
                  default: return 'Worksheet'
                }
              })()}</span>
            </button>
          </div>
        </section>

        {/* Financial Breakdown */}
        <section className="px-5 py-6">

          {/* Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Left: Pay */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>What You'd Pay</span>
                </div>
                <button onClick={handleOpenDealMaker} className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125 underline decoration-2 underline-offset-2 rounded px-2 py-1 -mr-2" style={{ color: colors.brand.teal }} title="Change assumptions"><svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Adjust</button>
              </div>
              {[
                ['Market Price', formatCurrency(listPrice), true],
                ['Target Buy', formatCurrency(targetPrice), false, colors.brand.blue],
                [`Down Payment (${Math.round(downPaymentPct * 100)}%)`, formatCurrency(downPayment)],
                [`Closing Costs (${Math.round(closingCostsPct * 100)}%)`, formatCurrency(closingCosts)],
                ...(rehabCost > 0 ? [['Rehab Budget', formatCurrency(rehabCost), false, colors.status.negative]] : []),
              ].map(([label, value, strike, color], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label as string}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: (color as string) || colors.text.primary, textDecoration: strike ? 'line-through' : undefined, ...(strike ? { color: colors.text.secondary } : {}) }}>{value as string}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 mt-1.5 border-t" style={{ borderColor: colors.ui.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>Cash Needed</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.brand.blue }}>{formatCurrency(downPayment + closingCosts + rehabCost)}</span>
              </div>

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>Your Loan</span>
                </div>
                <button onClick={handleOpenDealMaker} className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125 underline decoration-2 underline-offset-2 rounded px-2 py-1 -mr-2" style={{ color: colors.brand.teal }} title="Change assumptions"><svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Adjust</button>
              </div>
              {[
                ['Loan Amount', formatCurrency(loanAmount)],
                ['Interest Rate', `${(rate * 100).toFixed(1)}%`],
                ['Loan Term', `${loanTermYears} years`],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{value}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 mt-1.5 border-t" style={{ borderColor: colors.ui.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>Monthly Payment</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.brand.blue }}>{formatCurrency(monthlyPI)}</span>
              </div>

            </div>

            {/* Right: Earn + Expenses */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.positive }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.status.positive }}>What You'd Earn</span>
                </div>
                <button onClick={handleOpenDealMaker} className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125 underline decoration-2 underline-offset-2 rounded px-2 py-1 -mr-2" style={{ color: colors.brand.teal }} title="Change assumptions"><svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Adjust</button>
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
              <div className="flex justify-between pt-2.5 mt-1.5 border-t" style={{ borderColor: colors.ui.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>Effective Income</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.status.positive }}>{formatCurrency(effectiveIncome)}</span>
              </div>

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.negative }}>
                  <span className="text-[1.125rem] font-bold uppercase tracking-wide" style={{ color: colors.status.negative }}>What It Costs</span>
                </div>
                <button onClick={handleOpenDealMaker} className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125 underline decoration-2 underline-offset-2 rounded px-2 py-1 -mr-2" style={{ color: colors.brand.teal }} title="Change assumptions"><svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Adjust</button>
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
              <div className="flex justify-between pt-2.5 mt-1.5 border-t" style={{ borderColor: colors.ui.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>Total Costs</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.status.negative }}>{formatCurrency(totalExpenses)}/yr</span>
              </div>

            </div>
          </div>

          {/* Summary Cards — use per-strategy metrics when available */}
          {isFlipOrWholesale ? (
            /* Flip & Wholesale: Profit-oriented cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-6">
              <div className="rounded-xl p-4" style={{ background: strategyAnnualCashFlow >= 0 ? colors.accentBg.green : colors.accentBg.red, border: `1px solid ${strategyAnnualCashFlow >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>{activeStrategyId === 'wholesale' ? 'Assignment Fee' : 'Net Profit'}</p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-xs font-medium" style={{ color: strategyAnnualCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>Estimated</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: strategyAnnualCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>{formatCurrency(strategyAnnualCashFlow)}</p>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: colors.accentBg.green, border: `1px solid rgba(52,211,153,0.2)` }}>
                <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>ROI</p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-xs font-medium" style={{ color: colors.status.positive }}>Return</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: colors.status.positive }}>{cocVal !== null ? `${cocVal.toFixed(1)}%` : '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Rental strategies: NOI and Net Pocket — hero summary cards, full-width and prominent */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6 w-full">
              <div className="rounded-2xl p-5 sm:p-6 w-full" style={{ background: colors.accentBg.green, border: `1px solid rgba(52,211,153,0.25)`, boxShadow: `0 0 24px rgba(52,211,153,0.12)` }}>
                <p className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.text.primary }}>Before Your Loan</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: colors.status.positive }}>NOI</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums mt-2" style={{ color: colors.status.positive }}>{formatCurrency(noi)}</p>
                <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: colors.status.positive }}>{formatCurrency(Math.round(noi / 12))}/mo</p>
              </div>
              <div className="rounded-2xl p-5 sm:p-6 w-full" style={{ background: strategyCashFlow >= 0 ? colors.accentBg.green : colors.accentBg.red, border: `1px solid ${strategyCashFlow >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`, boxShadow: strategyCashFlow >= 0 ? `0 0 24px rgba(52,211,153,0.12)` : `0 0 24px rgba(248,113,113,0.12)` }}>
                <p className="text-sm font-bold uppercase tracking-wide" style={{ color: colors.text.primary }}>What You&apos;d Pocket</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: strategyCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>Net</p>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums mt-2" style={{ color: strategyCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>
                  {strategyCashFlow >= 0 ? formatCurrency(strategyAnnualCashFlow) : `(${formatCurrency(Math.abs(strategyAnnualCashFlow))})`}
                </p>
                <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: strategyCashFlow >= 0 ? colors.status.positive : colors.status.negative }}>
                  {strategyCashFlow >= 0 ? '' : '('}{formatCurrency(Math.abs(Math.round(strategyCashFlow)))}/mo{strategyCashFlow >= 0 ? '' : ')'}
                </p>
              </div>
            </div>
          )}

          {/* The Bottom Line */}
          <div className="mt-7 p-5 rounded-r-xl border border-l-[3px]" style={{ background: colors.background.card, borderColor: `rgba(56,189,248,0.12)`, borderLeftColor: colors.brand.blue }}>
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
          <div className="mt-7 flex gap-4 items-start rounded-[14px] p-5" style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}` }}>
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
                        color: isActive ? '#fff' : colors.text.body,
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

        {/* Benchmarks */}
        <section className="px-5 py-8 border-t" style={{ background: colors.background.bg, borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>Investor Benchmarks</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>How Does This Stack Up?</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}>
            We compare this deal against the numbers experienced investors actually look for. Green means this deal meets or beats the benchmark.
          </p>
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: colors.ui.border }}>
                <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: colors.text.secondary }}>Metric</th>
                <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: colors.text.secondary }}>This Deal</th>
                <th className="text-left text-xs font-bold uppercase tracking-wide py-3" style={{ color: colors.text.secondary }}>Target</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, i) => (
                <tr key={i} className="border-b" style={{ borderColor: colors.ui.border }}>
                  <td className="py-3 text-sm font-medium" style={{ color: colors.text.primary }}>{b.metric}</td>
                  <td className="py-3 text-sm font-semibold tabular-nums" style={{ color: colors.text.primary }}>{b.value}</td>
                  <td className="py-3 text-sm font-medium tabular-nums" style={{ color: colors.text.secondary }}>{b.target}</td>
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
        </section>

        {/* Data Quality */}
        <section className="px-5 py-8 border-t" style={{ borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>Data Quality</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>How Reliable Is This Analysis?</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}>
            No analysis is perfect. These scores show how much data we had to work with.
          </p>
          {[
            { label: 'Deal Probability', value: dealProb, color: colors.brand.blue },
            { label: 'Market Alignment', value: marketAlign, color: colors.brand.teal },
            { label: 'Price Confidence', value: priceConf, color: colors.brand.blue },
          ].map((m, i) => (
            <div key={i} className="flex items-center gap-3.5 mb-4">
              <span className="text-sm font-medium w-36 shrink-0" style={{ color: colors.text.body }}>{m.label}</span>
              <div className="flex-1 h-[7px] rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded" style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${m.color}, ${m.color}cc)` }} />
              </div>
              <span className="text-sm font-bold tabular-nums w-12 text-right" style={{ color: m.color }}>{Math.round(m.value)}%</span>
            </div>
          ))}
          <p className="text-xs mt-2" style={{ color: colors.text.muted }}>
            Price Confidence reflects comp availability in this price range. Luxury properties have fewer comparables.
          </p>
        </section>

        {/* Save CTA — adapt for logged-in vs anonymous; future: scan limit → Pro upgrade */}
        <section className="px-5 py-10 text-center border-t" style={{ borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 12 }}>You screened it. You proved it.</p>
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: colors.text.primary, letterSpacing: '-0.5px', lineHeight: 1.25 }}>Now Save It.</h2>
          <p className="text-[15px] mb-7 mx-auto max-w-sm" style={{ color: colors.text.body, lineHeight: 1.6 }}>
            Save to your DealVaultIQ and we&apos;ll keep the numbers fresh and alert you if anything changes.
          </p>
          {isAuthenticated ? (
            <>
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-white transition-all mb-4"
                style={{ background: colors.brand.teal }}>
                Save to DealVaultIQ
              </button>
            </>
          ) : (
            <>
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-white transition-all mb-4"
                style={{ background: colors.brand.teal }}>
                Create Free Account
              </button>
              <p className="text-xs" style={{ color: colors.text.secondary }}>No credit card · 3 free scans per month</p>
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: '#94A3B8' }}>Loading strategy...</p>
        </div>
      </div>
    }>
      <StrategyContent />
    </Suspense>
  )
}
