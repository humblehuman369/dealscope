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
  }>
  purchase_price: number
  breakeven_price: number
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
  useSession()

  const addressParam = searchParams.get('address') || ''
  const conditionParam = searchParams.get('condition')
  const locationParam = searchParams.get('location')
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState<string | null>(null)

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
        let price = propData.valuations?.current_value_avm || propData.valuations?.zestimate || 350000
        let monthlyRent = propData.rentals?.monthly_rent_ltr || propData.rentals?.average_rent || Math.round(price * 0.007)
        const propertyTaxes = propData.taxes?.annual_tax_amount || Math.round(price * 0.012)
        const insurance = propData.expenses?.insurance_annual || Math.round(price * 0.01)

        // Apply condition / location slider adjustments (from IQ Gateway)
        if (conditionParam) {
          const cond = getConditionAdjustment(Number(conditionParam))
          price += cond.pricePremium // Turnkey premium increases market value
        }
        if (locationParam) {
          const loc = getLocationAdjustment(Number(locationParam))
          monthlyRent = Math.round(monthlyRent * loc.rentMultiplier)
        }

        setPropertyInfo({ ...propData, price, monthlyRent, propertyTaxes, insurance })

        const analysis = await api.post<BackendAnalysisResponse>('/api/v1/analysis/verdict', {
          list_price: price,
          monthly_rent: monthlyRent,
          property_taxes: propertyTaxes,
          insurance,
          bedrooms: propData.details?.bedrooms || 3,
          bathrooms: propData.details?.bathrooms || 2,
          sqft: propData.details?.square_footage || 1500,
        })
        setData(analysis)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressParam, conditionParam, locationParam])

  const handleBack = useCallback(() => {
    router.push(`/verdict?address=${encodeURIComponent(addressParam)}`)
  }, [router, addressParam])

  const handleOpenDealMaker = useCallback(() => {
    router.push(`/verdict?address=${encodeURIComponent(addressParam)}&openDealMaker=1`)
  }, [router, addressParam])


  const handleExcelDownload = async () => {
    setIsExporting('excel')
    try {
      const propertyId = propertyInfo?.property_id || propertyInfo?.zpid || 'general'
      const topId = data?.strategies?.length ? [...data.strategies].sort((a, b) => b.score - a.score)[0]?.id || 'ltr' : 'ltr'
      const params = new URLSearchParams({
        address: addressParam,
        strategy: topId,
      })
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
      let filename = 'InvestIQ_Strategy_Report.xlsx'
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
    } finally {
      setIsExporting(null)
    }
  }

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

  // Top strategy — derive from backend data, never hardcode
  const topStrategy = data.strategies?.length
    ? [...data.strategies].sort((a, b) => b.score - a.score)[0]
    : null
  const topStrategyName = topStrategy?.name || 'Long-Term Rental'

  // Score — capped at 95 (no deal is 100% certain)
  const verdictScore = Math.min(95, Math.max(0, data.deal_score ?? (data as any).dealScore ?? 0))

  const listPrice = data.list_price ?? (data as any).listPrice ?? propertyInfo?.price ?? 350000
  const targetPrice = data.purchase_price ?? (data as any).purchasePrice ?? Math.round(listPrice * 0.85)
  const monthlyRent = propertyInfo?.monthlyRent || Math.round(listPrice * 0.007)
  const propertyTaxes = propertyInfo?.propertyTaxes || Math.round(listPrice * 0.012)
  const insurance = propertyInfo?.insurance || Math.round(listPrice * 0.01)
  const parsed = parseAddressString(addressParam)

  // Condition / location adjustments for display
  const rehabCost = conditionParam ? getConditionAdjustment(Number(conditionParam)).rehabCost : 0

  // Financial calcs
  const downPayment = targetPrice * 0.20
  const closingCosts = targetPrice * 0.03
  const loanAmount = targetPrice * 0.80
  const rate = 0.06; const term = 360
  const monthlyRate = rate / 12
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
  const annualRent = monthlyRent * 12
  const vacancyLoss = annualRent * 0.05
  const effectiveIncome = annualRent - vacancyLoss
  const mgmt = annualRent * 0.08
  const maint = annualRent * 0.05
  const reserves = annualRent * 0.05
  const totalExpenses = propertyTaxes + insurance + mgmt + maint + reserves
  const noi = effectiveIncome - totalExpenses
  const annualDebt = monthlyPI * 12
  const annualCashFlow = noi - annualDebt
  const monthlyCashFlow = annualCashFlow / 12

  // Benchmarks
  const capRateRaw = data.return_factors?.capRate ?? (data as any).returnFactors?.capRate
  const cocRaw = data.return_factors?.cashOnCash ?? (data as any).returnFactors?.cashOnCash
  const capRate = normalizePercentMetric(capRateRaw)
  const coc = normalizePercentMetric(cocRaw)
  const benchmarks = [
    { metric: 'Cap Rate', value: capRate !== null ? `${capRate.toFixed(1)}%` : '—', target: '6.0%', status: (capRate !== null && capRate >= 6.0) ? 'good' : 'poor' },
    { metric: 'Cash-on-Cash', value: coc !== null ? `${coc.toFixed(1)}%` : '—', target: '8.0%', status: (coc !== null && coc >= 8.0) ? 'good' : 'poor' },
    { metric: 'Monthly Cash Flow', value: formatCurrency(monthlyCashFlow), target: '+$300', status: monthlyCashFlow >= 300 ? 'good' : 'poor' },
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
        strategy: topStrategy?.id || 'ltr',
        theme,
        propertyId,
      })
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

  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <AnalysisNav />
      <div className="max-w-[640px] lg:max-w-5xl mx-auto">
        {/* Page Header + Actions */}
        <section className="px-5 pt-8 pb-0">
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>The Deep Dive</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>This Deal Passed the Screen.<br/>Here Are the Numbers.</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 0, lineHeight: 1.55 }}>
            Every dollar in and out — so you can see exactly whether this property pays for itself.
          </p>

          {/* VerdictIQ reference badge */}
          <div className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold" style={{ background: colors.accentBg.green, border: '1px solid rgba(52,211,153,0.2)', color: colors.status.positive }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            VerdictIQ Score: {verdictScore} · {topStrategyName} recommended
          </div>

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
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap"
              style={{ background: colors.background.cardUp, border: `1px solid ${colors.brand.teal}`, color: colors.brand.teal }}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Full Report</span>
            </button>
            <button
              onClick={handleExcelDownload}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all whitespace-nowrap"
              style={{ background: colors.background.cardUp, border: `1px solid ${colors.brand.teal}`, color: colors.brand.teal }}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
              <span>Worksheet</span>
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
                <button onClick={handleOpenDealMaker} className="text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125" style={{ color: colors.brand.teal }}>Adjust</button>
              </div>
              {[
                ['Market Price', formatCurrency(listPrice), true],
                ['Your Target Price', formatCurrency(targetPrice), false, colors.brand.blue],
                ['Down Payment (20%)', formatCurrency(downPayment)],
                ['Closing Costs (3%)', formatCurrency(closingCosts)],
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
                <button onClick={handleOpenDealMaker} className="text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125" style={{ color: colors.brand.teal }}>Adjust</button>
              </div>
              {[
                ['Loan Amount', formatCurrency(loanAmount)],
                ['Interest Rate', '6.0%'],
                ['Loan Term', '30 years'],
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
                <button onClick={handleOpenDealMaker} className="text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125" style={{ color: colors.brand.teal }}>Adjust</button>
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
                <span className="text-sm" style={{ color: colors.text.body }}>Vacancy Loss (5%)</span>
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
                <button onClick={handleOpenDealMaker} className="text-sm font-semibold uppercase tracking-wide transition-colors hover:brightness-125" style={{ color: colors.brand.teal }}>Adjust</button>
              </div>
              {[
                ['Property Tax', `${formatCurrency(propertyTaxes)}/yr`],
                ['Insurance', `${formatCurrency(insurance)}/yr`],
                ['Management (8%)', `${formatCurrency(mgmt)}/yr`],
                ['Maintenance (5%)', `${formatCurrency(maint)}/yr`],
                ['Reserves (5%)', `${formatCurrency(reserves)}/yr`],
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

          {/* Summary Cards — aligned row above action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-6">
            {/* Before Your Loan (NOI) Card */}
            <div className="rounded-xl p-4" style={{ background: colors.accentBg.green, border: `1px solid rgba(52,211,153,0.2)` }}>
              <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>Before Your Loan</p>
              <div className="flex justify-between items-baseline mt-1">
                <p className="text-xs font-medium" style={{ color: colors.status.positive }}>NOI</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: colors.status.positive }}>{formatCurrency(noi)}</p>
              </div>
              <p className="text-xs font-medium tabular-nums text-right mt-0.5" style={{ color: colors.status.positive }}>{formatCurrency(Math.round(noi / 12))}/mo</p>
            </div>

            {/* What You'd Pocket Card */}
            <div className="rounded-xl p-4" style={{ background: colors.accentBg.red, border: `1px solid rgba(248,113,113,0.2)` }}>
              <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>What You'd Pocket</p>
              <div className="flex justify-between items-baseline mt-1">
                <p className="text-xs font-medium" style={{ color: colors.status.negative }}>Net</p>
                <p className="text-lg font-bold tabular-nums" style={{ color: colors.status.negative }}>({formatCurrency(Math.abs(annualCashFlow))})</p>
              </div>
              <p className="text-xs font-medium tabular-nums text-right mt-0.5" style={{ color: colors.status.negative }}>({formatCurrency(Math.abs(Math.round(monthlyCashFlow)))})/mo</p>
            </div>
          </div>

          {/* The Bottom Line */}
          <div className="mt-7 p-5 rounded-r-xl border border-l-[3px]" style={{ background: colors.background.card, borderColor: `rgba(56,189,248,0.12)`, borderLeftColor: colors.brand.blue }}>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.brand.blue }}>The Bottom Line</p>
            <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
              {monthlyCashFlow >= 0 ? (
                <>At the Profit Entry Point of {formatCurrency(targetPrice)}, this property would <strong style={{ color: colors.status.positive, fontWeight: 600 }}>generate about {formatCurrency(Math.round(monthlyCashFlow))}/mo in cash flow</strong> as a {topStrategyName.toLowerCase()}. The numbers work — verify the assumptions with your own due diligence before making an offer.</>
              ) : (
                <>Even at the discounted Profit Entry Point of {formatCurrency(targetPrice)}, this property would <strong style={{ color: colors.text.primary, fontWeight: 600 }}>cost you about {formatCurrency(Math.abs(Math.round(monthlyCashFlow)))}/mo out of pocket</strong> as a {topStrategyName.toLowerCase()}. That doesn&apos;t mean it&apos;s a bad investment — but it means your returns come from appreciation and equity, not cashflow. Consider whether that fits your strategy.</>
              )}
            </p>
          </div>

          {/* Try Another Strategy */}
          <div className="mt-7 flex gap-4 items-start rounded-[14px] p-5" style={{ background: colors.background.card, border: `1px solid ${colors.ui.border}` }}>
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: colors.accentBg.gold }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.brand.gold} strokeWidth="2" strokeLinecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>
            </div>
            <div>
              <p className="text-sm font-extrabold mb-1.5" style={{ color: colors.text.primary }}>{topStrategyName} isn&apos;t the only path.</p>
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: colors.text.body }}>This property scored well across multiple strategies. See how the numbers change with a different approach.</p>
              <div className="flex flex-wrap gap-1.5">
                {(data.strategies || [])
                  .filter(s => s.name !== topStrategyName)
                  .slice(0, 4)
                  .map((s) => (
                    <span key={s.id} className="px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors" style={{ background: colors.background.cardUp, border: `1px solid ${colors.ui.border}`, color: colors.text.body }}>{s.name}</span>
                  ))}
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
        </section>

        {/* Save CTA */}
        <section className="px-5 py-10 text-center border-t" style={{ borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 12 }}>You screened it. You proved it.</p>
          <h2 className="text-2xl font-extrabold mb-3" style={{ color: colors.text.primary, letterSpacing: '-0.5px', lineHeight: 1.25 }}>Now Save It.</h2>
          <p className="text-[15px] mb-7 mx-auto max-w-sm" style={{ color: colors.text.body, lineHeight: 1.6 }}>
            Save to your DealVaultIQ and we&apos;ll keep the numbers fresh and alert you if anything changes.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-white transition-all mb-4"
            style={{ background: colors.brand.teal }}>
            Create Free Account
          </button>
          <p className="text-xs" style={{ color: colors.text.secondary }}>No credit card · 3 free scans per month</p>
        </section>

        {/* Footer */}
        <footer className="text-center py-5 text-xs" style={{ color: colors.text.secondary }}>
          Powered by <span className="font-semibold" style={{ color: colors.text.body }}>Invest<span style={{ color: colors.brand.blue }}>IQ</span></span>
        </footer>
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
