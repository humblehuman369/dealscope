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

import React from 'react'
import { X, TrendingUp, Target, BarChart3, Home, Database, Clock, DollarSign } from 'lucide-react'

// =============================================================================
// DESIGN TOKENS — Dark Fintech System
// =============================================================================
const T = {
  // Backgrounds
  base: '#000000',        // True black
  card: '#0C1220',        // Deep navy cards
  cardElevated: '#111827', // Slightly lifted card

  // Borders — 7% white opacity
  border: 'rgba(255,255,255,0.07)',
  borderSubtle: 'rgba(255,255,255,0.04)',

  // Four-tier Slate text hierarchy
  heading: '#F1F5F9',     // Near-white — headings
  body: '#CBD5E1',        // Solid grey — body text
  secondary: '#94A3B8',   // Mid-slate — secondary
  label: '#64748B',       // Slate — smallest labels

  // Semantic accent colors
  blue: '#38bdf8',        // Primary actions, key data
  teal: '#0EA5E9',        // Positive signals, educational
  amber: '#fbbf24',       // Caution, scores
  red: '#f87171',         // Negatives, losses
  green: '#34d399',       // Income, success
}

// =============================================================================
// IQ VERDICT METHODOLOGY
// =============================================================================

const DISCOUNT_BRACKETS = [
  { bracket: 'At or above list', investorPct: '10–15%', scoreRange: '88–95', color: T.teal },
  { bracket: '0–5% below list', investorPct: '30–38%', scoreRange: '75–88', color: T.teal },
  { bracket: '6–10% below list', investorPct: '30–37%', scoreRange: '60–75', color: T.blue },
  { bracket: '11–20% below list', investorPct: '12–18%', scoreRange: '40–60', color: T.amber },
  { bracket: '21–30% below list', investorPct: '6–10%', scoreRange: '22–40', color: T.amber },
  { bracket: '31–40% below list', investorPct: '2–4%', scoreRange: '12–22', color: T.red },
  { bracket: '41%+ below list', investorPct: '1–2.5%', scoreRange: '5–12', color: T.red },
] as const

const MODIFIER_SECTIONS = [
  {
    title: 'Seller Motivation',
    items: [
      { label: 'Foreclosure / Bank-Owned / Auction', impact: '+8 to +10' },
      { label: 'Price Reduced 2+ Times', impact: '+5 to +8' },
      { label: 'For Sale By Owner', impact: '+3 to +5' },
      { label: 'Agent-Listed (standard)', impact: '0' },
      { label: 'Off-Market (unknown intent)', impact: '−5 to −10' },
    ],
  },
  {
    title: 'Market Temperature',
    items: [
      { label: 'Cold Market', impact: '+5' },
      { label: 'Warm / Balanced Market', impact: '0' },
      { label: 'Hot Market', impact: '−5' },
    ],
  },
] as const

const SCORE_FORMULA = {
  steps: [
    'Measure the Deal Gap — how far below asking price you need to buy',
    'Map the gap to a base score using real U.S. investor discount data',
    'Adjust for seller motivation and market conditions (−15 to +15)',
  ],
  example: 'If your Deal Gap is 8% → base score 65. Seller reduced price 2x (+6) and market is cold (+5) → final score 76 (Good Opportunity)',
}

