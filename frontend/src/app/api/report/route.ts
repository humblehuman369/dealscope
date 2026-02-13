/**
 * InvestIQ Property Investment Report — Vercel Serverless Function
 *
 * Generates a professional, full-page, print-ready HTML investment report.
 * Each section makes a statement with bold typography, AI-written narrative
 * analysis, property photos, and data visualizations.
 *
 * 8 pages, letter size (8.5" x 11"), light + dark themes.
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Proforma {
  generated_at: string; property_id: string; property_address: string; strategy_type: string
  property: { address: string; city: string; state: string; zip: string; property_type: string; bedrooms: number; bathrooms: number; square_feet: number; year_built: number; lot_size: number }
  acquisition: { purchase_price: number; list_price: number; discount_from_list: number; closing_costs: number; closing_costs_percent: number; inspection_costs: number; rehab_costs: number; total_acquisition_cost: number }
  financing: { down_payment: number; down_payment_percent: number; loan_amount: number; interest_rate: number; loan_term_years: number; loan_type: string; monthly_payment: number; monthly_payment_with_escrow: number; total_interest_over_life: number; apr: number }
  income: { monthly_rent: number; annual_gross_rent: number; other_income: number; vacancy_allowance: number; vacancy_percent: number; effective_gross_income: number }
  expenses: { property_taxes: number; insurance: number; hoa_fees: number; management: number; management_percent: number; maintenance: number; maintenance_percent: number; utilities: number; landscaping: number; pest_control: number; cap_ex_reserve: number; cap_ex_reserve_percent: number; other_expenses: number; total_operating_expenses: number; expense_ratio: number }
  metrics: { net_operating_income: number; annual_debt_service: number; annual_cash_flow: number; monthly_cash_flow: number; cap_rate: number; cash_on_cash_return: number; dscr: number; gross_rent_multiplier: number; one_percent_rule: number; break_even_occupancy: number; price_per_unit: number; price_per_sqft: number; rent_per_sqft: number }
  depreciation: { purchase_price: number; land_value_percent: number; land_value: number; improvement_value: number; total_depreciable_basis: number; annual_depreciation: number }
  projections: { hold_period_years: number; appreciation_rate: number; rent_growth_rate: number; expense_growth_rate: number; annual_projections: Array<{ year: number; total_income: number; operating_expenses: number; net_operating_income: number; total_debt_service: number; pre_tax_cash_flow: number; after_tax_cash_flow: number; depreciation: number; taxable_income: number; estimated_tax_liability: number; mortgage_interest: number; mortgage_principal: number }>; cumulative_cash_flow: number[]; property_values: number[]; equity_positions: number[]; loan_balances: number[] }
  exit: { hold_period_years: number; initial_value: number; appreciation_rate: number; projected_sale_price: number; broker_commission: number; closing_costs: number; total_sale_costs: number; remaining_loan_balance: number; net_sale_proceeds: number; accumulated_depreciation: number; total_gain: number; depreciation_recapture: number; depreciation_recapture_tax: number; capital_gain: number; capital_gains_tax: number; total_tax_on_sale: number; after_tax_proceeds: number }
  returns: { irr: number; equity_multiple: number; average_annual_return: number; cagr: number; total_cash_flows: number; total_distributions: number; payback_period_months: number | null }
  sensitivity: { purchase_price: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>; interest_rate: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>; rent: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>; vacancy: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }>; appreciation: Array<{ variable: string; change_percent: number; absolute_value: number; irr: number; cash_on_cash: number; net_profit: number }> }
  deal_score: { score: number; grade: string; verdict: string; breakeven_price: number; discount_required: number }
  sources: { rent_estimate_source: string; property_value_source: string; tax_data_source: string; market_data_source: string; data_freshness: string }
  strategy_breakdown?: Record<string, any>
  strategy_methodology?: string
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const $ = (v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(2)}M` : `$${fmt(v)}`
const pct = (v: number, d = 2) => `${v.toFixed(d)}%`
const sign$ = (v: number) => v >= 0 ? $(v) : `-${$(Math.abs(v))}`
const ptypeLabel = (t: string) => { const m: Record<string,string> = { 'single family':'single-family residence','singlefamily':'single-family residence','condo':'condominium','townhouse':'townhouse','duplex':'duplex' }; return m[t.toLowerCase()] || t.toLowerCase() }

// ---------------------------------------------------------------------------
// Theme palettes
// ---------------------------------------------------------------------------
interface P { bg:string; card:string; text:string; sub:string; muted:string; brand:string; pos:string; neg:string; warn:string; border:string; colors:string[] }
const L: P = { bg:'#FFFFFF', card:'#F8FAFC', text:'#0F172A', sub:'#475569', muted:'#94A3B8', brand:'#0EA5E9', pos:'#16A34A', neg:'#DC2626', warn:'#D97706', border:'#E2E8F0', colors:['#0EA5E9','#10B981','#F59E0B','#F43F5E','#8B5CF6','#06B6D4'] }
const D: P = { bg:'#000000', card:'#0C1220', text:'#F1F5F9', sub:'#CBD5E1', muted:'#64748B', brand:'#38BDF8', pos:'#34D399', neg:'#F87171', warn:'#FBBF24', border:'rgba(255,255,255,0.08)', colors:['#38BDF8','#2DD4BF','#FBBF24','#F87171','#A78BFA','#22D3EE'] }

function gc(g: string, p: P) { return g.startsWith('A') ? p.pos : g.startsWith('B') ? p.brand : g.startsWith('C') ? p.warn : p.neg }

// ---------------------------------------------------------------------------
// SVG: Donut
// ---------------------------------------------------------------------------
function donut(segs: [string,number][], p: P, label: string, value: string, sz=200): string {
  const tot = segs.reduce((s,[,v]) => s+v, 0); if (!tot) return ''
  const cx=sz/2, cy=sz/2, oR=sz/2-8, iR=oR*.6, sw=oR-iR, mR=(oR+iR)/2
  let a=0; const ps: string[] = []
  for (let i=0;i<segs.length;i++){ const [,v]=segs[i]; if(v<=0) continue; const pc=v/tot, sw2=pc*360, g=segs.length>1?1.5:0, s=a+g/2, e=a+sw2-g/2; if(e<=s){a+=sw2;continue}; const r=Math.PI/180; const x1=cx+mR*Math.cos((s-90)*r),y1=cy+mR*Math.sin((s-90)*r),x2=cx+mR*Math.cos((e-90)*r),y2=cy+mR*Math.sin((e-90)*r); ps.push(`<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${mR.toFixed(1)} ${mR.toFixed(1)} 0 ${sw2>180?1:0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${p.colors[i%p.colors.length]}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round"/>`); a+=sw2 }
  return `<svg viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg">${ps.join('')}<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="11" font-weight="600" fill="${p.muted}">${label}</text><text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="18" font-weight="700" fill="${p.text}">${value}</text></svg>`
}

// ---------------------------------------------------------------------------
// SVG: Score Ring
// ---------------------------------------------------------------------------
function ring(score: number, grade: string, p: P, sz=160): string {
  const cx=sz/2,cy=sz/2,R=sz/2-14,C=2*Math.PI*R,pc=Math.min(score,100)/100,off=C*(1-pc),c=gc(grade,p)
  return `<svg viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${p.border}" stroke-width="10"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${c}" stroke-width="10" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/><text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="32" font-weight="700" fill="${p.text}">${score}</text><text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="16" font-weight="700" fill="${c}">${grade}</text></svg>`
}

// ---------------------------------------------------------------------------
// AI Narrative Engine (ported from Python pdf_narrative.py)
// ---------------------------------------------------------------------------
function narrativeCover(d: Proforma): string {
  const pr = d.property, tp = ptypeLabel(pr.property_type), st = d.strategy_type.toUpperCase()
  let t = `This comprehensive investment analysis provides detailed financial projections and property insights for a ${tp} located in ${pr.city}, ${pr.state}. `
  t += pr.year_built ? `Built in ${pr.year_built}, this property offers ` : 'This property offers '
  t += `${pr.bedrooms} bedrooms and ${pr.bathrooms} bathrooms across ${fmt(pr.square_feet)} square feet of living space`
  if (pr.lot_size > 0) { const ac = pr.lot_size / 43560; if (ac >= 0.1) t += ` on a ${fmt(pr.lot_size)}-square-foot lot (${ac.toFixed(2)} acres)` }
  return t + `. Analyzed under a ${st} investment strategy.`
}

function narrativeOverview(d: Proforma): string {
  const coc = d.metrics.cash_on_cash_return, pr = d.property, ac = d.acquisition, inc = d.income
  let assess = coc >= 8 ? 'a strong cash-flowing investment opportunity' : coc >= 0 ? 'a moderate investment opportunity with positive returns' : 'a wealth-building investment opportunity focused on long-term appreciation'
  let t = `This ${ptypeLabel(pr.property_type)} represents ${assess} in ${pr.city}'s residential market. With a list price of ${$(ac.list_price)} and a projected monthly rent of ${$(inc.monthly_rent)}, the property `
  if (d.metrics.price_per_sqft > 0) t += `carries a price per square foot of $${fmt(d.metrics.price_per_sqft)}. `
  t += `The rent-to-price ratio and location fundamentals position this property for sustained investor interest.`
  return t
}

function narrativeFinancing(d: Proforma): string {
  const f = d.financing, ac = d.acquisition
  let t = `The investment requires a total acquisition cost of ${$(ac.total_acquisition_cost)}, including the purchase price and closing costs`
  if (ac.rehab_costs > 0) t += `, plus ${$(ac.rehab_costs)} in rehabilitation costs`
  t += `. With a ${f.loan_type} financing structure utilizing a ${f.down_payment_percent.toFixed(0)}% down payment, investors can leverage ${$(f.loan_amount)} while maintaining strong equity positioning. `
  t += `The ${f.loan_term_years}-year fixed mortgage at ${f.interest_rate.toFixed(2)}% interest provides payment stability throughout the hold period. Over the life of the loan, total interest payments will reach ${$(f.total_interest_over_life)}, making refinancing opportunities an important consideration.`
  return t
}

function narrativeIncome(d: Proforma): string {
  const inc = d.income, m = d.metrics
  let t = `The first-year financial performance projects gross scheduled rent of ${$(inc.annual_gross_rent)} generating a net operating income of ${$(m.net_operating_income)}. `
  if (m.annual_cash_flow >= 0) {
    t += `After debt service of ${$(m.annual_debt_service)}, the property produces a pre-tax cash flow of ${$(m.annual_cash_flow)}, resulting in monthly positive cash flow of ${$(m.monthly_cash_flow)}. This positions the investment for immediate income generation alongside long-term wealth accumulation through appreciation and equity buildup.`
  } else {
    t += `After debt service of ${$(m.annual_debt_service)}, the property produces a pre-tax cash flow of negative ${$(Math.abs(m.annual_cash_flow))}, resulting in monthly negative cash flow of ${$(Math.abs(m.monthly_cash_flow))}. However, this initial underperformance is offset by significant tax benefits through depreciation and positions the investment for strong future returns as rents escalate and the loan amortizes.`
  }
  return t
}

function narrativeExpense(d: Proforma): string {
  const exp = d.expenses, proj = d.projections
  const ratio = exp.expense_ratio
  let t = `Total operating expenses of ${$(exp.total_operating_expenses)} annually represent ${ratio.toFixed(1)}% of effective gross income`
  t += ratio >= 35 && ratio <= 45 ? ', a healthy expense ratio for residential properties. ' : ratio < 35 ? ', a favorable ratio indicating efficient operations. ' : ', which is elevated relative to typical benchmarks. '
  t += exp.insurance > exp.property_taxes ? `Insurance costs are the largest category at ${$(exp.insurance)}, ` : `Property taxes are the largest category at ${$(exp.property_taxes)}, `
  t += `while conservative reserves for maintenance and capital expenditures ensure adequate funds for property upkeep. `
  if (exp.hoa_fees === 0) t += 'The absence of HOA fees provides a meaningful cost advantage. '
  t += `With ${pct(proj.expense_growth_rate,1)} annual expense growth, operating cost inflation remains modest relative to the projected ${pct(proj.rent_growth_rate,1)} annual rent growth.`
  return t
}

function narrativeMetrics(d: Proforma): string {
  const m = d.metrics, r = d.returns; let t = ''
  const cap = m.cap_rate, coc = m.cash_on_cash_return
  if (cap >= 6 && coc >= 8) t += 'This investment demonstrates strong operational fundamentals with above-benchmark returns on both an unlevered and levered basis. '
  else if (cap >= 4 && coc >= 0) t += 'The investment shows moderate operational performance. While first-year metrics reflect current market conditions, the property is positioned for improving returns. '
  else t += 'First-year operational metrics reflect the challenges of current market pricing and financing conditions. '
  if (m.dscr >= 1.25) t += `A DSCR of ${m.dscr.toFixed(2)} indicates the property's income comfortably covers debt obligations with a healthy safety margin. `
  else if (m.dscr >= 1.0) t += `A DSCR of ${m.dscr.toFixed(2)} indicates the property's income covers debt obligations, though with limited margin. `
  else t += `A DSCR below 1.0 (${m.dscr.toFixed(2)}) indicates the property's operational income does not fully cover debt obligations in year one. `
  if (r.irr > 0) { t += `The ${pct(r.irr)} projected IRR demonstrates `; t += r.irr >= 15 ? 'excellent' : r.irr >= 10 ? 'solid' : 'moderate'; t += ' total returns when held through the full investment cycle, accounting for rental income, appreciation, loan amortization, and eventual sale proceeds.' }
  return t
}

function narrativeDealScore(d: Proforma): string {
  const ds = d.deal_score; let assess: string, action: string
  if (ds.score >= 80) { assess = 'a strong investment opportunity'; action = 'The data supports moving forward with due diligence and negotiation.' }
  else if (ds.score >= 60) { assess = 'a moderate opportunity with upside potential'; action = 'Consider negotiating toward the breakeven price to improve returns.' }
  else if (ds.score >= 40) { assess = 'a marginal opportunity requiring careful evaluation'; action = 'Significant price negotiation would be needed to achieve target returns.' }
  else { assess = 'a challenging investment at current pricing'; action = 'The current pricing does not support the investment thesis. Look for substantial price reduction or alternative strategies.' }
  let t = `The InvestIQ Deal Score of ${ds.score} (${ds.grade}) indicates this is ${assess}. ${ds.verdict || ''}. `
  if (ds.breakeven_price > 0 && ds.discount_required !== 0) t += `The breakeven price is calculated at ${$(ds.breakeven_price)}, representing a ${Math.abs(ds.discount_required).toFixed(1)}% ${ds.discount_required > 0 ? 'discount' : 'premium'} from the current price. `
  return t + action
}

function narrativeProjections(d: Proforma): string {
  const proj = d.projections, yrs = proj.annual_projections.length
  let posYr: number | null = null
  for (let i = 0; i < proj.annual_projections.length; i++) { if (proj.annual_projections[i].pre_tax_cash_flow >= 0) { posYr = i + 1; break } }
  const initEq = d.financing.down_payment, finalEq = proj.equity_positions[proj.equity_positions.length-1] || initEq
  const eqGrowth = initEq > 0 ? ((finalEq - initEq) / initEq * 100) : 0
  const initVal = d.acquisition.purchase_price, finalVal = proj.property_values[proj.property_values.length-1] || initVal
  let t = ''
  if (posYr && posYr > 1) t += `The property transforms from negative to positive cash flow by year ${posYr} as rent growth at ${pct(proj.rent_growth_rate,1)} annually outpaces expense growth at ${pct(proj.expense_growth_rate,1)}. `
  else if (posYr === 1) t += `The property generates positive cash flow from year one, with returns strengthening as rent growth at ${pct(proj.rent_growth_rate,1)} outpaces expenses. `
  else t += `Over the ${yrs}-year projection, rent growth at ${pct(proj.rent_growth_rate,1)} works to offset expense growth at ${pct(proj.expense_growth_rate,1)}. `
  t += `Property value appreciation drives the primary wealth creation, compounding from ${$(initVal)} to a projected ${$(finalVal)} by year ${yrs}. Combined with loan principal reduction, total equity grows from ${$(initEq)} to ${$(finalEq)} — a ${eqGrowth.toFixed(0)}% increase over the hold period.`
  return t
}

function narrativeExit(d: Proforma): string {
  const e = d.exit, r = d.returns, f = d.financing
  let t = `After a ${e.hold_period_years}-year hold period, the exit analysis projects a gross sale price of ${$(e.projected_sale_price)} based on continued ${pct(e.appreciation_rate,1)} annual appreciation. After broker commissions, closing costs, and loan payoff of ${$(e.remaining_loan_balance)}, net sale proceeds reach ${$(e.net_sale_proceeds)} before taxes. `
  if (e.accumulated_depreciation > 0) t += `Tax implications are significant, with accumulated depreciation of ${$(e.accumulated_depreciation)} subject to recapture at 25%, plus capital gains taxes on the remaining ${$(e.capital_gain)} profit. `
  t += `The after-tax proceeds of ${$(e.after_tax_proceeds)} represent a ${r.equity_multiple.toFixed(2)}x equity multiple on the original ${$(f.down_payment)} down payment. `
  t += 'Investors should consider 1031 exchange opportunities to defer capital gains taxation and reinvest proceeds into larger properties, accelerating portfolio growth.'
  return t
}

function narrativeSensitivity(d: Proforma): string {
  const s = d.sensitivity; let t = 'Sensitivity analysis examines how changes in key variables affect investment returns. '
  if (s.purchase_price?.length) { const best = s.purchase_price.reduce((a,b)=>a.irr>b.irr?a:b), worst = s.purchase_price.reduce((a,b)=>a.irr<b.irr?a:b); t += `Purchase price scenarios show IRR ranging from ${pct(worst.irr)} to ${pct(best.irr)}, demonstrating the impact of acquisition pricing on total returns. ` }
  if (s.rent?.length) { const best = s.rent.reduce((a,b)=>a.irr>b.irr?a:b), worst = s.rent.reduce((a,b)=>a.irr<b.irr?a:b); t += `Rent variation scenarios project IRR between ${pct(worst.irr)} and ${pct(best.irr)}, highlighting the sensitivity of returns to rental income assumptions. ` }
  t += 'These scenarios help quantify risk and identify the variables with the greatest impact on investment performance.'
  return t
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function kv(label: string, value: string) { return `<div class="kv"><span>${label}</span><span>${value}</span></div>` }
function kvTotal(label: string, value: string) { return `<div class="kv kv-total"><span>${label}</span><span>${value}</span></div>` }
function wfRow(label: string, value: string, pctW: number, type: string, p: P, highlight = false) {
  const cls = type === 'pos' ? `background:${p.pos}` : type === 'neg' ? `background:${p.neg}` : `background:${p.brand}`
  return `<div class="wf-row${highlight?' wf-hl':''}"><div class="wf-label">${label}</div><div class="wf-track"><div class="wf-bar" style="${cls};width:${Math.max(pctW,2).toFixed(0)}%"></div></div><div class="wf-val">${value}</div></div>`
}
function metricCard(label: string, value: string, desc: string) { return `<div class="m-card"><div class="m-val">${value}</div><div class="m-lbl">${label}</div><div class="m-desc">${desc}</div></div>` }

// ---------------------------------------------------------------------------
// Report HTML Builder
// ---------------------------------------------------------------------------
function buildReport(d: Proforma, theme: string, photos: string[]): string {
  const p = theme === 'dark' ? D : L
  const dk = theme === 'dark'
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
  const exp = d.expenses
  const expSegs: [string,number][] = [['Property Taxes',exp.property_taxes],['Insurance',exp.insurance],['Management',exp.management],['Maintenance',exp.maintenance],['CapEx Reserve',exp.cap_ex_reserve],['Other',exp.utilities+exp.landscaping+exp.pest_control+(exp.hoa_fees||0)+exp.other_expenses]].filter(([,v]) => (v as number)>0) as [string,number][]
  const ph = photos.slice(0, 5)

  const sensBlock = (title: string, rows: Array<{change_percent:number;absolute_value:number;irr:number;cash_on_cash:number;net_profit:number}>) => {
    if (!rows?.length) return ''
    return `<div class="sens-block"><h4>${title}</h4><table class="tbl"><thead><tr><th>Change</th><th>Value</th><th>IRR</th><th>CoC Return</th><th>Net Profit</th></tr></thead><tbody>${rows.map(s => { const c = s.irr>=0?p.pos:p.neg; return `<tr><td>${s.change_percent>0?'+':''}${pct(s.change_percent,0)}</td><td>${$(s.absolute_value)}</td><td style="color:${c}">${pct(s.irr)}</td><td style="color:${c}">${pct(s.cash_on_cash)}</td><td style="color:${c}">${sign$(s.net_profit)}</td></tr>` }).join('')}</tbody></table></div>`
  }

  // Photo grid HTML
  const photoHTML = ph.length > 0 ? `<div class="photos photos-${Math.min(ph.length,5)}">${ph.map((u,i) => `<div class="ph${i===0?' ph-main':''}"><img src="${u}" alt=""/></div>`).join('')}</div>` : ''

  const N = 6
  const pgHdr = `<div class="pg-hdr"><div class="logo-sm">Invest<span class="iq">IQ</span></div><div class="pg-hdr-title">${d.property_address}</div></div>`
  const pgFt = (n: number) => `<div class="pg-foot"><span>InvestIQ Property Report</span><span>${dateStr}</span><span>Page ${n} of ${N}</span></div>`

  const pages = `
<!-- ===== PAGE 1: COVER + PROPERTY DETAILS ===== -->
<div class="page">
  <div class="brand-bar"></div>
  <div class="cover-top">
    <div class="logo-lg">Invest<span class="iq">IQ</span></div>
    <div class="cover-type">Property Investment Report</div>
    <div class="cover-date">${dateStr} &bull; ${d.strategy_type.toUpperCase()} Strategy</div>
  </div>
  ${photoHTML}
  <div class="cover-divider"></div>
  <h1 class="cover-addr">${d.property_address}</h1>
  <p class="cover-meta">${d.property.property_type} &bull; ${d.property.bedrooms} BD / ${d.property.bathrooms} BA &bull; ${fmt(d.property.square_feet)} sqft &bull; Built ${d.property.year_built}</p>
  <div class="hero">
    <div class="hero-item"><div class="hero-val">${$(d.acquisition.purchase_price)}</div><div class="hero-lbl">Purchase Price</div></div>
    <div class="hero-item"><div class="hero-val">${$(d.income.monthly_rent)}</div><div class="hero-lbl">Monthly Rent</div></div>
    <div class="hero-item"><div class="hero-val">${pct(d.metrics.cash_on_cash_return)}</div><div class="hero-lbl">Cash-on-Cash</div></div>
    <div class="hero-item"><div class="hero-val">${pct(d.metrics.cap_rate)}</div><div class="hero-lbl">Cap Rate</div></div>
    <div class="hero-item"><div class="hero-val">${sign$(d.metrics.monthly_cash_flow)}</div><div class="hero-lbl">Cash Flow</div></div>
    <div class="hero-item"><div class="hero-val">${d.metrics.dscr.toFixed(2)}x</div><div class="hero-lbl">DSCR</div></div>
  </div>
  <p class="narrative">${narrativeCover(d)}</p>
  ${d.strategy_methodology ? `
  <div class="card mt-14" style="border-left:3px solid ${p.brand}">
    <div class="card-hd">Strategy Methodology: ${d.strategy_type.toUpperCase()}</div>
    <p class="narrative" style="margin:8px 0 0">${d.strategy_methodology.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, ' ')}</p>
  </div>` : ''}
  <div class="sec-divider"></div>
  <div class="sec-tag">01</div>
  <h2 class="sec-title">Property Details &amp; Capital Structure</h2>
  <p class="narrative">${narrativeOverview(d)}</p>
  <p class="narrative mt-6">${narrativeFinancing(d)}</p>
  <div class="grid3 mt-12">
    <div class="card">
      <div class="card-hd">Property Details</div>
      ${kv('Address', d.property.address)}
      ${kv('City / State', `${d.property.city}, ${d.property.state} ${d.property.zip}`)}
      ${kv('Type', d.property.property_type)}
      ${kv('Bedrooms', String(d.property.bedrooms))}
      ${kv('Bathrooms', String(d.property.bathrooms))}
      ${kv('Square Feet', fmt(d.property.square_feet))}
      ${kv('Year Built', String(d.property.year_built))}
      ${kv('Lot Size', `${fmt(d.property.lot_size)} sqft`)}
      ${kv('Price / sqft', `${$(d.metrics.price_per_sqft)}`)}
      ${kv('Rent / sqft', `$${d.metrics.rent_per_sqft.toFixed(2)}`)}
    </div>
    <div class="card">
      <div class="card-hd">Acquisition</div>
      ${kv('Purchase Price', $(d.acquisition.purchase_price))}
      ${kv('List Price', $(d.acquisition.list_price))}
      ${kv('Discount from List', pct(d.acquisition.discount_from_list,1))}
      ${kv('Closing Costs', `${$(d.acquisition.closing_costs)} (${pct(d.acquisition.closing_costs_percent,1)})`)}
      ${kv('Rehab Costs', $(d.acquisition.rehab_costs))}
      ${kvTotal('Total Investment', $(d.acquisition.total_acquisition_cost))}
    </div>
    <div class="card">
      <div class="card-hd">Financing</div>
      ${kv('Down Payment', `${$(d.financing.down_payment)} (${pct(d.financing.down_payment_percent,0)})`)}
      ${kv('Loan Amount', $(d.financing.loan_amount))}
      ${kv('Interest Rate', pct(d.financing.interest_rate))}
      ${kv('Loan Term', `${d.financing.loan_term_years} yrs (${d.financing.loan_type})`)}
      ${kv('Monthly P&I', $(d.financing.monthly_payment))}
      ${kv('Monthly w/ Escrow', $(d.financing.monthly_payment_with_escrow))}
      ${kv('Total Interest', $(d.financing.total_interest_over_life))}
    </div>
  </div>
  ${pgFt(1)}
</div>

<!-- ===== PAGE 2: MARKET + INCOME ===== -->
<div class="page">
  ${pgHdr}
  <div class="sec-tag">02</div>
  <h2 class="sec-title">Market Position &amp; Location Analysis</h2>
  <p class="narrative">Located in ${d.property.city}, ${d.property.state}, this property benefits from the area's residential market dynamics. With an assumed annual appreciation of ${pct(d.projections.appreciation_rate,1)}, the investment leverages both rental income and long-term value growth. Strong fundamentals in the local housing market support the projected appreciation trajectory.</p>
  <div class="grid4 mt-14">
    <div class="stat-card"><div class="stat-val">${pct(d.projections.appreciation_rate,1)}</div><div class="stat-lbl">Annual Appreciation</div></div>
    <div class="stat-card"><div class="stat-val">${pct(d.projections.rent_growth_rate,1)}</div><div class="stat-lbl">Rent Growth Rate</div></div>
    <div class="stat-card"><div class="stat-val">${$(d.projections.property_values[d.projections.property_values.length-1] || d.acquisition.purchase_price)}</div><div class="stat-lbl">Projected Value (Yr ${d.projections.hold_period_years})</div></div>
    <div class="stat-card"><div class="stat-val">${$(d.projections.equity_positions[d.projections.equity_positions.length-1] || d.financing.down_payment)}</div><div class="stat-lbl">Projected Equity (Yr ${d.projections.hold_period_years})</div></div>
  </div>
  <div class="card mt-14">
    <div class="card-hd">Depreciation &amp; Tax Shield</div>
    <div class="grid2">
      <div>
        ${kv('Depreciable Basis', $(d.depreciation.total_depreciable_basis))}
        ${kv('Land Value', `${$(d.depreciation.land_value)} (${pct(d.depreciation.land_value_percent*100,0)})`)}
        ${kv('Improvement Value', $(d.depreciation.improvement_value))}
      </div>
      <div>
        ${kv('Annual Depreciation', $(d.depreciation.annual_depreciation))}
        ${kv('Depreciation Period', '27.5 years (Residential)')}
        ${kv('Annual Tax Savings (est.)', $(d.depreciation.annual_depreciation * 0.24))}
      </div>
    </div>
  </div>
  <div class="sec-divider"></div>
  <div class="sec-tag">03</div>
  <h2 class="sec-title">Income &amp; Cash Flow Analysis</h2>
  <p class="narrative">${narrativeIncome(d)}</p>
  <div class="mt-14">
    ${wfRow('Gross Rental Income', $(d.income.annual_gross_rent), 100, 'pos', p)}
    ${wfRow(`Vacancy Allowance (${pct(d.income.vacancy_percent,0)})`, `-${$(d.income.vacancy_allowance)}`, (d.income.vacancy_allowance/d.income.annual_gross_rent)*100, 'neg', p)}
    ${wfRow('Effective Gross Income', $(d.income.effective_gross_income), (d.income.effective_gross_income/d.income.annual_gross_rent)*100, 'brand', p)}
    ${wfRow('Operating Expenses', `-${$(exp.total_operating_expenses)}`, (exp.total_operating_expenses/d.income.annual_gross_rent)*100, 'neg', p)}
    ${wfRow('Net Operating Income', sign$(d.metrics.net_operating_income), (Math.abs(d.metrics.net_operating_income)/d.income.annual_gross_rent)*100, d.metrics.net_operating_income>=0?'pos':'neg', p, true)}
    ${wfRow('Annual Debt Service', `-${$(d.metrics.annual_debt_service)}`, (d.metrics.annual_debt_service/d.income.annual_gross_rent)*100, 'neg', p)}
    ${wfRow('Pre-Tax Cash Flow', sign$(d.metrics.annual_cash_flow), Math.max((Math.abs(d.metrics.annual_cash_flow)/d.income.annual_gross_rent)*100, 3), d.metrics.annual_cash_flow>=0?'pos':'neg', p, true)}
  </div>
  <div class="grid4 mt-14">
    <div class="stat-card"><div class="stat-val">${sign$(d.metrics.monthly_cash_flow)}</div><div class="stat-lbl">Monthly Cash Flow</div></div>
    <div class="stat-card"><div class="stat-val">${sign$(d.metrics.annual_cash_flow)}</div><div class="stat-lbl">Annual Cash Flow</div></div>
    <div class="stat-card"><div class="stat-val">${$(d.metrics.net_operating_income)}</div><div class="stat-lbl">Net Operating Income</div></div>
    <div class="stat-card"><div class="stat-val">${pct(exp.expense_ratio,1)}</div><div class="stat-lbl">Expense Ratio</div></div>
  </div>
  ${pgFt(2)}
</div>

<!-- ===== PAGE 3: EXPENSES + PERFORMANCE ===== -->
<div class="page">
  ${pgHdr}
  <div class="sec-tag">04</div>
  <h2 class="sec-title">Expense Breakdown</h2>
  <p class="narrative">${narrativeExpense(d)}</p>
  <div class="expense-layout mt-14">
    <div class="donut-col">
      ${donut(expSegs, p, 'Total Annual', $(exp.total_operating_expenses), 155)}
      <div class="legend">
        ${expSegs.map(([l,v],i) => `<div class="leg"><span class="dot" style="background:${p.colors[i%p.colors.length]}"></span><span class="leg-name">${l}</span><span class="leg-amt">${$(v as number)}</span></div>`).join('')}
      </div>
    </div>
    <div>
      <table class="tbl">
        <thead><tr><th>Category</th><th>Annual</th><th>Monthly</th><th>% of Income</th></tr></thead>
        <tbody>
          <tr><td>Property Taxes</td><td>${$(exp.property_taxes)}</td><td>${$(exp.property_taxes/12)}</td><td>${pct((exp.property_taxes/d.income.effective_gross_income)*100,1)}</td></tr>
          <tr><td>Insurance</td><td>${$(exp.insurance)}</td><td>${$(exp.insurance/12)}</td><td>${pct((exp.insurance/d.income.effective_gross_income)*100,1)}</td></tr>
          <tr><td>Management</td><td>${$(exp.management)}</td><td>${$(exp.management/12)}</td><td>${pct(exp.management_percent,1)}</td></tr>
          <tr><td>Maintenance</td><td>${$(exp.maintenance)}</td><td>${$(exp.maintenance/12)}</td><td>${pct(exp.maintenance_percent,1)}</td></tr>
          <tr><td>CapEx Reserve</td><td>${$(exp.cap_ex_reserve)}</td><td>${$(exp.cap_ex_reserve/12)}</td><td>${pct(exp.cap_ex_reserve_percent,1)}</td></tr>
          ${exp.hoa_fees ? `<tr><td>HOA Fees</td><td>${$(exp.hoa_fees)}</td><td>${$(exp.hoa_fees/12)}</td><td>${pct((exp.hoa_fees/d.income.effective_gross_income)*100,1)}</td></tr>` : ''}
          <tr class="tbl-total"><td><strong>Total</strong></td><td><strong>${$(exp.total_operating_expenses)}</strong></td><td><strong>${$(exp.total_operating_expenses/12)}</strong></td><td><strong>${pct(exp.expense_ratio,1)}</strong></td></tr>
        </tbody>
      </table>
    </div>
  </div>
  <div class="sec-divider"></div>
  <div class="sec-tag">05</div>
  <h2 class="sec-title">Performance Analysis</h2>
  <p class="narrative">${narrativeMetrics(d)}</p>
  <div class="metric-grid mt-14">
    ${metricCard('Cap Rate', pct(d.metrics.cap_rate), 'Unlevered return on property value')}
    ${metricCard('Cash-on-Cash', pct(d.metrics.cash_on_cash_return), 'Annual return on cash invested')}
    ${metricCard('DSCR', `${d.metrics.dscr.toFixed(2)}x`, 'Debt coverage safety margin')}
    ${metricCard('Gross Rent Multiplier', `${d.metrics.gross_rent_multiplier.toFixed(1)}x`, 'Price-to-rent ratio')}
    ${metricCard('1% Rule', pct(d.metrics.one_percent_rule), 'Monthly rent / purchase price')}
    ${metricCard('Break-Even Occupancy', pct(d.metrics.break_even_occupancy,0), 'Minimum occupancy to cover costs')}
    ${metricCard('IRR', pct(d.returns.irr), 'Internal rate of return over hold')}
    ${metricCard('Equity Multiple', `${d.returns.equity_multiple.toFixed(2)}x`, 'Total return on invested equity')}
    ${metricCard('CAGR', pct(d.returns.cagr), 'Compound annual growth rate')}
    ${metricCard('Price / sqft', $(d.metrics.price_per_sqft), 'Acquisition cost per square foot')}
    ${metricCard('Rent / sqft', `$${d.metrics.rent_per_sqft.toFixed(2)}`, 'Monthly rent per square foot')}
    ${metricCard('Avg Annual Return', pct(d.returns.average_annual_return), 'Average return per year')}
  </div>
  ${pgFt(3)}
</div>

<!-- ===== PAGE 4: VERDICT + DISCLAIMER ===== -->
<div class="page">
  ${pgHdr}
  <div class="sec-tag">06</div>
  <h2 class="sec-title">Investment Verdict</h2>
  <div class="score-section">
    <div class="score-ring-wrap">${ring(d.deal_score.score, d.deal_score.grade, p, 150)}</div>
    <div class="score-text">
      <h3 class="verdict-hd" style="color:${gc(d.deal_score.grade,p)}">${d.deal_score.verdict || `Grade ${d.deal_score.grade}`}</h3>
      <p class="narrative">${narrativeDealScore(d)}</p>
    </div>
  </div>
  <div class="card mt-16">
    <div class="card-hd">Investment Thesis Summary</div>
    <div class="grid2">
      <div>
        ${kv('Total Cash Required', $(d.acquisition.total_acquisition_cost))}
        ${kv('Year 1 Cash Flow', sign$(d.metrics.annual_cash_flow))}
        ${kv('Year 1 Cash-on-Cash', pct(d.metrics.cash_on_cash_return))}
        ${kv('Cap Rate', pct(d.metrics.cap_rate))}
        ${kv('DSCR', `${d.metrics.dscr.toFixed(2)}x`)}
      </div>
      <div>
        ${kv('10-Year IRR', pct(d.returns.irr))}
        ${kv('Equity Multiple', `${d.returns.equity_multiple.toFixed(2)}x`)}
        ${kv('After-Tax Proceeds', $(d.exit.after_tax_proceeds))}
        ${kv('Total Appreciation', $(d.exit.projected_sale_price - d.acquisition.purchase_price))}
        ${kv('Total Net Profit', $(d.exit.after_tax_proceeds - d.financing.down_payment))}
      </div>
    </div>
  </div>
  ${d.strategy_breakdown && !d.strategy_breakdown.error ? `
  <div class="card mt-14">
    <div class="card-hd">${d.strategy_type.toUpperCase()} Strategy Breakdown</div>
    <div class="grid2">
      ${(() => {
        const b = d.strategy_breakdown!
        const st = d.strategy_type
        if (st === 'brrrr') return `
          <div>
            ${kv('Purchase Price', $(b.purchase?.purchase_price || b.phase1_buy?.purchase_price || 0))}
            ${kv('Renovation Budget', $(b.renovation?.renovation_budget || b.phase2_rehab?.renovation_budget || 0))}
            ${kv('ARV', $(b.refinance?.arv || b.phase3_rent?.arv || 0))}
            ${kv('Refinance Loan', $(b.refinance?.refinance_loan_amount || b.phase4_refinance?.refinance_loan_amount || 0))}
          </div>
          <div>
            ${kv('Capital Recycled', pct(b.repeat?.capital_recycled_pct || b.phase5_repeat?.capital_recycled_pct || 0))}
            ${kv('Cash Left in Deal', $(b.repeat?.cash_left_in_deal || b.phase5_repeat?.cash_left_in_deal || 0))}
            ${kv('Post-Refi Cash Flow', sign$(b.post_refinance?.post_refi_monthly_cash_flow || 0) + '/mo')}
            ${kv('Infinite ROI?', (b.post_refinance?.infinite_roi_achieved || b.repeat?.capital_recycled_pct >= 100) ? 'Yes' : 'No')}
          </div>`
        if (st === 'flip') return `
          <div>
            ${kv('Purchase Price', $(b.acquisition?.purchase_price || 0))}
            ${kv('Renovation', $(b.renovation?.total_renovation || 0))}
            ${kv('Holding Costs', $(b.holding_costs?.total_holding_costs || 0))}
            ${kv('Total Project Cost', $(b.profit_analysis?.total_project_cost || 0))}
          </div>
          <div>
            ${kv('ARV (Sale Price)', $(b.sale?.arv || 0))}
            ${kv('Selling Costs', $(b.sale?.total_selling_costs || 0))}
            ${kv('Net Profit', sign$(b.profit_analysis?.net_profit_after_tax || b.profit_analysis?.net_profit_before_tax || 0))}
            ${kv('ROI', pct(b.key_metrics?.roi || 0))}
          </div>`
        if (st === 'wholesale') return `
          <div>
            ${kv('ARV', $(b.deal_analysis?.arv || 0))}
            ${kv('Contract Price', $(b.deal_structure?.contract_price || 0))}
            ${kv('End Buyer Price', $(b.deal_structure?.end_buyer_price || 0))}
          </div>
          <div>
            ${kv('Assignment Fee', $(b.profit?.net_profit || b.deal_structure?.assignment_fee || 0))}
            ${kv('Earnest Money', $(b.deal_structure?.earnest_money || 0))}
            ${kv('ROI', pct(b.key_metrics?.roi || 0))}
          </div>`
        if (st === 'str') return `
          <div>
            ${kv('ADR', $(b.revenue?.average_daily_rate || 0))}
            ${kv('Occupancy', pct((b.revenue?.occupancy_rate || 0) * 100))}
            ${kv('Annual Revenue', $(b.revenue?.total_gross_revenue || 0))}
          </div>
          <div>
            ${kv('Platform Fees', $(b.expenses?.platform_fees || 0))}
            ${kv('Cleaning Costs', $(b.expenses?.cleaning_costs || 0))}
            ${kv('Cash-on-Cash', pct(b.metrics?.cash_on_cash_return || 0))}
          </div>`
        if (st === 'house_hack') return `
          <div>
            ${kv('Rooms Rented', String(b.scenario_a?.rooms_rented || 0))}
            ${kv('Monthly Rental Income', $(b.scenario_a?.total_monthly_income || 0))}
            ${kv('Housing Cost Offset', pct(b.key_metrics?.housing_cost_offset_pct || 0))}
          </div>
          <div>
            ${kv('Net Housing Cost', $(b.scenario_a?.net_housing_cost_scenario_a || 0) + '/mo')}
            ${kv('Annual Savings', $(b.key_metrics?.roi_on_savings || b.scenario_a?.annual_savings_a || 0))}
            ${kv('Live Free?', (b.key_metrics?.housing_cost_offset_pct || 0) >= 100 ? 'Yes' : 'Working toward it')}
          </div>`
        // Default: LTR - already covered by main report
        return `
          <div>
            ${kv('Monthly Rent', $(b.income?.monthly_rent || d.income.monthly_rent))}
            ${kv('NOI', $(b.metrics?.noi || d.metrics.net_operating_income))}
            ${kv('Cap Rate', pct(b.metrics?.cap_rate || d.metrics.cap_rate))}
          </div>
          <div>
            ${kv('Cash-on-Cash', pct(b.metrics?.cash_on_cash_return || d.metrics.cash_on_cash_return))}
            ${kv('DSCR', (b.metrics?.dscr || d.metrics.dscr).toFixed(2) + 'x')}
            ${kv('Monthly Cash Flow', sign$(b.metrics?.monthly_cash_flow || d.metrics.monthly_cash_flow))}
          </div>`
      })()}
    </div>
  </div>` : ''}
  <div class="disclaimer">
    <h4>Data Sources</h4>
    <p>Rent Estimate: ${d.sources.rent_estimate_source} &bull; Property Value: ${d.sources.property_value_source} &bull; Tax Data: ${d.sources.tax_data_source} &bull; Market Data: ${d.sources.market_data_source} &bull; Data Freshness: ${d.sources.data_freshness}</p>
    <h4 class="mt-6">Disclaimer</h4>
    <p>This report is for informational purposes only and does not constitute investment advice. All projections are based on assumptions that may not materialize. Past performance is not indicative of future results. Market conditions, interest rates, rental demand, and property values can change significantly. Always conduct independent due diligence, consult qualified professionals, and verify all data before making investment decisions.</p>
    <p class="mt-4">&copy; ${now.getFullYear()} InvestIQ. All rights reserved.</p>
  </div>
  ${pgFt(4)}
</div>

<!-- ===== PAGE 5: PROJECTIONS + EXIT ===== -->
<div class="page">
  ${pgHdr}
  <div class="sec-tag">07</div>
  <h2 class="sec-title">Financial Projections</h2>
  <p class="narrative">${narrativeProjections(d)}</p>
  <table class="tbl mt-14">
    <thead><tr><th>Year</th><th>Income</th><th>Expenses</th><th>NOI</th><th>Debt Service</th><th>Cash Flow</th><th>Property Value</th><th>Equity</th></tr></thead>
    <tbody>${d.projections.annual_projections.map((yr,i) => `<tr><td><strong>Yr ${yr.year}</strong></td><td>${$(yr.total_income)}</td><td>${$(yr.operating_expenses)}</td><td>${$(yr.net_operating_income)}</td><td>${$(yr.total_debt_service)}</td><td style="color:${yr.pre_tax_cash_flow>=0?p.pos:p.neg};font-weight:600">${sign$(yr.pre_tax_cash_flow)}</td><td>${$(d.projections.property_values[i]||0)}</td><td>${$(d.projections.equity_positions[i]||0)}</td></tr>`).join('')}</tbody>
  </table>
  <div class="sec-divider"></div>
  <div class="sec-tag">08</div>
  <h2 class="sec-title">Exit Strategy &amp; Tax Analysis</h2>
  <p class="narrative">${narrativeExit(d)}</p>
  <div class="grid2 mt-14">
    <div class="card">
      <div class="card-hd">Sale Proceeds (Year ${d.exit.hold_period_years})</div>
      ${kv('Projected Sale Price', $(d.exit.projected_sale_price))}
      ${kv('Broker Commission', `-${$(d.exit.broker_commission)}`)}
      ${kv('Closing Costs', `-${$(d.exit.closing_costs)}`)}
      ${kv('Remaining Loan Balance', `-${$(d.exit.remaining_loan_balance)}`)}
      ${kvTotal('Net Sale Proceeds', $(d.exit.net_sale_proceeds))}
    </div>
    <div class="card">
      <div class="card-hd">Tax on Sale</div>
      ${kv('Total Gain', $(d.exit.total_gain))}
      ${kv('Depreciation Recapture', $(d.exit.depreciation_recapture))}
      ${kv('Recapture Tax (25%)', `-${$(d.exit.depreciation_recapture_tax)}`)}
      ${kv('Capital Gains Tax', `-${$(d.exit.capital_gains_tax)}`)}
      ${kv('Total Tax on Sale', `-${$(d.exit.total_tax_on_sale)}`)}
      ${kvTotal('After-Tax Proceeds', $(d.exit.after_tax_proceeds))}
    </div>
  </div>
  ${pgFt(5)}
</div>

<!-- ===== PAGE 6: SENSITIVITY ANALYSIS ===== -->
<div class="page">
  ${pgHdr}
  <div class="sec-tag">09</div>
  <h2 class="sec-title">What-If Scenarios</h2>
  <p class="narrative">${narrativeSensitivity(d)}</p>
  <div class="sens-container mt-16">
    ${sensBlock('Purchase Price Scenarios', d.sensitivity.purchase_price)}
    ${sensBlock('Interest Rate Scenarios', d.sensitivity.interest_rate)}
    ${sensBlock('Rent Scenarios', d.sensitivity.rent)}
  </div>
  ${pgFt(6)}
</div>`

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>InvestIQ Property Report — ${d.property_address}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>${css(p,dk)}</style><script>document.fonts.ready.then(function(){setTimeout(function(){window.print()},500)});</script></head><body>${pages}</body></html>`
}

// ---------------------------------------------------------------------------
// CSS Design System
// ---------------------------------------------------------------------------
function css(p: P, dk: boolean): string {
  return `
@page{size:letter;margin:0}
@media print{body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.page{height:11in;overflow:hidden;page-break-after:always}.page:last-child{page-break-after:auto}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,sans-serif;font-size:11px;line-height:1.55;color:${p.text};background:${p.bg}}
.page{width:8.5in;min-height:11in;padding:0.5in 0.55in;position:relative;background:${p.bg};margin:0 auto}
.card,.stat-card,.m-card,.sens-block{page-break-inside:avoid}
.tbl thead{display:table-header-group}

/* --- Page Header (pages 2+) --- */
.pg-hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid ${p.brand};padding-bottom:8px;margin-bottom:14px}
.logo-sm{font-size:13px;font-weight:700;color:${p.text}}
.pg-hdr-title{font-size:8.5px;color:${p.sub};text-transform:uppercase;letter-spacing:1.5px}

