'use client'

/**
 * IQVerdictScreen - Redesigned IQ Verdict page
 * Exact implementation from design files (v2)
 * 
 * Design specs:
 * - Max width: 480px centered
 * - Background: #F1F5F9
 * - Font: Inter
 * - Uses new CompactHeader design
 */

import React, { useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, ArrowRight, Download } from 'lucide-react'
import {
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
  scoreToGradeLabel,
} from './types'
import { OpportunityFactors } from './OpportunityFactors'
import { CompactHeader, PropertyData, NavItemId, Strategy } from '../layout/CompactHeader'

// =============================================================================
// BRAND COLORS - From design files
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
// HELPER FUNCTIONS
// =============================================================================
const getReturnColor = (value: number): string => {
  if (value >= 50) return COLORS.green
  if (value > 0) return COLORS.teal
  return COLORS.rose
}

const getGradeColor = (grade: string): string => {
  if (grade.includes('A')) return COLORS.green
  if (grade.includes('B')) return COLORS.teal
  if (grade.includes('C')) return COLORS.warning
  return COLORS.rose
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return COLORS.green
  if (score >= 50) return COLORS.teal
  if (score >= 30) return COLORS.warning
  return COLORS.rose
}

// =============================================================================
// PROPS
// =============================================================================
interface IQVerdictScreenProps {
  property: IQProperty
  analysis: IQAnalysisResult
  onViewStrategy: (strategy: IQStrategy) => void
  onCompareAll: () => void
  onNavChange?: (navId: NavItemId) => void
  isDark?: boolean
}

// Default strategies for the dropdown
const HEADER_STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
]

// Mapping from display name to IQStrategy ID
const STRATEGY_ID_MAP: Record<string, string> = {
  'Long-term': 'long-term-rental',
  'Short-term': 'short-term-rental',
  'BRRRR': 'brrrr',
  'Fix & Flip': 'fix-and-flip',
  'House Hack': 'house-hack',
  'Wholesale': 'wholesale',
}

