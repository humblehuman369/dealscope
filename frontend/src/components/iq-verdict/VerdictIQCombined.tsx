'use client'

/**
 * VerdictIQCombined Component
 * 
 * Unified IQ Verdict page that combines:
 * - Verdict Score Hero with deal gap and motivation factors
 * - Investment Analysis with price cards (Breakeven, Target, Wholesale)
 * - Performance Benchmarks with national comparisons
 * - At-a-Glance summary bars
 * 
 * This replaces the previous two-page flow (verdict + analysis-iq).
 * 
 * ARCHITECTURE:
 * - For SAVED properties (propertyId param): Loads from dealMakerStore
 * - For UNSAVED properties (address param): Uses URL params for overrides
 */

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, TrendingDown, Target, Clock, AlertTriangle, ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { CompactHeader, PropertyData } from '../layout/CompactHeader'
import { useDealMakerStore, useDealMakerReady } from '@/stores/dealMakerStore'
import { ScoreMethodologySheet } from './ScoreMethodologySheet'
import { VerdictHero } from './VerdictHero'
import { InvestmentAnalysis } from './InvestmentAnalysis'
import { FinancialBreakdown } from './FinancialBreakdown'
import { AtAGlanceSection } from './AtAGlanceSection'
import { PerformanceBenchmarksSection, NATIONAL_RANGES } from './PerformanceBenchmarksSection'
import { DealMakerPopup, DealMakerValues, PopupStrategyType, DealMakerTab } from '../deal-maker/DealMakerPopup'
import {
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
} from './types'
import { PriceTarget } from '@/lib/priceUtils'
import { 
  StrategyType, 
  headerStrategyToType, 
  STRATEGY_METRICS, 
  METRIC_DEFINITIONS,
  formatMetricValue,
  MetricId 
} from '@/config/strategyMetrics'
import { 
  calculateStrategyMetrics, 
  getBasePriceForTarget,
  CalculationInputs 
} from '@/lib/dynamicMetrics'

// =============================================================================
// PROPS
// =============================================================================

interface VerdictIQCombinedProps {
  property: IQProperty
  analysis: IQAnalysisResult
  onNavigateToDealMaker?: () => void
  savedPropertyId?: string
}

// Default strategies for the dropdown
const HEADER_STRATEGIES = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
]