// =============================================================================
// GRADE TIERS
// =============================================================================
const GRADE_TIERS = [
  { grade: 'A+', range: '90–100', label: 'Strong Opportunity', color: T.teal, meaning: 'Numbers work at or near asking price' },
  { grade: 'A',  range: '80–89',  label: 'Good Opportunity',   color: T.teal, meaning: 'Minimal negotiation needed' },
  { grade: 'B',  range: '65–79',  label: 'Moderate Opportunity', color: T.amber, meaning: 'Negotiation required' },
  { grade: 'C',  range: '50–64',  label: 'Marginal Opportunity', color: T.amber, meaning: 'Significant discount needed' },
  { grade: 'D',  range: '30–49',  label: 'Unlikely Opportunity', color: T.red, meaning: 'Gap too large to bridge' },
  { grade: 'F',  range: '0–29',   label: 'Pass',                 color: T.red, meaning: 'Not a viable investment' },
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
  if (!isOpen) return null

  const getTitle = () => {
    switch (scoreType) {
      case 'verdict':
        return 'How VerdictIQ Works'
      case 'strategy':
        return 'Strategy Score Breakdown'
      default:
        return 'How We Score'
    }
  }

  const getSubtitle = () => {
    switch (scoreType) {
      case 'verdict':
        return 'Scored against real U.S. investor transaction data'
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
              {currentScore !== undefined && (
                <p className="text-sm mt-1.5" style={{ color: T.label }}>
                  Current score: <span className="font-semibold" style={{ color: T.blue, fontVariantNumeric: 'tabular-nums' }}>{currentScore}</span>
                  {currentGrade && <span className="ml-1" style={{ color: T.secondary }}>({currentGrade})</span>}
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
                background: `radial-gradient(ellipse at 50% 0%, rgba(14,165,233,0.06) 0%, transparent 70%), ${T.card}`,
                border: `1px solid rgba(14,165,233,0.15)`,
              }}
            >
              <p className="text-sm font-normal text-center" style={{ color: T.body }}>
                The Verdict Score answers one question:
              </p>
              <p className="text-base font-bold text-center mt-2" style={{ color: T.teal }}>
                &ldquo;How achievable is this Deal Gap?&rdquo;
              </p>
            </div>

            {/* Breakeven Price */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                Understanding Breakeven Price
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
                    The maximum price you can pay and still break even on monthly cash flow.
                  </p>
                </div>

                <p className="text-xs font-semibold mb-2.5" style={{ color: T.body }}>
                  Breakeven is calculated using YOUR assumptions:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-4">
                  {['Down payment %', 'Interest rate', 'Loan term', 'Vacancy rate', 'Management fees', 'Maintenance %'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ color: T.teal }}>•</span>
                      <span style={{ color: T.secondary }}>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'rgba(52,211,153,0.05)', border: `1px solid rgba(52,211,153,0.12)` }}>
                  <p className="text-xs leading-relaxed" style={{ color: T.body }}>
                    <span className="font-semibold" style={{ color: T.green }}>At breakeven:</span> Monthly rental income exactly covers all expenses (mortgage, taxes, insurance, vacancy, maintenance, management). Any price below breakeven = positive cash flow.
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
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}
                  >
                    <BarChart3 className="w-4 h-4" style={{ color: T.blue }} />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed" style={{ color: T.heading }}>
                    Your Deal Gap is scored against real U.S. investor transaction data.
                  </p>
                </div>

                <div className="space-y-2">
                  {DISCOUNT_BRACKETS.map((b, idx) => (
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
                  Source: U.S. residential sales data (2025). Investor-initiated transactions across single-family homes, townhomes, and condos.
                </p>
              </div>
            </section>

            {/* Score Modifiers */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                2. Score Modifiers
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(56,189,248,0.1)' }}
                  >
                    <Target className="w-4 h-4" style={{ color: T.blue }} />
                  </div>
                  <p className="text-sm font-semibold leading-relaxed" style={{ color: T.heading }}>
                    The base score is adjusted by seller motivation and market conditions.
                  </p>
                </div>

                {MODIFIER_SECTIONS.map((section, si) => (
                  <div key={si} className={si > 0 ? 'mt-4' : ''}>
                    <p className="text-xs font-semibold mb-2.5" style={{ color: T.body }}>
                      {section.title}
                    </p>
                    <div className="space-y-2">
                      {section.items.map((item, ii) => (
                        <div key={ii} className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: T.secondary }}>{item.label}</span>
                          <span className="text-xs font-semibold tabular-nums" style={{ color: item.impact.startsWith('+') ? T.teal : item.impact.startsWith('−') ? T.red : T.label }}>{item.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Score Calculation */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: T.blue }}>
                3. How It All Works
              </h3>
              <div className="p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div className="space-y-3 mb-4">
                  {SCORE_FORMULA.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                        style={{ backgroundColor: 'rgba(56,189,248,0.1)', color: T.blue }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-relaxed" style={{ color: T.body }}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-lg" style={{ backgroundColor: 'rgba(14,165,233,0.05)', border: `1px solid rgba(14,165,233,0.12)` }}>
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
