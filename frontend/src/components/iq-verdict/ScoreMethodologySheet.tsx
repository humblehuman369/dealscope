'use client'

/**
 * ScoreMethodologySheet Component
 * 
 * Bottom sheet/modal explaining how IQ scores are calculated.
 * Shows scoring factors with weights, grade tier legend, and data sources.
 * 
 * Addresses bounce trigger: Users don't understand how scores are calculated.
 */

import React from 'react'
import { X, Info, TrendingUp, Shield, Target, BarChart3, Percent, Home, Database, Clock } from 'lucide-react'

// =============================================================================
// BRAND COLORS
// =============================================================================
const COLORS = {
  navy: '#0A1628',
  teal: '#0891B2',
  tealLight: '#06B6D4',
  cyan: '#00D4FF',
  rose: '#E11D48',
  warning: '#F59E0B',
  green: '#10B981',
  surface50: '#F8FAFC',
  surface100: '#F1F5F9',
  surface200: '#E2E8F0',
  surface300: '#CBD5E1',
  surface400: '#94A3B8',
  surface500: '#64748B',
  surface600: '#475569',
  surface700: '#334155',
}

// =============================================================================
// IQ VERDICT METHODOLOGY
// =============================================================================

// The IQ Verdict Score answers: "How likely can you negotiate the required discount?"
// Score = Probability of achieving Deal Gap given Motivation level

const METHODOLOGY_SECTIONS = [
  {
    name: 'Deal Gap %',
    icon: TrendingUp,
    description: 'The discount needed from asking price to reach your breakeven price.',
    formula: 'Deal Gap = (List Price - Breakeven) / List Price × 100',
    explanation: 'Breakeven is the maximum price where monthly cash flow = $0, calculated using YOUR financing terms (down payment, interest rate, vacancy, etc.).',
    note: 'Based on LTR (rental) revenue model.',
  },
  {
    name: 'Motivation',
    icon: Target,
    description: 'Seller willingness to negotiate, based on signals and market conditions.',
    components: [
      { label: 'Foreclosure/Bank-Owned', impact: 'Very High (+90-100)' },
      { label: 'FSBO + Price Reductions', impact: 'High (+70-85)' },
      { label: 'High Days on Market (90+)', impact: 'Medium (+50-70)' },
      { label: 'Standard Listing', impact: 'Low (+40-50)' },
      { label: 'Off-Market', impact: 'Minimal (+25-35)' },
    ],
    marketModifier: {
      cold: '+15 (Buyer\'s market - sellers more motivated)',
      warm: '+0 (Balanced market)',
      hot: '-15 (Seller\'s market - sellers less motivated)',
    },
  },
] as const

const SCORE_FORMULA = {
  title: 'How the Score is Calculated',
  steps: [
    'Motivation Score determines Max Achievable Discount (0-25%)',
    'Compare your Deal Gap to the Max Achievable Discount',
    'Score = Probability of successfully negotiating the gap',
  ],
  example: 'If Motivation = 80 → Max Discount ≈ 20%. If your Deal Gap is 10%, that\'s easily achievable = High Score (A+)',
}

// =============================================================================
// GRADE TIERS
// =============================================================================
const GRADE_TIERS = [
  { grade: 'A+', range: '90-100', label: 'Strong Buy', color: '#22c55e', meaning: 'Deal Gap easily achievable' },
  { grade: 'A', range: '80-89', label: 'Good Buy', color: '#22c55e', meaning: 'Deal Gap likely achievable' },
  { grade: 'B', range: '65-79', label: 'Moderate', color: '#84cc16', meaning: 'Negotiation required' },
  { grade: 'C', range: '50-64', label: 'Stretch', color: '#f97316', meaning: 'Aggressive discount needed' },
  { grade: 'D', range: '30-49', label: 'Unlikely', color: '#f97316', meaning: 'Deal Gap probably too large' },
  { grade: 'F', range: '0-29', label: 'Pass', color: '#ef4444', meaning: 'Discount unrealistic' },
]

