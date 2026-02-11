/**
 * InvestIQ Property Investment Report — Vercel Serverless Function
 *
 * Generates a professional, print-ready HTML report from proforma data.
 * The browser's native print dialog (Cmd+P → Save as PDF) handles conversion.
 *
 * Flow:
 *  1. Frontend opens /api/report?address=...&strategy=...&theme=... in new tab
 *  2. This route fetches proforma JSON from Railway backend
 *  3. Generates a styled 11-page HTML report
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
// SVG Chart: Donut
// ---------------------------------------------------------------------------
function svgDonut(segments: [string,number][], p: Palette, innerLabel: string, innerValue: string): string {
  const total = segments.reduce((s,[,v]) => s+v, 0)
  if (!total) return ''
  const W=220, H=220, cx=W/2, cy=H/2, oR=W/2-8, iR=oR*0.6, sw=oR-iR, mR=(oR+iR)/2
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
    <text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="10" font-weight="600" fill="${p.textTertiary}">${innerLabel}</text>
    <text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="16" font-weight="700" fill="${p.textPrimary}">${innerValue}</text>
  </svg>`
}

// ---------------------------------------------------------------------------
// SVG Chart: Score Ring
// ---------------------------------------------------------------------------
function svgScoreRing(score: number, grade: string, p: Palette): string {
  const W=180, H=180, cx=W/2, cy=H/2, R=70, C=2*Math.PI*R
  const pct=Math.min(score,100)/100, offset=C*(1-pct)
  const color = gradeColor(grade, p)
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.border}" stroke-width="10"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy-8}" text-anchor="middle" font-size="36" font-weight="700" fill="${p.textPrimary}">${score}</text>
    <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="18" font-weight="700" fill="${color}">${grade}</text>
  </svg>`
}

// ---------------------------------------------------------------------------
// SVG Chart: Gauge Bar
// ---------------------------------------------------------------------------
function svgGauge(label: string, value: number, max: number, target: number|null, unit: string, p: Palette): string {
  const W=320, H=40, pct=Math.min(Math.max(value/max,0),1)
  const color = value > 0 ? p.positive : p.negative
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="12" font-size="10" fill="${p.textSecondary}">${label}</text>
    <text x="${W}" y="12" text-anchor="end" font-size="11" font-weight="600" fill="${p.textPrimary}">${value.toFixed(2)}${unit}</text>
    <rect x="0" y="20" width="${W}" height="8" rx="4" fill="${p.border}"/>
    <rect x="0" y="20" width="${(W*pct).toFixed(1)}" height="8" rx="4" fill="${color}"/>
    ${target !== null ? `<line x1="${(W*Math.min(target/max,1)).toFixed(1)}" y1="18" x2="${(W*Math.min(target/max,1)).toFixed(1)}" y2="30" stroke="${p.warning}" stroke-width="2" stroke-dasharray="3,2"/>` : ''}
  </svg>`
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------
function buildReport(d: Proforma, theme: string): string {
  const p = theme === 'dark' ? DARK : LIGHT
  const isDark = theme === 'dark'
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })

  // -- Helpers --
  const card = (content: string, extra = '') =>
    `<div class="card ${extra}">${content}</div>`
  const metric = (label: string, value: string, sub = '') =>
    `<div class="metric"><div class="metric-value">${value}</div><div class="metric-label">${label}</div>${sub ? `<div class="metric-sub">${sub}</div>` : ''}</div>`
  const sectionHeader = (label: string, title: string) =>
    `<div class="section-header"><div class="section-label">${label}</div><h2 class="section-title">${title}</h2><div class="section-rule"></div></div>`
  const pageHeader = (title: string) =>
    `<div class="page-header"><div class="logo">Invest<span class="logo-iq">IQ</span></div><div class="page-title">${title}</div></div>`
  const tableRow = (cells: string[], isHeader = false) => {
    const tag = isHeader ? 'th' : 'td'
    return `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`
  }

  // -- Expense segments for donut --
  const exp = d.expenses
  const expenseSegments: [string,number][] = [
    ['Property Taxes', exp.property_taxes],
    ['Insurance', exp.insurance],
    ['Management', exp.management],
    ['Maintenance', exp.maintenance],
    ['CapEx Reserve', exp.cap_ex_reserve],
    ['Other', exp.utilities + exp.landscaping + exp.pest_control + (exp.hoa_fees||0) + exp.other_expenses],
  ].filter(([,v]) => v > 0) as [string,number][]

  // -- Pages --
  const coverPage = `
<div class="page cover-page">
  <div class="cover-top-band"></div>
  <div class="cover-content">
    <div class="cover-logo">Invest<span class="logo-iq">IQ</span></div>
    <div class="cover-subtitle">Property Investment Report</div>
    <div class="cover-divider"></div>
    <h1 class="cover-address">${d.property_address}</h1>
    <div class="cover-meta">
      <span>${d.property.property_type} &bull; ${d.property.bedrooms} BD / ${d.property.bathrooms} BA &bull; ${fmt(d.property.square_feet)} sqft &bull; Built ${d.property.year_built}</span>
    </div>
    <div class="cover-hero">
      ${card(metric('Purchase Price', fmtM(d.acquisition.purchase_price)) + metric('Monthly Rent', fmtM(d.income.monthly_rent)) + metric('Cash-on-Cash', fmtPct(d.metrics.cash_on_cash_return)) + metric('Cap Rate', fmtPct(d.metrics.cap_rate)), 'hero-metrics')}
    </div>
    <div class="cover-strategy">Strategy: <strong>${d.strategy_type.toUpperCase()}</strong></div>
  </div>
  <div class="cover-footer">
    <span>Generated ${dateStr}</span>
    <span>InvestIQ &mdash; Data-Driven Real Estate Intelligence</span>
  </div>
</div>`

  const overviewPage = `
<div class="page">
  ${pageHeader('Property Overview')}
  ${sectionHeader('01', 'Property Details & Annual Obligations')}
  <div class="grid-2">
    ${card(`<h3>Property Details</h3>
      <div class="detail-grid">
        <div><span class="dl">Address</span><span class="dv">${d.property.address}</span></div>
        <div><span class="dl">City/State</span><span class="dv">${d.property.city}, ${d.property.state} ${d.property.zip}</span></div>
        <div><span class="dl">Type</span><span class="dv">${d.property.property_type}</span></div>
        <div><span class="dl">Bedrooms</span><span class="dv">${d.property.bedrooms}</span></div>
        <div><span class="dl">Bathrooms</span><span class="dv">${d.property.bathrooms}</span></div>
        <div><span class="dl">Sq Ft</span><span class="dv">${fmt(d.property.square_feet)}</span></div>
        <div><span class="dl">Year Built</span><span class="dv">${d.property.year_built}</span></div>
        <div><span class="dl">Lot Size</span><span class="dv">${fmt(d.property.lot_size)} sqft</span></div>
        <div><span class="dl">$/sqft</span><span class="dv">${fmtM(d.metrics.price_per_sqft)}</span></div>
      </div>`)}
    ${card(`<h3>Annual Obligations</h3>
      <div class="detail-grid">
        <div><span class="dl">Property Taxes</span><span class="dv">${fmtM(d.expenses.property_taxes)}/yr</span></div>
        <div><span class="dl">Insurance</span><span class="dv">${fmtM(d.expenses.insurance)}/yr</span></div>
        <div><span class="dl">HOA Fees</span><span class="dv">${fmtM(d.expenses.hoa_fees || 0)}/yr</span></div>
        <div><span class="dl">Debt Service</span><span class="dv">${fmtM(d.metrics.annual_debt_service)}/yr</span></div>
        <div><span class="dl">Maintenance</span><span class="dv">${fmtM(d.expenses.maintenance)}/yr</span></div>
        <div><span class="dl">Management</span><span class="dv">${fmtM(d.expenses.management)}/yr (${fmtPct(d.expenses.management_percent*100,0)})</span></div>
        <div><span class="dl">CapEx Reserve</span><span class="dv">${fmtM(d.expenses.cap_ex_reserve)}/yr</span></div>
        <div><span class="dl">Total Expenses</span><span class="dv highlight">${fmtM(d.expenses.total_operating_expenses)}/yr</span></div>
        <div><span class="dl">Expense Ratio</span><span class="dv">${fmtPct(d.expenses.expense_ratio*100,1)}</span></div>
      </div>`)}
  </div>
</div>`

  const financingPage = `
<div class="page">
  ${pageHeader('Investment Structure')}
  ${sectionHeader('02', 'Acquisition & Financing')}
  <div class="grid-2">
    ${card(`<h3>Acquisition</h3>
      <div class="detail-grid">
        <div><span class="dl">Purchase Price</span><span class="dv">${fmtM(d.acquisition.purchase_price)}</span></div>
        <div><span class="dl">List Price</span><span class="dv">${fmtM(d.acquisition.list_price)}</span></div>
        <div><span class="dl">Discount</span><span class="dv">${fmtPct(d.acquisition.discount_from_list*100,1)}</span></div>
        <div><span class="dl">Closing Costs</span><span class="dv">${fmtM(d.acquisition.closing_costs)} (${fmtPct(d.acquisition.closing_costs_percent*100,1)})</span></div>
        <div><span class="dl">Rehab</span><span class="dv">${fmtM(d.acquisition.rehab_costs)}</span></div>
        <div><span class="dl total">Total Investment</span><span class="dv total">${fmtM(d.acquisition.total_acquisition_cost)}</span></div>
      </div>`)}
    ${card(`<h3>Financing</h3>
      <div class="detail-grid">
        <div><span class="dl">Down Payment</span><span class="dv">${fmtM(d.financing.down_payment)} (${fmtPct(d.financing.down_payment_percent*100,0)})</span></div>
        <div><span class="dl">Loan Amount</span><span class="dv">${fmtM(d.financing.loan_amount)}</span></div>
        <div><span class="dl">Interest Rate</span><span class="dv">${fmtPct(d.financing.interest_rate*100)}</span></div>
        <div><span class="dl">Loan Term</span><span class="dv">${d.financing.loan_term_years} years (${d.financing.loan_type})</span></div>
        <div><span class="dl">Monthly P&I</span><span class="dv">${fmtM(d.financing.monthly_payment)}</span></div>
        <div><span class="dl">Monthly w/ Escrow</span><span class="dv">${fmtM(d.financing.monthly_payment_with_escrow)}</span></div>
        <div><span class="dl">Total Interest</span><span class="dv">${fmtM(d.financing.total_interest_over_life)}</span></div>
        <div><span class="dl">APR</span><span class="dv">${fmtPct(d.financing.apr*100)}</span></div>
      </div>`)}
  </div>
</div>`

  const incomePage = `
<div class="page">
  ${pageHeader('Year 1 Income')}
  ${sectionHeader('03', 'Income Statement')}
  <div class="income-waterfall">
    ${card(`
      <div class="waterfall">
        <div class="wf-step">
          <div class="wf-label">Gross Rental Income</div>
          <div class="wf-bar positive" style="width:100%"></div>
          <div class="wf-value">${fmtM(d.income.annual_gross_rent)}</div>
        </div>
        <div class="wf-step">
          <div class="wf-label">Vacancy (${fmtPct(d.income.vacancy_percent*100,0)})</div>
          <div class="wf-bar negative" style="width:${((d.income.vacancy_allowance/d.income.annual_gross_rent)*100).toFixed(0)}%"></div>
          <div class="wf-value">-${fmtM(d.income.vacancy_allowance)}</div>
        </div>
        <div class="wf-step">
          <div class="wf-label">Effective Gross Income</div>
          <div class="wf-bar brand" style="width:${((d.income.effective_gross_income/d.income.annual_gross_rent)*100).toFixed(0)}%"></div>
          <div class="wf-value">${fmtM(d.income.effective_gross_income)}</div>
        </div>
        <div class="wf-step">
          <div class="wf-label">Operating Expenses</div>
          <div class="wf-bar negative" style="width:${((d.expenses.total_operating_expenses/d.income.annual_gross_rent)*100).toFixed(0)}%"></div>
          <div class="wf-value">-${fmtM(d.expenses.total_operating_expenses)}</div>
        </div>
        <div class="wf-step">
          <div class="wf-label">Net Operating Income</div>
          <div class="wf-bar ${d.metrics.net_operating_income >= 0 ? 'positive' : 'negative'}" style="width:${((Math.abs(d.metrics.net_operating_income)/d.income.annual_gross_rent)*100).toFixed(0)}%"></div>
          <div class="wf-value">${signM(d.metrics.net_operating_income)}</div>
        </div>
        <div class="wf-step">
          <div class="wf-label">Debt Service</div>
          <div class="wf-bar negative" style="width:${((d.metrics.annual_debt_service/d.income.annual_gross_rent)*100).toFixed(0)}%"></div>
          <div class="wf-value">-${fmtM(d.metrics.annual_debt_service)}</div>
        </div>
        <div class="wf-step wf-total">
          <div class="wf-label">Pre-Tax Cash Flow</div>
          <div class="wf-bar ${d.metrics.annual_cash_flow >= 0 ? 'positive' : 'negative'}" style="width:${Math.max((Math.abs(d.metrics.annual_cash_flow)/d.income.annual_gross_rent)*100,5).toFixed(0)}%"></div>
          <div class="wf-value highlight">${signM(d.metrics.annual_cash_flow)}</div>
        </div>
      </div>
    `)}
  </div>
  <div class="grid-3 mt-16">
    ${card(metric('Monthly Cash Flow', signM(d.metrics.monthly_cash_flow)))}
    ${card(metric('Annual Cash Flow', signM(d.metrics.annual_cash_flow)))}
    ${card(metric('NOI', fmtM(d.metrics.net_operating_income)))}
  </div>
</div>`

  const expensesPage = `
<div class="page">
  ${pageHeader('Expense Breakdown')}
  ${sectionHeader('04', 'Operating Expense Analysis')}
  <div class="grid-2">
    <div class="donut-container">
      ${svgDonut(expenseSegments, p, 'Total', fmtM(exp.total_operating_expenses))}
      <div class="donut-legend">
        ${expenseSegments.map(([label,val], i) =>
          `<div class="legend-item"><span class="legend-dot" style="background:${p.chartColors[i%p.chartColors.length]}"></span><span class="legend-label">${label}</span><span class="legend-value">${fmtM(val)}</span></div>`
        ).join('')}
      </div>
    </div>
    ${card(`<h3>Expense Detail</h3>
      <table class="data-table">
        ${tableRow(['Category', 'Annual', 'Monthly', '% of Income'], true)}
        ${tableRow(['Property Taxes', fmtM(exp.property_taxes), fmtM(exp.property_taxes/12), fmtPct((exp.property_taxes/d.income.effective_gross_income)*100,1)])}
        ${tableRow(['Insurance', fmtM(exp.insurance), fmtM(exp.insurance/12), fmtPct((exp.insurance/d.income.effective_gross_income)*100,1)])}
        ${tableRow(['Management', fmtM(exp.management), fmtM(exp.management/12), fmtPct(exp.management_percent*100,1)])}
        ${tableRow(['Maintenance', fmtM(exp.maintenance), fmtM(exp.maintenance/12), fmtPct(exp.maintenance_percent*100,1)])}
        ${tableRow(['CapEx Reserve', fmtM(exp.cap_ex_reserve), fmtM(exp.cap_ex_reserve/12), fmtPct(exp.cap_ex_reserve_percent*100,1)])}
        ${exp.hoa_fees ? tableRow(['HOA Fees', fmtM(exp.hoa_fees), fmtM(exp.hoa_fees/12), fmtPct((exp.hoa_fees/d.income.effective_gross_income)*100,1)]) : ''}
        ${tableRow(['<strong>Total</strong>', `<strong>${fmtM(exp.total_operating_expenses)}</strong>`, `<strong>${fmtM(exp.total_operating_expenses/12)}</strong>`, `<strong>${fmtPct(exp.expense_ratio*100,1)}</strong>`])}
      </table>`)}
  </div>
</div>`

  const metricsPage = `
<div class="page">
  ${pageHeader('Key Metrics')}
  ${sectionHeader('05', 'Investment Performance Metrics')}
  <div class="gauge-section">
    ${svgGauge('Cap Rate', d.metrics.cap_rate*100, 15, 5, '%', p)}
    ${svgGauge('Cash-on-Cash Return', d.metrics.cash_on_cash_return*100, 20, 8, '%', p)}
    ${svgGauge('DSCR', d.metrics.dscr, 3, 1.25, 'x', p)}
    ${svgGauge('Gross Rent Multiplier', d.metrics.gross_rent_multiplier, 30, 15, 'x', p)}
    ${svgGauge('1% Rule', d.metrics.one_percent_rule*100, 2, 1, '%', p)}
    ${svgGauge('Break-Even Occupancy', d.metrics.break_even_occupancy*100, 100, 85, '%', p)}
  </div>
  <div class="grid-3 mt-16">
    ${card(metric('Price/sqft', fmtM(d.metrics.price_per_sqft)))}
    ${card(metric('Rent/sqft', `$${d.metrics.rent_per_sqft.toFixed(2)}`))}
    ${card(metric('Price/Unit', fmtM(d.metrics.price_per_unit)))}
  </div>
</div>`

  const dealScorePage = `
<div class="page">
  ${pageHeader('Deal Score')}
  ${sectionHeader('06', 'InvestIQ Verdict')}
  <div class="deal-score-container">
    <div class="score-ring-container">
      ${svgScoreRing(d.deal_score.score, d.deal_score.grade, p)}
    </div>
    <div class="verdict-text">
      <h3 class="verdict-title" style="color:${gradeColor(d.deal_score.grade, p)}">${d.deal_score.verdict}</h3>
      <p class="verdict-detail">This ${d.property.property_type.toLowerCase()} at <strong>${d.property_address}</strong> scores <strong>${d.deal_score.score}/100</strong> (Grade ${d.deal_score.grade}) based on cash flow, appreciation potential, risk metrics, and market conditions.</p>
      ${d.deal_score.breakeven_price > 0 ? `<p class="verdict-breakeven">Breakeven Price: <strong>${fmtM(d.deal_score.breakeven_price)}</strong> (${d.deal_score.discount_required > 0 ? fmtPct(d.deal_score.discount_required*100,1)+' discount needed' : 'currently profitable'})</p>` : ''}
    </div>
  </div>
  <div class="grid-4 mt-16">
    ${card(metric('IRR', fmtPct(d.returns.irr*100)))}
    ${card(metric('Equity Multiple', d.returns.equity_multiple.toFixed(2) + 'x'))}
    ${card(metric('Avg Annual Return', fmtPct(d.returns.average_annual_return*100)))}
    ${card(metric('CAGR', fmtPct(d.returns.cagr*100)))}
  </div>
</div>`

  const projectionsPage = `
<div class="page">
  ${pageHeader('10-Year Projections')}
  ${sectionHeader('07', 'Financial Projections')}
  ${card(`
    <table class="data-table compact">
      ${tableRow(['Year','Income','Expenses','NOI','Debt Service','Cash Flow','Property Value','Equity'], true)}
      ${d.projections.annual_projections.map((yr, i) => tableRow([
        `Yr ${yr.year}`,
        fmtM(yr.total_income),
        fmtM(yr.operating_expenses),
        fmtM(yr.net_operating_income),
        fmtM(yr.total_debt_service),
        signM(yr.pre_tax_cash_flow),
        fmtM(d.projections.property_values[i] || 0),
        fmtM(d.projections.equity_positions[i] || 0),
      ])).join('')}
    </table>
  `)}
  <div class="grid-3 mt-16">
    ${card(metric('Total Cash Flows', fmtM(d.returns.total_cash_flows), `over ${d.projections.hold_period_years} years`))}
    ${card(metric('Appreciation', fmtPct(d.projections.appreciation_rate*100,1)+'/yr', `${fmtM(d.projections.property_values[0] || d.acquisition.purchase_price)} → ${fmtM(d.exit.projected_sale_price)}`))}
    ${card(metric('Rent Growth', fmtPct(d.projections.rent_growth_rate*100,1)+'/yr'))}
  </div>
</div>`

  const exitPage = `
<div class="page">
  ${pageHeader('Exit Strategy')}
  ${sectionHeader('08', 'Disposition & Tax Analysis')}
  <div class="grid-2">
    ${card(`<h3>Sale Proceeds</h3>
      <div class="detail-grid">
        <div><span class="dl">Projected Sale Price</span><span class="dv">${fmtM(d.exit.projected_sale_price)}</span></div>
        <div><span class="dl">Broker Commission</span><span class="dv">-${fmtM(d.exit.broker_commission)}</span></div>
        <div><span class="dl">Closing Costs</span><span class="dv">-${fmtM(d.exit.closing_costs)}</span></div>
        <div><span class="dl">Remaining Loan</span><span class="dv">-${fmtM(d.exit.remaining_loan_balance)}</span></div>
        <div><span class="dl total">Net Sale Proceeds</span><span class="dv total">${fmtM(d.exit.net_sale_proceeds)}</span></div>
      </div>`)}
    ${card(`<h3>Tax on Sale</h3>
      <div class="detail-grid">
        <div><span class="dl">Total Gain</span><span class="dv">${fmtM(d.exit.total_gain)}</span></div>
        <div><span class="dl">Depreciation Recapture</span><span class="dv">${fmtM(d.exit.depreciation_recapture)}</span></div>
        <div><span class="dl">Recapture Tax (25%)</span><span class="dv">-${fmtM(d.exit.depreciation_recapture_tax)}</span></div>
        <div><span class="dl">Capital Gains Tax</span><span class="dv">-${fmtM(d.exit.capital_gains_tax)}</span></div>
        <div><span class="dl">Total Tax on Sale</span><span class="dv">-${fmtM(d.exit.total_tax_on_sale)}</span></div>
        <div><span class="dl total">After-Tax Proceeds</span><span class="dv total">${fmtM(d.exit.after_tax_proceeds)}</span></div>
      </div>`)}
  </div>
</div>`

  const sensitivityPage = `
<div class="page">
  ${pageHeader('Sensitivity Analysis')}
  ${sectionHeader('09', 'What-If Scenarios')}
  ${buildSensitivityTable('Purchase Price', d.sensitivity.purchase_price, p)}
  ${buildSensitivityTable('Interest Rate', d.sensitivity.interest_rate, p)}
  ${buildSensitivityTable('Rent', d.sensitivity.rent, p)}
  <div class="disclaimer">
    <h4>Data Sources & Disclaimer</h4>
    <p>Rent: ${d.sources.rent_estimate_source} &bull; Value: ${d.sources.property_value_source} &bull; Tax: ${d.sources.tax_data_source} &bull; Market: ${d.sources.market_data_source}</p>
    <p>Data freshness: ${d.sources.data_freshness}</p>
    <p class="mt-8">This report is for informational purposes only and does not constitute investment advice. Projections are based on assumptions that may not materialize. Past performance is not indicative of future results. Always conduct independent due diligence before making investment decisions.</p>
    <p class="mt-8">&copy; ${now.getFullYear()} InvestIQ. All rights reserved.</p>
  </div>
</div>`

  // -- CSS --
  const css = buildCSS(p, isDark)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>InvestIQ Property Report — ${d.property_address}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
<script>
  document.fonts.ready.then(function() {
    setTimeout(function() { window.print(); }, 500);
  });
</script>
</head>
<body>
${coverPage}
${overviewPage}
${financingPage}
${incomePage}
${expensesPage}
${metricsPage}
${dealScorePage}
${projectionsPage}
${exitPage}
${sensitivityPage}
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Sensitivity table builder
// ---------------------------------------------------------------------------
function buildSensitivityTable(title: string, scenarios: Array<{change_percent:number; absolute_value:number; irr:number; cash_on_cash:number; net_profit:number}>, p: Palette): string {
  if (!scenarios || scenarios.length === 0) return ''
  return `<div class="sensitivity-block">
    <h4>${title} Scenarios</h4>
    <table class="data-table compact">
      <tr><th>Change</th><th>Value</th><th>IRR</th><th>Cash-on-Cash</th><th>Net Profit</th></tr>
      ${scenarios.map(s => {
        const color = s.irr >= 0 ? p.positive : p.negative
        return `<tr>
          <td>${s.change_percent > 0 ? '+' : ''}${fmtPct(s.change_percent,0)}</td>
          <td>${fmtM(s.absolute_value)}</td>
          <td style="color:${color}">${fmtPct(s.irr*100)}</td>
          <td style="color:${color}">${fmtPct(s.cash_on_cash*100)}</td>
          <td style="color:${color}">${signM(s.net_profit)}</td>
        </tr>`
      }).join('')}
    </table>
  </div>`
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------
function buildCSS(p: Palette, isDark: boolean): string {
  const cardShadow = isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.06)'
  return `
@page {
  size: letter;
  margin: 0;
}
@media print {
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .page { page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 11px; line-height: 1.5;
  color: ${p.textPrimary}; background: ${p.bg};
}
.page {
  width: 8.5in; min-height: 11in;
  padding: 0.6in 0.65in;
  page-break-after: always;
  position: relative; background: ${p.bg};
}
.page:last-child { page-break-after: auto; }

/* ===== COVER ===== */
.cover-page { display:flex; flex-direction:column; padding:0; }
.cover-top-band { height:8px; background:linear-gradient(90deg,${p.brand},${isDark?'#2DD4BF':'#0284c7'}); }
.cover-content { flex:1; padding:60px 60px 30px; display:flex; flex-direction:column; justify-content:center; }
.cover-logo { font-size:28px; font-weight:700; color:${p.textPrimary}; margin-bottom:8px; }
.cover-logo .logo-iq, .logo .logo-iq { color:${p.brand}; }
.cover-subtitle { font-size:14px; color:${p.textSecondary}; text-transform:uppercase; letter-spacing:2px; }
.cover-divider { width:60px; height:3px; background:${p.brand}; margin:24px 0; border-radius:2px; }
.cover-address { font-size:24px; font-weight:700; color:${p.textPrimary}; margin-bottom:12px; line-height:1.3; }
.cover-meta { font-size:12px; color:${p.textSecondary}; margin-bottom:32px; }
.cover-hero { margin-bottom:32px; }
.hero-metrics { display:flex; gap:24px; justify-content:space-between; }
.cover-strategy { font-size:12px; color:${p.textSecondary}; }
.cover-footer { display:flex; justify-content:space-between; padding:16px 60px; border-top:1px solid ${p.border}; font-size:10px; color:${p.textTertiary}; }

