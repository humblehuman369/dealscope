'use client'

/**
 * IQVerdictScreen - Redesigned IQ Verdict page (V2)
 * 
 * Core Value Proposition:
 * "Every property can be a good investment at the right price."
 * 
 * DealGapIQ tells you:
 * 1. WHAT PRICE MAKES THIS DEAL WORK (Income Value) - based on YOUR financing terms
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
  navy: 'var(--text-heading)',
  teal: 'var(--accent-sky)',
  tealLight: 'var(--accent-sky-light)',
  cyan: 'var(--accent-sky-light)',
  rose: 'var(--status-negative)',
  warning: 'var(--status-warning)',
  green: 'var(--status-positive)',
  surface50: 'var(--surface-section)',
  surface100: 'var(--surface-elevated)',
  surface200: 'var(--border-subtle)',
  surface300: 'var(--text-body)',
  surface400: 'var(--text-heading)',
  surface500: 'var(--text-heading)',
  surface600: 'var(--text-secondary)',
  surface700: 'var(--text-body)',
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
  onCompareAll: _onCompareAll,
  isDark: _isDark = false,
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
  const { record, isLoading: _storeLoading } = useDealMakerStore()
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
    // Use assumptions from the backend response (no hardcoded fallbacks)
    const used = analysis.defaults_used || {}
    return {
      financing: {
        down_payment_pct: used.financing?.down_payment_pct ?? 0.20,
        interest_rate: used.financing?.interest_rate ?? 0.06,
        loan_term_years: used.financing?.loan_term_years ?? 30,
        closing_costs_pct: used.financing?.closing_costs_pct ?? 0.03,
      },
      operating: {
        vacancy_rate: used.operating?.vacancy_rate ?? 0.01,
        maintenance_pct: used.operating?.maintenance_pct ?? 0.05,
        property_management_pct: used.operating?.property_management_pct ?? 0.00,
      },
    }
  }, [isSavedPropertyMode, record, analysis.defaults_used])
  
  const _hasUserCustomizations = isSavedPropertyMode && !!record?.initial_assumptions
  
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
    rent: property.monthlyRent || 0,
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
  
  // Market Price: when listed = list price; when off-market = backend market_price (property.price set from API)
  const marketValue = property.price
  const priceSource = isOffMarket ? 'Zestimate' : 'Asking Price'

  // Calculate prices
  const incomeValue = analysis.incomeValue || Math.round(marketValue * 1.1)
  const buyPrice = analysis.purchasePrice || Math.round(incomeValue * 0.95)
  const wholesalePrice = Math.round(incomeValue * 0.70)
  
  // For "Market Estimate" / "Asking Price" display:
  // - For saved properties, use the original list_price from Deal Maker record
  // - For unsaved properties, use property's market value
  // NOTE: Don't use analysis.listPrice here - that contains the user's buy_price for calculations
  const estValue = isSavedPropertyMode && record?.list_price
    ? record.list_price
    : marketValue
  
  // User's target buy price (from Deal Maker or calculated Income Value)
  const userTargetPrice = isSavedPropertyMode && record?.buy_price 
    ? record.buy_price 
    : incomeValue
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
    const monthlyRent = property.monthlyRent ?? 0
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
        ? 'bg-[var(--surface-card)] border-2 border-[var(--accent-sky)]' 
        : 'bg-[var(--surface-section)] border-[var(--border-subtle)]'
    }`}>
      <div className={`text-[9px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${
        recommended ? 'text-[var(--accent-sky)]' : 'text-[var(--text-secondary)]'
      }`}>
        {label}
        <HelpCircle className="w-3 h-3 text-[var(--text-body)]" />
      </div>
      <div className={`text-base font-bold mb-1 ${recommended ? 'text-[var(--accent-sky)]' : 'text-[var(--text-heading)]'}`}>
        {formatPrice(value)}
      </div>
      <div className="text-[9px] text-[var(--text-secondary)] leading-tight">{desc}</div>
    </div>
  )

  // Factor Row Component
  const FactorRow = ({ icon, label, value, positive }: { icon: 'clock' | 'alert'; label: string; value: string; positive?: boolean }) => (
    <div className="flex justify-between items-center py-2">
      <div className="flex items-center gap-2.5 text-[13px] text-[var(--text-secondary)]">
        {icon === 'clock' ? (
          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
        {label}
      </div>
      <span className={`text-[13px] font-semibold ${positive ? 'text-[var(--accent-sky)]' : 'text-[var(--text-secondary)]'}`}>
        {value}
      </span>
    </div>
  )

  return (
    <div 
      className="min-h-screen flex flex-col max-w-[480px] mx-auto"
      style={{ 
        background: 'var(--surface-section)',
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
        <div className="bg-[var(--surface-card)] p-5 px-6 border-b border-[var(--border-subtle)] flex items-center gap-4">
          <div 
            className="w-[72px] h-[72px] rounded-full border-4 border-[var(--accent-sky)] flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface-card) 100%)' }}
          >
            <span className="text-[28px] font-extrabold text-[var(--accent-sky)]">{analysis.dealScore}</span>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-[var(--accent-sky)] mb-0.5">{verdictInfo.label}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mb-2">{verdictInfo.sublabel}</div>
            <div className="flex gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <TrendingDown className="w-3 h-3 text-[var(--text-secondary)]" />
                Gap: <span className="font-semibold text-[var(--accent-sky)]">{opportunityFactors.dealGap > 0 ? '-' : '+'}{Math.abs(opportunityFactors.dealGap).toFixed(1)}%</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <Settings2 className="w-3 h-3 text-[var(--text-secondary)]" />
                Motivation: <span className="font-semibold text-[var(--accent-sky)]">{sellerMotivation.level}</span>
              </span>
            </div>
            <button 
              className="flex items-center gap-1 text-[var(--accent-sky)] text-xs font-medium mt-1 bg-transparent border-none cursor-pointer p-0"
              onClick={() => setShowMethodology(true)}
            >
              <Info className="w-3.5 h-3.5" />
              How Verdict IQ Works
            </button>
          </div>
        </div>

        {/* Your Investment Analysis */}
        <div className="bg-[var(--surface-card)] p-4 px-6 border-b border-[var(--border-subtle)]">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[15px] font-bold text-[var(--text-heading)]">YOUR INVESTMENT ANALYSIS</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Based on YOUR financing terms ({((defaults?.financing?.down_payment_pct ?? 0.20) * 100).toFixed(0)}% down, {((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%)
              </div>
            </div>
            <button 
              className="text-[var(--accent-sky)] text-[13px] font-medium bg-transparent border-none cursor-pointer"
              onClick={() => setShowAssumptions(!showAssumptions)}
            >
              Change terms
            </button>
          </div>

          <div className="text-xs font-semibold text-[var(--accent-sky)] mt-2 mb-3">
            WHAT PRICE MAKES THIS DEAL WORK?
          </div>

          {/* Info Banner for Off-Market */}
          {isOffMarket && (
            <div className="flex items-start gap-2.5 p-3 bg-[var(--surface-elevated)] rounded-lg mb-4 border-l-[3px] border-l-[var(--accent-sky)]">
              <AlertCircle className="w-[18px] h-[18px] text-[var(--accent-sky)] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--accent-sky)]">Off-Market Property:</strong> No asking price available. Using {priceSource} of {formatPrice(marketValue)} for Deal Gap calculation.
              </div>
            </div>
          )}

          {/* Price Cards */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[var(--text-secondary)]">Three ways to approach this deal:</span>
            <button 
              className="flex items-center gap-1.5 text-[var(--accent-sky)] text-[13px] font-semibold bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
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
              label="Income Value" 
              value={incomeValue} 
              desc="Price where income covers all costs" 
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
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
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
                  className="flex items-center gap-1 text-[10px] font-medium text-[var(--accent-sky)] hover:opacity-80"
                >
                  <Settings2 className="w-3 h-3" />
                  Edit in Deal Maker
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">FINANCING</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Down Payment</span>
                      <span className="font-medium text-[var(--text-heading)]">{((defaults?.financing?.down_payment_pct ?? 0.20) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Interest Rate</span>
                      <span className="font-medium text-[var(--text-heading)]">{((defaults?.financing?.interest_rate ?? 0.06) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Loan Term</span>
                      <span className="font-medium text-[var(--text-heading)]">{defaults?.financing?.loan_term_years ?? 30} years</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">EXPENSES</div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Vacancy</span>
                      <span className="font-medium text-[var(--text-heading)]">{((defaults?.operating?.vacancy_rate ?? 0.01) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Management</span>
                      <span className="font-medium text-[var(--text-heading)]">{((defaults?.operating?.property_management_pct ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Maintenance</span>
                      <span className="font-medium text-[var(--text-heading)]">{((defaults?.operating?.maintenance_pct ?? 0.05) * 100).toFixed(0)}%</span>
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
        <div className="bg-[var(--surface-card)] p-4 px-6 border-b border-[var(--border-subtle)]">
          <div className="text-xs font-semibold text-[var(--accent-sky)] mb-3">
            HOW LIKELY CAN YOU GET THIS PRICE?
          </div>

          {/* Deal Gap */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-heading)]">
              <TrendingDown className="w-[18px] h-[18px] text-[var(--text-secondary)]" />
              Deal Gap
            </div>
            <div className="text-lg font-bold text-[var(--accent-sky)]">
              {opportunityFactors.dealGap > 0 ? '-' : '+'}{Math.abs(opportunityFactors.dealGap).toFixed(1)}%
            </div>
          </div>

          <div className="bg-[var(--surface-section)] rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[var(--text-secondary)]">{isOffMarket ? 'Zestimate' : 'Asking Price'}</span>
              <span className="text-[13px] font-semibold text-[var(--text-heading)]">{formatPrice(estValue)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[var(--text-secondary)]">Your Target</span>
              <span className="text-[13px] font-semibold text-[var(--accent-sky)]">{formatPrice(userTargetPrice)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[13px] text-[var(--text-secondary)]">Discount needed</span>
              <span className="text-[13px] font-semibold text-[var(--accent-sky)]">{formatPrice(Math.abs(discountNeeded))}</span>
            </div>
          </div>

          {/* Seller Motivation */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-heading)]">
              <Target className="w-[18px] h-[18px] text-[var(--text-secondary)]" />
              Seller Motivation
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold" style={{ color: getMotivationColor(opportunityFactors.motivation) }}>
                {sellerMotivation.level}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{sellerMotivation.score}</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-[13px] text-[var(--text-secondary)]">Max achievable discount</span>
            <span className="text-[13px] font-semibold text-[var(--text-heading)]">{sellerMotivation.maxDiscount}</span>
          </div>

          {/* Suggested Offer */}
          <div 
            className="relative rounded-[10px] p-4 mt-3 border border-[var(--accent-sky)]"
            style={{ background: 'linear-gradient(135deg, var(--surface-section) 0%, var(--surface-elevated) 100%)' }}
          >
            <span className="absolute -top-2 left-4 bg-[var(--accent-sky)] text-[var(--text-inverse)] text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
              Recommended
            </span>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--text-heading)] font-medium">Suggested opening offer</span>
              <span className="text-base font-bold text-[var(--accent-sky)]">{sellerMotivation.suggestedOffer}</span>
            </div>
          </div>
        </div>

        {/* Additional Opportunity Factors */}
        <div className="bg-[var(--surface-card)] p-4 px-6 border-b border-[var(--border-subtle)]">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-secondary)]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
              </svg>
              Additional Opportunity Factors
            </span>
            <button 
              className="flex items-center gap-1 text-[var(--accent-sky)] text-xs font-medium bg-transparent border-none cursor-pointer"
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
            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
              {factors.map((factor, index) => (
                <FactorRow key={index} {...factor} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[var(--surface-card)] border-t border-[var(--border-subtle)] p-4 px-6">
        <button 
          className="w-full flex items-center justify-center gap-2 bg-[var(--accent-sky)] text-[var(--text-inverse)] py-4 rounded-xl text-[15px] font-semibold cursor-pointer border-none mb-3 hover:bg-[var(--accent-sky-light)] transition-colors"
          onClick={() => onViewStrategy(topStrategy)}
        >
          Continue to Analysis
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>
        <button 
          className="w-full flex items-center justify-center gap-2 bg-transparent text-[var(--text-secondary)] py-3 text-[13px] font-medium cursor-pointer border-none hover:text-[var(--text-heading)] transition-colors"
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