// =============================================================================
// DATA SOURCES
// =============================================================================
const DATA_SOURCES = [
  { name: 'Zillow API', description: 'Property values, rent estimates', icon: Home },
  { name: 'County Records', description: 'Property taxes, ownership history', icon: Database },
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
        return 'How IQ Verdict Works'
      case 'strategy':
        return 'Strategy Score Breakdown'
      default:
        return 'How We Calculate Profit Quality'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl animate-slide-up"
        style={{ backgroundColor: COLORS.surface50 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: COLORS.surface300 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b" style={{ borderColor: COLORS.surface200 }}>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.teal}15` }}
            >
              <Info className="w-5 h-5" style={{ color: COLORS.teal }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: COLORS.navy }}>
                {getTitle()}
              </h2>
              {currentScore !== undefined && (
                <p className="text-sm" style={{ color: COLORS.surface500 }}>
                  Your current score: <span className="font-semibold" style={{ color: COLORS.teal }}>{currentScore}</span>
                  {currentGrade && <span className="ml-1">({currentGrade})</span>}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: COLORS.surface500 }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-100px)] px-5 py-4 space-y-6">
          {/* Core Concept */}
          <section>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: `${COLORS.teal}10`, border: `1px solid ${COLORS.teal}30` }}
            >
              <p className="text-sm font-medium text-center" style={{ color: COLORS.navy }}>
                The IQ Verdict Score answers:
              </p>
              <p className="text-base font-bold text-center mt-1" style={{ color: COLORS.teal }}>
                "How likely can you negotiate the required discount?"
              </p>
            </div>
          </section>

          {/* Deal Gap Section */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              1. Deal Gap %
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${COLORS.teal}10` }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: COLORS.teal }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                    {METHODOLOGY_SECTIONS[0].description}
                  </p>
                </div>
              </div>
              <div 
                className="p-3 rounded-lg mb-3"
                style={{ backgroundColor: COLORS.surface50 }}
              >
                <p className="text-xs font-mono font-medium text-center" style={{ color: COLORS.navy }}>
                  {METHODOLOGY_SECTIONS[0].formula}
                </p>
              </div>
              <p className="text-xs" style={{ color: COLORS.surface500 }}>
                {METHODOLOGY_SECTIONS[0].explanation}
              </p>
              <p className="text-[11px] mt-2 italic" style={{ color: COLORS.surface400 }}>
                {METHODOLOGY_SECTIONS[0].note}
              </p>
            </div>
          </section>

          {/* Motivation Section */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              2. Motivation Score
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${COLORS.teal}10` }}
                >
                  <Target className="w-4 h-4" style={{ color: COLORS.teal }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                    {METHODOLOGY_SECTIONS[1].description}
                  </p>
                </div>
              </div>
              
              {/* Seller Signals */}
              <p className="text-xs font-semibold mb-2" style={{ color: COLORS.surface600 }}>
                Seller Signals:
              </p>
              <div className="space-y-1.5 mb-4">
                {METHODOLOGY_SECTIONS[1].components.map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span style={{ color: COLORS.surface500 }}>{comp.label}</span>
                    <span className="font-medium" style={{ color: COLORS.navy }}>{comp.impact}</span>
                  </div>
                ))}
              </div>

              {/* Market Temperature */}
              <p className="text-xs font-semibold mb-2" style={{ color: COLORS.surface600 }}>
                Market Condition Modifier:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: COLORS.surface500 }}>Cold Market</span>
                  <span className="font-medium" style={{ color: COLORS.green }}>+15</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: COLORS.surface500 }}>Warm Market</span>
                  <span className="font-medium" style={{ color: COLORS.surface500 }}>+0</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: COLORS.surface500 }}>Hot Market</span>
                  <span className="font-medium" style={{ color: COLORS.rose }}>-15</span>
                </div>
              </div>
            </div>
          </section>

          {/* How Score is Calculated */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              3. Score Calculation
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
            >
              <div className="space-y-2 mb-3">
                {SCORE_FORMULA.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span 
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                      style={{ backgroundColor: `${COLORS.teal}15`, color: COLORS.teal }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs" style={{ color: COLORS.surface600 }}>{step}</span>
                  </div>
                ))}
              </div>
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${COLORS.green}08`, border: `1px solid ${COLORS.green}20` }}
              >
                <p className="text-xs" style={{ color: COLORS.surface600 }}>
                  <span className="font-semibold">Example: </span>
                  {SCORE_FORMULA.example}
                </p>
              </div>
            </div>
          </section>

          {/* Grade Tiers */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              Score Interpretation
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
            >
              <div className="grid grid-cols-3 gap-2">
                {GRADE_TIERS.map((tier) => (
                  <div 
                    key={tier.grade}
                    className="text-center p-2 rounded-lg"
                    style={{ backgroundColor: `${tier.color}10` }}
                  >
                    <div 
                      className="text-lg font-bold"
                      style={{ color: tier.color }}
                    >
                      {tier.grade}
                    </div>
                    <div className="text-[10px] font-medium" style={{ color: COLORS.surface500 }}>
                      {tier.range}
                    </div>
                    <div className="text-[10px] font-semibold" style={{ color: tier.color }}>
                      {tier.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              Data Sources
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
            >
              <div className="grid grid-cols-2 gap-3">
                {DATA_SOURCES.map((source) => {
                  const Icon = source.icon
                  return (
                    <div key={source.name} className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: COLORS.teal }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: COLORS.navy }}>
                          {source.name}
                        </div>
                        <div className="text-[10px]" style={{ color: COLORS.surface400 }}>
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
            <div className="flex items-center justify-center gap-2 pt-2">
              <Clock className="w-3 h-3" style={{ color: COLORS.surface400 }} />
              <span className="text-xs" style={{ color: COLORS.surface400 }}>
                Score updated: {lastUpdated}
              </span>
            </div>
          )}

          {/* Bottom padding for safe area */}
          <div className="h-6" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

export default ScoreMethodologySheet
