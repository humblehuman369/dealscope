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
import { colors, typography, tw } from '@/components/iq-verdict/verdict-design-tokens'

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


function StrategyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useSession()

  const addressParam = searchParams.get('address') || ''
  const [data, setData] = useState<BackendAnalysisResponse | null>(null)
  const [propertyInfo, setPropertyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!addressParam) { setError('No address'); setIsLoading(false); return }
      try {
        setIsLoading(true)
        const propData = await api.post<any>('/api/v1/properties/search', { address: addressParam })
        const price = propData.valuations?.current_value_avm || propData.valuations?.zestimate || 350000
        const monthlyRent = propData.rentals?.monthly_rent_ltr || propData.rentals?.average_rent || Math.round(price * 0.007)
        const propertyTaxes = propData.taxes?.annual_tax_amount || Math.round(price * 0.012)
        const insurance = propData.expenses?.insurance_annual || Math.round(price * 0.01)
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
  }, [addressParam])

  const handleBack = useCallback(() => {
    router.push(`/verdict?address=${encodeURIComponent(addressParam)}`)
  }, [router, addressParam])

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

  const listPrice = data.list_price || propertyInfo?.price || 350000
  const targetPrice = data.purchase_price || Math.round(listPrice * 0.85)
  const monthlyRent = propertyInfo?.monthlyRent || Math.round(listPrice * 0.007)
  const propertyTaxes = propertyInfo?.propertyTaxes || Math.round(listPrice * 0.012)
  const insurance = propertyInfo?.insurance || Math.round(listPrice * 0.01)
  const parsed = parseAddressString(addressParam)

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
  const capRate = data.return_factors?.capRate || (data as any).returnFactors?.capRate
  const coc = data.return_factors?.cashOnCash || (data as any).returnFactors?.cashOnCash
  const benchmarks = [
    { metric: 'Cap Rate', value: capRate ? `${(capRate * 100).toFixed(1)}%` : '—', target: '6.0%', status: (capRate && capRate >= 0.06) ? 'good' : 'poor' },
    { metric: 'Cash-on-Cash', value: coc ? `${(coc * 100).toFixed(1)}%` : '—', target: '8.0%', status: (coc && coc >= 0.08) ? 'good' : 'poor' },
    { metric: 'Monthly Cash Flow', value: formatCurrency(monthlyCashFlow), target: '+$300', status: monthlyCashFlow >= 300 ? 'good' : 'poor' },
  ]

  // Confidence
  const of = data.opportunity_factors || (data as any).opportunityFactors
  const dealProb = of ? Math.min(100, Math.max(0, 50 + (of.dealGap || 0) * 5)) : 50
  const marketAlign = of?.motivation || 50
  const priceConf = (data.opportunity || (data as any).opportunity)?.score || 65

  const handleExportReport = () => {
    const score = data.deal_score || 0
    const verdict = data.deal_verdict || 'Unknown'
    const streetAddr = parsed.street || addressParam.split(',')[0]
    const cityStateZip = [parsed.city, [parsed.state, parsed.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>InvestIQ Strategy Report — ${streetAddr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color: #1e293b; background: #fff; padding: 40px 48px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
  .subtitle { font-size: 13px; color: #64748b; margin-bottom: 4px; }
  .score-badge { display: inline-block; font-size: 13px; font-weight: 700; padding: 3px 14px; border-radius: 20px; margin-top: 8px; }
  .score-good { background: #dcfce7; color: #16a34a; }
  .score-poor { background: #fee2e2; color: #dc2626; }
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #0ea5e9; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  td { font-size: 13px; padding: 7px 0; border-bottom: 1px solid #f1f5f9; }
  td:last-child { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; border-top: 2px solid #e2e8f0; border-bottom: none; padding-top: 10px; }
  .highlight { color: #0ea5e9; }
  .negative { color: #dc2626; }
  .positive { color: #16a34a; }
  .result-box { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-radius: 10px; margin-bottom: 10px; }
  .result-noi { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .result-cf { background: #fef2f2; border: 1px solid #fecaca; }
  .result-box .label { font-size: 13px; font-weight: 600; }
  .result-box .sublabel { font-size: 11px; color: #64748b; margin-top: 2px; }
  .result-box .value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .result-box .subvalue { font-size: 11px; margin-top: 2px; text-align: right; }
  .bench-status { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; }
  .bench-good { background: #dcfce7; color: #16a34a; }
  .bench-poor { background: #fee2e2; color: #dc2626; }
  .confidence-bar { height: 8px; border-radius: 4px; background: #f1f5f9; margin: 6px 0 14px; }
  .confidence-fill { height: 100%; border-radius: 4px; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 24px 32px; } }
</style>
</head><body>
<h1>${streetAddr}</h1>
<div class="subtitle">${cityStateZip}</div>
<div class="subtitle">${propertyInfo?.details?.bedrooms || '—'} bed · ${propertyInfo?.details?.bathrooms || '—'} bath · ${(propertyInfo?.details?.square_footage || 0).toLocaleString()} sqft</div>
<span class="score-badge ${score >= 65 ? 'score-good' : 'score-poor'}">IQ Score: ${score} — ${verdict}</span>

<hr class="divider">

<h2>Financial Breakdown</h2>
<table>
  <tr><td>Market Price</td><td style="text-decoration:line-through;color:#94a3b8">${formatCurrency(listPrice)}</td></tr>
  <tr><td>Your Target Price</td><td class="highlight">${formatCurrency(targetPrice)}</td></tr>
  <tr><td>Down Payment (20%)</td><td>${formatCurrency(downPayment)}</td></tr>
  <tr><td>Closing Costs (3%)</td><td>${formatCurrency(closingCosts)}</td></tr>
  <tr class="total-row"><td>Cash Needed at Close</td><td class="highlight">${formatCurrency(downPayment + closingCosts)}</td></tr>
</table>

<table style="margin-top:20px">
  <tr><td>Monthly Rent</td><td>${formatCurrency(monthlyRent)}/mo</td></tr>
  <tr><td>Vacancy Loss (5%)</td><td class="negative">-${formatCurrency(vacancyLoss)}/yr</td></tr>
  <tr><td>Effective Income</td><td>${formatCurrency(effectiveIncome)}/yr</td></tr>
</table>

<table style="margin-top:20px">
  <tr><td>Property Taxes</td><td>${formatCurrency(propertyTaxes)}/yr</td></tr>
  <tr><td>Insurance</td><td>${formatCurrency(insurance)}/yr</td></tr>
  <tr><td>Management (8%)</td><td>${formatCurrency(mgmt)}/yr</td></tr>
  <tr><td>Maintenance (5%)</td><td>${formatCurrency(maint)}/yr</td></tr>
  <tr><td>Reserves (5%)</td><td>${formatCurrency(reserves)}/yr</td></tr>
  <tr><td>Loan Payment</td><td>${formatCurrency(monthlyPI)}/mo</td></tr>
  <tr class="total-row"><td>Total Costs</td><td class="negative">${formatCurrency(totalExpenses)}/yr</td></tr>
</table>

<div style="margin-top:20px">
  <div class="result-box result-noi">
    <div><div class="label">Before Your Loan</div><div class="sublabel">NOI</div></div>
    <div style="text-align:right"><div class="value positive">${formatCurrency(noi)}</div><div class="subvalue positive">${formatCurrency(Math.round(noi / 12))}/mo</div></div>
  </div>
  <div class="result-box result-cf">
    <div><div class="label">What You'd Pocket</div><div class="sublabel">Net</div></div>
    <div style="text-align:right"><div class="value negative">(${formatCurrency(Math.abs(annualCashFlow))})</div><div class="subvalue negative">(${formatCurrency(Math.abs(Math.round(monthlyCashFlow)))})/mo</div></div>
  </div>
</div>

<hr class="divider">

<h2>Investor Benchmarks</h2>
<table>
  <thead><tr><th>Metric</th><th>This Deal</th><th>Target</th><th style="text-align:right">Status</th></tr></thead>
  <tbody>
    ${benchmarks.map(b => `<tr><td>${b.metric}</td><td style="font-weight:600">${b.value}</td><td>${b.target}</td><td style="text-align:right"><span class="bench-status ${b.status === 'good' ? 'bench-good' : 'bench-poor'}">${b.status === 'good' ? 'Good' : 'Below'}</span></td></tr>`).join('')}
  </tbody>
</table>

<hr class="divider">

<h2>Data Quality</h2>
${[
  { label: 'Deal Probability', value: dealProb },
  { label: 'Market Alignment', value: marketAlign },
  { label: 'Price Confidence', value: priceConf },
].map(m => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
  <span style="width:140px;font-size:13px;font-weight:500">${m.label}</span>
  <div class="confidence-bar" style="flex:1"><div class="confidence-fill" style="width:${m.value}%;background:#0ea5e9"></div></div>
  <span style="width:40px;text-align:right;font-size:13px;font-weight:700;color:#0ea5e9">${Math.round(m.value)}%</span>
</div>`).join('')}

<div class="footer">
  Generated by InvestIQ · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
</div>
</body></html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      // Slight delay to let styles render before print dialog
      setTimeout(() => printWindow.print(), 400)
    }
  }

  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <div className="max-w-[520px] mx-auto">
        {/* Full Breakdown */}
        <section className="px-5 py-8">
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>Full Breakdown</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>Where Does the Money Go?</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}>
            Every dollar in and out — so you can see exactly whether this property pays for itself.
          </p>

          {/* Two columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-16">
            {/* Left: Pay */}
            <div>
              <div className="flex items-center gap-2 mb-4 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>What You'd Pay</span>
              </div>
              {[
                ['Market Price', formatCurrency(listPrice), true],
                ['Your Target Price', formatCurrency(targetPrice), false, colors.brand.blue],
                ['Down Payment (20%)', formatCurrency(downPayment)],
                ['Closing Costs (3%)', formatCurrency(closingCosts)],
              ].map(([label, value, strike, color], i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-sm" style={{ color: colors.text.body }}>{label as string}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: (color as string) || colors.text.primary, textDecoration: strike ? 'line-through' : undefined, ...(strike ? { color: colors.text.secondary } : {}) }}>{value as string}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2.5 mt-1.5 border-t" style={{ borderColor: colors.ui.border }}>
                <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>Cash Needed at Close</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: colors.brand.blue }}>{formatCurrency(downPayment + closingCosts)}</span>
              </div>

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              <div className="flex items-center gap-2 mb-4 pl-2.5 border-l-[3px]" style={{ borderColor: colors.brand.blue }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.brand.blue }}>Your Loan</span>
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

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

              {/* Before Your Loan (NOI) Card */}
              <div className="rounded-xl p-4" style={{ background: colors.accentBg.green, border: `1px solid rgba(52,211,153,0.2)` }}>
                <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>Before Your Loan</p>
                <div className="flex justify-between items-baseline mt-1">
                  <p className="text-xs font-medium" style={{ color: colors.status.positive }}>NOI</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: colors.status.positive }}>{formatCurrency(noi)}</p>
                </div>
                <p className="text-xs font-medium tabular-nums text-right mt-0.5" style={{ color: colors.status.positive }}>{formatCurrency(Math.round(noi / 12))}/mo</p>
              </div>
            </div>

            {/* Right: Earn + Expenses */}
            <div>
              <div className="flex items-center gap-2 mb-4 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.positive }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.status.positive }}>What You'd Earn</span>
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

              <div className="flex items-center gap-2 mb-4 pl-2.5 border-l-[3px]" style={{ borderColor: colors.status.negative }}>
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: colors.status.negative }}>What It Costs to Own</span>
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

              <hr className="my-5" style={{ borderColor: colors.ui.border }} />

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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => {
                router.push(`/verdict?address=${encodeURIComponent(addressParam)}&openDealMaker=1`)
              }}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ color: colors.brand.teal, border: `1.5px solid ${colors.brand.teal}50`, background: `${colors.brand.teal}10` }}
            >
              Change Terms
            </button>
            <button
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ color: colors.brand.gold, border: `1.5px solid ${colors.brand.gold}50`, background: `${colors.brand.gold}10` }}
              onClick={handleExportReport}
            >
              Export Report
            </button>
          </div>

          {/* Insight Box */}
          <div className="mt-6 p-4 rounded-r-xl border border-l-[3px]" style={{ background: colors.background.card, borderColor: colors.ui.border, borderLeftColor: colors.brand.blue }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: colors.brand.blue }}>What this means for you</p>
            <p className="text-sm leading-relaxed" style={{ color: colors.text.body }}>
              Even at the discounted Profit Entry Point of {formatCurrency(targetPrice)}, this property would <strong style={{ color: colors.text.primary, fontWeight: 600 }}>cost you about {formatCurrency(Math.abs(Math.round(monthlyCashFlow)))} per month out of pocket</strong> as a long-term rental.
            </p>
          </div>
        </section>

        {/* Benchmarks */}
        <section className="px-5 py-8 border-t" style={{ background: colors.background.bg, borderColor: colors.ui.border }}>
          <p className={tw.sectionHeader} style={{ color: colors.brand.blue, marginBottom: 8 }}>Investor Benchmarks</p>
          <h2 className={tw.textHeading} style={{ color: colors.text.primary, marginBottom: 6 }}>How Does This Stack Up?</h2>
          <p className={tw.textBody} style={{ color: colors.text.body, marginBottom: 28, lineHeight: 1.55 }}>
            We compare this deal against numbers experienced investors actually look for.
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
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.text.primary }}>Don't Lose This Deal</h2>
          <p className="text-sm mb-6" style={{ color: colors.text.body, lineHeight: 1.55 }}>
            Save it to your DealVaultIQ. We'll keep the numbers fresh and alert you if anything changes.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base text-white transition-all"
            style={{ background: colors.brand.blueDeep, boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
            Create Free Account
          </button>
          <p className="mt-3 text-xs" style={{ color: colors.text.secondary }}>No credit card · 3 free scans per month</p>
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
