'use client'

/**
 * IQVerdictScreen - Redesigned IQ Verdict page
 * 
 * Core Value Proposition:
 * "Every property can be a good investment at the right price."
 * 
 * InvestIQ tells you:
 * 1. WHAT PRICE MAKES THIS DEAL WORK (Breakeven) - based on YOUR financing terms
 * 2. HOW LIKELY YOU ARE TO GET THAT PRICE (Deal Gap + Motivation) - based on market signals
 * 
 * Design specs:
 * - Max width: 480px centered
 * - Background: #F1F5F9
 * - Font: Inter
 * - Uses new CompactHeader design
 */

import React, { useState, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, ArrowRight, Download, Info, HelpCircle, Settings2, TrendingDown, Target, AlertCircle } from 'lucide-react'
import { useDefaults } from '@/hooks/useDefaults'
import {
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
  scoreToGradeLabel,
  SellerMotivationData,
} from './types'
import { OpportunityFactors } from './OpportunityFactors'
import { CompactHeader, PropertyData, Strategy } from '../layout/CompactHeader'
import { ScoreMethodologySheet } from './ScoreMethodologySheet'

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

// Get verdict label based on score tier
// Score represents probability of achieving the required Deal Gap
const getVerdictLabel = (score: number, city?: string): { label: string; sublabel: string } => {
  if (score >= 90) return { label: 'Strong Buy', sublabel: 'Deal Gap easily achievable' }
  if (score >= 80) return { label: 'Good Buy', sublabel: 'Deal Gap likely achievable' }
  if (score >= 65) return { label: 'Moderate', sublabel: 'Negotiation required' }
  if (score >= 50) return { label: 'Stretch', sublabel: 'Aggressive discount needed' }
  if (score >= 30) return { label: 'Unlikely', sublabel: 'Deal Gap probably too large' }
  return { label: 'Pass', sublabel: 'Discount unrealistic' }
}

// Price point explanations - now includes YOUR terms messaging
const PRICE_EXPLANATIONS = {
  breakeven: 'Maximum price with $0 cash flow, based on YOUR financing terms (down payment, rate, vacancy, etc.). Calculated using LTR (rental) revenue model.',
  buyPrice: 'Recommended offer for positive cash flow — 5% below your breakeven',
  wholesale: 'Maximum price for assignment to another investor (70% of breakeven)',
}

// Get Deal Gap color and label based on percentage
const getDealGapDisplay = (gap: number, isOffMarket: boolean): { color: string; label: string; emoji: string } => {
  if (isOffMarket) {
    // For off-market, we're comparing to AVM, so interpretation is different
    if (gap <= 0) return { color: COLORS.rose, label: 'Above Market', emoji: '⚠️' }
    if (gap <= 5) return { color: COLORS.warning, label: 'At Market', emoji: '➡️' }
    if (gap <= 10) return { color: COLORS.teal, label: 'Below Market', emoji: '✓' }
    if (gap <= 20) return { color: COLORS.green, label: 'Good Discount', emoji: '✓✓' }
    return { color: COLORS.green, label: 'Deep Value', emoji: '🎯' }
  }
  
  // For listed properties
  if (gap <= 0) return { color: COLORS.rose, label: 'No Discount Needed', emoji: '✓' }
  if (gap <= 5) return { color: COLORS.green, label: 'Easy Target', emoji: '✓' }
  if (gap <= 10) return { color: COLORS.teal, label: 'Achievable', emoji: '➡️' }
  if (gap <= 20) return { color: COLORS.warning, label: 'Challenging', emoji: '⚠️' }
  return { color: COLORS.rose, label: 'Difficult', emoji: '⚠️⚠️' }
}

// Get Seller Motivation color
const getMotivationColor = (score: number): string => {
  if (score >= 70) return COLORS.green
  if (score >= 40) return COLORS.warning
  return COLORS.rose
}