/* ===== HEADER ===== */
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid ${p.border}; }
.logo { font-size:16px; font-weight:700; color:${p.textPrimary}; }
.page-title { font-size:11px; color:${p.textSecondary}; text-transform:uppercase; letter-spacing:1.5px; }

/* ===== SECTION HEADER ===== */
.section-header { margin-bottom:20px; }
.section-label { font-size:10px; font-weight:600; color:${p.brand}; text-transform:uppercase; letter-spacing:2px; margin-bottom:4px; }
.section-title { font-size:18px; font-weight:700; color:${p.textPrimary}; margin-bottom:8px; }
.section-rule { width:40px; height:3px; background:${p.brand}; border-radius:2px; }

/* ===== CARDS ===== */
.card { background:${p.cardBg}; border:1px solid ${p.border}; border-radius:8px; padding:16px; box-shadow:${cardShadow}; }
.card h3 { font-size:12px; font-weight:600; color:${p.textPrimary}; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; }

/* ===== GRIDS ===== */
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
.grid-4 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; }

/* ===== METRIC ===== */
.metric { text-align:center; padding:8px 0; }
.metric-value { font-size:18px; font-weight:700; color:${p.textPrimary}; }
.metric-label { font-size:10px; color:${p.textSecondary}; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
.metric-sub { font-size:9px; color:${p.textTertiary}; margin-top:2px; }

/* ===== DETAIL GRID ===== */
.detail-grid { display:grid; gap:8px; }
.detail-grid > div { display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid ${isDark?'rgba(255,255,255,0.04)':p.border}; }
.detail-grid > div:last-child { border-bottom:none; }
.dl { font-size:11px; color:${p.textSecondary}; }
.dv { font-size:11px; font-weight:600; color:${p.textPrimary}; text-align:right; }
.dv.highlight { color:${p.brand}; font-weight:700; }
.dl.total, .dv.total { font-weight:700; font-size:12px; }

/* ===== TABLE ===== */
.data-table { width:100%; border-collapse:collapse; font-size:10px; }
.data-table th { text-align:left; padding:6px 8px; border-bottom:2px solid ${p.border}; font-weight:600; color:${p.textSecondary}; text-transform:uppercase; letter-spacing:0.5px; font-size:9px; }
.data-table td { padding:5px 8px; border-bottom:1px solid ${isDark?'rgba(255,255,255,0.04)':p.border}; }
.data-table.compact th, .data-table.compact td { padding:3px 6px; font-size:9px; }
.data-table tr:last-child td { border-bottom:none; }

/* ===== WATERFALL ===== */
.waterfall { display:flex; flex-direction:column; gap:12px; }
.wf-step { display:grid; grid-template-columns:180px 1fr 100px; align-items:center; gap:12px; }
.wf-label { font-size:11px; color:${p.textSecondary}; }
.wf-bar { height:16px; border-radius:4px; min-width:4px; }
.wf-bar.positive { background:${p.positive}; }
.wf-bar.negative { background:${p.negative}; }
.wf-bar.brand { background:${p.brand}; }
.wf-value { font-size:12px; font-weight:600; color:${p.textPrimary}; text-align:right; }
.wf-value.highlight { color:${p.brand}; font-weight:700; }
.wf-total { border-top:2px solid ${p.border}; padding-top:12px; }

/* ===== DONUT ===== */
.donut-container { display:flex; flex-direction:column; align-items:center; gap:16px; }
.donut-legend { display:grid; gap:6px; width:100%; }
.legend-item { display:flex; align-items:center; gap:8px; font-size:10px; }
.legend-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.legend-label { flex:1; color:${p.textSecondary}; }
.legend-value { font-weight:600; color:${p.textPrimary}; }

/* ===== GAUGE ===== */
.gauge-section { display:flex; flex-direction:column; gap:20px; }

/* ===== DEAL SCORE ===== */
.deal-score-container { display:flex; gap:32px; align-items:center; margin-bottom:24px; }
.score-ring-container { flex-shrink:0; }
.verdict-text { flex:1; }
.verdict-title { font-size:20px; font-weight:700; margin-bottom:8px; }
.verdict-detail { font-size:12px; color:${p.textSecondary}; line-height:1.6; margin-bottom:8px; }
.verdict-breakeven { font-size:11px; color:${p.textTertiary}; }

/* ===== SENSITIVITY ===== */
.sensitivity-block { margin-bottom:16px; }
.sensitivity-block h4 { font-size:11px; font-weight:600; color:${p.textPrimary}; margin-bottom:8px; }

/* ===== DISCLAIMER ===== */
.disclaimer { margin-top:24px; padding:16px; border:1px solid ${p.border}; border-radius:8px; background:${p.cardBg}; }
.disclaimer h4 { font-size:11px; font-weight:600; color:${p.textPrimary}; margin-bottom:8px; }
.disclaimer p { font-size:9px; color:${p.textTertiary}; line-height:1.5; }

/* ===== UTILS ===== */
.mt-8 { margin-top:8px; }
.mt-16 { margin-top:16px; }
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
    // Fetch proforma data from Railway backend
    const params = new URLSearchParams({ address, strategy })
    const backendUrl = `${BACKEND_URL}/api/v1/proforma/property/${propertyId}?${params}`

    const res = await fetch(backendUrl, {
      headers: { 'Accept': 'application/json' },
      // Don't cache — always fetch fresh data
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`Backend proforma fetch failed (${res.status}):`, err)
      return new NextResponse(
        `<html><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Report generation failed</h2><p>Could not fetch property data. Status: ${res.status}</p><p>${err}</p></body></html>`,
        { status: 502, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const proforma: Proforma = await res.json()

    // Generate HTML report
    const html = buildReport(proforma, theme === 'dark' ? 'dark' : 'light')

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
