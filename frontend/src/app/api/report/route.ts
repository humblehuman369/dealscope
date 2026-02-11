/**
 * InvestIQ Property Investment Report — Vercel Serverless Function
 *
 * Generates a professional, dense, print-ready HTML report from proforma data.
 * The browser's native print dialog (Cmd+P → Save as PDF) handles conversion.
 *
 * Flow:
 *  1. Frontend opens /api/report?address=...&strategy=...&theme=... in new tab
 *  2. This route fetches proforma JSON + property photos from Railway backend
 *  3. Generates a styled, compact HTML report (3-4 pages, no wasted space)
 *  4. Returns it as text/html
 *  5. Auto-triggers window.print() after fonts load
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

// ---------------------------------------------------------------------------
// Types (matching backend FinancialProforma)
// ---------------------------------------------------------------------------
interface Proforma {
  generated_at: string
  property_id: string
  property_address: string
  strategy_type: string
  property: {
    address: string; city: string; state: string; zip: string
    property_type: string; bedrooms: number; bathrooms: number
    square_feet: number; year_built: number; lot_size: number
  }
  acquisition: {
    purchase_price: number; list_price: number; discount_from_list: number
    closing_costs: number; closing_costs_percent: number
    inspection_costs: number; rehab_costs: number; total_acquisition_cost: number
  }
  financing: {
    down_payment: number; down_payment_percent: number; loan_amount: number
    interest_rate: number; loan_term_years: number; loan_type: string
    monthly_payment: number; monthly_payment_with_escrow: number
    total_interest_over_life: number; apr: number
  }
  income: {
    monthly_rent: number; annual_gross_rent: number; other_income: number
    vacancy_allowance: number; vacancy_percent: number; effective_gross_income: number
  }
  expenses: {
    property_taxes: number; insurance: number; hoa_fees: number
    management: number; management_percent: number
    maintenance: number; maintenance_percent: number
    utilities: number; landscaping: number; pest_control: number
    cap_ex_reserve: number; cap_ex_reserve_percent: number
    other_expenses: number; total_operating_expenses: number; expense_ratio: number
  }
  metrics: {
    net_operating_income: number; annual_debt_service: number
    annual_cash_flow: number; monthly_cash_flow: number
    cap_rate: number; cash_on_cash_return: number; dscr: number
    gross_rent_multiplier: number; one_percent_rule: number
    break_even_occupancy: number; price_per_unit: number
    price_per_sqft: number; rent_per_sqft: number
  }
  depreciation: {
    purchase_price: number; land_value_percent: number
    land_value: number; improvement_value: number
    total_depreciable_basis: number; annual_depreciation: number
  }
  projections: {
    hold_period_years: number; appreciation_rate: number
    rent_growth_rate: number; expense_growth_rate: number
    annual_projections: Array<{
      year: number; total_income: number; operating_expenses: number
      net_operating_income: number; total_debt_service: number
      pre_tax_cash_flow: number; after_tax_cash_flow: number
      depreciation: number; taxable_income: number; estimated_tax_liability: number
      mortgage_interest: number; mortgage_principal: number
    }>
    cumulative_cash_flow: number[]
    property_values: number[]
    equity_positions: number[]
    loan_balances: number[]
  }
  exit: {
    hold_period_years: number; initial_value: number; appreciation_rate: number
    projected_sale_price: number; broker_commission: number
    closing_costs: number; total_sale_costs: number
    remaining_loan_balance: number; net_sale_proceeds: number
    accumulated_depreciation: number; total_gain: number
    depreciation_recapture: number; depreciation_recapture_tax: number
    capital_gain: number; capital_gains_tax: number
    total_tax_on_sale: number; after_tax_proceeds: number
  }
  returns: {
    irr: number; equity_multiple: number; average_annual_return: number
    cagr: number; total_cash_flows: number; total_distributions: number
    payback_period_months: number | null
  }
  sensitivity: {
    purchase_price: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>
    interest_rate: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>
    rent: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>
    vacancy: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>
    appreciation: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>
  }
  deal_score: {
    score: number; grade: string; verdict: string
    breakeven_price: number; discount_required: number
  }
  sources: {
    rent_estimate_source: string; property_value_source: string
    tax_data_source: string; market_data_source: string; data_freshness: string
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtM = (v: number) => `$${fmt(v)}`
const fmtPct = (v: number, d = 2) => `${v.toFixed(d)}%`
const signM = (v: number) => v >= 0 ? `$${fmt(v)}` : `-$${fmt(Math.abs(v))}`

function gradeColor(grade: string, p: Palette): string {
  if (grade.startsWith('A')) return p.positive
  if (grade.startsWith('B')) return p.brand
  if (grade.startsWith('C')) return p.warning
  return p.negative
}

// ---------------------------------------------------------------------------
// Theme palettes
// ---------------------------------------------------------------------------
interface Palette {
  bg: string; cardBg: string; textPrimary: string; textSecondary: string
  textTertiary: string; brand: string; brandDark: string
  positive: string; negative: string; warning: string
  border: string; chartColors: string[]
}

const LIGHT: Palette = {
  bg: '#FFFFFF', cardBg: '#F8FAFC', textPrimary: '#0F172A',
  textSecondary: '#475569', textTertiary: '#94A3B8',
  brand: '#0EA5E9', brandDark: '#1E3A5F',
  positive: '#16A34A', negative: '#DC2626', warning: '#D97706',
  border: '#E2E8F0',
  chartColors: ['#0EA5E9','#10B981','#F59E0B','#F43F5E','#8B5CF6','#06B6D4'],
}
const DARK: Palette = {
  bg: '#000000', cardBg: '#0C1220', textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1', textTertiary: '#64748B',
  brand: '#38BDF8', brandDark: '#0C1220',
  positive: '#34D399', negative: '#F87171', warning: '#FBBF24',
  border: 'rgba(255,255,255,0.07)',
  chartColors: ['#38BDF8','#2DD4BF','#FBBF24','#F87171','#A78BFA','#22D3EE'],
}

// ---------------------------------------------------------------------------
// SVG Charts
// ---------------------------------------------------------------------------
function svgDonut(segments: [string,number][], p: Palette, innerLabel: string, innerValue: string, size=140): string {
  const total = segments.reduce((s,[,v]) => s+v, 0)
  if (!total) return ''
  const W=size, H=size, cx=W/2, cy=H/2, oR=W/2-6, iR=oR*0.6, sw=oR-iR, mR=(oR+iR)/2
  let angle=0; const paths: string[] = []
  for (let i=0;i<segments.length;i++){
    const [,v]=segments[i]; if(v<=0) continue
    const pct=v/total, sweep=pct*360, gap=segments.length>1?1.5:0
    const s=angle+gap/2, e=angle+sweep-gap/2
    if(e<=s){angle+=sweep;continue}
    const r=Math.PI/180
    const x1=cx+mR*Math.cos((s-90)*r), y1=cy+mR*Math.sin((s-90)*r)
    const x2=cx+mR*Math.cos((e-90)*r), y2=cy+mR*Math.sin((e-90)*r)
    const la=sweep>180?1:0, c=p.chartColors[i%p.chartColors.length]
    paths.push(`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${mR.toFixed(1)} ${mR.toFixed(1)} 0 ${la} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${c}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`)
    angle+=sweep
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    ${paths.join('\n    ')}
    <text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="8" font-weight="600" fill="${p.textTertiary}">${innerLabel}</text>
    <text x="${cx}" y="${cy+10}" text-anchor="middle" font-size="12" font-weight="700" fill="${p.textPrimary}">${innerValue}</text>
  </svg>`
}

function svgScoreRing(score: number, grade: string, p: Palette, size=120): string {
  const W=size, H=size, cx=W/2, cy=H/2, R=size/2-12, C=2*Math.PI*R
  const pct=Math.min(score,100)/100, offset=C*(1-pct)
  const color = gradeColor(grade, p)
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.border}" stroke-width="8"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="24" font-weight="700" fill="${p.textPrimary}">${score}</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="14" font-weight="700" fill="${color}">${grade}</text>
  </svg>`
}

// ---------------------------------------------------------------------------
// HTML generation — DENSE LAYOUT (flowing, no forced page-per-section)
// ---------------------------------------------------------------------------
function buildReport(d: Proforma, theme: string, photos: string[]): string {
  const p = theme === 'dark' ? DARK : LIGHT
  const isDark = theme === 'dark'
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })

  const exp = d.expenses
  const expenseSegments: [string,number][] = [
    ['Property Taxes', exp.property_taxes],
    ['Insurance', exp.insurance],
    ['Management', exp.management],
    ['Maintenance', exp.maintenance],
    ['CapEx Reserve', exp.cap_ex_reserve],
    ['Other', exp.utilities + exp.landscaping + exp.pest_control + (exp.hoa_fees||0) + exp.other_expenses],
  ].filter(([,v]) => (v as number) > 0) as [string,number][]

  // Photo grid (up to 4 photos)
  const photoSlice = photos.slice(0, 4)
  const photoGrid = photoSlice.length > 0
    ? `<div class="photo-grid photo-grid-${Math.min(photoSlice.length, 4)}">
        ${photoSlice.map((url, i) => `<div class="photo-cell${i === 0 ? ' photo-main' : ''}"><img src="${url}" alt="Property photo ${i+1}"/></div>`).join('')}
      </div>`
    : ''

  // -- Sensitivity helper --
  const sensTable = (title: string, rows: Array<{change_percent:number; absolute_value:number; irr:number; cash_on_cash:number; net_profit:number}>) => {
    if (!rows || rows.length === 0) return ''
    return `<div class="sens-block">
      <div class="sens-title">${title}</div>
      <table class="t"><tr><th>Change</th><th>Value</th><th>IRR</th><th>CoC</th><th>Net Profit</th></tr>
      ${rows.map(s => {
        const c = s.irr >= 0 ? p.positive : p.negative
        return `<tr><td>${s.change_percent > 0 ? '+' : ''}${fmtPct(s.change_percent,0)}</td><td>${fmtM(s.absolute_value)}</td><td style="color:${c}">${fmtPct(s.irr*100)}</td><td style="color:${c}">${fmtPct(s.cash_on_cash*100)}</td><td style="color:${c}">${signM(s.net_profit)}</td></tr>`
      }).join('')}
      </table></div>`
  }

  const body = `
<!-- =============== PAGE 1: COVER + OVERVIEW + FINANCING =============== -->
<div class="page">
  <!-- Cover Header -->
  <div class="cover-band"></div>
  <div class="cover-header">
    <div>
      <div class="logo">Invest<span class="iq">IQ</span></div>
      <div class="cover-sub">Property Investment Report</div>
    </div>
    <div class="cover-date">${dateStr}</div>
  </div>

  <!-- Photo Grid + Property Title -->
  ${photoGrid}
  <h1 class="prop-address">${d.property_address}</h1>
  <div class="prop-meta">${d.property.property_type} &bull; ${d.property.bedrooms} BD / ${d.property.bathrooms} BA &bull; ${fmt(d.property.square_feet)} sqft &bull; Built ${d.property.year_built} &bull; Lot ${fmt(d.property.lot_size)} sqft &bull; Strategy: <strong>${d.strategy_type.toUpperCase()}</strong></div>

  <!-- Hero Metrics Row -->
  <div class="hero-row">
    <div class="hero-metric"><div class="hv">${fmtM(d.acquisition.purchase_price)}</div><div class="hl">Purchase Price</div></div>
    <div class="hero-metric"><div class="hv">${fmtM(d.income.monthly_rent)}</div><div class="hl">Monthly Rent</div></div>
    <div class="hero-metric"><div class="hv">${fmtPct(d.metrics.cash_on_cash_return*100)}</div><div class="hl">Cash-on-Cash</div></div>
    <div class="hero-metric"><div class="hv">${fmtPct(d.metrics.cap_rate*100)}</div><div class="hl">Cap Rate</div></div>
    <div class="hero-metric"><div class="hv">${signM(d.metrics.monthly_cash_flow)}</div><div class="hl">Monthly CF</div></div>
    <div class="hero-metric"><div class="hv">${d.metrics.dscr.toFixed(2)}x</div><div class="hl">DSCR</div></div>
  </div>

  <!-- Property + Acquisition + Financing (3 columns) -->
  <div class="sec-label">Property Details &amp; Investment Structure</div>
  <div class="grid-3">
    <div class="card">
      <div class="card-title">Property</div>
      <div class="kv"><span>Address</span><span>${d.property.address}</span></div>
      <div class="kv"><span>City/State</span><span>${d.property.city}, ${d.property.state} ${d.property.zip}</span></div>
      <div class="kv"><span>Type</span><span>${d.property.property_type}</span></div>
      <div class="kv"><span>Bed / Bath</span><span>${d.property.bedrooms} / ${d.property.bathrooms}</span></div>
      <div class="kv"><span>Sq Ft</span><span>${fmt(d.property.square_feet)}</span></div>
      <div class="kv"><span>Year Built</span><span>${d.property.year_built}</span></div>
      <div class="kv"><span>$/sqft</span><span>${fmtM(d.metrics.price_per_sqft)}</span></div>
      <div class="kv"><span>Rent/sqft</span><span>$${d.metrics.rent_per_sqft.toFixed(2)}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Acquisition</div>
      <div class="kv"><span>Purchase Price</span><span>${fmtM(d.acquisition.purchase_price)}</span></div>
      <div class="kv"><span>List Price</span><span>${fmtM(d.acquisition.list_price)}</span></div>
      <div class="kv"><span>Discount</span><span>${fmtPct(d.acquisition.discount_from_list*100,1)}</span></div>
      <div class="kv"><span>Closing Costs</span><span>${fmtM(d.acquisition.closing_costs)}</span></div>
      <div class="kv"><span>Rehab</span><span>${fmtM(d.acquisition.rehab_costs)}</span></div>
      <div class="kv tot"><span>Total Investment</span><span>${fmtM(d.acquisition.total_acquisition_cost)}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Financing</div>
      <div class="kv"><span>Down Payment</span><span>${fmtM(d.financing.down_payment)} (${fmtPct(d.financing.down_payment_percent*100,0)})</span></div>
      <div class="kv"><span>Loan Amount</span><span>${fmtM(d.financing.loan_amount)}</span></div>
      <div class="kv"><span>Rate / Term</span><span>${fmtPct(d.financing.interest_rate*100)} / ${d.financing.loan_term_years}yr</span></div>
      <div class="kv"><span>Loan Type</span><span>${d.financing.loan_type}</span></div>
      <div class="kv"><span>Monthly P&amp;I</span><span>${fmtM(d.financing.monthly_payment)}</span></div>
      <div class="kv"><span>w/ Escrow</span><span>${fmtM(d.financing.monthly_payment_with_escrow)}</span></div>
      <div class="kv"><span>Total Interest</span><span>${fmtM(d.financing.total_interest_over_life)}</span></div>
    </div>
  </div>

  <div class="page-footer"><span>InvestIQ Property Report</span><span>${d.property_address}</span><span>Page 1</span></div>
</div>

<!-- =============== PAGE 2: INCOME + EXPENSES + METRICS + DEAL SCORE =============== -->
<div class="page">
  <div class="page-top"><div class="logo-sm">Invest<span class="iq">IQ</span></div></div>

  <!-- Income Statement + Expense Donut side by side -->
  <div class="sec-label">Year 1 Income &amp; Expenses</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Income Waterfall</div>
      <div class="wf"><div class="wf-row"><span>Gross Rental Income</span><span class="wf-pos">${fmtM(d.income.annual_gross_rent)}</span></div>
      <div class="wf-row"><span>Vacancy (${fmtPct(d.income.vacancy_percent*100,0)})</span><span class="wf-neg">-${fmtM(d.income.vacancy_allowance)}</span></div>
      <div class="wf-row"><span>Effective Gross Income</span><span class="wf-brand">${fmtM(d.income.effective_gross_income)}</span></div>
      <div class="wf-row"><span>Operating Expenses</span><span class="wf-neg">-${fmtM(exp.total_operating_expenses)}</span></div>
      <div class="wf-row hl"><span>Net Operating Income</span><span class="wf-pos">${signM(d.metrics.net_operating_income)}</span></div>
      <div class="wf-row"><span>Debt Service</span><span class="wf-neg">-${fmtM(d.metrics.annual_debt_service)}</span></div>
      <div class="wf-row hl total"><span>Pre-Tax Cash Flow</span><span style="color:${d.metrics.annual_cash_flow >= 0 ? p.positive : p.negative}">${signM(d.metrics.annual_cash_flow)}</span></div>
      <div class="wf-row"><span>Monthly Cash Flow</span><span style="color:${p.brand};font-weight:700">${signM(d.metrics.monthly_cash_flow)}</span></div></div>
    </div>
    <div class="card">
      <div class="card-title">Expense Breakdown — ${fmtM(exp.total_operating_expenses)}/yr (${fmtPct(exp.expense_ratio*100,1)} ratio)</div>
      <div class="donut-row">
        ${svgDonut(expenseSegments, p, 'Total', fmtM(exp.total_operating_expenses), 130)}
        <div class="legend">
          ${expenseSegments.map(([label,val], i) =>
            `<div class="leg-item"><span class="leg-dot" style="background:${p.chartColors[i%p.chartColors.length]}"></span>${label}<span class="leg-val">${fmtM(val as number)}</span></div>`
          ).join('')}
        </div>
      </div>
      <table class="t mt-8"><tr><th>Category</th><th>Annual</th><th>Monthly</th><th>% Inc</th></tr>
      <tr><td>Property Taxes</td><td>${fmtM(exp.property_taxes)}</td><td>${fmtM(exp.property_taxes/12)}</td><td>${fmtPct((exp.property_taxes/d.income.effective_gross_income)*100,1)}</td></tr>
      <tr><td>Insurance</td><td>${fmtM(exp.insurance)}</td><td>${fmtM(exp.insurance/12)}</td><td>${fmtPct((exp.insurance/d.income.effective_gross_income)*100,1)}</td></tr>
      <tr><td>Management</td><td>${fmtM(exp.management)}</td><td>${fmtM(exp.management/12)}</td><td>${fmtPct(exp.management_percent*100,1)}</td></tr>
      <tr><td>Maintenance</td><td>${fmtM(exp.maintenance)}</td><td>${fmtM(exp.maintenance/12)}</td><td>${fmtPct(exp.maintenance_percent*100,1)}</td></tr>
      <tr><td>CapEx Reserve</td><td>${fmtM(exp.cap_ex_reserve)}</td><td>${fmtM(exp.cap_ex_reserve/12)}</td><td>${fmtPct(exp.cap_ex_reserve_percent*100,1)}</td></tr>
      ${exp.hoa_fees ? `<tr><td>HOA</td><td>${fmtM(exp.hoa_fees)}</td><td>${fmtM(exp.hoa_fees/12)}</td><td>${fmtPct((exp.hoa_fees/d.income.effective_gross_income)*100,1)}</td></tr>` : ''}
      <tr class="total-row"><td><strong>Total</strong></td><td><strong>${fmtM(exp.total_operating_expenses)}</strong></td><td><strong>${fmtM(exp.total_operating_expenses/12)}</strong></td><td><strong>${fmtPct(exp.expense_ratio*100,1)}</strong></td></tr>
      </table>
    </div>
  </div>

  <!-- Key Metrics + Deal Score side by side -->
  <div class="sec-label mt-12">Key Metrics &amp; Deal Score</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Performance Metrics</div>
      <div class="metrics-grid">
        <div class="mg-item"><span class="mg-val">${fmtPct(d.metrics.cap_rate*100)}</span><span class="mg-lbl">Cap Rate</span></div>
        <div class="mg-item"><span class="mg-val">${fmtPct(d.metrics.cash_on_cash_return*100)}</span><span class="mg-lbl">Cash-on-Cash</span></div>
        <div class="mg-item"><span class="mg-val">${d.metrics.dscr.toFixed(2)}x</span><span class="mg-lbl">DSCR</span></div>
        <div class="mg-item"><span class="mg-val">${d.metrics.gross_rent_multiplier.toFixed(1)}x</span><span class="mg-lbl">GRM</span></div>
        <div class="mg-item"><span class="mg-val">${fmtPct(d.metrics.one_percent_rule*100)}</span><span class="mg-lbl">1% Rule</span></div>
        <div class="mg-item"><span class="mg-val">${fmtPct(d.metrics.break_even_occupancy*100,0)}</span><span class="mg-lbl">Break-Even Occ.</span></div>
        <div class="mg-item"><span class="mg-val">${fmtPct(d.returns.irr*100)}</span><span class="mg-lbl">IRR</span></div>
        <div class="mg-item"><span class="mg-val">${d.returns.equity_multiple.toFixed(2)}x</span><span class="mg-lbl">Equity Multiple</span></div>
        <div class="mg-item"><span class="mg-val">${fmtPct(d.returns.cagr*100)}</span><span class="mg-lbl">CAGR</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">InvestIQ Verdict</div>
      <div class="deal-score-row">
        ${svgScoreRing(d.deal_score.score, d.deal_score.grade, p, 100)}
        <div class="verdict-info">
          <div class="verdict-title" style="color:${gradeColor(d.deal_score.grade, p)}">${d.deal_score.verdict || `Grade ${d.deal_score.grade}`}</div>
          <div class="verdict-body">Score <strong>${d.deal_score.score}/100</strong> based on cash flow, appreciation, risk, and market conditions.</div>
          ${d.deal_score.breakeven_price > 0 ? `<div class="verdict-be">Breakeven: ${fmtM(d.deal_score.breakeven_price)}</div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <div class="page-footer"><span>InvestIQ Property Report</span><span>${d.property_address}</span><span>Page 2</span></div>
</div>

<!-- =============== PAGE 3: PROJECTIONS + EXIT + SENSITIVITY =============== -->
<div class="page">
  <div class="page-top"><div class="logo-sm">Invest<span class="iq">IQ</span></div></div>

  <!-- 10-Year Projections -->
  <div class="sec-label">10-Year Financial Projections</div>
  <div class="card">
    <table class="t">
      <tr><th>Year</th><th>Income</th><th>Expenses</th><th>NOI</th><th>Debt Svc</th><th>Cash Flow</th><th>Prop Value</th><th>Equity</th></tr>
      ${d.projections.annual_projections.map((yr, i) => `<tr>
        <td>Yr ${yr.year}</td><td>${fmtM(yr.total_income)}</td><td>${fmtM(yr.operating_expenses)}</td>
        <td>${fmtM(yr.net_operating_income)}</td><td>${fmtM(yr.total_debt_service)}</td>
        <td style="color:${yr.pre_tax_cash_flow >= 0 ? p.positive : p.negative};font-weight:600">${signM(yr.pre_tax_cash_flow)}</td>
        <td>${fmtM(d.projections.property_values[i] || 0)}</td><td>${fmtM(d.projections.equity_positions[i] || 0)}</td>
      </tr>`).join('')}
    </table>
    <div class="proj-summary">
      <span>Total Cash Flows: <strong>${fmtM(d.returns.total_cash_flows)}</strong></span>
      <span>Appreciation: <strong>${fmtPct(d.projections.appreciation_rate*100,1)}/yr</strong></span>
      <span>Rent Growth: <strong>${fmtPct(d.projections.rent_growth_rate*100,1)}/yr</strong></span>
      <span>Final Value: <strong>${fmtM(d.exit.projected_sale_price)}</strong></span>
    </div>
  </div>

  <!-- Exit Strategy -->
  <div class="sec-label mt-12">Exit Strategy &amp; Tax Analysis (Year ${d.exit.hold_period_years})</div>
  <div class="grid-2">
    <div class="card">
      <div class="card-title">Sale Proceeds</div>
      <div class="kv"><span>Projected Sale Price</span><span>${fmtM(d.exit.projected_sale_price)}</span></div>
      <div class="kv"><span>Broker Commission</span><span class="neg">-${fmtM(d.exit.broker_commission)}</span></div>
      <div class="kv"><span>Closing Costs</span><span class="neg">-${fmtM(d.exit.closing_costs)}</span></div>
      <div class="kv"><span>Remaining Loan</span><span class="neg">-${fmtM(d.exit.remaining_loan_balance)}</span></div>
      <div class="kv tot"><span>Net Sale Proceeds</span><span>${fmtM(d.exit.net_sale_proceeds)}</span></div>
    </div>
    <div class="card">
      <div class="card-title">Tax on Sale</div>
      <div class="kv"><span>Total Gain</span><span>${fmtM(d.exit.total_gain)}</span></div>
      <div class="kv"><span>Depreciation Recapture</span><span>${fmtM(d.exit.depreciation_recapture)}</span></div>
      <div class="kv"><span>Recapture Tax (25%)</span><span class="neg">-${fmtM(d.exit.depreciation_recapture_tax)}</span></div>
      <div class="kv"><span>Capital Gains Tax</span><span class="neg">-${fmtM(d.exit.capital_gains_tax)}</span></div>
      <div class="kv"><span>Total Tax</span><span class="neg">-${fmtM(d.exit.total_tax_on_sale)}</span></div>
      <div class="kv tot"><span>After-Tax Proceeds</span><span style="color:${p.positive}">${fmtM(d.exit.after_tax_proceeds)}</span></div>
    </div>
  </div>

  <!-- Sensitivity -->
  <div class="sec-label mt-12">Sensitivity Analysis</div>
  <div class="grid-3 sens-grid">
    ${sensTable('Purchase Price', d.sensitivity.purchase_price)}
    ${sensTable('Interest Rate', d.sensitivity.interest_rate)}
    ${sensTable('Rent', d.sensitivity.rent)}
  </div>

  <!-- Footer / Disclaimer -->
  <div class="disclaimer">
    <strong>Data Sources:</strong> Rent: ${d.sources.rent_estimate_source} &bull; Value: ${d.sources.property_value_source} &bull; Tax: ${d.sources.tax_data_source} &bull; Market: ${d.sources.market_data_source} &bull; Freshness: ${d.sources.data_freshness}<br/>
    This report is for informational purposes only and does not constitute investment advice. Projections are based on assumptions that may not materialize. &copy; ${now.getFullYear()} InvestIQ.
  </div>

  <div class="page-footer"><span>InvestIQ Property Report</span><span>${d.property_address}</span><span>Page 3</span></div>
</div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>InvestIQ Property Report — ${d.property_address}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${buildCSS(p, isDark)}</style>
<script>document.fonts.ready.then(function(){setTimeout(function(){window.print()},500)});</script>
</head>
<body>${body}</body>
</html>`
}

// ---------------------------------------------------------------------------
// CSS — compact, dense, professional
// ---------------------------------------------------------------------------
function buildCSS(p: Palette, isDark: boolean): string {
  const cardShadow = isDark ? '0 1px 6px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06)'
  return `
@page { size: letter; margin: 0.35in 0.45in 0.4in; }
@media print {
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .page { page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:9px;line-height:1.4;color:${p.textPrimary};background:${p.bg};}
.page{width:8.5in;min-height:11in;padding:0.35in 0.45in 0.4in;position:relative;background:${p.bg};page-break-after:always;}
.page:last-child{page-break-after:auto;}

/* Cover */
.cover-band{height:4px;background:linear-gradient(90deg,${p.brand},${isDark?'#2DD4BF':'#0284c7'});margin:-0.35in -0.45in 12px;width:calc(100% + 0.9in);}
.cover-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
.logo{font-size:20px;font-weight:700;color:${p.textPrimary};}.logo .iq,.logo-sm .iq{color:${p.brand};}
.logo-sm{font-size:13px;font-weight:700;color:${p.textPrimary};}
.cover-sub{font-size:9px;color:${p.textSecondary};text-transform:uppercase;letter-spacing:2px;margin-top:1px;}
.cover-date{font-size:8px;color:${p.textTertiary};padding-top:4px;}

