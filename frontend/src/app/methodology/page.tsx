import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Methodology — How DealGapIQ Calculates the Verdict, Deal Gap, and Income Value',
  description:
    'The full methodology behind every DealGapIQ analysis: IQ Verdict scoring, Deal Gap formula, Income Value, the unified strategy performance formula, Deal Opportunity Score, Seller Motivation indicators, and default assumptions for vacancy, expenses, and financing.',
  alternates: { canonical: '/methodology' },
  openGraph: {
    title: 'DealGapIQ Methodology — Formulas, Defaults, and Data Sources',
    description:
      'Every formula DealGapIQ uses to score a property — Deal Gap, IQ Verdict, Income Value, six strategy P&Ls, and Seller Motivation indicators.',
    url: '/methodology',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealGapIQ Methodology',
    description: 'Every formula DealGapIQ uses to score a property — published in full.',
  },
}

const BASE = 'https://dealgapiq.com'

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  '@id': `${BASE}/methodology#article`,
  headline: 'DealGapIQ Methodology — Formulas, Defaults, and Data Sources',
  description:
    'The full methodology behind every DealGapIQ analysis: IQ Verdict scoring, Deal Gap formula, Income Value, the unified strategy performance formula, Deal Opportunity Score, Seller Motivation indicators, and default assumptions.',
  mainEntityOfPage: `${BASE}/methodology`,
  author: { '@id': `${BASE}/about#brad-geisen` },
  publisher: { '@id': `${BASE}/#organization` },
  about: 'Real estate investment analysis methodology',
  audience: { '@type': 'Audience', audienceType: 'Real estate investors' },
  proficiencyLevel: 'Expert',
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
    { '@type': 'ListItem', position: 2, name: 'Methodology', item: `${BASE}/methodology` },
  ],
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mb-12">
      <h2 className="text-2xl font-semibold text-white mb-4 scroll-mt-24">{title}</h2>
      <div className="text-[15px] leading-relaxed space-y-4">{children}</div>
    </section>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 p-3 bg-slate-950/60 border border-slate-800 rounded-md text-[13px] leading-snug overflow-x-auto text-teal-300">
      <code>{children}</code>
    </pre>
  )
}

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
          &larr; Back to DealGapIQ
        </Link>

        <header className="mt-10 mb-12">
          <p className="text-sm font-semibold tracking-widest text-sky-400 uppercase">Methodology</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            How DealGapIQ Calculates Every Number
          </h1>
          <p className="text-lg text-slate-400 mt-4 leading-relaxed">
            Every formula, every default, every data source. We don&apos;t hide the math behind a proprietary
            wall — if you understand what we&apos;re calculating, you understand what we&apos;re telling you.
          </p>
          <p className="text-sm text-slate-500 mt-6">Last updated: May 9, 2026 · Glossary version 2.0</p>
        </header>

        {/* Table of Contents */}
        <nav aria-label="Methodology contents" className="mb-12 p-5 border border-slate-800 rounded-lg bg-slate-950/40">
          <h2 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">Contents</h2>
          <ol className="text-sm space-y-1.5 list-decimal list-inside text-sky-400">
            <li><a href="#income-value" className="hover:text-sky-300">Income Value &amp; Target Buy</a></li>
            <li><a href="#deal-gap" className="hover:text-sky-300">The Deal Gap</a></li>
            <li><a href="#iq-verdict-score" className="hover:text-sky-300">IQ Verdict Score</a></li>
            <li><a href="#deal-opportunity-score" className="hover:text-sky-300">Deal Opportunity Score</a></li>
            <li><a href="#performance-scores" className="hover:text-sky-300">Strategy Performance Scores</a></li>
            <li><a href="#strategy-formulas" className="hover:text-sky-300">Strategy P&amp;L Formulas</a></li>
            <li><a href="#wholesale-70-rule" className="hover:text-sky-300">Wholesale &amp; the 70% Rule</a></li>
            <li><a href="#seller-motivation" className="hover:text-sky-300">Seller Motivation Score</a></li>
            <li><a href="#market-temperature" className="hover:text-sky-300">Market Temperature</a></li>
            <li><a href="#defaults" className="hover:text-sky-300">Default Assumptions</a></li>
            <li><a href="#data-sources" className="hover:text-sky-300">Data Sources</a></li>
            <li><a href="#disclosures" className="hover:text-sky-300">Disclosures &amp; Limitations</a></li>
          </ol>
        </nav>

        <Section id="income-value" title="1. Income Value & Target Buy">
          <p>
            <strong className="text-white">Income Value</strong> is the foundation of every DealGapIQ Verdict.
            It is the purchase price at which projected rental income exactly covers all operating expenses
            and debt service for the property. Buy below it and the deal cash-flows; buy above it and you
            are paying for assumptions, not income.
          </p>
          <p>The formula:</p>
          <Formula>{`income_value = NOI / WACC

where:
  NOI  = effective_gross_income − operating_expenses
  WACC = LTV × mortgage_constant + (1 − LTV) × required_equity_yield

  effective_gross_income = monthly_rent × 12 × (1 − vacancy_rate)
  operating_expenses     = property_taxes + insurance
                         + (effective_gross_income × maintenance_pct)
                         + (effective_gross_income × management_pct)

  LTV               = 1 − down_payment_pct
  mortgage_constant = (i × (1+i)^n) / ((1+i)^n − 1) × 12
                      where i = monthly rate, n = months

  required_equity_yield default = 8%`}</Formula>
          <p>
            <strong className="text-white">Target Buy</strong> applies a small safety margin below Income
            Value so the deal pencils with room to spare:
          </p>
          <Formula>{`target_buy = income_value × (1 − buy_discount_pct)
              capped at list_price

default buy_discount_pct = 5%`}</Formula>
          <p>
            For an all-cash purchase (no debt service), Income Value collapses to{' '}
            <code className="text-teal-300">NOI / required_equity_yield</code>.
          </p>
        </Section>

        <Section id="deal-gap" title="2. The Deal Gap">
          <p>
            The <strong className="text-white">Deal Gap</strong> is the percentage between the asking price
            and the Target Buy. A negative Deal Gap means the listing is asking less than Target Buy —
            the deal already pencils. A positive Deal Gap means the listing is above Target Buy — you need
            a discount, creative structure, or a different strategy to make it work.
          </p>
          <Formula>{`deal_gap_pct = (list_price − target_buy) / list_price × 100`}</Formula>
          <p>The deal-gap component score (0–100) maps the gap to a band:</p>
          <Formula>{`if deal_gap_pct ≤ 0%   → score: 100  (already cash-flowing at list price)
elif ≤ 10%             → score: 80–95
elif ≤ 25%             → score: 50–80
elif ≤ 40%             → score: 20–50
elif ≤ 45%             → score: 0–20
else                   → score: 0     (significant discount needed)`}</Formula>
        </Section>

        <Section id="iq-verdict-score" title="3. IQ Verdict Score">
          <p>
            The IQ Verdict Score (0–100, displayed on the Verdict page) is a Deal-Gap-centric score
            grounded in U.S. 2025 investor transaction data. The base score comes from the deal gap;
            seller motivation and market conditions apply modifiers of −15 to +15.
          </p>
          <Formula>{`score = clamp(base + motivation_mod + market_mod, 5, 95)

where:
  base            = interpolated from investor discount brackets (below)
  motivation_mod  = (motivation_score − 50) / 50 × 10
  market_mod      = cold: +5,  warm: 0,  hot: −5`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Investor discount brackets (2025 U.S. data)</h3>
          <p>Base score ranges mapped from real U.S. investor transaction data:</p>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border border-slate-800 rounded-md">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Deal Gap</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">% of investor transactions</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Base score range</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr><td className="px-3 py-2 border-b border-slate-800">≤ 0% (at or above list)</td><td className="px-3 py-2 border-b border-slate-800">10–15%</td><td className="px-3 py-2 border-b border-slate-800">88–95</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">0–5%</td><td className="px-3 py-2 border-b border-slate-800">30–38%</td><td className="px-3 py-2 border-b border-slate-800">75–88</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">6–10%</td><td className="px-3 py-2 border-b border-slate-800">30–37%</td><td className="px-3 py-2 border-b border-slate-800">60–75</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">11–20%</td><td className="px-3 py-2 border-b border-slate-800">12–18%</td><td className="px-3 py-2 border-b border-slate-800">40–60</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">21–30%</td><td className="px-3 py-2 border-b border-slate-800">6–10%</td><td className="px-3 py-2 border-b border-slate-800">22–40</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">31–40%</td><td className="px-3 py-2 border-b border-slate-800">2–4%</td><td className="px-3 py-2 border-b border-slate-800">12–22</td></tr>
                <tr><td className="px-3 py-2">41%+</td><td className="px-3 py-2">1–2.5%</td><td className="px-3 py-2">5–12</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="deal-opportunity-score" title="4. Deal Opportunity Score">
          <p>
            On worksheets and the Deal Score flow, the <strong className="text-white">Deal Opportunity Score</strong>{' '}
            uses a weighted combination of three factors:
          </p>
          <Formula>{`deal_opportunity_score =
    (deal_gap_score      × 0.50)  // primary: how much discount is needed
  + (availability_score  × 0.30)  // seller motivation by listing status
  + (dom_score           × 0.20)  // days on market context`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Grading bands</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong className="text-emerald-400">A+</strong> — 85+ — Strong Opportunity</li>
            <li><strong className="text-emerald-400">A</strong> — 70+ — Good Opportunity</li>
            <li><strong className="text-lime-400">B</strong> — 55+ — Moderate Opportunity</li>
            <li><strong className="text-orange-400">C</strong> — 40+ — Marginal Opportunity</li>
            <li><strong className="text-orange-400">D</strong> — 25+ — Unlikely Opportunity</li>
            <li><strong className="text-red-400">F</strong> — &lt; 25 — Pass</li>
          </ul>
        </Section>

        <Section id="performance-scores" title="5. Strategy Performance Scores">
          <p>
            Each of the six investment strategies gets its own performance score (0–100) using a unified
            base formula centered at 50 for breakeven:
          </p>
          <Formula>{`performance_score = 50 + (metric × multiplier)
                  clamped to 0–100`}</Formula>
          <p>The metric and multiplier vary by strategy:</p>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border border-slate-800 rounded-md">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Strategy</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Metric</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Multiplier</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Score 100 ≈</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr><td className="px-3 py-2 border-b border-slate-800">Long-Term Rental</td><td className="px-3 py-2 border-b border-slate-800">Cash-on-Cash %</td><td className="px-3 py-2 border-b border-slate-800">5.00</td><td className="px-3 py-2 border-b border-slate-800">10% CoC</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Short-Term Rental</td><td className="px-3 py-2 border-b border-slate-800">Cash-on-Cash %</td><td className="px-3 py-2 border-b border-slate-800">3.33</td><td className="px-3 py-2 border-b border-slate-800">15% CoC</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">BRRRR</td><td className="px-3 py-2 border-b border-slate-800">Cash Recovery %</td><td className="px-3 py-2 border-b border-slate-800">1.00</td><td className="px-3 py-2 border-b border-slate-800">50% recovery</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Fix &amp; Flip</td><td className="px-3 py-2 border-b border-slate-800">ROI %</td><td className="px-3 py-2 border-b border-slate-800">2.50</td><td className="px-3 py-2 border-b border-slate-800">20% ROI</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">House Hack</td><td className="px-3 py-2 border-b border-slate-800">Housing Offset %</td><td className="px-3 py-2 border-b border-slate-800">1.00</td><td className="px-3 py-2 border-b border-slate-800">50% offset</td></tr>
                <tr><td className="px-3 py-2">Wholesale</td><td className="px-3 py-2">ROI on EMD %</td><td className="px-3 py-2">0.50</td><td className="px-3 py-2">100% ROI</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Score of 50 = breakeven. Score above 50 = positive return. Score below 50 = negative return for that strategy.
          </p>
        </Section>

        <Section id="strategy-formulas" title="6. Strategy P&L Formulas">
          <h3 className="text-lg font-semibold text-white mt-2 mb-3">Long-Term Rental (LTR)</h3>
          <Formula>{`annual_gross_rent       = monthly_rent × 12
vacancy_loss            = annual_gross_rent × vacancy_rate
effective_gross_income  = annual_gross_rent − vacancy_loss

operating_expenses = property_taxes + insurance
                   + (annual_gross_rent × management_pct)
                   + (annual_gross_rent × maintenance_pct)
                   + utilities + landscaping + pest_control + hoa_fees

NOI                = effective_gross_income − operating_expenses
annual_debt_service = monthly_pi × 12
annual_cash_flow   = NOI − annual_debt_service

cap_rate           = NOI / purchase_price
cash_on_cash       = annual_cash_flow / total_cash_required
DSCR               = NOI / annual_debt_service
GRM                = purchase_price / annual_gross_rent
1%_rule            = monthly_rent / purchase_price`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Short-Term Rental (STR)</h3>
          <Formula>{`nights_occupied        = 365 × occupancy_rate
rental_revenue         = average_daily_rate × nights_occupied
total_gross_revenue    = rental_revenue + cleaning_fee_revenue

operating_expenses     = property_taxes + insurance
                       + (gross × platform_fees_pct)
                       + (gross × str_management_pct)
                       + cleaning_costs + supplies + utilities
                       + maintenance + landscaping + pest_control + hoa
NOI                    = total_gross_revenue − operating_expenses
break_even_occupancy   = fixed_costs / (ADR − variable_cost_per_night) / 365`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">BRRRR (Buy, Rehab, Rent, Refinance, Repeat)</h3>
          <Formula>{`initial_loan         = purchase_price − down_payment
total_rehab          = renovation_budget × (1 + contingency_pct)
holding_costs        = monthly_holding_costs × holding_period_months
total_cash_invested  = down_payment + closing_costs + total_rehab + holding_costs

refinance_loan       = ARV × refinance_LTV
cash_out             = refinance_loan − initial_loan − refinance_closing_costs
cash_left_in_deal    = total_cash_invested − cash_out
capital_recycled_pct = cash_out / total_cash_invested

post_refi_cash_on_cash = post_refi_annual_cash_flow / cash_left_in_deal
infinite_roi_achieved  = (cash_left_in_deal ≤ 0)`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Fix &amp; Flip</h3>
          <Formula>{`hard_money_loan      = purchase_price × hard_money_LTV
total_renovation     = renovation_budget × (1 + contingency_pct)
total_holding_costs  = hard_money_interest + property_taxes + insurance
                     + utilities + security_maintenance
total_project_cost   = purchase_price + closing + inspection
                     + total_renovation + total_holding_costs

total_selling_costs  = ARV × selling_costs_pct          // typical 8%
net_sale_proceeds    = ARV − total_selling_costs
gross_profit         = ARV − total_project_cost
net_profit_before_tax = net_sale_proceeds − hard_money_loan − total_cash_required
ROI                  = net_profit_before_tax / total_cash_required
annualized_ROI       = ROI × (12 / holding_period_months)`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">House Hack</h3>
          <Formula>{`monthly_PITI           = monthly_PI + monthly_MIP
                       + monthly_taxes + monthly_insurance
total_monthly_income   = monthly_rent_per_room × rooms_rented
net_housing_cost       = total_monthly_expenses − total_monthly_income
savings_vs_renting     = owner_unit_market_rent − net_housing_cost
housing_offset_pct     = total_monthly_income / total_monthly_expenses
breakeven achieved     = housing_offset_pct ≥ 100%  (you live for free)`}</Formula>
        </Section>

        <Section id="wholesale-70-rule" title="7. Wholesale & the 70% Rule">
          <p>
            For wholesale and Fix-and-Flip, the industry-standard{' '}
            <strong className="text-white">70% rule</strong> sets the maximum allowable offer:
          </p>
          <Formula>{`MAO (70% rule) = ARV × (1 − arv_discount_pct) − estimated_rehab_costs

default arv_discount_pct = 30%   // i.e. the 70% rule

Verdict-context wholesale MAO:
  wholesale_fee = price × 0.7%
  MAO           = (ARV × 0.70) − rehab_cost − wholesale_fee`}</Formula>
          <p>
            Deal viability bands for the wholesale spread (ARV − contract_price − rehab):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li><strong>Strong</strong> — spread ≥ assignment_fee + $20,000</li>
            <li><strong>Moderate</strong> — spread ≥ assignment_fee + $10,000</li>
            <li><strong>Tight</strong> — spread ≥ assignment_fee</li>
            <li><strong>Not viable</strong> — anything less</li>
          </ul>
        </Section>

        <Section id="seller-motivation" title="8. Seller Motivation Score">
          <p>
            The Seller Motivation Score (0–100) combines weighted indicators — only those actually detected
            in the data are included in the composite:
          </p>
          <Formula>{`seller_motivation_score =
  Σ(indicator_score × indicator_weight)
  ─────────────────────────────────────
        Σ(indicator_weight)

  for all detected indicators`}</Formula>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Indicators by signal strength</h3>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400">
            <li><strong className="text-white">HIGH (weight 3.0)</strong> — Days on market, price reductions, withdrawn/expired listing, foreclosure/REO/auction, poor condition keywords</li>
            <li><strong className="text-white">MEDIUM-HIGH (weight 2.5)</strong> — Absentee ownership, FSBO</li>
            <li><strong className="text-white">MEDIUM (weight 2.0)</strong> — Out-of-state owner, likely vacant, possibly inherited, selling-soon prediction</li>
            <li><strong className="text-white">LOW counter-indicator (weight 1.0)</strong> — Owner-occupied (reduces motivation)</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Grading bands</h3>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border border-slate-800 rounded-md">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Grade</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Score</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Negotiation leverage</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Expected discount</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr><td className="px-3 py-2 border-b border-slate-800">A+</td><td className="px-3 py-2 border-b border-slate-800">80+</td><td className="px-3 py-2 border-b border-slate-800">High</td><td className="px-3 py-2 border-b border-slate-800">10–20%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">A</td><td className="px-3 py-2 border-b border-slate-800">65–79</td><td className="px-3 py-2 border-b border-slate-800">High</td><td className="px-3 py-2 border-b border-slate-800">10–20%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">B</td><td className="px-3 py-2 border-b border-slate-800">50–64</td><td className="px-3 py-2 border-b border-slate-800">Medium</td><td className="px-3 py-2 border-b border-slate-800">5–10%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">C</td><td className="px-3 py-2 border-b border-slate-800">35–49</td><td className="px-3 py-2 border-b border-slate-800">Low</td><td className="px-3 py-2 border-b border-slate-800">2–5%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">D</td><td className="px-3 py-2 border-b border-slate-800">20–34</td><td className="px-3 py-2 border-b border-slate-800">Minimal</td><td className="px-3 py-2 border-b border-slate-800">0–3%</td></tr>
                <tr><td className="px-3 py-2">F</td><td className="px-3 py-2">&lt; 20</td><td className="px-3 py-2">Minimal</td><td className="px-3 py-2">0–3%</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="market-temperature" title="9. Market Temperature">
          <p>
            Market temperature is classified from median days on market in the property&apos;s zip code:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400">
            <li><strong className="text-rose-400">Hot</strong> (median DOM &lt; 30 days) — Seller&apos;s market, properties sell quickly. Expected discount 0–3%.</li>
            <li><strong className="text-amber-400">Warm</strong> (30–60 days) — Balanced. Moderate negotiation possible. Expected discount 3–7%.</li>
            <li><strong className="text-sky-400">Cold</strong> (&gt; 60 days) — Buyer&apos;s market. Strong negotiation leverage. Expected discount 7–15%.</li>
          </ul>
          <p>
            The absorption rate (new listings / total listings) is a complementary signal: 0.10+ indicates a
            fast-moving seller&apos;s market; below 0.05 indicates an aging-inventory buyer&apos;s market.
          </p>
        </Section>

        <Section id="defaults" title="10. Default Assumptions">
          <p>
            Every analysis runs with investor-grade defaults that any Pro Investor can override before re-running.
            These are the values DealGapIQ applies when the user has not specified their own:
          </p>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm border border-slate-800 rounded-md">
              <thead className="bg-slate-950/60">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Category</th>
                  <th className="text-left px-3 py-2 border-b border-slate-800 text-slate-200">Default</th>
                </tr>
              </thead>
              <tbody className="text-slate-400">
                <tr><td className="px-3 py-2 border-b border-slate-800">Vacancy rate</td><td className="px-3 py-2 border-b border-slate-800">1.0%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Maintenance (% of EGI)</td><td className="px-3 py-2 border-b border-slate-800">5.0%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Property management (% of EGI)</td><td className="px-3 py-2 border-b border-slate-800">0.0% (self-managed)</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Down payment</td><td className="px-3 py-2 border-b border-slate-800">20.0%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Interest rate</td><td className="px-3 py-2 border-b border-slate-800">6.0%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Loan term</td><td className="px-3 py-2 border-b border-slate-800">30 years</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Closing costs</td><td className="px-3 py-2 border-b border-slate-800">3.0% of purchase price</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Buy discount (Target Buy)</td><td className="px-3 py-2 border-b border-slate-800">5.0% below Income Value</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Required equity yield (cash deals)</td><td className="px-3 py-2 border-b border-slate-800">8.0%</td></tr>
                <tr><td className="px-3 py-2 border-b border-slate-800">Wholesale ARV discount (70% rule)</td><td className="px-3 py-2 border-b border-slate-800">30.0%</td></tr>
                <tr><td className="px-3 py-2">Wholesale assignment fee (default)</td><td className="px-3 py-2">$15,000</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="data-sources" title="11. Data Sources">
          <p>
            DealGapIQ aggregates property data from multiple licensed providers and triangulates a single
            <strong className="text-white"> IQ Estimate</strong> for off-market properties:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-slate-400">
            <li><strong className="text-slate-200">RentCast</strong> — rent estimates, sale and rental market statistics, AVM</li>
            <li><strong className="text-slate-200">AXESSO Zillow</strong> — listing data, Zestimate, rent Zestimate, price history, foreclosure flags</li>
            <li><strong className="text-slate-200">Redfin</strong> — listing comparables and valuations (via marketplace gateway)</li>
            <li><strong className="text-slate-200">Realtor.com</strong> — listings and valuations (via marketplace gateway)</li>
            <li><strong className="text-slate-200">Mashvisor</strong> — short-term-rental market data</li>
            <li><strong className="text-slate-200">Google Maps</strong> — geocoding and address normalization</li>
          </ul>
          <p>
            For listed properties, Market Price is the asking (list) price. For off-market properties, Market
            Price uses the IQ Estimate — the average of available value providers — with a fallback chain of
            Zestimate → AVM → tax-assessed value / 0.75.
          </p>
        </Section>

        <Section id="disclosures" title="12. Disclosures & Limitations">
          <p>
            Every output of the methodology is a projection, not a guarantee. Third-party data may be incomplete,
            delayed, estimated, or inaccurate. Verdicts, scores, and offer recommendations are for informational
            and educational purposes only — they are not financial, investment, legal, or tax advice. See the
            full <Link href="/disclosures" className="text-sky-400 hover:text-sky-300">disclosures page</Link>{' '}
            for data accuracy, methodology limitations, and conflicts.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            All calculations are performed in the backend; the website and mobile app display API response
            values only. The methodology above is the same code that runs in production — not a marketing
            simplification.
          </p>
        </Section>

        <div className="mt-16 pt-8 border-t border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Related</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-400">
            <li><Link href="/deal-gap" className="text-sky-400 hover:text-sky-300">What is the Deal Gap?</Link></li>
            <li><Link href="/verdict" className="text-sky-400 hover:text-sky-300">IQ Verdict feature page</Link></li>
            <li><Link href="/strategy" className="text-sky-400 hover:text-sky-300">Strategy Analysis</Link></li>
            <li><Link href="/glossary" className="text-sky-400 hover:text-sky-300">Glossary of investor terms</Link></li>
            <li><Link href="/disclosures" className="text-sky-400 hover:text-sky-300">Disclosures &amp; data limitations</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