// Map header strategy to popup strategy type
function getPopupStrategyType(headerStrategy: string): PopupStrategyType {
  switch (headerStrategy) {
    case 'Short-term': return 'str'
    case 'BRRRR': return 'brrrr'
    case 'Fix & Flip': return 'flip'
    case 'House Hack': return 'house_hack'
    case 'Wholesale': return 'wholesale'
    default: return 'ltr'
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getVerdictLabel = (score: number): { label: string; sublabel: string } => {
  if (score >= 90) return { label: 'Strong Buy', sublabel: 'Deal Gap easily achievable' }
  if (score >= 80) return { label: 'Good Buy', sublabel: 'Deal Gap likely achievable' }
  if (score >= 65) return { label: 'Moderate', sublabel: 'Negotiation required' }
  if (score >= 50) return { label: 'Stretch', sublabel: 'Aggressive discount needed' }
  if (score >= 30) return { label: 'Unlikely', sublabel: 'Deal Gap probably too large' }
  return { label: 'Pass', sublabel: 'Discount unrealistic' }
}

const getMotivationColor = (score: number): string => {
  if (score >= 70) return '#10B981'
  if (score >= 40) return '#F59E0B'
  return '#E11D48'
}

const getSuggestedOffer = (motivation: number): { min: number; max: number } => {
  if (motivation >= 70) return { min: 15, max: 25 }
  if (motivation >= 50) return { min: 10, max: 18 }
  if (motivation >= 30) return { min: 5, max: 12 }
  return { min: 3, max: 8 }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VerdictIQCombined({
  property,
  analysis,
  onNavigateToDealMaker,
  savedPropertyId,
}: VerdictIQCombinedProps) {
  const router = useRouter()
  const [showMethodology, setShowMethodology] = useState(false)
  const [showFactors, setShowFactors] = useState(false)
  const [showPriceLikelihood, setShowPriceLikelihood] = useState(false)
  const [currentStrategy, setCurrentStrategy] = useState(HEADER_STRATEGIES[0].short)
  const [showDealMakerPopup, setShowDealMakerPopup] = useState(false)
  const [dealMakerInitialTab, setDealMakerInitialTab] = useState<DealMakerTab | undefined>(undefined)
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  
  // Active price target for dynamic recalculation
  const [activePriceTarget, setActivePriceTarget] = useState<PriceTarget>('targetBuy')
  
  // Override values from DealMaker popup (for recalculation)
  const [overrideValues, setOverrideValues] = useState<Partial<DealMakerValues> | null>(null)

  // Deal Maker Store for saved properties
  const { record } = useDealMakerStore()
  const { hasRecord } = useDealMakerReady()
  const isSavedPropertyMode = !!savedPropertyId && hasRecord

  // Build defaults from store, override values, or fallback
  const defaults = useMemo(() => {
    // If we have override values from the popup, use those
    if (overrideValues) {
      return {
        financing: {
          down_payment_pct: overrideValues.downPayment! / 100,
          interest_rate: overrideValues.interestRate! / 100,
          loan_term_years: overrideValues.loanTerm!,
          closing_costs_pct: overrideValues.closingCosts! / 100,
        },
        operating: {
          vacancy_rate: overrideValues.vacancyRate! / 100,
          maintenance_pct: 0.05, // Default maintenance
          property_management_pct: overrideValues.managementRate! / 100,
        },
      }
    }
    
    if (isSavedPropertyMode && record?.initial_assumptions) {
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
  }, [isSavedPropertyMode, record, overrideValues])

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

  // Verdict and pricing calculations
  const verdictInfo = getVerdictLabel(analysis.dealScore)
  
  const isOffMarket = !property.listingStatus || 
    property.listingStatus === 'OFF_MARKET' || 
    property.listingStatus === 'SOLD' ||
    property.listingStatus === 'FOR_RENT'
  
  const marketValue = isOffMarket 
    ? (property.zestimate || property.price) 
    : property.price
  const priceSource = isOffMarket 
    ? (property.zestimate ? 'Zestimate' : 'Market Estimate')
    : 'Asking Price'

  // Base prices from analysis (before any overrides)
  const baseBreakevenPrice = analysis.breakevenPrice || Math.round(marketValue * 1.1)
  const baseBuyPrice = analysis.purchasePrice || Math.round(baseBreakevenPrice * 0.95)
  
  // Use override buy price if available, otherwise fall back to calculated
  const effectiveBuyPrice = overrideValues?.buyPrice ?? baseBuyPrice
  
  // Recalculate breakeven based on override values if available
  const breakevenPrice = useMemo(() => {
    if (!overrideValues) return baseBreakevenPrice
    
    // Recalculate breakeven based on new terms
    const monthlyRent = overrideValues.monthlyRent ?? property.monthlyRent ?? effectiveBuyPrice * 0.007
    const annualRent = monthlyRent * 12
    const vacancyRate = (overrideValues.vacancyRate ?? 1) / 100
    const effectiveIncome = annualRent * (1 - vacancyRate)
    
    const propertyTaxes = overrideValues.propertyTaxes ?? property.propertyTaxes ?? effectiveBuyPrice * 0.012
    const insurance = overrideValues.insurance ?? property.insurance ?? effectiveBuyPrice * 0.01
    const managementRate = (overrideValues.managementRate ?? 0) / 100
    const maintenance = annualRent * 0.05
    const management = annualRent * managementRate
    
    const noi = effectiveIncome - propertyTaxes - insurance - maintenance - management
    
    // Calculate mortgage constant
    const rate = (overrideValues.interestRate ?? 6) / 100 / 12
    const term = (overrideValues.loanTerm ?? 30) * 12
    const downPmt = (overrideValues.downPayment ?? 20) / 100
    const loanRatio = 1 - downPmt
    
    const monthlyRate = rate
    const mortgageConstant = loanRatio * (monthlyRate * Math.pow(1 + monthlyRate, term)) / 
      (Math.pow(1 + monthlyRate, term) - 1) * 12
    
    // Breakeven = NOI / Mortgage Constant
    return mortgageConstant > 0 ? Math.round(noi / mortgageConstant) : baseBreakevenPrice
  }, [overrideValues, property, effectiveBuyPrice, baseBreakevenPrice])
  
  const buyPrice = effectiveBuyPrice
  const wholesalePrice = Math.round(breakevenPrice * 0.70)

  const estValue = isSavedPropertyMode && record?.list_price
    ? record.list_price
    : marketValue

  // User target price uses override buy price if available
  const userTargetPrice = overrideValues?.buyPrice 
    ?? (isSavedPropertyMode && record?.buy_price ? record.buy_price : breakevenPrice)
  const discountNeeded = estValue - userTargetPrice

  const calculatedDealGap = estValue > 0 
    ? ((estValue - userTargetPrice) / estValue) * 100 
    : 0

  // Opportunity factors - recalculate deal gap when override values are present
  const opportunityFactors = useMemo(() => ({
    dealGap: overrideValues 
      ? calculatedDealGap
      : (isSavedPropertyMode 
          ? calculatedDealGap
          : (analysis.opportunityFactors?.dealGap ?? analysis.discountPercent ?? 0)),
    motivation: analysis.opportunityFactors?.motivation ?? 50,
    motivationLabel: analysis.opportunityFactors?.motivationLabel ?? 'Medium',
    daysOnMarket: analysis.opportunityFactors?.daysOnMarket ?? null,
    distressedSale: analysis.opportunityFactors?.distressedSale ?? false,
  }), [overrideValues, calculatedDealGap, isSavedPropertyMode, analysis])

  const sellerMotivation = {
    level: opportunityFactors.motivationLabel,
    score: `${opportunityFactors.motivation}/100`,
    maxDiscount: `Up to ${Math.round((opportunityFactors.motivation / 100) * 25)}%`,
    suggestedOffer: `${getSuggestedOffer(opportunityFactors.motivation).min}% - ${getSuggestedOffer(opportunityFactors.motivation).max}% below asking`,
  }

  // Calculate metrics for snapshots and benchmarks
  const metrics = useMemo(() => {
    // Use override values if available, otherwise fall back to defaults
    const effectivePrice = overrideValues?.buyPrice 
      ?? (isSavedPropertyMode && record?.buy_price ? record.buy_price : buyPrice)
    const monthlyRent = overrideValues?.monthlyRent 
      ?? property.monthlyRent 
      ?? effectivePrice * 0.007
    const propertyTaxes = overrideValues?.propertyTaxes 
      ?? property.propertyTaxes 
      ?? effectivePrice * 0.012
    const insurance = overrideValues?.insurance 
      ?? property.insurance 
      ?? effectivePrice * 0.01

    const annualRent = monthlyRent * 12
    const noi = annualRent - propertyTaxes - insurance - (annualRent * defaults.operating.vacancy_rate) - (annualRent * defaults.operating.maintenance_pct)
    const downPayment = effectivePrice * defaults.financing.down_payment_pct
    const loanAmount = effectivePrice * (1 - defaults.financing.down_payment_pct)
    const closingCosts = effectivePrice * (defaults.financing.closing_costs_pct || 0.03)
    const rehabBudget = overrideValues?.rehabBudget ?? 0
    const totalInvestment = downPayment + closingCosts + rehabBudget

    // Simple annual debt service calculation
    const monthlyRate = defaults.financing.interest_rate / 12
    const numPayments = defaults.financing.loan_term_years * 12
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    const annualDebtService = monthlyPI * 12
    
    const annualCashFlow = noi - annualDebtService
    const monthlyCashFlow = annualCashFlow / 12

    const capRate = effectivePrice > 0 ? (noi / effectivePrice) * 100 : 0
    const cashOnCash = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0
    const dscr = annualDebtService > 0 ? noi / annualDebtService : 0

    const arv = overrideValues?.arv ?? property.arv ?? effectivePrice * 1.15
    const totalBasis = effectivePrice + rehabBudget
    const equityCapture = totalBasis > 0 ? ((arv - totalBasis) / totalBasis) * 100 : 0

    const totalExpenses = propertyTaxes + insurance + (annualRent * defaults.operating.vacancy_rate) + (annualRent * defaults.operating.maintenance_pct)
    const expenseRatio = annualRent > 0 ? (totalExpenses / annualRent) * 100 : 0

    const fixedCosts = propertyTaxes + insurance + annualDebtService
    const breakevenOcc = annualRent > 0 ? (fixedCosts / annualRent) * 100 : 0

    const cashFlowYield = totalInvestment > 0 ? (annualCashFlow / totalInvestment) * 100 : 0

    return {
      capRate,
      cashOnCash,
      dscr,
      monthlyCashFlow,
      noi,
      totalInvestment,
      equityCapture,
      expenseRatio,
      breakevenOcc,
      cashFlowYield,
    }
  }, [property, buyPrice, defaults, isSavedPropertyMode, record, overrideValues])

  // Performance bars for At-a-Glance
  const performanceBars = useMemo(() => [
    { label: 'Returns', value: Math.min(100, Math.max(0, metrics.capRate * 12)) },
    { label: 'Cash Flow', value: Math.min(100, Math.max(0, metrics.cashFlowYield * 5)) },
    { label: 'Equity Gain', value: Math.min(100, Math.max(0, metrics.equityCapture * 5)) },
    { label: 'Debt Safety', value: Math.min(100, Math.max(0, metrics.dscr * 70)) },
    { label: 'Cost Control', value: Math.min(100, Math.max(0, 100 - metrics.expenseRatio * 2)) },
    { label: 'Downside Risk', value: Math.min(100, Math.max(0, 100 - metrics.breakevenOcc)) },
  ], [metrics])

  // Calculate Total ROI (5yr) - simplified estimate
  const totalRoi5yr = useMemo(() => {
    // Estimate: cash flow return + appreciation (3%/yr) + principal paydown
    const annualCashFlowReturn = metrics.cashOnCash
    const annualAppreciation = 3 // Assume 3% annual appreciation
    const annualPrincipalPaydown = 2 // Rough estimate
    return (annualCashFlowReturn + annualAppreciation + annualPrincipalPaydown) * 5
  }, [metrics])

  // Calculate dynamic strategy metrics based on active price target and current strategy
  const strategyMetricsForDisplay = useMemo(() => {
    const strategyType = headerStrategyToType(currentStrategy)
    const metricIds = STRATEGY_METRICS[strategyType]?.[activePriceTarget] || STRATEGY_METRICS.ltr.targetBuy
    
    // Build calculation inputs
    const effectivePrice = overrideValues?.buyPrice 
      ?? (isSavedPropertyMode && record?.buy_price ? record.buy_price : buyPrice)
    const monthlyRent = overrideValues?.monthlyRent ?? property.monthlyRent ?? effectivePrice * 0.007
    const propertyTaxes = overrideValues?.propertyTaxes ?? property.propertyTaxes ?? effectivePrice * 0.012
    const insurance = overrideValues?.insurance ?? property.insurance ?? effectivePrice * 0.01
    
    const inputs: CalculationInputs = {
      listPrice: estValue,
      breakevenPrice,
      targetBuyPrice: buyPrice,
      wholesalePrice,
      arv: overrideValues?.arv ?? property.arv ?? buyPrice * 1.15,
      downPaymentPct: defaults.financing.down_payment_pct,
      interestRate: defaults.financing.interest_rate,
      loanTermYears: defaults.financing.loan_term_years,
      closingCostsPct: defaults.financing.closing_costs_pct || 0.03,
      monthlyRent,
      vacancyRate: defaults.operating.vacancy_rate,
      propertyTaxes,
      insurance,
      hoaFees: property.hoa ?? 0,
      managementRate: defaults.operating.property_management_pct,
      maintenanceRate: defaults.operating.maintenance_pct,
      capexRate: overrideValues?.capexRate ? overrideValues.capexRate / 100 : 0.05,
      // STR fields
      averageDailyRate: overrideValues?.averageDailyRate ?? 200,
      occupancyRate: (overrideValues?.occupancyRate ?? 65) / 100,
      platformFeeRate: (overrideValues?.platformFeeRate ?? 15) / 100,
      strManagementRate: (overrideValues?.strManagementRate ?? 20) / 100,
      // BRRRR fields
      rehabBudget: overrideValues?.rehabBudget ?? 0,
      contingencyPct: (overrideValues?.contingencyPct ?? 10) / 100,
      holdingPeriodMonths: overrideValues?.holdingPeriodMonths ?? 6,
      holdingCostsMonthly: overrideValues?.holdingCostsMonthly ?? 1500,
      postRehabMonthlyRent: overrideValues?.postRehabMonthlyRent ?? monthlyRent,
      refinanceLtv: (overrideValues?.refinanceLtv ?? 75) / 100,
      refinanceInterestRate: (overrideValues?.refinanceInterestRate ?? 6.5) / 100,
      refinanceTermYears: overrideValues?.refinanceTermYears ?? 30,
      // Flip fields
      rehabTimeMonths: overrideValues?.rehabTimeMonths ?? 4,
      daysOnMarket: overrideValues?.daysOnMarket ?? 45,
      sellingCostsPct: (overrideValues?.sellingCostsPct ?? 8) / 100,
      capitalGainsRate: (overrideValues?.capitalGainsRate ?? 25) / 100,
      hardMoneyRate: (overrideValues?.hardMoneyRate ?? 12) / 100,
      hardMoneyLtv: (overrideValues?.hardMoneyLtv ?? 90) / 100,
      loanPoints: (overrideValues?.loanPoints ?? 2) / 100,
      // House Hack fields
      totalUnits: overrideValues?.totalUnits ?? 4,
      ownerOccupiedUnits: overrideValues?.ownerOccupiedUnits ?? 1,
      // Calculate avgRentPerUnit based on actual totalUnits, not hardcoded 4
      avgRentPerUnit: overrideValues?.avgRentPerUnit ?? monthlyRent / (overrideValues?.totalUnits ?? 4),
      currentHousingPayment: overrideValues?.currentHousingPayment ?? 2000,
      pmiRate: (overrideValues?.pmiRate ?? 0.85) / 100,
      // Wholesale fields
      contractPrice: overrideValues?.contractPrice ?? buyPrice * 0.85,
      assignmentFee: overrideValues?.assignmentFee ?? 15000,
      earnestMoney: overrideValues?.earnestMoney ?? 1000,
      marketingCosts: overrideValues?.marketingCosts ?? 500,
      wholesaleClosingCosts: overrideValues?.wholesaleClosingCosts ?? 500,
      estimatedRepairs: overrideValues?.estimatedRepairs ?? 40000,
    }
    
    // Calculate metrics
    const calculatedMetrics = calculateStrategyMetrics(strategyType, activePriceTarget, inputs, metricIds)
    
    return calculatedMetrics.map(m => ({
      id: m.id,
      label: m.label,
      value: m.formatted,
    }))
  }, [
    currentStrategy, 
    activePriceTarget, 
    overrideValues, 
    isSavedPropertyMode, 
    record, 
    buyPrice, 
    property, 
    estValue, 
    breakevenPrice, 
    wholesalePrice, 
    defaults
  ])

  // Handle price target change
  const handlePriceTargetChange = useCallback((target: PriceTarget) => {
    setActivePriceTarget(target)
  }, [])

  // Benchmark metrics - 7 metrics with categories
  const benchmarkMetrics = useMemo(() => [
    // Returns Category
    {
      key: 'cashOnCash',
      label: 'Cash on Cash Return',
      value: metrics.cashOnCash,
      displayValue: `${metrics.cashOnCash.toFixed(1)}%`,
      range: NATIONAL_RANGES.cashOnCash,
      category: 'returns' as const,
    },
    {
      key: 'capRate',
      label: 'Cap Rate',
      value: metrics.capRate,
      displayValue: `${metrics.capRate.toFixed(1)}%`,
      range: NATIONAL_RANGES.capRate,
      category: 'returns' as const,
    },
    {
      key: 'totalRoi',
      label: 'Total ROI (5yr)',
      value: totalRoi5yr,
      displayValue: `${totalRoi5yr.toFixed(0)}%`,
      range: NATIONAL_RANGES.totalRoi,
      category: 'returns' as const,
    },
    // Cash Flow & Risk Category
    {
      key: 'cashFlowYield',
      label: 'Cash Flow Yield',
      value: metrics.cashFlowYield,
      displayValue: `${metrics.cashFlowYield.toFixed(1)}%`,
      range: NATIONAL_RANGES.cashFlowYield,
      category: 'cashflow' as const,
    },
    {
      key: 'dscr',
      label: 'Debt Service Coverage',
      value: metrics.dscr,
      displayValue: metrics.dscr.toFixed(2),
      range: NATIONAL_RANGES.dscr,
      category: 'cashflow' as const,
    },
    {
      key: 'expenseRatio',
      label: 'Expense Ratio',
      value: metrics.expenseRatio,
      displayValue: `${metrics.expenseRatio.toFixed(0)}%`,
      range: NATIONAL_RANGES.expenseRatio,
      category: 'cashflow' as const,
    },
    {
      key: 'breakevenOcc',
      label: 'Breakeven Occupancy',
      value: metrics.breakevenOcc,
      displayValue: `${metrics.breakevenOcc.toFixed(0)}%`,
      range: NATIONAL_RANGES.breakevenOcc,
      category: 'cashflow' as const,
    },
  ], [metrics, totalRoi5yr])

  // Composite score
  const compositeScore = useMemo(() => {
    let score = 50
    if (metrics.capRate >= 6) score += 15
    else if (metrics.capRate >= 4) score += 5
    if (metrics.cashOnCash >= 8) score += 15
    else if (metrics.cashOnCash >= 4) score += 5
    if (metrics.dscr >= 1.25) score += 10
    else if (metrics.dscr >= 1.0) score += 5
    if (metrics.equityCapture >= 15) score += 10
    return Math.min(100, Math.max(0, score))
  }, [metrics])

  // Opportunity factors for collapsible section
  const factors = [
    { 
      icon: 'clock' as const, 
      label: 'Long Listing Duration', 
      value: opportunityFactors.daysOnMarket && opportunityFactors.daysOnMarket > 60 ? 'Yes' : 'No', 
      positive: !!(opportunityFactors.daysOnMarket && opportunityFactors.daysOnMarket > 60)
    },
    { 
      icon: 'alert' as const, 
      label: 'Distressed Sale', 
      value: opportunityFactors.distressedSale ? 'Yes' : 'No', 
      positive: !!opportunityFactors.distressedSale 
    },
  ]

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleStrategyChange = useCallback((strategy: string) => {
    setCurrentStrategy(strategy)
  }, [])

  // Handle strategy change from popup (maps popup type back to header format)
  const handlePopupStrategyChange = useCallback((popupStrategy: PopupStrategyType) => {
    const headerMap: Record<PopupStrategyType, string> = {
      ltr: 'Long-term',
      str: 'Short-term',
      brrrr: 'BRRRR',
      flip: 'Fix & Flip',
      house_hack: 'House Hack',
      wholesale: 'Wholesale',
    }
    setCurrentStrategy(headerMap[popupStrategy])
  }, [])

  // Open DealMaker popup instead of navigating to page
  const handleOpenDealMakerPopup = useCallback(() => {
    setDealMakerInitialTab(undefined)
    setShowDealMakerPopup(true)
  }, [])

  // Open DealMaker popup with a specific tab
  const openDealMakerWithTab = useCallback((tab: DealMakerTab) => {
    setDealMakerInitialTab(tab)
    setShowDealMakerPopup(true)
  }, [])

  // Handle apply from DealMaker popup
  const handleApplyDealMakerValues = useCallback((values: DealMakerValues) => {
    setOverrideValues(values)
    setShowDealMakerPopup(false)
  }, [])

  // For backward compatibility - calls popup
  const handleNavigateToDealMaker = useCallback(() => {
    handleOpenDealMakerPopup()
  }, [handleOpenDealMakerPopup])

  const handleEditAssumptions = useCallback(() => {
    handleOpenDealMakerPopup()
  }, [handleOpenDealMakerPopup])

  // Export proforma handlers
  const handleExportProforma = useCallback(async (format: 'excel' | 'pdf') => {
    // Use property.id (always available) or fallback to analysis.propertyId or savedPropertyId
    const propertyIdToUse = property.id || analysis.propertyId || savedPropertyId
    if (!propertyIdToUse) {
      setExportError('Property ID not found')
      return
    }

    setIsExporting(true)
    setExportError(null)

    try {
      // Map current strategy to API format
      const strategyMap: Record<string, string> = {
        'Long-term': 'ltr',
        'Short-term': 'str',
        'BRRRR': 'brrrr',
        'Fix & Flip': 'flip',
        'House Hack': 'house_hack',
        'Wholesale': 'wholesale',
      }
      const strategy = strategyMap[currentStrategy] || 'ltr'

      let blob: Blob
      let filename: string
      
      // Build full address for property lookup
      const fullAddress = [property.address, property.city, property.state, property.zip]
        .filter(Boolean)
        .join(', ')
      
      // Excel export only - include strategy
      // Note: priceTarget support to be added when backend API is updated
      blob = await api.proforma.downloadExcel({
        propertyId: propertyIdToUse,
        address: fullAddress,
        strategy,
        holdPeriodYears: 10,
      })
      filename = `Proforma_${property.address?.replace(/\s+/g, '_').slice(0, 30)}_${strategy.toUpperCase()}.xlsx`

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }, [property.id, analysis.propertyId, savedPropertyId, currentStrategy, property.address, activePriceTarget])

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
        onStrategyChange={handleStrategyChange}
        defaultPropertyOpen={true}
        savedPropertyId={savedPropertyId}
      />

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto pb-36">
        {/* Verdict Hero */}
        <VerdictHero
          dealScore={analysis.dealScore}
          verdictLabel={verdictInfo.label}
          verdictSublabel={verdictInfo.sublabel}
          dealGap={opportunityFactors.dealGap}
          motivationLevel={sellerMotivation.level}
          motivationScore={opportunityFactors.motivation}
          onShowMethodology={() => setShowMethodology(true)}
        />

        {/* Investment Analysis with Price Cards */}
        <InvestmentAnalysis
          breakevenPrice={breakevenPrice}
          targetBuyPrice={buyPrice}
          wholesalePrice={wholesalePrice}
          isOffMarket={isOffMarket}
          priceSource={priceSource}
          marketValue={estValue}
          financing={defaults.financing}
          operating={defaults.operating}
          onEditAssumptions={handleEditAssumptions}
          currentStrategy={currentStrategy}
          onStrategyChange={handleStrategyChange}
          monthlyCashFlow={metrics.monthlyCashFlow}
          cashNeeded={metrics.totalInvestment}
          capRate={metrics.capRate / 100}
          activePriceTarget={activePriceTarget}
          onPriceTargetChange={handlePriceTargetChange}
          strategyMetrics={strategyMetricsForDisplay}
        />

        {/* Financial Breakdown - Detailed breakdown synced with DealMakerIQ */}
        <FinancialBreakdown
          buyPrice={overrideValues?.buyPrice ?? (isSavedPropertyMode && record?.buy_price ? record.buy_price : buyPrice)}
          targetBuyPrice={buyPrice}
          downPaymentPct={defaults.financing.down_payment_pct * 100}
          interestRate={defaults.financing.interest_rate * 100}
          loanTermYears={defaults.financing.loan_term_years}
          monthlyRent={overrideValues?.monthlyRent ?? property.monthlyRent ?? Math.round(buyPrice * 0.007)}
          vacancyRate={defaults.operating.vacancy_rate * 100}
          otherIncome={0}
          propertyTaxes={overrideValues?.propertyTaxes ?? property.propertyTaxes ?? Math.round(buyPrice * 0.012)}
          insurance={overrideValues?.insurance ?? property.insurance ?? Math.round(buyPrice * 0.01)}
          hoaFees={property.hoa ?? 0}
          managementRate={defaults.operating.property_management_pct * 100}
          maintenanceRate={defaults.operating.maintenance_pct * 100}
          utilities={overrideValues?.utilitiesMonthly ?? 100}
          landscaping={0}
          pestControl={0}
          capexRate={overrideValues?.capexRate ?? 5}
          otherExpenses={0}
          onAdjustTerms={() => openDealMakerWithTab('buy-price')}
          onAdjustIncome={() => openDealMakerWithTab('income')}
          onAdjustExpenses={() => openDealMakerWithTab('expenses')}
          onAdjustDebt={() => openDealMakerWithTab('financing')}
          strategy={headerStrategyToType(currentStrategy)}
          priceTarget={activePriceTarget}
          // BRRRR props
          rehabBudget={overrideValues?.rehabBudget ?? 0}
          contingencyPct={overrideValues?.contingencyPct ?? 10}
          holdingPeriodMonths={overrideValues?.holdingPeriodMonths ?? 6}
          holdingCostsMonthly={overrideValues?.holdingCostsMonthly ?? 1500}
          arv={overrideValues?.arv ?? property.arv ?? buyPrice * 1.15}
          refinanceLtv={overrideValues?.refinanceLtv ?? 75}
          refinanceInterestRate={overrideValues?.refinanceInterestRate ?? defaults.financing.interest_rate * 100}
          refinanceTermYears={overrideValues?.refinanceTermYears ?? 30}
          postRehabMonthlyRent={overrideValues?.postRehabMonthlyRent ?? property.monthlyRent ?? Math.round(buyPrice * 0.007)}
          // Flip props
          rehabTimeMonths={overrideValues?.rehabTimeMonths ?? 4}
          daysOnMarket={overrideValues?.daysOnMarket ?? 45}
          sellingCostsPct={overrideValues?.sellingCostsPct ?? 8}
          capitalGainsRate={overrideValues?.capitalGainsRate ?? 25}
          hardMoneyRate={overrideValues?.hardMoneyRate ?? 12}
          hardMoneyLtv={overrideValues?.hardMoneyLtv ?? 90}
          loanPoints={overrideValues?.loanPoints ?? 2}
          // House Hack props
          totalUnits={overrideValues?.totalUnits ?? 4}
          ownerOccupiedUnits={overrideValues?.ownerOccupiedUnits ?? 1}
          avgRentPerUnit={overrideValues?.avgRentPerUnit ?? Math.round((property.monthlyRent ?? buyPrice * 0.007) / (overrideValues?.totalUnits ?? 4))}
          currentHousingPayment={overrideValues?.currentHousingPayment ?? 2000}
          pmiRate={overrideValues?.pmiRate ?? 0.85}
          // Wholesale props
          contractPrice={overrideValues?.contractPrice ?? buyPrice * 0.85}
          assignmentFee={overrideValues?.assignmentFee ?? 15000}
          earnestMoney={overrideValues?.earnestMoney ?? 1000}
          marketingCosts={overrideValues?.marketingCosts ?? 500}
          wholesaleClosingCosts={overrideValues?.wholesaleClosingCosts ?? 500}
          estimatedRepairs={overrideValues?.estimatedRepairs ?? 40000}
        />

        {/* Section Separator Bar */}
        <div className="h-3 bg-[#E2E8F0]" />

        {/* Deal Gap & Motivation Section - Collapsible Dropdown */}
        <div className="bg-white border-b border-[#E2E8F0]">
          {/* Dropdown Header */}
          <button
            onClick={() => setShowPriceLikelihood(!showPriceLikelihood)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors bg-white border-none cursor-pointer"
          >
            <span className="text-sm font-bold text-[#0A1628] uppercase tracking-wide">
              How Likely Can You Get This Price?
            </span>
            <ChevronDown 
              className={`w-5 h-5 text-[#64748B] transition-transform duration-200 ${showPriceLikelihood ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Expandable Content */}
          {showPriceLikelihood && (
            <div className="px-5 pb-4">
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

              {/* Additional Opportunity Factors - Integrated */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#475569] mb-3">
                  Additional Opportunity Factors
                </div>
                {factors.map((factor, index) => (
                  <div key={index} className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2.5 text-[13px] text-[#475569]">
                      {factor.icon === 'clock' ? (
                        <Clock className="w-4 h-4 text-[#94A3B8]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#94A3B8]" />
                      )}
                      {factor.label}
                    </div>
                    <span className={`text-[13px] font-semibold ${factor.positive ? 'text-[#0891B2]' : 'text-[#94A3B8]'}`}>
                      {factor.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* At-a-Glance */}
        <AtAGlanceSection
          bars={performanceBars}
          compositeScore={compositeScore}
        />

        {/* Performance Benchmarks */}
        <PerformanceBenchmarksSection
          metrics={benchmarkMetrics}
          onNavigateToDealMaker={handleNavigateToDealMaker}
        />
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-[#E2E8F0] p-4 px-5">
        <button 
          className="w-full flex items-center justify-center gap-2 bg-[#0891B2] text-white py-4 rounded-xl text-[15px] font-semibold cursor-pointer border-none mb-3 hover:bg-[#0E7490] active:scale-[0.98] transition-all"
          onClick={handleNavigateToDealMaker}
        >
          Go to Deal Maker IQ
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>
        
        {/* Export Proforma Button - Direct Excel Download */}
        <div className="relative">
          <button 
            className="w-full flex items-center justify-center gap-2 bg-transparent text-[#64748B] py-3 text-[13px] font-medium cursor-pointer border-none hover:text-[#0A1628] transition-colors disabled:opacity-50"
            onClick={() => handleExportProforma('excel')}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Export Financial Proforma
              </>
            )}
          </button>
          
          {/* Export Error */}
          {exportError && (
            <p className="text-center text-[11px] text-red-500 mt-1">{exportError}</p>
          )}
        </div>
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

      {/* DealMaker Popup */}
      <DealMakerPopup
        isOpen={showDealMakerPopup}
        onClose={() => setShowDealMakerPopup(false)}
        onApply={handleApplyDealMakerValues}
        strategyType={getPopupStrategyType(currentStrategy)}
        onStrategyChange={handlePopupStrategyChange}
        initialTab={dealMakerInitialTab}
        activePriceTarget={activePriceTarget}
        onPriceTargetChange={handlePriceTargetChange}
        initialValues={{
          // Common fields
          buyPrice: overrideValues?.buyPrice ?? (isSavedPropertyMode && record?.buy_price ? record.buy_price : buyPrice),
          downPayment: (defaults.financing.down_payment_pct * 100),
          closingCosts: ((defaults.financing.closing_costs_pct || 0.03) * 100),
          interestRate: (defaults.financing.interest_rate * 100),
          loanTerm: defaults.financing.loan_term_years,
          rehabBudget: overrideValues?.rehabBudget ?? 0,
          arv: overrideValues?.arv ?? property.arv ?? buyPrice * 1.15,
          propertyTaxes: overrideValues?.propertyTaxes ?? property.propertyTaxes ?? Math.round(buyPrice * 0.012),
          insurance: overrideValues?.insurance ?? property.insurance ?? Math.round(buyPrice * 0.01),
          // LTR fields
          monthlyRent: overrideValues?.monthlyRent ?? property.monthlyRent ?? Math.round(buyPrice * 0.007),
          vacancyRate: (defaults.operating.vacancy_rate * 100),
          managementRate: (defaults.operating.property_management_pct * 100),
          // STR fields
          averageDailyRate: overrideValues?.averageDailyRate ?? 200,
          occupancyRate: overrideValues?.occupancyRate ?? 65,
          cleaningFeeRevenue: overrideValues?.cleaningFeeRevenue ?? 150,
          avgLengthOfStayDays: overrideValues?.avgLengthOfStayDays ?? 3,
          platformFeeRate: overrideValues?.platformFeeRate ?? 15,
          strManagementRate: overrideValues?.strManagementRate ?? 20,
          cleaningCostPerTurnover: overrideValues?.cleaningCostPerTurnover ?? 100,
          suppliesMonthly: overrideValues?.suppliesMonthly ?? 150,
          additionalUtilitiesMonthly: overrideValues?.additionalUtilitiesMonthly ?? 200,
          furnitureSetupCost: overrideValues?.furnitureSetupCost ?? 6000,
          // BRRRR fields
          buyDiscountPct: overrideValues?.buyDiscountPct ?? 15,
          hardMoneyRate: overrideValues?.hardMoneyRate ?? 12,
          holdingPeriodMonths: overrideValues?.holdingPeriodMonths ?? 6,
          holdingCostsMonthly: overrideValues?.holdingCostsMonthly ?? 1500,
          postRehabMonthlyRent: overrideValues?.postRehabMonthlyRent ?? property.monthlyRent ?? Math.round(buyPrice * 0.007),
          refinanceLtv: overrideValues?.refinanceLtv ?? 75,
          refinanceInterestRate: overrideValues?.refinanceInterestRate ?? 6.5,
          refinanceTermYears: overrideValues?.refinanceTermYears ?? 30,
          refinanceClosingCostsPct: overrideValues?.refinanceClosingCostsPct ?? 2,
          contingencyPct: overrideValues?.contingencyPct ?? 10,
          maintenanceRate: overrideValues?.maintenanceRate ?? 5,
          monthlyHoa: overrideValues?.monthlyHoa ?? 0,
          // Fix & Flip fields
          financingType: overrideValues?.financingType ?? 'hardMoney',
          hardMoneyLtv: overrideValues?.hardMoneyLtv ?? 90,
          loanPoints: overrideValues?.loanPoints ?? 2,
          rehabTimeMonths: overrideValues?.rehabTimeMonths ?? 4,
          daysOnMarket: overrideValues?.daysOnMarket ?? 45,
          sellingCostsPct: overrideValues?.sellingCostsPct ?? 8,
          capitalGainsRate: overrideValues?.capitalGainsRate ?? 25,
          // House Hack fields
          totalUnits: overrideValues?.totalUnits ?? 4,
          ownerOccupiedUnits: overrideValues?.ownerOccupiedUnits ?? 1,
          ownerUnitMarketRent: overrideValues?.ownerUnitMarketRent ?? 1500,
          loanType: overrideValues?.loanType ?? 'fha',
          pmiRate: overrideValues?.pmiRate ?? 0.85,
          avgRentPerUnit: overrideValues?.avgRentPerUnit ?? 1500,
          currentHousingPayment: overrideValues?.currentHousingPayment ?? 2000,
          utilitiesMonthly: overrideValues?.utilitiesMonthly ?? 200,
          capexRate: overrideValues?.capexRate ?? 5,
          // Wholesale fields
          estimatedRepairs: overrideValues?.estimatedRepairs ?? 40000,
          squareFootage: overrideValues?.squareFootage ?? property.sqft ?? 1500,
          contractPrice: overrideValues?.contractPrice ?? buyPrice * 0.85,
          earnestMoney: overrideValues?.earnestMoney ?? 1000,
          inspectionPeriodDays: overrideValues?.inspectionPeriodDays ?? 14,
          daysToClose: overrideValues?.daysToClose ?? 45,
          assignmentFee: overrideValues?.assignmentFee ?? 15000,
          marketingCosts: overrideValues?.marketingCosts ?? 500,
          wholesaleClosingCosts: overrideValues?.wholesaleClosingCosts ?? 500,
        }}
      />
    </div>
  )
}

export default VerdictIQCombined