// Get opening offer suggestion based on motivation
const getSuggestedOffer = (motivation: number, dealGap: number): { min: number; max: number } => {
  // Higher motivation = can ask for bigger discount
  if (motivation >= 70) return { min: 15, max: 25 }
  if (motivation >= 50) return { min: 10, max: 18 }
  if (motivation >= 30) return { min: 5, max: 12 }
  return { min: 3, max: 8 }
}

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
  isDark = false,
}: IQVerdictScreenProps) {
  const [showFactors, setShowFactors] = useState(true)
  const [showMethodology, setShowMethodology] = useState(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [activePriceTooltip, setActivePriceTooltip] = useState<string | null>(null)
  const [currentStrategy, setCurrentStrategy] = useState<string>(HEADER_STRATEGIES[0].short)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const topStrategy = analysis.strategies.reduce((best, s) => s.score > best.score ? s : best, analysis.strategies[0])
  
  // Get user's default assumptions (for displaying what terms breakeven is based on)
  const { defaults, hasUserCustomizations } = useDefaults(property.zip)
  
  // Get verdict label and sublabel with city-specific context
  const verdictInfo = getVerdictLabel(analysis.dealScore, property.city)
  
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
    zpid: property.zpid?.toString(),
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

  // Determine if property is off-market (no asking price)
  const isOffMarket = !property.listingStatus || 
    property.listingStatus === 'OFF_MARKET' || 
    property.listingStatus === 'SOLD' ||
    property.listingStatus === 'FOR_RENT'
  
  // Use AVM (Zestimate) for off-market properties, otherwise use listing price
  const marketValue = isOffMarket 
    ? (property.zestimate || property.price) 
    : property.price
  const priceSource = isOffMarket 
    ? (property.zestimate ? 'Zestimate' : 'Market Estimate')
    : 'Asking Price'

  // Calculate prices
  const breakevenPrice = analysis.breakevenPrice || Math.round(marketValue * 1.1)
  const buyPrice = analysis.purchasePrice || Math.round(breakevenPrice * 0.95)
  const wholesalePrice = Math.round(breakevenPrice * 0.70)
  const estValue = analysis.listPrice || marketValue
  
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
      className="min-h-screen flex flex-col max-w-[480px] mx-auto"
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
        onStrategyChange={handleHeaderStrategyChange}
        defaultPropertyOpen={true}
      />

      {/* Main Content */}
      <main className="flex-1 w-full">
        {/* Content Area */}
        <div>
          {/* YOUR INVESTMENT ANALYSIS - Main Header */}
          <div 
            className="p-4 border-b border-[#CBD5E1]"
            style={{ 
              background: 'white',
            }}
          >
            {/* Header with financing terms context */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: COLORS.navy }}>
                  YOUR INVESTMENT ANALYSIS
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: COLORS.surface500 }}>
                  Based on YOUR financing terms ({(defaults?.financing?.down_payment_pct ?? 0.20) * 100}% down, {((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%)
                </p>
              </div>
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="text-[11px] font-medium px-2 py-1 rounded-md hover:opacity-80"
                style={{ color: COLORS.teal, backgroundColor: `${COLORS.teal}10` }}
              >
                Change terms
              </button>
            </div>

            {/* SECTION 1: What Price Makes This Deal Work? */}
            <div 
              className="rounded-xl p-4 mb-4"
              style={{ backgroundColor: COLORS.surface50, border: `1px solid ${COLORS.surface200}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: COLORS.teal }}>
                WHAT PRICE MAKES THIS DEAL WORK?
              </h3>
              
              {/* Off-Market Notice */}
              {isOffMarket && (
                <div 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-[11px]"
                  style={{ backgroundColor: `${COLORS.warning}12`, border: `1px solid ${COLORS.warning}30` }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.warning }} />
                  <span style={{ color: COLORS.surface600 }}>
                    <strong style={{ color: COLORS.warning }}>Off-Market Property:</strong> No asking price available. 
                    Using {priceSource} of {formatPrice(marketValue)} for Deal Gap calculation.
                  </span>
                </div>
              )}
              
              {/* Three Price Cards */}
              <div className="grid grid-cols-3 gap-2">
                {/* Breakeven Price */}
                <div 
                  className="rounded-lg p-3 text-center relative"
                  style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.surface500 }}>
                    BREAKEVEN
                  </div>
                  <div className="text-[15px] font-bold mb-1" style={{ color: COLORS.navy }}>
                    {formatPrice(breakevenPrice)}
                  </div>
                  <div className="text-[9px] leading-tight" style={{ color: COLORS.surface400 }}>
                    Max price for $0 cashflow (LTR model)
                  </div>
                  <button
                    onClick={() => setActivePriceTooltip(activePriceTooltip === 'breakeven' ? null : 'breakeven')}
                    className="absolute top-2 right-2"
                  >
                    <HelpCircle className="w-3 h-3" style={{ color: COLORS.surface300 }} />
                  </button>
                  {activePriceTooltip === 'breakeven' && (
                    <div 
                      className="absolute left-0 right-0 top-full mt-1 z-10 p-2 rounded-lg shadow-lg text-[10px] text-left"
                      style={{ backgroundColor: COLORS.navy, color: 'white' }}
                    >
                      {PRICE_EXPLANATIONS.breakeven}
                    </div>
                  )}
                </div>
                
                {/* Target Buy Price - Highlighted */}
                <div 
                  className="rounded-lg p-3 text-center relative"
                  style={{ 
                    backgroundColor: `${COLORS.teal}08`, 
                    border: `2px solid ${COLORS.teal}`,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: COLORS.teal }}>
                    TARGET BUY
                  </div>
                  <div className="text-[15px] font-bold mb-1" style={{ color: COLORS.teal }}>
                    {formatPrice(buyPrice)}
                  </div>
                  <div className="text-[9px] leading-tight" style={{ color: COLORS.surface500 }}>
                    5% discount for profit
                  </div>
                  <button
                    onClick={() => setActivePriceTooltip(activePriceTooltip === 'buyPrice' ? null : 'buyPrice')}
                    className="absolute top-2 right-2"
                  >
                    <HelpCircle className="w-3 h-3" style={{ color: COLORS.teal }} />
                  </button>
                  {activePriceTooltip === 'buyPrice' && (
                    <div 
                      className="absolute left-0 right-0 top-full mt-1 z-10 p-2 rounded-lg shadow-lg text-[10px] text-left"
                      style={{ backgroundColor: COLORS.navy, color: 'white' }}
                    >
                      {PRICE_EXPLANATIONS.buyPrice}
                    </div>
                  )}
                </div>
                
                {/* Wholesale Price */}
                <div 
                  className="rounded-lg p-3 text-center relative"
                  style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.surface500 }}>
                    WHOLESALE
                  </div>
                  <div className="text-[15px] font-bold mb-1" style={{ color: COLORS.navy }}>
                    {formatPrice(wholesalePrice)}
                  </div>
                  <div className="text-[9px] leading-tight" style={{ color: COLORS.surface400 }}>
                    30% discount for assignment
                  </div>
                  <button
                    onClick={() => setActivePriceTooltip(activePriceTooltip === 'wholesale' ? null : 'wholesale')}
                    className="absolute top-2 right-2"
                  >
                    <HelpCircle className="w-3 h-3" style={{ color: COLORS.surface300 }} />
                  </button>
                  {activePriceTooltip === 'wholesale' && (
                    <div 
                      className="absolute left-0 right-0 top-full mt-1 z-10 p-2 rounded-lg shadow-lg text-[10px] text-left"
                      style={{ backgroundColor: COLORS.navy, color: 'white' }}
                    >
                      {PRICE_EXPLANATIONS.wholesale}
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Assumptions Panel */}
              <button
                onClick={() => setShowAssumptions(!showAssumptions)}
                className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-[11px] font-medium hover:opacity-80"
                style={{ color: COLORS.teal }}
              >
                {showAssumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                See how we calculated this
              </button>
              
              {showAssumptions && (
                <div 
                  className="mt-3 pt-3 space-y-3"
                  style={{ borderTop: `1px solid ${COLORS.surface200}` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLORS.surface600 }}>
                      YOUR ASSUMPTIONS
                    </span>
                    <a 
                      href="/dashboard?tab=profile" 
                      className="flex items-center gap-1 text-[10px] font-medium hover:opacity-80"
                      style={{ color: COLORS.teal }}
                    >
                      <Settings2 className="w-3 h-3" />
                      Edit in Dashboard
                    </a>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Financing Column */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.surface400 }}>
                        FINANCING
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Down Payment</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.financing?.down_payment_pct ?? 0.20) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Interest Rate</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Loan Term</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {defaults?.financing?.loan_term_years ?? 30} years
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Closing Costs</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.financing?.closing_costs_pct ?? 0.03) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expenses Column */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.surface400 }}>
                        EXPENSES
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Vacancy</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.operating?.vacancy_rate ?? 0.01) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Management</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.operating?.property_management_pct ?? 0) * 100).toFixed(0)}% {(defaults?.operating?.property_management_pct ?? 0) === 0 ? '(self)' : ''}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Maintenance</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.operating?.maintenance_pct ?? 0.05) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.surface500 }}>Insurance</span>
                          <span className="font-medium" style={{ color: COLORS.navy }}>
                            {((defaults?.operating?.insurance_pct ?? 0.01) * 100).toFixed(0)}% of value
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Income Source */}
                  <div 
                    className="pt-3 mt-2"
                    style={{ borderTop: `1px solid ${COLORS.surface200}` }}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: COLORS.surface400 }}>
                      INCOME
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: COLORS.surface500 }}>Estimated Rent</span>
                      <span className="font-medium" style={{ color: COLORS.navy }}>
                        ${property.monthlyRent?.toLocaleString() || Math.round(property.price * 0.007).toLocaleString()}/mo
                        <span className="text-[9px] ml-1" style={{ color: COLORS.surface400 }}>(from rental comps)</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    {hasUserCustomizations ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${COLORS.green}20`, color: COLORS.green }}>
                        Using your customized defaults
                      </span>
                    ) : (
                      <span className="text-[10px]" style={{ color: COLORS.surface400 }}>
                        Using system defaults
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: How Likely Can You Get This Price? */}
            <div 
              className="rounded-xl p-4"
              style={{ backgroundColor: COLORS.surface50, border: `1px solid ${COLORS.surface200}` }}
            >
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: COLORS.teal }}>
                HOW LIKELY CAN YOU GET THIS PRICE?
              </h3>
              
              {/* Deal Gap + Motivation Combined Display */}
              <div 
                className="rounded-lg p-4"
                style={{ backgroundColor: 'white', border: `1px solid ${COLORS.surface200}` }}
              >
                {/* Deal Gap Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" style={{ color: COLORS.surface400 }} />
                    <span className="text-[13px] font-semibold" style={{ color: COLORS.navy }}>Deal Gap</span>
                  </div>
                  <span 
                    className="text-[15px] font-bold"
                    style={{ color: getDealGapDisplay(opportunityFactors.dealGap, isOffMarket).color }}
                  >
                    {opportunityFactors.dealGap > 0 ? '-' : '+'}{Math.abs(opportunityFactors.dealGap).toFixed(1)}%
                  </span>
                </div>
                
                {/* Gap Explanation */}
                <div 
                  className="rounded-lg p-3 mb-3"
                  style={{ backgroundColor: COLORS.surface50 }}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span style={{ color: COLORS.surface500 }}>
                      {isOffMarket ? 'Market Estimate' : 'Asking Price'}
                    </span>
                    <span className="font-medium" style={{ color: COLORS.navy }}>
                      {formatPrice(estValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span style={{ color: COLORS.surface500 }}>Your Target</span>
                    <span className="font-medium" style={{ color: COLORS.teal }}>
                      {formatPrice(breakevenPrice)}
                    </span>
                  </div>
                  <div 
                    className="pt-2 flex items-center justify-between text-[11px]"
                    style={{ borderTop: `1px dashed ${COLORS.surface200}` }}
                  >
                    <span className="font-medium" style={{ color: COLORS.surface600 }}>
                      {opportunityFactors.dealGap > 0 ? 'Discount needed' : 'Already below target'}
                    </span>
                    <span className="font-bold" style={{ color: getDealGapDisplay(opportunityFactors.dealGap, isOffMarket).color }}>
                      {formatPrice(Math.abs(estValue - breakevenPrice))}
                    </span>
                  </div>
                </div>
                
                {/* Seller Motivation Row - Integrated */}
                <div 
                  className="pt-3"
                  style={{ borderTop: `1px solid ${COLORS.surface100}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" style={{ color: COLORS.surface400 }} />
                      <span className="text-[13px] font-semibold" style={{ color: COLORS.navy }}>Seller Motivation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[13px] font-bold"
                        style={{ color: getMotivationColor(opportunityFactors.motivation) }}
                      >
                        {opportunityFactors.motivationLabel}
                      </span>
                      <span 
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${getMotivationColor(opportunityFactors.motivation)}15`,
                          color: getMotivationColor(opportunityFactors.motivation)
                        }}
                      >
                        {opportunityFactors.motivation}/100
                      </span>
                    </div>
                  </div>
                  
                  {/* Motivation Factors */}
                  {(opportunityFactors.daysOnMarket !== null || opportunityFactors.distressedSale) && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {opportunityFactors.daysOnMarket !== null && opportunityFactors.daysOnMarket > 60 && (
                        <span 
                          className="text-[10px] px-2 py-1 rounded-full"
                          style={{ backgroundColor: `${COLORS.green}15`, color: COLORS.green }}
                        >
                          ✓ {opportunityFactors.daysOnMarket} days on market
                        </span>
                      )}
                      {opportunityFactors.distressedSale && (
                        <span 
                          className="text-[10px] px-2 py-1 rounded-full"
                          style={{ backgroundColor: `${COLORS.green}15`, color: COLORS.green }}
                        >
                          ✓ Distressed sale
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Max Achievable Discount - Based on Motivation */}
                  <div 
                    className="rounded-lg p-2.5 mb-3 flex items-center justify-between"
                    style={{ backgroundColor: COLORS.surface50 }}
                  >
                    <span className="text-[11px]" style={{ color: COLORS.surface500 }}>
                      Max achievable discount
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: COLORS.navy }}>
                      {/* Calculate max based on motivation: motivation/100 * 25 */}
                      Up to {Math.round((opportunityFactors.motivation / 100) * 25)}%
                    </span>
                  </div>
                  
                  {/* Suggested Opening Offer */}
                  <div 
                    className="rounded-lg p-3 flex items-center justify-between"
                    style={{ backgroundColor: `${COLORS.teal}08`, border: `1px solid ${COLORS.teal}20` }}
                  >
                    <span className="text-[11px] font-medium" style={{ color: COLORS.surface600 }}>
                      Suggested opening offer
                    </span>
                    <span className="text-[13px] font-bold" style={{ color: COLORS.teal }}>
                      {getSuggestedOffer(opportunityFactors.motivation, opportunityFactors.dealGap).min}% - {getSuggestedOffer(opportunityFactors.motivation, opportunityFactors.dealGap).max}% below asking
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* IQ Score Badge - Compact */}
            <div 
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: `1px solid ${COLORS.surface100}` }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    border: `3px solid ${getScoreColor(analysis.dealScore)}`,
                    background: `${getScoreColor(analysis.dealScore)}14`,
                  }}
                >
                  <span 
                    className="text-lg font-extrabold"
                    style={{ color: getScoreColor(analysis.dealScore) }}
                  >
                    {analysis.dealScore}
                  </span>
                </div>
                <div>
                  <div 
                    className="text-[13px] font-bold"
                    style={{ color: getScoreColor(analysis.dealScore) }}
                  >
                    {verdictInfo.label}
                  </div>
                  <div className="text-[10px]" style={{ color: COLORS.surface400 }}>
                    {verdictInfo.sublabel}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowMethodology(true)}
                className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80"
                style={{ color: COLORS.teal }}
              >
                <Info className="w-3 h-3" />
                How we score
              </button>
            </div>
          </div>

          {/* Factors Accordion - Full Width */}
          <div 
            className="p-4 border-b border-[#CBD5E1] cursor-pointer transition-colors hover:bg-[#FAFAFA]"
            style={{ 
              background: 'white',
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
          <div className="p-4 bg-white border-b border-[#CBD5E1]">
            <button
              onClick={() => onViewStrategy(topStrategy)}
              className="w-full p-4 rounded-xl text-base font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: COLORS.teal }}
            >
              Continue to Analysis
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Export Link */}
          <div className="p-4 bg-white">
            <button 
              className="flex items-center gap-2 text-sm py-3 cursor-pointer hover:opacity-80"
              style={{ color: COLORS.surface500 }}
            >
              <Download className="w-[18px] h-[18px]" />
              Export PDF Report
            </button>
          </div>
        </div>
      </main>

      {/* Score Methodology Sheet */}
      <ScoreMethodologySheet
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
        currentScore={analysis.dealScore}
        scoreType="verdict"
        lastUpdated={new Date(analysis.analyzedAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}
      />
    </div>
  )
}

export default IQVerdictScreen