/* Photos */
.photo-grid{display:grid;gap:4px;margin-bottom:10px;border-radius:6px;overflow:hidden;height:180px;}
.photo-grid-1{grid-template-columns:1fr;}
.photo-grid-2{grid-template-columns:1fr 1fr;}
.photo-grid-3{grid-template-columns:1.5fr 1fr;grid-template-rows:1fr 1fr;}
.photo-grid-3 .photo-main{grid-row:1/3;}
.photo-grid-4{grid-template-columns:1.5fr 1fr 1fr;grid-template-rows:1fr 1fr;}
.photo-grid-4 .photo-main{grid-row:1/3;}
.photo-cell{overflow:hidden;min-height:0;}
.photo-cell img{width:100%;height:100%;object-fit:cover;display:block;}

/* Property header */
.prop-address{font-size:16px;font-weight:700;color:${p.textPrimary};margin-bottom:3px;line-height:1.2;}
.prop-meta{font-size:8.5px;color:${p.textSecondary};margin-bottom:10px;}

/* Hero metrics */
.hero-row{display:flex;gap:2px;margin-bottom:12px;background:${p.cardBg};border:1px solid ${p.border};border-radius:6px;padding:8px 4px;}
.hero-metric{flex:1;text-align:center;border-right:1px solid ${p.border};padding:0 4px;}
.hero-metric:last-child{border-right:none;}
.hv{font-size:13px;font-weight:700;color:${p.textPrimary};}
.hl{font-size:7px;color:${p.textSecondary};text-transform:uppercase;letter-spacing:0.5px;margin-top:1px;}