/* --- Page Footer --- */
.pg-foot{position:absolute;bottom:0.22in;left:0.55in;right:0.55in;display:flex;justify-content:space-between;font-size:8.5px;color:${p.muted};border-top:1px solid ${p.border};padding-top:5px}

/* --- Cover --- */
.brand-bar{height:4px;background:linear-gradient(90deg,${p.brand},${dk?'#2DD4BF':'#0284c7'});margin:-0.5in -0.55in calc(0.5in - 4px);width:calc(100% + 1.1in)}
.cover-top{margin-bottom:8px}
.logo-lg{font-size:24px;font-weight:700;color:${p.text}}.iq{color:${p.brand}}
.cover-type{font-size:10px;color:${p.sub};text-transform:uppercase;letter-spacing:2.5px;margin-top:3px}
.cover-date{font-size:10px;color:${p.muted};margin-top:3px}
.cover-divider{width:55px;height:3px;background:${p.brand};border-radius:2px;margin:10px 0 16px}
.cover-addr{font-size:22px;font-weight:700;color:${p.text};line-height:1.3;margin-bottom:5px}
.cover-meta{font-size:11px;color:${p.sub};margin-bottom:12px}

/* --- Photos --- */
.photos{display:grid;gap:4px;border-radius:8px;overflow:hidden;height:150px;margin-bottom:12px}
.photos-1{grid-template-columns:1fr}
.photos-2{grid-template-columns:1fr 1fr}
.photos-3{grid-template-columns:1.6fr 1fr;grid-template-rows:1fr 1fr}.photos-3 .ph-main{grid-row:1/3}
.photos-4{grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr}.photos-4 .ph-main{grid-row:1/3}
.photos-5{grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr}.photos-5 .ph-main{grid-row:1/3}
.ph{overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;display:block}