// =============================================================================
// COMPONENT
// =============================================================================
export function IQVerdictScreen({
  property,
  analysis,
  onViewStrategy,
  onCompareAll,
  onNavChange,
  isDark = false,
}: IQVerdictScreenProps) {
  const [showFactors, setShowFactors] = useState(true)
  const [currentStrategy, setCurrentStrategy] = useState<string>(HEADER_STRATEGIES[0].short)
  const topStrategy = analysis.strategies.reduce((best, s) => s.score > best.score ? s : best, analysis.strategies[0])
  
  // Build property data for CompactHeader
  const headerPropertyData: PropertyData = useMemo(() => ({
    address: property.address,
    city: property.city || '',
    state: property.state || '',
    zip: property.zip || '',
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft || 0,
    price: property.price,
    rent: property.monthlyRent || Math.round(property.price * 0.007),
    status: 'OFF-MARKET',
    image: property.imageUrl,
  }), [property])

  // Handle strategy change from header dropdown
  const handleHeaderStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy)
    // Find matching IQStrategy and trigger navigation
    const strategyId = STRATEGY_ID_MAP[strategy]
    const matchingStrategy = analysis.strategies.find(s => s.id === strategyId)
    if (matchingStrategy) {
      onViewStrategy(matchingStrategy)
    }
  }, [analysis.strategies, onViewStrategy])

  // Handle navigation from header
  const handleNavChange = useCallback((navId: NavItemId) => {
    if (onNavChange) {
      onNavChange(navId)
    }
  }, [onNavChange])
  
  // Calculate prices
  const breakevenPrice = analysis.breakevenPrice || Math.round(property.price * 1.1)
  const buyPrice = analysis.purchasePrice || Math.round(breakevenPrice * 0.95)
  const wholesalePrice = Math.round(breakevenPrice * 0.70)
  const estValue = analysis.listPrice || property.price
  
  // Default opportunity factors
  const opportunityFactors = analysis.opportunityFactors || {
    dealGap: analysis.discountPercent || 0,
    motivation: 50,
    motivationLabel: 'Medium',
    daysOnMarket: null,
    buyerMarket: null,
    distressedSale: false,
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        background: COLORS.surface100,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* New Compact Header */}
      <CompactHeader
        property={headerPropertyData}
        activeNav="analysis"
        currentStrategy={currentStrategy}
        pageTitle="VERDICT"
        pageTitleAccent="IQ"
        onNavChange={handleNavChange}
        onStrategyChange={handleHeaderStrategyChange}
        defaultPropertyOpen={true}
      />

      {/* Main Content - Max 480px centered */}
      <main className="max-w-[480px] mx-auto flex-1 w-full">
        {/* Content Area with padding */}
        <div className="p-4">
          {/* IQ Verdict Card */}
          <div 
            className="rounded-2xl p-6 mb-4"
            style={{ 
              background: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Verdict Header - Score LEFT, Prices RIGHT */}
            <div className="flex gap-4 items-stretch mb-5">
              {/* Score Container - 35% */}
              <div className="flex flex-col items-center justify-center" style={{ flex: '35' }}>
                <div 
                  className="text-[10px] font-bold tracking-widest mb-2"
                  style={{ color: COLORS.teal, letterSpacing: '0.1em' }}
                >
                  IQ VERDICT
                </div>
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
                  style={{ 
                    border: `4px solid ${getScoreColor(analysis.dealScore)}`,
                    background: `${getScoreColor(analysis.dealScore)}14`,
                  }}
                >
                  <span 
                    className="text-[28px] font-extrabold"
                    style={{ color: getScoreColor(analysis.dealScore) }}
                  >
                    {analysis.dealScore}
                  </span>
                </div>
                <button
                  onClick={() => setShowFactors(!showFactors)}
                  className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80"
                  style={{ color: COLORS.teal }}
                >
                  View Factors
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              
              {/* Prices - 65% */}
              <div className="flex flex-col gap-3 justify-center" style={{ flex: '65' }}>
                {/* Breakeven */}
                <div className="flex items-center justify-end gap-4">
                  <span 
                    className="text-[13px]"
                    style={{ color: COLORS.surface500 }}
                  >
                    Breakeven
                  </span>
                  <span 
                    className="text-base font-bold tabular-nums"
                    style={{ color: COLORS.navy }}
                  >
                    {formatPrice(breakevenPrice)}
                  </span>
                </div>
                
                {/* Buy Price - Highlighted */}
                <div className="flex items-center justify-end gap-4">
                  <span 
                    className="text-[13px] font-semibold"
                    style={{ color: COLORS.teal }}
                  >
                    Buy Price
                  </span>
                  <span 
                    className="text-base font-bold tabular-nums"
                    style={{ color: COLORS.teal }}
                  >
                    {formatPrice(buyPrice)}
                  </span>
                </div>
                
                {/* Wholesale */}
                <div className="flex items-center justify-end gap-4">
                  <span 
                    className="text-[13px]"
                    style={{ color: COLORS.surface500 }}
                  >
                    Wholesale
                  </span>
                  <span 
                    className="text-base font-bold tabular-nums"
                    style={{ color: COLORS.navy }}
                  >
                    {formatPrice(wholesalePrice)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Verdict Description */}
            <div 
              className="text-sm text-center leading-relaxed pt-4"
              style={{ 
                color: COLORS.surface500,
                borderTop: `1px solid ${COLORS.surface100}`,
              }}
            >
              {analysis.verdictDescription?.split(topStrategy.name).map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <strong style={{ color: COLORS.teal, fontWeight: 600 }}>
                      {topStrategy.name}
                    </strong>
                  )}
                </React.Fragment>
              )) || 'Excellent potential across multiple strategies.'}
            </div>
          </div>

          {/* Factors Accordion - Full Width */}
          <div 
            className="rounded-2xl p-4 mb-4 cursor-pointer transition-colors hover:bg-opacity-95"
            style={{ 
              background: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
            onClick={() => setShowFactors(!showFactors)}
          >
            <div className="flex items-center justify-between mb-3">
              <span 
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: COLORS.navy }}
              >
                Opportunity Factors
              </span>
              <div 
                className="flex items-center gap-1 text-xs"
                style={{ color: COLORS.surface400 }}
              >
                {showFactors ? 'Hide' : 'Show'}
                {showFactors ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
            {showFactors && (
              <div onClick={(e) => e.stopPropagation()}>
                <OpportunityFactors factors={opportunityFactors} />
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="mb-5">
            <button
              onClick={() => onViewStrategy(topStrategy)}
              className="w-full p-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 mb-3 transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: COLORS.teal }}
            >
              Continue to Analysis
              <ArrowRight className="w-5 h-5" />
            </button>
            <div 
              className="text-center text-[13px] italic"
              style={{ color: COLORS.surface400 }}
            >
              or
            </div>
            <div 
              className="text-center text-[15px] font-semibold mt-1"
              style={{ color: COLORS.navy }}
            >
              Select a Strategy
            </div>
          </div>

          {/* Strategy List */}
          <div className="mb-5">
            {analysis.strategies.map((strategy) => {
              const isTopPick = strategy.id === topStrategy.id && strategy.score >= 70
              const gradeDisplay = scoreToGradeLabel(strategy.score)
              const metricValue = strategy.metricValue
              
              return (
                <button
                  key={strategy.id}
                  onClick={() => onViewStrategy(strategy)}
                  className="w-full rounded-xl mb-2 cursor-pointer transition-shadow hover:shadow-md"
                  style={{ 
                    background: 'white',
                    boxShadow: isTopPick 
                      ? `0 0 0 2px ${COLORS.green}` 
                      : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div className="flex items-center gap-3 p-3.5">
                    {/* Strategy Info */}
                    <div className="flex-1 flex items-center gap-2 text-left">
                      <span 
                        className="text-[15px] font-semibold"
                        style={{ color: COLORS.navy }}
                      >
                        {strategy.name}
                      </span>
                      {strategy.type && (
                        <span 
                          className="text-xs"
                          style={{ color: COLORS.surface400 }}
                        >
                          {strategy.type}
                        </span>
                      )}
                      {strategy.badge && (
                        <span 
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ 
                            letterSpacing: '0.03em',
                            background: strategy.badge === 'Strong' 
                              ? `${COLORS.green}1F` 
                              : `${COLORS.teal}1F`,
                            color: strategy.badge === 'Strong' 
                              ? COLORS.green 
                              : COLORS.teal,
                          }}
                        >
                          {strategy.badge}
                        </span>
                      )}
                    </div>
                    
                    {/* Metrics */}
                    <div className="text-right flex-shrink-0">
                      <div 
                        className="text-base font-bold tabular-nums"
                        style={{ color: getReturnColor(metricValue) }}
                      >
                        {strategy.metric}
                      </div>
                      <div 
                        className="text-[10px] font-semibold uppercase"
                        style={{ 
                          letterSpacing: '0.03em',
                          color: getGradeColor(gradeDisplay.grade),
                        }}
                      >
                        {gradeDisplay.label} {gradeDisplay.grade}
                      </div>
                    </div>
                    
                    {/* Chevron */}
                    <ChevronRight 
                      className="w-5 h-5 flex-shrink-0" 
                      style={{ color: COLORS.surface300 }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Export Link */}
          <button 
            className="flex items-center gap-2 text-sm py-3 cursor-pointer hover:opacity-80"
            style={{ color: COLORS.surface500 }}
          >
            <Download className="w-[18px] h-[18px]" />
            Export PDF Report
          </button>
        </div>
      </main>
    </div>
  )
}

export default IQVerdictScreen
