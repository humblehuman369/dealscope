'use client'

/**
 * IQVerdictScreen - Redesigned IQ Verdict page (V2)
 * 
 * Core Value Proposition:
 * "Every property can be a good investment at the right price."
 * 
 * DealGapIQ tells you:
 * 1. WHAT PRICE MAKES THIS DEAL WORK (Breakeven) - based on YOUR financing terms
 * 2. HOW LIKELY YOU ARE TO GET THAT PRICE (Deal Gap + Motivation) - based on market signals
 * 
 * Design specs:
 * - Max width: 480px centered
 * - Background: #E8ECF0
 * - Font: Inter
 * - Uses new CompactHeader design
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ArrowRight, Download, Info, HelpCircle, Settings2, TrendingDown, Target, AlertCircle, Clock, AlertTriangle } from 'lucide-react'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'
import {
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
} from './types'
import { CompactHeader, PropertyData, Strategy } from '../layout/CompactHeader'
import { ScoreMethodologySheet } from './ScoreMethodologySheet'
import { SummarySnapshot } from './SummarySnapshot'

// =============================================================================
// BRAND COLORS - From design files (synced with verdict-design-tokens.ts)
// =============================================================================
const COLORS = {
  navy: '#0A1628',
  teal: '#0891B2',
  tealLight: '#0891B2', // Synced with design tokens - was #06B6D4
  cyan: '#00D4FF',
  rose: '#EF4444',      // Red - Unified with verdict-design-tokens
  warning: '#D97706',   // Amber - Unified with verdict-design-tokens
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
// Unified rating system across all VerdictIQ pages
const getVerdictLabel = (score: number): { label: string; sublabel: string } => {
  if (score >= 90) return { label: 'Strong', sublabel: 'Deal Gap easily achievable' }
  if (score >= 80) return { label: 'Good', sublabel: 'Deal Gap likely achievable' }
  if (score >= 65) return { label: 'Average', sublabel: 'Negotiation required' }
  if (score >= 50) return { label: 'Marginal', sublabel: 'Aggressive discount needed' }
  if (score >= 30) return { label: 'Unlikely', sublabel: 'Deal Gap probably too large' }
  return { label: 'Pass', sublabel: 'Not a viable investment' }
}

// Get Seller Motivation color
const getMotivationColor = (score: number): string => {
  if (score >= 70) return COLORS.green
  if (score >= 40) return COLORS.warning
  return COLORS.rose
}

// Get opening offer suggestion based on motivation
const getSuggestedOffer = (motivation: number): { min: number; max: number } => {
  if (motivation >= 70) return { min: 15, max: 25 }
  if (motivation >= 50) return { min: 10, max: 18 }
  if (motivation >= 30) return { min: 5, max: 12 }
  return { min: 3, max: 8 }
}

// Unified color system across all VerdictIQ pages
const getScoreColor = (score: number): string => {
  if (score >= 80) return COLORS.teal   // Strong/Good (A+/A)
  if (score >= 50) return COLORS.warning // Average/Marginal (B/C)
  return COLORS.rose                     // Unlikely/Pass (D/F)
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
  // If provided, assumptions will be read from dealMakerStore (saved property mode)
  savedPropertyId?: string
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
  savedPropertyId,
}: IQVerdictScreenProps) {
  const router = useRouter()
  const [showFactors, setShowFactors] = useState(true)
  const [showMethodology, setShowMethodology] = useState(false)
  const [showCalculation, setShowCalculation] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState<string>(HEADER_STRATEGIES[0].short)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const topStrategy = analysis.strategies.reduce((best, s) => s.score > best.score ? s : best, analysis.strategies[0])
  
  // Get assumptions from dealMakerStore (for saved properties) or use analysis inputs
  const { record, isLoading: storeLoading } = useDealMakerStore()
  const { hasRecord } = useDealMakerReady()
  
  // Determine if we're using store data or analysis data for assumptions display
  const isSavedPropertyMode = !!savedPropertyId && hasRecord
  
  // Build defaults object from store or analysis inputs
  const defaults = useMemo(() => {
    if (isSavedPropertyMode && record?.initial_assumptions) {
      // Use locked assumptions from DealMakerRecord
      const initial = record.initial_assumptions
      return {
        financing: {
          down_payment_pct: initial.down_payment_pct,
          interest_rate: initial.interest_rate,
          loan_term_years: initial.loan_term_years,
          closing_costs_pct: initial.closing_costs_pct,
        },
        operating: {
          vacancy_rate: initial.vacancy_rate,
          maintenance_pct: initial.maintenance_pct,
          property_management_pct: initial.management_pct,
        },
      }
    }
    // Fallback to hardcoded defaults (these should match backend defaults)
    return {
      financing: {
        down_payment_pct: 0.20,
        interest_rate: 0.06,
        loan_term_years: 30,
        closing_costs_pct: 0.03,
      },
      operating: {
        vacancy_rate: 0.01,
        maintenance_pct: 0.05,
        property_management_pct: 0.00,
      },
    }
  }, [isSavedPropertyMode, record])
  
  const hasUserCustomizations = isSavedPropertyMode && !!record?.initial_assumptions
  
  // Get verdict label and sublabel
  const verdictInfo = getVerdictLabel(analysis.dealScore)
  
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
  
  // For "Market Estimate" / "Asking Price" display:
  // - For saved properties, use the original list_price from Deal Maker record
  // - For unsaved properties, use property's market value
  // NOTE: Don't use analysis.listPrice here - that contains the user's buy_price for calculations
  const estValue = isSavedPropertyMode && record?.list_price
    ? record.list_price
    : marketValue
  
  // User's target buy price (from Deal Maker or calculated breakeven)
  const userTargetPrice = isSavedPropertyMode && record?.buy_price 
    ? record.buy_price 
    : breakevenPrice
  const discountNeeded = estValue - userTargetPrice
  
  // Recalculate deal gap: (Market - Target) / Market × 100
  // Positive means discount needed, negative means paying premium
  const calculatedDealGap = estValue > 0 
    ? ((estValue - userTargetPrice) / estValue) * 100 
    : 0
  
  // Default opportunity factors
  // Use recalculated deal gap for accurate display
  const opportunityFactors = {
    dealGap: isSavedPropertyMode 
      ? calculatedDealGap  // Use recalculated gap based on actual list_price
      : (analysis.opportunityFactors?.dealGap ?? analysis.discountPercent ?? 0),
    motivation: analysis.opportunityFactors?.motivation ?? 50,
    motivationLabel: analysis.opportunityFactors?.motivationLabel ?? 'Medium',
    daysOnMarket: analysis.opportunityFactors?.daysOnMarket ?? null,
    buyerMarket: analysis.opportunityFactors?.buyerMarket ?? null,
    distressedSale: analysis.opportunityFactors?.distressedSale ?? false,
  }

  // Seller motivation data
  const sellerMotivation = {
    level: opportunityFactors.motivationLabel || 'Medium',
    score: `${opportunityFactors.motivation}/100`,
    maxDiscount: `Up to ${Math.round((opportunityFactors.motivation / 100) * 25)}%`,
    suggestedOffer: `${getSuggestedOffer(opportunityFactors.motivation).min}% - ${getSuggestedOffer(opportunityFactors.motivation).max}% below asking`,
  }

  // Opportunity factors for collapsible section
  const factors: Array<{ icon: 'clock' | 'alert'; label: string; value: string; positive: boolean }> = [
    { 
      icon: 'clock', 
      label: 'Long Listing Duration', 
      value: opportunityFactors.daysOnMarket && opportunityFactors.daysOnMarket > 60 ? 'Yes' : 'No', 
      positive: !!(opportunityFactors.daysOnMarket && opportunityFactors.daysOnMarket > 60)
    },
    { 
      icon: 'alert', 
      label: 'Distressed Sale', 
      value: opportunityFactors.distressedSale ? 'Yes' : 'No', 
      positive: !!opportunityFactors.distressedSale 
    },
  ]

  // Calculate metrics for Summary Snapshot
  const metrics = useMemo(() => {
    const effectivePrice = userTargetPrice
    const monthlyRent = property.monthlyRent ?? effectivePrice * 0.007
    const propertyTaxes = property.propertyTaxes ?? effectivePrice * 0.012
    const insurance = property.insurance ?? effectivePrice * 0.01

    const annualRent = monthlyRent * 12
    const vacancyRate = defaults?.operating?.vacancy_rate ?? 0.01
    const maintenancePct = defaults?.operating?.maintenance_pct ?? 0.05
    const noi = annualRent - propertyTaxes - insurance - (annualRent * vacancyRate) - (annualRent * maintenancePct)
    
    const downPaymentPct = defaults?.financing?.down_payment_pct ?? 0.20
    const downPayment = effectivePrice * downPaymentPct
    const loanAmount = effectivePrice * (1 - downPaymentPct)
    const closingCostsPct = defaults?.financing?.closing_costs_pct ?? 0.03
    const closingCosts = effectivePrice * closingCostsPct
    const totalInvestment = downPayment + closingCosts

    // Calculate monthly mortgage payment
    const interestRate = defaults?.financing?.interest_rate ?? 0.06
    const loanTermYears = defaults?.financing?.loan_term_years ?? 30
    const monthlyRate = interestRate / 12
    const numPayments = loanTermYears * 12
    const monthlyPI = loanAmount > 0 
      ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0
    const annualDebtService = monthlyPI * 12
    
    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = annualCashFlow / 12

    const capRate = effectivePrice > 0 ? (noi / effectivePrice) * 100 : 0
    const cashOnCash = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0

    return {
      capRate,
      cashOnCash,
      dscr,
      monthlyCashFlow,
      noi,
      totalInvestment,
    }
  }, [property, userTargetPrice, defaults])

  // Price Card Component
  const PriceCard = ({ label, value, desc, recommended = false }: { label: string; value: number; desc: string; recommended?: boolean }) => (
    <div className={`rounded-lg p-3 text-center border ${
      recommended 
        ? 'bg-white border-2 border-[#0891B2]' 
        : 'bg-[#F8FAFC] border-[#E2E8F0]'
    }`}>
      <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
        recommended ? 'text-[#0891B2]' : 'text-[#64748B]'
      }`}>
        {label}
        <HelpCircle className="w-3 h-3 text-[#CBD5E1]" />
      </div>
      <div className={`text-base font-bold mb-1 ${recommended ? 'text-[#0891B2]' : 'text-[#0A1628]'}`}>
        {formatPrice(value)}
      </div>
      <div className="text-[9px] text-[#94A3B8] leading-tight">{desc}</div>
    </div>
  )

  // Factor Row Component
  const FactorRow = ({ icon, label, value, positive }: { icon: 'clock' | 'alert'; label: string; value: string; positive?: boolean }) => (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
        {icon === 'clock' ? (
          <Clock className="w-4 h-4 text-[#94A3B8]" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#94A3B8]" />
        )}
        {label}
      </div>
      <span className={`text-[13px] font-semibold ${positive ? 'text-[#0891B2]' : 'text-[#94A3B8]'}`}>
        {value}
      </span>
    </div>
  )

  return (
    <div 
      className="min-h-screen flex flex-col max-w-[480px] mx-auto"
      style={{ 
        background: '#E8ECF0',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Compact Header */}
      <CompactHeader
        property={headerPropertyData}
        activeNav="analysis"
        currentStrategy={currentStrategy}
        pageTitle="VERDICT"
        pageTitleAccent="IQ"
        onStrategyChange={handleHeaderStrategyChange}
        defaultPropertyOpen={true}
        savedPropertyId={savedPropertyId}
      />

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-36">
        
        {/* VERDICT HERO */}
        <div className="bg-white p-5 px-6 border-b border-[#E2E8F0] flex items-center gap-4">
          <div 
            className="w-[72px] h-[72px] rounded-full border-4 border-[#0891B2] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #FFFFFF 100%)' }}
          >
            <span className="text-[28px] font-extrabold text-[#0891B2]">{analysis.dealScore}</span>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-[#0891B2] mb-0.5">{verdictInfo.label}</div>
            <div className="text-[13px] text-[#64748B] mb-2">{verdictInfo.sublabel}</div>
            <div className="flex gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                <TrendingDown className="w-3 h-3 text-[#94A3B8]" />
                Gap: <span className="font-semibold text-[#0891B2]">{opportunityFactors.dealGap > 0 ? '-' : '+'}{Math.abs(opportunityFactors.dealGap).toFixed(1)}%</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#64748B]">
                <Settings2 className="w-3 h-3 text-[#94A3B8]" />
                Motivation: <span className="font-semibold text-[#0891B2]">{sellerMotivation.level}</span>
              </span>
            </div>
            <button 
              className="flex items-center gap-1 text-[#0891B2] text-xs font-medium mt-1 bg-transparent border-none cursor-pointer p-0"
              onClick={() => setShowMethodology(true)}
            >
              <Info className="w-3.5 h-3.5" />
              How Verdict IQ Works
            </button>
          </div>
        </div>

        {/* Your Investment Analysis */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[15px] font-bold text-[#0A1628]">YOUR INVESTMENT ANALYSIS</div>
              <div className="text-xs text-[#64748B]">
                Based on YOUR financing terms ({((defaults?.financing?.down_payment_pct ?? 0.20) * 100).toFixed(0)}% down, {((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%)
              </div>
            </div>
            <button 
              className="text-[#0891B2] text-[13px] font-medium bg-transparent border-none cursor-pointer"
              onClick={() => setShowAssumptions(!showAssumptions)}
            >
              Change terms
            </button>
          </div>

          <div className="text-xs font-semibold text-[#0891B2] mt-2 mb-3">
            WHAT PRICE MAKES THIS DEAL WORK?
          </div>

          {/* Info Banner for Off-Market */}
          {isOffMarket && (
            <div className="flex items-start gap-2.5 p-3 bg-[#F1F5F9] rounded-lg mb-4 border-l-[3px] border-l-[#0891B2]">
              <AlertCircle className="w-[18px] h-[18px] text-[#0891B2] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#0891B2]">Off-Market Property:</strong> No asking price available. Using {priceSource} of {formatPrice(marketValue)} for Deal Gap calculation.
              </div>
            </div>
          )}

          {/* Price Cards */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[#64748B]">Three ways to approach this deal:</span>
            <button 
              className="flex items-center gap-1.5 text-[#0891B2] text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setShowCalculation(!showCalculation)}
            >
              <ChevronDown 
                className="w-3.5 h-3.5 transition-transform" 
                style={{ transform: showCalculation ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
              See how we calculated this
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <PriceCard 
              label="Breakeven" 
              value={breakevenPrice} 
              desc="Max price for $0 cashflow (LTR model)" 
            />
            <PriceCard 
              label="Target Buy" 
              value={buyPrice} 
              desc="Max Price for\nPositive Cashflow" 
              recommended 
            />
            <PriceCard 
              label="Wholesale" 
              value={wholesalePrice} 
              desc="30% discount for assignment" 
            />
          </div>

          {/* Expandable Assumptions Panel */}
          {showAssumptions && (
            <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">
                  YOUR ASSUMPTIONS
                </span>
                <button 
                  onClick={() => {
                    const fullAddr = `${property.address}, ${property.city || ''}, ${property.state || ''} ${property.zip || ''}`
                    const dealMakerUrl = savedPropertyId
                      ? `/deal-maker/${encodeURIComponent(fullAddr)}?propertyId=${savedPropertyId}`
                      : `/deal-maker/${encodeURIComponent(fullAddr)}`
                    router.push(dealMakerUrl)
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#0891B2] hover:opacity-80"
                >
                  <Settings2 className="w-3 h-3" />
                  Edit in Deal Maker
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">FINANCING</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Down Payment</span>
                      <span className="font-medium text-[#0A1628]">{((defaults?.financing?.down_payment_pct ?? 0.20) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Interest Rate</span>
                      <span className="font-medium text-[#0A1628]">{((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Loan Term</span>
                      <span className="font-medium text-[#0A1628]">{defaults?.financing?.loan_term_years ?? 30} years</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-2">EXPENSES</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Vacancy</span>
                      <span className="font-medium text-[#0A1628]">{((defaults?.operating?.vacancy_rate ?? 0.01) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Management</span>
                      <span className="font-medium text-[#0A1628]">{((defaults?.operating?.property_management_pct ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Maintenance</span>
                      <span className="font-medium text-[#0A1628]">{((defaults?.operating?.maintenance_pct ?? 0.05) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Snapshot */}
        <SummarySnapshot
          capRate={metrics.capRate}
          cashOnCash={metrics.cashOnCash}
          dscr={metrics.dscr}
          monthlyCashFlow={metrics.monthlyCashFlow}
          noi={metrics.noi}
          totalInvestment={metrics.totalInvestment}
          targetBuyPrice={buyPrice}
          strategy={currentStrategy === 'Long-term' ? 'Long-term Rental' : currentStrategy === 'Short-term' ? 'Short-term Rental' : currentStrategy}
        />

        {/* How Likely Section */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="text-xs font-semibold text-[#0891B2] mb-3">
            HOW LIKELY CAN YOU GET THIS PRICE?
          </div>

          {/* Deal Gap */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]">
              <TrendingDown className="w-[18px] h-[18px] text-[#64748B]" />
              Deal Gap
            </div>
            <div className="text-lg font-bold text-[#0891B2]">
              {opportunityFactors.dealGap > 0 ? '-' : '+'}{Math.abs(opportunityFactors.dealGap).toFixed(1)}%
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">{isOffMarket ? 'Market Estimate' : 'Asking Price'}</span>
              <span className="text-[13px] font-semibold text-[#0A1628]">{formatPrice(estValue)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">Your Target</span>
              <span className="text-[13px] font-semibold text-[#0891B2]">{formatPrice(userTargetPrice)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[#64748B]">Discount needed</span>
              <span className="text-[13px] font-semibold text-[#0891B2]">{formatPrice(Math.abs(discountNeeded))}</span>
            </div>
          </div>

          {/* Seller Motivation */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0A1628]">
              <Target className="w-[18px] h-[18px] text-[#64748B]" />
              Seller Motivation
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold" style={{ color: getMotivationColor(opportunityFactors.motivation) }}>
                {sellerMotivation.level}
              </span>
              <span className="text-xs text-[#94A3B8]">{sellerMotivation.score}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-[13px] text-[#64748B]">Max achievable discount</span>
            <span className="text-[13px] font-semibold text-[#0A1628]">{sellerMotivation.maxDiscount}</span>
          </div>

          {/* Suggested Offer */}
          <div 
            className="relative rounded-[10px] p-4 mt-3 border border-[#0891B2]"
            style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #E0F7FA 100%)' }}
          >
            <span className="absolute -top-2 left-4 bg-[#0891B2] text-white text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
              Recommended
            </span>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#0A1628] font-medium">Suggested opening offer</span>
              <span className="text-base font-bold text-[#0891B2]">{sellerMotivation.suggestedOffer}</span>
            </div>
          </div>
        </div>

        {/* Additional Opportunity Factors */}
        <div className="bg-white p-4 px-6 border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
              </svg>
              Additional Opportunity Factors
            </span>
            <button 
              className="flex items-center gap-1 text-[#0891B2] text-xs font-medium bg-transparent border-none cursor-pointer"
              onClick={() => setShowFactors(!showFactors)}
            >
              {showFactors ? 'Hide' : 'Show'}
              {showFactors ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showFactors && (
            <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
              {factors.map((factor, index) => (
                <FactorRow key={index} {...factor} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-[#E2E8F0] p-4 px-6">
        <button 
          className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white py-4 rounded-xl text-[15px] font-semibold cursor-pointer border-none mb-3 hover:bg-[#0E7490] transition-colors"
          onClick={() => onViewStrategy(topStrategy)}
        >
          Continue to Analysis
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>
        <button 
          className="w-full flex items-center justify-center gap-2 bg-transparent text-[#64748B] py-3 text-[13px] font-medium cursor-pointer border-none hover:text-[#475569] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export PDF Report
        </button>
      </div>

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