/* --- Hero Metrics Bar --- */
.hero{display:flex;background:${p.card};border:1px solid ${p.border};border-radius:8px;padding:12px 10px;margin-bottom:12px;gap:3px}
.hero-item{flex:1;text-align:center;border-right:1px solid ${p.border};padding:0 8px}.hero-item:last-child{border-right:none}
.hero-val{font-size:16px;font-weight:700;color:${p.text}}
.hero-lbl{font-size:8px;color:${p.sub};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px}

/* --- Section Divider, Tag, Title --- */
.sec-divider{height:2px;background:linear-gradient(90deg,${p.brand},${dk?'#2DD4BF':'#0284c7'});border-radius:2px;margin:16px 0 18px}
.sec-tag{font-size:11px;font-weight:700;color:${p.brand};margin-bottom:3px}
.sec-title{font-size:16px;font-weight:700;color:${p.text};margin-bottom:7px;line-height:1.3}

/* --- Narrative --- */
.narrative{font-size:11px;color:${p.sub};line-height:1.55;max-width:100%}

/* --- Cards --- */
.card{background:${p.card};border:1px solid ${p.border};border-radius:8px;padding:12px 14px}
.card-hd{font-size:9.5px;font-weight:700;color:${p.text};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid ${p.brand}}

/* --- Grids --- */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px}

