'use client'

/**
 * ScoreMethodologySheet Component
 * 
 * Centered modal explaining how IQ scores are calculated.
 * Shows scoring factors with weights, grade tier legend, and data sources.
 * 
 * Design system: Dark fintech — true black base, deep navy cards,
 * Inter typography, four-tier Slate text hierarchy, semantic accent colors.
 */

import React, { useState } from 'react'
import { X, TrendingUp, Target, BarChart3, Home, Database, Clock, DollarSign } from 'lucide-react'

// =============================================================================
// DESIGN TOKENS — Dark Fintech System
// =============================================================================
const T = {
  // Backgrounds — prefer CSS tokens (theme); legacy hex retained only where modal shell still references T.base
  base: 'var(--surface-base)',
  card: 'var(--surface-card)',
  cardElevated: '#111827', // Slightly lifted card

  // Borders — 7% white opacity
  border: 'rgba(255,255,255,0.07)',
  borderSubtle: 'rgba(255,255,255,0.04)',

  // Four-tier Slate text hierarchy
  heading: '#F1F5F9',     // Near-white — headings
  body: '#CBD5E1',        // Solid grey — body text
  secondary: '#F1F5F9',   // Match primary text
  label: '#F1F5F9',       // Match primary text

  // Semantic accent colors — CURSOR-UNIFY-COLOR-SYSTEM primary var(--accent-sky)
  blue: 'var(--accent-sky)',       // Primary accent (unified)
  teal: 'var(--accent-sky)',       // Alias for primary
  amber: '#fbbf24',       // Caution, scores
  red: '#f87171',         // Negatives, losses
  green: '#34d399',       // Income, success
}

// =============================================================================
// IQ VERDICT METHODOLOGY
// =============================================================================

// DealGapIQ cohort tables — match backend REGIONAL_COHORT_PERCENTAGES + INVESTOR_DISCOUNT_BRACKETS (score ranges).
// Mutually exclusive cohorts; each region sums to 100%. Verdict headline uses cumulative P(depth ≥ Deal Gap) within the cohort for the property state.
type CohortKey = 'national' | 'sun_belt' | 'midwest_affordability' | 'coastal_northeast'

const COHORT_TABS: { id: CohortKey; label: string }[] = [
  { id: 'national', label: 'U.S. (national)' },
  { id: 'sun_belt', label: 'Sun Belt' },
  { id: 'midwest_affordability', label: 'Midwest' },
  { id: 'coastal_northeast', label: 'Coastal / NE' },
]

const BRACKET_ROWS_BY_COHORT: Record<
  CohortKey,
  readonly { bracket: string; investorPct: string; scoreRange: string; color: string }[]
