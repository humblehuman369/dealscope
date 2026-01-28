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
// SCORING FACTORS
// =============================================================================
const SCORING_FACTORS = [
  {
    name: 'Cap Rate',
    weight: 20,
    description: 'Net operating income relative to property value',
    icon: Percent,
    thresholds: '≥8% = Full points, ≥5% = Half points',
  },
  {
    name: 'Cash-on-Cash',
    weight: 25,
    description: 'Annual cash flow relative to cash invested',
    icon: TrendingUp,
    thresholds: '≥10% = Full points, ≥5% = Half points',
  },
  {
    name: 'DSCR',
    weight: 20,
    description: 'Debt Service Coverage Ratio - ability to cover mortgage',
    icon: Shield,
    thresholds: '≥1.25 = Full points, ≥1.0 = Half points',
  },
  {
    name: 'Expense Ratio',
    weight: 15,
    description: 'Operating expenses as percentage of income',
    icon: BarChart3,
    thresholds: '≤40% = Full points, ≤50% = Half points',
  },
  {
    name: 'Equity Capture',
    weight: 20,
    description: 'Discount from market value creating instant equity',
    icon: Target,
    thresholds: '≥10% = Full points, ≥5% = Half points',
  },
]

// =============================================================================
// GRADE TIERS
// =============================================================================
const GRADE_TIERS = [
  { grade: 'A+', range: '85-100', label: 'Exceptional', color: '#22c55e' },
  { grade: 'A', range: '70-84', label: 'Excellent', color: '#22c55e' },
  { grade: 'B', range: '55-69', label: 'Good', color: '#84cc16' },
  { grade: 'C', range: '40-54', label: 'Fair', color: '#f97316' },
  { grade: 'D', range: '25-39', label: 'Below Average', color: '#f97316' },
  { grade: 'F', range: '0-24', label: 'Poor', color: '#ef4444' },
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
          {/* Scoring Factors */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              Scoring Factors
            </h3>
            <div className="space-y-3">
              {SCORING_FACTORS.map((factor) => {
                const Icon = factor.icon
                return (
                  <div 
                    key={factor.name}
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${COLORS.teal}10` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: COLORS.teal }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold" style={{ color: COLORS.navy }}>
                            {factor.name}
                          </span>
                          <span 
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${COLORS.teal}15`, color: COLORS.teal }}
                          >
                            {factor.weight}%
                          </span>
                        </div>
                        <p className="text-xs mb-1" style={{ color: COLORS.surface500 }}>
                          {factor.description}
                        </p>
                        <p className="text-[11px]" style={{ color: COLORS.surface400 }}>
                          {factor.thresholds}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Grade Tiers */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: COLORS.teal }}>
              Grade Scale
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
                    <div className="text-[10px]" style={{ color: COLORS.surface400 }}>
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