/* --- KV Rows --- */
.kv{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid ${dk?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.05)'}}.kv:last-child{border-bottom:none}
.kv span:first-child{color:${p.sub};font-size:10.5px}.kv span:last-child{font-weight:600;color:${p.text};font-size:10.5px}
.kv-total{border-top:2px solid ${p.border};margin-top:5px;padding-top:6px;border-bottom:none}.kv-total span{font-weight:700!important;font-size:11px!important}

/* --- Waterfall --- */
.wf-row{display:grid;grid-template-columns:190px 1fr 100px;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid ${dk?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.04)'}}.wf-row:last-child{border-bottom:none}
.wf-hl{background:${dk?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'};border-radius:4px;padding:6px 5px;margin:1px 0;border-bottom:none}
.wf-label{font-size:10.5px;color:${p.sub}}
.wf-track{height:11px;background:${p.border};border-radius:4px;overflow:hidden}
.wf-bar{height:100%;border-radius:4px;min-width:3px}
.wf-val{font-size:10.5px;font-weight:700;color:${p.text};text-align:right}

/* --- Stat Cards --- */
.stat-card{background:${p.card};border:1px solid ${p.border};border-radius:8px;padding:11px;text-align:center}
.stat-val{font-size:17px;font-weight:700;color:${p.text}}
.stat-lbl{font-size:8px;color:${p.sub};text-transform:uppercase;letter-spacing:0.7px;margin-top:3px}

/* --- Expense Layout --- */
.expense-layout{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start}
.donut-col{text-align:center}
.legend{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.leg{display:flex;align-items:center;gap:7px;font-size:10px;color:${p.sub}}
.dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.leg-name{flex:1}
.leg-amt{font-weight:600;color:${p.text}}

/* --- Metric Grid --- */
.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.m-card{background:${p.card};border:1px solid ${p.border};border-radius:8px;padding:10px 8px;text-align:center}
.m-val{font-size:16px;font-weight:700;color:${p.text}}
.m-lbl{font-size:8.5px;font-weight:600;color:${p.text};margin-top:3px}
.m-desc{font-size:7.5px;color:${p.muted};margin-top:1px}

/* --- Deal Score --- */
.score-section{display:flex;gap:24px;align-items:center;margin-top:14px}
.score-ring-wrap{flex-shrink:0}
.score-text{flex:1}
.verdict-hd{font-size:16px;font-weight:700;margin-bottom:6px}

/* --- Tables --- */
.tbl{width:100%;border-collapse:collapse;font-size:10px}
.tbl thead th{text-align:left;padding:4px 7px;border-bottom:2px solid ${p.border};font-weight:600;color:${p.sub};text-transform:uppercase;letter-spacing:0.5px;font-size:8.5px}
.tbl tbody td{padding:4px 7px;border-bottom:1px solid ${dk?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)'}}
.tbl tbody tr:last-child td{border-bottom:none}
.tbl-total td{border-top:2px solid ${p.border}!important}

/* --- Sensitivity --- */
.sens-container{display:flex;flex-direction:column;gap:18px}
.sens-block h4{font-size:12px;font-weight:700;color:${p.text};margin-bottom:6px}

/* --- Disclaimer --- */
.disclaimer{background:${p.card};border:1px solid ${p.border};border-radius:8px;padding:16px;margin-top:18px}
.disclaimer h4{font-size:10px;font-weight:700;color:${p.text};margin-bottom:4px}
.disclaimer p{font-size:9px;color:${p.muted};line-height:1.55}

/* --- Utilities --- */
.mt-4{margin-top:4px}.mt-6{margin-top:6px}.mt-8{margin-top:8px}.mt-10{margin-top:10px}.mt-12{margin-top:12px}.mt-14{margin-top:14px}.mt-16{margin-top:16px}
`
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get('address')
  const strategy = searchParams.get('strategy') || 'ltr'
  const theme = searchParams.get('theme') || 'light'
  const propertyId = searchParams.get('propertyId') || 'general'

  if (!address) return NextResponse.json({ detail: 'address parameter is required' }, { status: 400 })

  try {
    const [proformaRes, photosRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/proforma/property/${propertyId}?${new URLSearchParams({ address, strategy })}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }),
      fetch(`${BACKEND_URL}/api/v1/photos?zpid=${propertyId}`, { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
    ])

    if (!proformaRes.ok) {
      const err = await proformaRes.text()
      return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Report generation failed</h2><p>Status: ${proformaRes.status}</p><p>${err}</p></body></html>`, { status: 502, headers: { 'Content-Type': 'text/html' } })
    }

    const proforma: Proforma = await proformaRes.json()
    let photos: string[] = []
    try { if (photosRes?.ok) { const pd = await photosRes.json(); if (pd.success && Array.isArray(pd.photos)) photos = pd.photos.map((x: {url?:string}) => x.url).filter(Boolean) } } catch {}

    return new NextResponse(buildReport(proforma, theme === 'dark' ? 'dark' : 'light', photos), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
  } catch (err) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Error</h2><p>${err instanceof Error ? err.message : String(err)}</p></body></html>`, { status: 500, headers: { 'Content-Type': 'text/html' } })
  }
}
