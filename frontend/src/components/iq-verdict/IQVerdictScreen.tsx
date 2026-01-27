'use client'

/**
 * IQVerdictScreen - Redesigned IQ Verdict page
 * Exact implementation from design files (v2)
 * 
 * Design specs:
 * - Max width: 480px centered
 * - Background: #F1F5F9
 * - Font: Inter
 * - Dark property header banner
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, ArrowRight, Download } from 'lucide-react'
import {
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
  scoreToGradeLabel,
} from './types'
import { OpportunityFactors } from './OpportunityFactors'

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
}

// =============================================================================
// COMPONENT
// =============================================================================
export function IQVerdictScreen({
  property,
  analysis,
  onViewStrategy,
  onCompareAll,
}: IQVerdictScreenProps) {
  const [showFactors, setShowFactors] = useState(false)
  const topStrategy = analysis.strategies.reduce((best, s) => s.score > best.score ? s : best, analysis.strategies[0])
  
  // Build full address
  const fullAddress = [
    property.address,
    property.city,
    [property.state, property.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ')
  
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
      className="min-h-screen"
      style={{ 
        background: COLORS.surface100,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Property Card - Dark Header Style (Full Width Background) */}
      <div 
        style={{ 
          background: COLORS.navy,
          width: '100%',
        }}
      >
        <div 
          className="max-w-[480px] mx-auto"
          style={{ padding: '16px 20px 20px' }}
        >
          <div className="flex gap-4">
            {/* Left: Property Image */}
            <div 
              className="w-[88px] h-[88px] rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ 
                background: '#1E293B',
                border: '2px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {property.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={property.imageUrl} 
                  alt={property.address}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke={COLORS.cyan} strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                  </svg>
                  <div className="text-[10px] font-medium" style={{ color: COLORS.surface400 }}>HOUSE</div>
                  <div className="text-[10px] font-medium" style={{ color: COLORS.surface400 }}>PHOTO</div>
                </div>
              )}
            </div>
            
            {/* Middle: Address & Details */}
            <div className="flex-1 flex flex-col justify-center">
              <div 
                className="text-lg font-bold mb-0.5"
                style={{ color: 'white' }}
              >
                {property.address}
              </div>
              <div 
                className="text-[15px] font-semibold mb-2"
                style={{ color: COLORS.tealLight }}
              >
                {[property.city, [property.state, property.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
              </div>
              <div 
                className="text-[13px]"
                style={{ color: 'white' }}
              >
                {property.beds} bd · {property.baths} ba · {property.sqft?.toLocaleString() || '—'} sqft
              </div>
            </div>
            
            {/* Right: Est. Value & Badge */}
            <div className="flex flex-col items-end justify-between flex-shrink-0">
              <div className="text-right">
                <div 
                  className="text-xl font-bold tabular-nums"
                  style={{ color: COLORS.cyan }}
                >
                  {formatPrice(estValue)}
                </div>
                <div 
                  className="text-[11px] italic"
                  style={{ color: COLORS.surface400 }}
                >
                  Est. Value
                </div>
              </div>
              <div 
                className="text-[10px] font-bold tracking-wider px-3 py-1"
                style={{ 
                  color: COLORS.surface400,
                  letterSpacing: '0.08em',
                }}
              >
                OFF-MARKET
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Max 480px centered */}
      <main className="max-w-[480px] mx-auto">
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
                  style={{ color: COLORS.surface400 }}
                >
                  View Factors
                  {showFactors ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
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
            
            {/* Factors (expandable) */}
            {showFactors && (
              <div className="mb-4 p-4 rounded-lg" style={{ background: COLORS.surface50 }}>
                <OpportunityFactors factors={opportunityFactors} />
              </div>
            )}
            
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