> = {
  national: [
    { bracket: 'At or above list', investorPct: '~19%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '0–5% below list', investorPct: '~32%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '6–10% below list', investorPct: '~24%', scoreRange: '75–88', color: '#84cc16' },
    { bracket: '11–20% below list', investorPct: '~16%', scoreRange: '60–75', color: '#84cc16' },
    { bracket: '21–30% below list', investorPct: '~6%', scoreRange: '40–60', color: '#f97316' },
    { bracket: '31–40% below list', investorPct: '~3%', scoreRange: '22–40', color: '#f97316' },
    { bracket: '41%+ below list', investorPct: '~1%', scoreRange: '5–22', color: '#ef4444' },
  ],
  sun_belt: [
    { bracket: 'At or above list', investorPct: '~15%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '0–5% below list', investorPct: '~25%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '6–10% below list', investorPct: '~25%', scoreRange: '75–88', color: '#84cc16' },
    { bracket: '11–20% below list', investorPct: '~22%', scoreRange: '60–75', color: '#84cc16' },
    { bracket: '21–30% below list', investorPct: '~8%', scoreRange: '40–60', color: '#f97316' },
    { bracket: '31–40% below list', investorPct: '~3%', scoreRange: '22–40', color: '#f97316' },
    { bracket: '41%+ below list', investorPct: '~2%', scoreRange: '5–22', color: '#ef4444' },
  ],
  midwest_affordability: [
    { bracket: 'At or above list', investorPct: '~25%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '0–5% below list', investorPct: '~30%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '6–10% below list', investorPct: '~23%', scoreRange: '75–88', color: '#84cc16' },
    { bracket: '11–20% below list', investorPct: '~14%', scoreRange: '60–75', color: '#84cc16' },
    { bracket: '21–30% below list', investorPct: '~5%', scoreRange: '40–60', color: '#f97316' },
    { bracket: '31–40% below list', investorPct: '~2%', scoreRange: '22–40', color: '#f97316' },
    { bracket: '41%+ below list', investorPct: '~1%', scoreRange: '5–22', color: '#ef4444' },
  ],
  coastal_northeast: [
    { bracket: 'At or above list', investorPct: '~35%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '0–5% below list', investorPct: '~35%', scoreRange: '88–95', color: '#22c55e' },
    { bracket: '6–10% below list', investorPct: '~16%', scoreRange: '75–88', color: '#84cc16' },
    { bracket: '11–20% below list', investorPct: '~9%', scoreRange: '60–75', color: '#84cc16' },
    { bracket: '21–30% below list', investorPct: '~3%', scoreRange: '40–60', color: '#f97316' },
    { bracket: '31–40% below list', investorPct: '~2%', scoreRange: '22–40', color: '#f97316' },
    { bracket: '41%+ below list', investorPct: '~1%', scoreRange: '5–22', color: '#ef4444' },
  ],
}

const SCORE_FORMULA = {
  steps: [
    'Measure the Deal Gap — how far below asking price you need to buy',
    'Map the gap directly to a score using real U.S. investor discount data',
  ],
  example: 'If your Deal Gap is 8% → score ~77 (Negotiable). A 3% gap → score ~90 (Achievable). At or above asking → 95.',
}

// =============================================================================
// GRADE TIERS
// =============================================================================
// Score Interpretation — aligned with DealGapIQ Score Chart CSV
const GRADE_TIERS = [
  { grade: 'A+', range: '88–95',  label: 'Achievable',             color: '#22c55e', meaning: 'Numbers work at or near asking price' },
  { grade: 'A',  range: '75–87',  label: 'Negotiable',             color: '#84cc16', meaning: 'Small discount — common in investor deals' },
  { grade: 'B',  range: '60–74',  label: 'Challenging',            color: '#84cc16', meaning: 'Meaningful negotiation required' },
  { grade: 'C',  range: '40–59',  label: 'More Challenging',       color: '#f97316', meaning: 'Significant discount needed' },
  { grade: 'D',  range: '22–39',  label: 'Very Challenging',      color: '#f97316', meaning: 'Few investor deals achieve this discount' },
  { grade: 'F',  range: '5–21',   label: 'Extremely Challenging',  color: '#ef4444', meaning: 'Rare — tail of investor deals (~1% nationally)' },
]

// =============================================================================
// DATA SOURCES
// =============================================================================
const DATA_SOURCES = [
  { name: 'Zillow', description: 'Property values, rent estimates', icon: Home },
  { name: 'County Records', description: 'Taxes, ownership history', icon: Database },
  { name: 'Rental Comps', description: 'Nearby rental listings', icon: BarChart3 },
  { name: 'Sales Comps', description: 'Recent sold properties', icon: TrendingUp },
]

// =============================================================================
// PROPS
// =============================================================================
interface ScoreMethodologySheetProps {
  isOpen: boolean
  onClose: () => void
  currentScore?: number
  currentGrade?: string
  scoreType?: 'verdict' | 'profit' | 'strategy'
  lastUpdated?: string
}

// =============================================================================
// COMPONENT
// =============================================================================
export function ScoreMethodologySheet({
  isOpen,
  onClose,
  currentScore,
  currentGrade,
  scoreType = 'profit',
  lastUpdated,
}: ScoreMethodologySheetProps) {
  const [cohortTab, setCohortTab] = useState<CohortKey>('national')

  if (!isOpen) return null

  const getTitle = () => {
    switch (scoreType) {
      case 'verdict':
        return 'How The Deal Gap Works'
      case 'strategy':
        return 'Strategy Score Breakdown'
      default:
        return 'How We Score'
    }
  }

  const getSubtitle = () => {
    switch (scoreType) {
      case 'verdict':
        return 'Measured against real U.S. investor transaction data'
      case 'strategy':
        return 'How each strategy is ranked and scored'
      default:
        return 'The methodology behind every score'
    }
  }

  return (
    <>
      {/* Backdrop — no washout, just a subtle dim */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
        onClick={onClose}
      />

      {/* Centered modal — max small desktop width */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full sm:max-w-[520px] max-h-[90vh] sm:max-h-[85vh] overflow-hidden sm:rounded-2xl rounded-t-2xl"
          style={{
            backgroundColor: T.base,
            border: `1px solid ${T.border}`,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5" style={{ borderBottom: `1px solid ${T.border}` }}>
            <div>
              <h2 className="text-lg font-bold" style={{ color: T.heading }}>
                {getTitle()}
              </h2>
              <p className="text-sm mt-1" style={{ color: T.secondary }}>
                {getSubtitle()}
              </p>
              {(currentScore !== undefined || currentGrade) && (
                <p className="text-sm mt-1.5" style={{ color: T.label }}>
                  {currentScore !== undefined ? (
                    <>Current score: <span className="font-semibold" style={{ color: T.blue, fontVariantNumeric: 'tabular-nums' }}>{currentScore}</span></>
                  ) : currentGrade ? (
                    <span className="font-semibold" style={{ color: T.blue }}>{currentGrade}</span>
                  ) : null}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <X className="w-4 h-4" style={{ color: T.secondary }} />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-6 py-5 space-y-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>

            {/* Core Concept — Educational helper box */}
            <div
              className="p-5 rounded-xl"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, rgba(15,164,233,0.06) 0%, transparent 70%), ${T.card}`,
                border: `1px solid rgba(15,164,233,0.15)`,
              }}
            >
              <p className="text-sm font-normal text-center" style={{ color: T.body }}>
                The Deal Gap answers one question:
              </p>
              <p className="text-base font-bold text-center mt-2" style={{ color: T.teal }}>
                &ldquo;How far below market price do you need to buy?&rdquo;
              </p>
            </div>

            {/* Income Value (breakeven) */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                Income Value
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(52,211,153,0.1)' }}
                  >
                    <DollarSign className="w-4 h-4" style={{ color: T.green }} />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed" style={{ color: T.heading }}>
                    The highest price the rental income can support at your blended cost of capital: mortgage debt plus a required return on
                    any cash you put in (default 8% annually — the &quot;equity yield&quot; hurdle).
                  </p>
                </div>

                <p className="text-xs font-semibold mb-2.5" style={{ color: T.body }}>
                  Breakeven is calculated using YOUR assumptions:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {['Down payment %', 'Interest rate', 'Loan term', 'Required equity yield', 'Management fees', 'Maintenance %'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ color: T.teal }}>•</span>
                      <span style={{ color: T.secondary }}>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'rgba(52,211,153,0.05)', border: `1px solid rgba(52,211,153,0.12)` }}>
                  <p className="text-xs leading-relaxed" style={{ color: T.body }}>
                    <span className="font-semibold" style={{ color: T.green }}>At breakeven:</span> NOI covers operating expenses plus your annual capital cost (loan payments on the financed portion and the hurdle return on your equity). Any price below Income Value = positive cash flow vs. that hurdle.
                  </p>
                </div>

                <p className="text-[11px] mt-3" style={{ color: T.label }}>
                  Based on LTR (Long-Term Rental) revenue model using estimated market rent.
                </p>
              </div>
            </section>

            {/* Discount Brackets */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                1. Investor Discount Brackets
              </h3>
              <div
                className="p-4 rounded-xl"
                style={{ background: 'var(--surface-card)', border: `1px solid ${T.border}` }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}
                  >
                    <BarChart3 className="w-4 h-4" style={{ color: T.blue }} />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed" style={{ color: T.heading }}>
                    Your Deal Gap is scored against real U.S. investor transaction data. The headline probability uses your
                    property&apos;s state to pick a regional cohort when available; cumulative share = investors who close at
                    this discount depth or deeper.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {COHORT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCohortTab(tab.id)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                      style={{
                        background:
                          cohortTab === tab.id ? 'rgba(15,164,233,0.2)' : 'rgba(255,255,255,0.06)',
                        color: cohortTab === tab.id ? T.blue : T.secondary,
                        border: `1px solid ${cohortTab === tab.id ? 'rgba(15,164,233,0.35)' : T.borderSubtle}`,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {BRACKET_ROWS_BY_COHORT[cohortTab].map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: T.secondary }}>{b.bracket}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] tabular-nums" style={{ color: T.label }}>{b.investorPct} of deals</span>
                        <span className="text-xs font-semibold tabular-nums w-12 text-right" style={{ color: b.color }}>{b.scoreRange}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] mt-4 leading-relaxed" style={{ color: T.label }}>
                  Sources: Redfin 2025 MLS sale-to-list, Cotality Q4 2025 Home Investor Report, Realtor.com Q1 2026 Market
                  Clock (methodology in docs/calculations/INVESTOR_DISCOUNT_DATA.md).
                </p>
              </div>
            </section>

            {/* Score Calculation */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                2. How It All Works
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="space-y-3 mb-4">
                  {SCORE_FORMULA.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                        style={{ backgroundColor: 'rgba(15,164,233,0.1)', color: T.blue }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: T.body }}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'rgba(15,164,233,0.05)', border: `1px solid rgba(15,164,233,0.12)` }}>
                  <p className="text-xs leading-relaxed" style={{ color: T.body }}>
                    <span className="font-semibold" style={{ color: T.teal }}>Example: </span>
                    {SCORE_FORMULA.example}
                  </p>
                </div>
              </div>
            </section>

            {/* Grade Tiers */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                Score Interpretation
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-3 gap-2.5">
                  {GRADE_TIERS.map((tier) => (
                    <div
                      key={tier.grade}
                      className="text-center py-3 px-2 rounded-xl"
                      style={{ backgroundColor: `${tier.color}08`, border: `1px solid ${tier.color}18` }}
                    >
                      <div className="text-xl font-bold" style={{ color: tier.color, fontVariantNumeric: 'tabular-nums' }}>
                        {tier.grade}
                      </div>
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: tier.color }}>
                        {tier.label}
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: T.label }}>
                        {tier.range}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Data Sources */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                Data Sources
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-2 gap-4">
                  {DATA_SOURCES.map((source) => {
                    const Icon = source.icon
                    return (
                      <div key={source.name} className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: T.teal }} />
                        <div>
                          <div className="text-xs font-semibold" style={{ color: T.heading }}>
                            {source.name}
                          </div>
                          <div className="text-[10px]" style={{ color: T.label }}>
                            {source.description}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <Clock className="w-3 h-3" style={{ color: T.label }} />
                <span className="text-[11px]" style={{ color: T.label }}>
                  Score updated: {lastUpdated}
                </span>
              </div>
            )}

            {/* Bottom safe area */}
            <div className="h-4" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .fixed.inset-0.z-50:first-child {
          animation: fade-in 0.2s ease-out;
        }
        .pointer-events-auto {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  )
}

export default ScoreMethodologySheet