/* Section labels */
.sec-label{font-size:8px;font-weight:600;color:${p.brand};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;padding-bottom:3px;border-bottom:2px solid ${p.brand};}

/* Cards */
.card{background:${p.cardBg};border:1px solid ${p.border};border-radius:5px;padding:8px 10px;box-shadow:${cardShadow};}
.card-title{font-size:8px;font-weight:700;color:${p.textPrimary};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;padding-bottom:3px;border-bottom:1px solid ${p.border};}

/* Grids */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.sens-grid{gap:6px;}

/* Key-Value rows */
.kv{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid ${isDark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.04)'};}
.kv:last-child{border-bottom:none;}
.kv span:first-child{color:${p.textSecondary};font-size:8.5px;}
.kv span:last-child{font-weight:600;color:${p.textPrimary};font-size:8.5px;}
.kv.tot{border-top:1.5px solid ${p.border};margin-top:3px;padding-top:4px;}
.kv.tot span{font-weight:700;font-size:9px;}
.neg{color:${p.negative}!important;}

/* Waterfall */
.wf{display:flex;flex-direction:column;gap:3px;}
.wf-row{display:flex;justify-content:space-between;padding:2.5px 0;border-bottom:1px solid ${isDark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.04)'};}
.wf-row:last-child{border-bottom:none;}
.wf-row span:first-child{color:${p.textSecondary};font-size:8.5px;}
.wf-row.hl{background:${isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'};padding:3px 4px;border-radius:3px;}
.wf-row.total{border-top:1.5px solid ${p.border};margin-top:2px;padding-top:4px;}
.wf-pos{color:${p.positive};font-weight:600;font-size:8.5px;}
.wf-neg{color:${p.negative};font-weight:600;font-size:8.5px;}
.wf-brand{color:${p.brand};font-weight:600;font-size:8.5px;}

/* Donut + legend */
.donut-row{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.legend{display:flex;flex-direction:column;gap:2px;flex:1;}
.leg-item{display:flex;align-items:center;gap:4px;font-size:8px;color:${p.textSecondary};}
.leg-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.leg-val{margin-left:auto;font-weight:600;color:${p.textPrimary};}

/* Metrics grid */
.metrics-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}
.mg-item{text-align:center;padding:4px 2px;background:${isDark?'rgba(255,255,255,0.02)':'rgba(0,0,0,0.02)'};border-radius:4px;}
.mg-val{font-size:12px;font-weight:700;color:${p.textPrimary};display:block;}
.mg-lbl{font-size:7px;color:${p.textSecondary};text-transform:uppercase;letter-spacing:0.3px;}

/* Deal score */
.deal-score-row{display:flex;align-items:center;gap:12px;}
.verdict-info{flex:1;}
.verdict-title{font-size:13px;font-weight:700;margin-bottom:3px;}
.verdict-body{font-size:8.5px;color:${p.textSecondary};line-height:1.4;}
.verdict-be{font-size:8px;color:${p.textTertiary};margin-top:3px;}

/* Tables */
.t{width:100%;border-collapse:collapse;font-size:8px;}
.t th{text-align:left;padding:3px 4px;border-bottom:1.5px solid ${p.border};font-weight:600;color:${p.textSecondary};text-transform:uppercase;letter-spacing:0.3px;font-size:7px;}
.t td{padding:2.5px 4px;border-bottom:1px solid ${isDark?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.04)'};}
.t tr:last-child td{border-bottom:none;}
.t .total-row td{border-top:1.5px solid ${p.border};}

/* Projections summary */
.proj-summary{display:flex;gap:16px;padding:6px 4px;margin-top:4px;border-top:1px solid ${p.border};font-size:8px;color:${p.textSecondary};}

/* Sensitivity */
.sens-block{margin-bottom:0;}
.sens-title{font-size:8px;font-weight:600;color:${p.textPrimary};margin-bottom:3px;}

/* Disclaimer */
.disclaimer{margin-top:10px;padding:8px;border:1px solid ${p.border};border-radius:4px;background:${p.cardBg};font-size:7px;color:${p.textTertiary};line-height:1.4;}

/* Page furniture */
.page-top{margin-bottom:8px;}
.page-footer{position:absolute;bottom:0.25in;left:0.45in;right:0.45in;display:flex;justify-content:space-between;font-size:7px;color:${p.textTertiary};border-top:1px solid ${p.border};padding-top:4px;}
.mt-8{margin-top:8px;}.mt-12{margin-top:12px;}
`
}

// ---------------------------------------------------------------------------
// API Route Handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const strategy = searchParams.get('strategy') || 'ltr'
  const theme = searchParams.get('theme') || 'light'
  const propertyId = searchParams.get('propertyId') || 'general'

  if (!address) {
    return NextResponse.json({ detail: 'address parameter is required' }, { status: 400 })
  }

  try {
    // Fetch proforma data + photos in parallel from Railway backend
    const proformaParams = new URLSearchParams({ address, strategy })
    const proformaUrl = `${BACKEND_URL}/api/v1/proforma/property/${propertyId}?${proformaParams}`
    const photosUrl = `${BACKEND_URL}/api/v1/photos?zpid=${propertyId}`

    const [proformaRes, photosRes] = await Promise.all([
      fetch(proformaUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' }),
      fetch(photosUrl, { headers: { 'Accept': 'application/json' }, cache: 'no-store' }).catch(() => null),
    ])

    if (!proformaRes.ok) {
      const err = await proformaRes.text()
      console.error(`Backend proforma fetch failed (${proformaRes.status}):`, err)
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Report generation failed</h2><p>Could not fetch property data. Status: ${proformaRes.status}</p><p>${err}</p></body></html>`,
        { status: 502, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const proforma: Proforma = await proformaRes.json()

    // Extract photo URLs (best-effort, non-blocking)
    let photos: string[] = []
    try {
      if (photosRes && photosRes.ok) {
        const photosData = await photosRes.json()
        if (photosData.success && Array.isArray(photosData.photos)) {
          photos = photosData.photos
            .map((p: { url?: string }) => p.url)
            .filter((u: string | undefined): u is string => !!u)
        }
      }
    } catch { /* photos are optional */ }

    // Generate HTML report
    const html = buildReport(proforma, theme === 'dark' ? 'dark' : 'light', photos)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Report generation error:', err)
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Report generation error</h2><p>${err instanceof Error ? err.message : String(err)}</p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }
}
