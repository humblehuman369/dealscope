/**
 * InvestIQ - Deal Scoring & Sensitivity Analysis
 * 
 * Deal Score is based on Investment Opportunity - how much discount from 
 * list price is needed to reach breakeven. Lower discount = better opportunity.
 * 
 * Enhanced Deal Opportunity Score considers:
 * 1. Deal Gap (50%) - ((List Price - Breakeven) / List Price) × 100
 * 2. Availability (30%) - Listing status and seller motivation
 * 3. Days on Market (20%) - Negotiation leverage context
 */

import {
  calculateDealOpportunityScore,
  getAvailabilityRanking,
  calculateDOMScore,
  type DealOpportunityScore as IQTargetDealScore,
  type AvailabilityInfo,
  type OpportunityGrade as IQOpportunityGrade,
} from './iqTarget'

// ============================================
// DEAL SCORE CALCULATION (Opportunity-Based)
// ============================================

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface DealScoreBreakdown {
  overall: number
  discountPercent: number
  breakevenPrice: number
  listPrice: number
  grade: OpportunityGrade
  label: string
  verdict: string
  strengths: string[]
  weaknesses: string[]
  // Enhanced scoring factors (optional - populated when listing info provided)
  factors?: {
    dealGapScore: number
    availabilityScore: number
    daysOnMarketScore: number
    availability?: AvailabilityInfo
    daysOnMarket?: number | null
    leverage?: 'high' | 'medium' | 'low' | 'unknown'
  }
}

export interface DealMetrics {
  monthlyCashFlow: number
  cashOnCash: number
  capRate: number
  onePercentRule: number
  dscr: number
  purchasePrice: number
  arv: number
  totalCashRequired: number
  monthlyRent: number
}

/**
 * Listing information for enhanced Deal Opportunity scoring
 */
export interface ListingInfo {
  listingStatus?: string | null
  sellerType?: string | null
  isForeclosure?: boolean
  isBankOwned?: boolean
  isFsbo?: boolean
  isAuction?: boolean
  priceReductions?: number
  daysOnMarket?: number | null
}

/**
 * Calculate Deal Score based on Investment Opportunity
 * 
 * Enhanced scoring considers multiple factors when listing info is provided:
 * - Deal Gap (50% weight): Discount needed from list to breakeven
 * - Availability (30% weight): Seller motivation based on listing status
 * - Days on Market (20% weight): Negotiation leverage context
 * 
 * Without listing info, uses Deal Gap only (legacy behavior).
 * 
 * Thresholds (with full scoring):
 * - 85-100 = Strong Opportunity (A+)
 * - 70-84 = Great Opportunity (A)
 * - 55-69 = Moderate Opportunity (B)
 * - 40-54 = Potential Opportunity (C)
 * - 25-39 = Weak Opportunity (D)
 * - 0-24 = Poor Opportunity (F)
 */
export function calculateDealScore(
  breakevenPrice: number,
  listPrice: number,
  metrics?: DealMetrics,
  listingInfo?: ListingInfo
): DealScoreBreakdown {
  // If listing info is provided, use enhanced scoring
  if (listingInfo) {
    const enhancedScore = calculateDealOpportunityScore(
      breakevenPrice,
      listPrice,
      {
        listingStatus: listingInfo.listingStatus,
        sellerType: listingInfo.sellerType,
        isForeclosure: listingInfo.isForeclosure,
        isBankOwned: listingInfo.isBankOwned,
        isFsbo: listingInfo.isFsbo,
        isAuction: listingInfo.isAuction,
        priceReductions: listingInfo.priceReductions,
        daysOnMarket: listingInfo.daysOnMarket,
      }
    )
    
    // Generate insights based on enhanced factors
    const strengths: string[] = []
    const weaknesses: string[] = []
    
    // Deal Gap insights
    if (enhancedScore.factors.dealGap.gapPercent <= 5) {
      strengths.push('Profitable near list price')
    } else if (enhancedScore.factors.dealGap.gapPercent <= 10) {
      strengths.push('Achievable with typical negotiation')
    }
    
    // Availability insights
    if (enhancedScore.factors.availability.motivationLevel === 'high') {
      strengths.push(`${enhancedScore.factors.availability.label}`)
    } else if (enhancedScore.factors.availability.status === 'PENDING') {
      weaknesses.push('Under contract - may need backup offer')
    } else if (enhancedScore.factors.availability.status === 'SOLD') {
      weaknesses.push('Recently sold - not available')
    }
    
    // Days on Market insights
    if (enhancedScore.factors.daysOnMarket.leverage === 'high') {
      const days = enhancedScore.factors.daysOnMarket.days
      strengths.push(`${days}+ days on market - negotiation leverage`)
    } else if (enhancedScore.factors.daysOnMarket.days !== null && 
               enhancedScore.factors.daysOnMarket.days < 14 &&
               enhancedScore.factors.dealGap.gapPercent <= 10) {
      strengths.push('New listing at reasonable price - act fast')
    }
    
    // Metrics insights
    if (metrics) {
      if (metrics.monthlyCashFlow >= 300) {
        strengths.push(`Strong cash flow potential ($${Math.round(metrics.monthlyCashFlow)}/mo)`)
      }
      if (metrics.dscr >= 1.25) {
        strengths.push(`Good debt coverage (DSCR: ${metrics.dscr.toFixed(2)})`)
      }
      if (metrics.monthlyCashFlow < 0) {
        weaknesses.push('Negative cash flow at list price')
      }
      if (metrics.dscr < 1.0) {
        weaknesses.push('Income may not cover debt service')
      }
    }
    
    // Deal Gap warnings
    if (enhancedScore.factors.dealGap.gapPercent > 25) {
      weaknesses.push(`Requires ${enhancedScore.factors.dealGap.gapPercent.toFixed(0)}% discount - may be unrealistic`)
    } else if (enhancedScore.factors.dealGap.gapPercent > 15) {
      weaknesses.push(`Needs significant negotiation (${enhancedScore.factors.dealGap.gapPercent.toFixed(0)}% off)`)
    }
    
    // Build verdict based on overall opportunity
    let verdict: string
    if (enhancedScore.score >= 85) {
      verdict = 'Excellent deal - all factors align favorably'
    } else if (enhancedScore.score >= 70) {
      verdict = 'Very good deal - strong fundamentals'
    } else if (enhancedScore.score >= 55) {
      verdict = 'Decent opportunity - negotiate firmly'
    } else if (enhancedScore.score >= 40) {
      verdict = 'Possible deal - significant work needed'
    } else if (enhancedScore.score >= 25) {
      verdict = 'Challenging deal - major price reduction required'
    } else {
      verdict = 'Not recommended - unrealistic discount needed'
    }
    
    return {
      overall: enhancedScore.score,
      discountPercent: enhancedScore.discountPercent,
      breakevenPrice: enhancedScore.breakevenPrice,
      listPrice: enhancedScore.listPrice,
      grade: enhancedScore.grade as OpportunityGrade,
      label: enhancedScore.label,
      verdict,
      strengths: strengths.slice(0, 4),
      weaknesses: weaknesses.slice(0, 4),
      factors: {
        dealGapScore: enhancedScore.factors.dealGap.score,
        availabilityScore: enhancedScore.factors.availability.score,
        daysOnMarketScore: enhancedScore.factors.daysOnMarket.score,
        availability: enhancedScore.factors.availability,
        daysOnMarket: enhancedScore.factors.daysOnMarket.days,
        leverage: enhancedScore.factors.daysOnMarket.leverage,
      }
    }
  }
  
  // Legacy scoring (Deal Gap only)
  const discountPercent = listPrice > 0 
    ? Math.max(0, ((listPrice - breakevenPrice) / listPrice) * 100)
    : 0
  
  // Score is inverse of discount (lower discount = higher score)
  // 0% discount = 100 score, 45% discount = 0 score
  const overall = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))))
  
  // Determine grade, label, verdict based on discount percentage
  let grade: OpportunityGrade
  let label: string
  let verdict: string
  
  if (discountPercent <= 5) {
    grade = 'A+'
    label = 'Strong Opportunity'
    verdict = 'Excellent deal - minimal negotiation needed'
  } else if (discountPercent <= 10) {
    grade = 'A'
    label = 'Great Opportunity'
    verdict = 'Very good deal - reasonable negotiation required'
  } else if (discountPercent <= 15) {
    grade = 'B'
    label = 'Moderate Opportunity'
    verdict = 'Good potential - negotiate firmly'
  } else if (discountPercent <= 25) {
    grade = 'C'
    label = 'Potential Opportunity'
    verdict = 'Possible deal - significant discount needed'
  } else if (discountPercent <= 35) {
    grade = 'D'
    label = 'Weak Opportunity'
    verdict = 'Challenging deal - major price reduction required'
  } else {
    grade = 'F'
    label = 'Poor Opportunity'
    verdict = 'Not recommended - unrealistic discount needed'
  }
  
  // Generate insights
  const strengths: string[] = []
  const weaknesses: string[] = []
  
  if (discountPercent <= 5) {
    strengths.push('Profitable near list price')
  } else if (discountPercent <= 10) {
    strengths.push('Achievable with typical negotiation')
  }
  
  if (metrics) {
    if (metrics.monthlyCashFlow >= 300) {
      strengths.push(`Strong cash flow potential ($${Math.round(metrics.monthlyCashFlow)}/mo)`)
    }
    if (metrics.dscr >= 1.25) {
      strengths.push(`Good debt coverage (DSCR: ${metrics.dscr.toFixed(2)})`)
    }
    if (metrics.monthlyCashFlow < 0) {
      weaknesses.push('Negative cash flow at list price')
    }
    if (metrics.dscr < 1.0) {
      weaknesses.push('Income may not cover debt service')
    }
  }
  
  if (discountPercent > 25) {
    weaknesses.push(`Requires ${discountPercent.toFixed(0)}% discount - may be unrealistic`)
  } else if (discountPercent > 15) {
    weaknesses.push(`Needs significant negotiation (${discountPercent.toFixed(0)}% off)`)
  }
  
  return {
    overall,
    discountPercent,
    breakevenPrice,
    listPrice,
    grade,
    label,
    verdict,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4)
  }
}

/**
 * Legacy function for backwards compatibility
 * Uses metrics to estimate breakeven internally
 */
export function calculateDealScoreFromMetrics(
  metrics: DealMetrics,
  listingInfo?: ListingInfo
): DealScoreBreakdown {
  // Estimate breakeven as purchase price adjusted for cash flow
  // This is a simplified estimate - actual calculation should use binary search
  const monthlyDeficit = metrics.monthlyCashFlow < 0 ? Math.abs(metrics.monthlyCashFlow) : 0
  const annualDeficit = monthlyDeficit * 12
  const breakevenEstimate = metrics.purchasePrice - (annualDeficit * 10) // Rough estimate
  
  return calculateDealScore(breakevenEstimate, metrics.purchasePrice, metrics, listingInfo)
}

// Re-export enhanced scoring functions for direct use
export { 
  calculateDealOpportunityScore,
  getAvailabilityRanking,
  calculateDOMScore,
  type IQTargetDealScore,
  type AvailabilityInfo 
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

export interface SensitivityPoint {
  value: number
  cashFlow: number
  cashOnCash: number
  capRate: number
}

export interface SensitivityAnalysis {
  interestRate: SensitivityPoint[]
  purchasePrice: SensitivityPoint[]
  rent: SensitivityPoint[]
  vacancy: SensitivityPoint[]
}

export interface BaseAssumptions {
  purchasePrice: number
  downPaymentPct: number
  interestRate: number
  loanTermYears: number
  monthlyRent: number
  propertyTaxes: number
  insurance: number
  vacancyRate: number
  managementPct: number
  maintenancePct: number
}

function calculateMetricsForScenario(
  assumptions: BaseAssumptions
): { cashFlow: number; cashOnCash: number; capRate: number } {
  const downPayment = assumptions.purchasePrice * assumptions.downPaymentPct
  const closingCosts = assumptions.purchasePrice * 0.03
  const loanAmount = assumptions.purchasePrice - downPayment
  const totalCashRequired = downPayment + closingCosts
  
  // Monthly mortgage
  const monthlyRate = assumptions.interestRate / 12
  const numPayments = assumptions.loanTermYears * 12
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  const annualDebtService = monthlyPI * 12
  
  // Income
  const annualRent = assumptions.monthlyRent * 12
  const effectiveRent = annualRent * (1 - assumptions.vacancyRate)
  
  // Expenses
  const opEx = assumptions.propertyTaxes + assumptions.insurance + 
    annualRent * (assumptions.managementPct + assumptions.maintenancePct)
  
  const noi = effectiveRent - opEx
  const annualCashFlow = noi - annualDebtService
  
  return {
    cashFlow: annualCashFlow / 12,
    cashOnCash: totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0,
    capRate: assumptions.purchasePrice > 0 ? noi / assumptions.purchasePrice : 0
  }
}

export function calculateSensitivityAnalysis(
  baseAssumptions: BaseAssumptions
): SensitivityAnalysis {
  // Interest Rate Sensitivity: -1.5% to +1.5%
  const interestRatePoints: SensitivityPoint[] = []
  for (let delta = -0.015; delta <= 0.015; delta += 0.005) {
    const rate = Math.max(0.01, baseAssumptions.interestRate + delta)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      interestRate: rate
    })
    interestRatePoints.push({
      value: rate,
      ...metrics
    })
  }
  
  // Purchase Price Sensitivity: -15% to +15%
  const pricePoints: SensitivityPoint[] = []
  for (let pct = -0.15; pct <= 0.15; pct += 0.05) {
    const price = baseAssumptions.purchasePrice * (1 + pct)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      purchasePrice: price
    })
    pricePoints.push({
      value: price,
      ...metrics
    })
  }
  
  // Rent Sensitivity: -15% to +15%
  const rentPoints: SensitivityPoint[] = []
  for (let pct = -0.15; pct <= 0.15; pct += 0.05) {
    const rent = baseAssumptions.monthlyRent * (1 + pct)
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      monthlyRent: rent
    })
    rentPoints.push({
      value: rent,
      ...metrics
    })
  }
  
  // Vacancy Sensitivity: 0% to 15%
  const vacancyPoints: SensitivityPoint[] = []
  for (let vac = 0; vac <= 0.15; vac += 0.025) {
    const metrics = calculateMetricsForScenario({
      ...baseAssumptions,
      vacancyRate: vac
    })
    vacancyPoints.push({
      value: vac,
      ...metrics
    })
  }
  
  return {
    interestRate: interestRatePoints,
    purchasePrice: pricePoints,
    rent: rentPoints,
    vacancy: vacancyPoints
  }
}

// ============================================
// REHAB ESTIMATOR
// ============================================

export interface RehabCategory {
  id: string
  name: string
  icon: string
  items: RehabItem[]
}

export interface RehabItem {
  id: string
  name: string
  lowCost: number
  midCost: number
  highCost: number
  unit: string
  defaultQuantity: number
}

export interface RehabSelection {
  itemId: string
  quantity: number
  tier: 'low' | 'mid' | 'high'
}

export interface RehabEstimate {
  totalCost: number
  breakdown: {
    category: string
    cost: number
  }[]
  contingency: number
  grandTotal: number
}

export const REHAB_CATEGORIES: RehabCategory[] = [
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: '🍳',
    items: [
      { id: 'cabinets', name: 'Cabinets', lowCost: 3000, midCost: 8000, highCost: 20000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'countertops', name: 'Countertops', lowCost: 1500, midCost: 4000, highCost: 10000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'appliances', name: 'Appliances Package', lowCost: 2000, midCost: 5000, highCost: 15000, unit: 'set', defaultQuantity: 1 },
      { id: 'backsplash', name: 'Backsplash', lowCost: 400, midCost: 1200, highCost: 3000, unit: 'kitchen', defaultQuantity: 1 },
      { id: 'sink_faucet', name: 'Sink & Faucet', lowCost: 300, midCost: 800, highCost: 2000, unit: 'each', defaultQuantity: 1 },
    ]
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    icon: '🚿',
    items: [
      { id: 'full_bath', name: 'Full Bath Remodel', lowCost: 5000, midCost: 12000, highCost: 30000, unit: 'bathroom', defaultQuantity: 1 },
      { id: 'half_bath', name: 'Half Bath Remodel', lowCost: 2500, midCost: 6000, highCost: 15000, unit: 'bathroom', defaultQuantity: 1 },
      { id: 'vanity', name: 'Vanity & Sink', lowCost: 300, midCost: 800, highCost: 2500, unit: 'each', defaultQuantity: 1 },
      { id: 'toilet', name: 'Toilet', lowCost: 150, midCost: 400, highCost: 1000, unit: 'each', defaultQuantity: 1 },
      { id: 'tub_shower', name: 'Tub/Shower', lowCost: 500, midCost: 2000, highCost: 6000, unit: 'each', defaultQuantity: 1 },
    ]
  },
  {
    id: 'flooring',
    name: 'Flooring',
    icon: '🏠',
    items: [
      { id: 'lvp', name: 'Luxury Vinyl Plank', lowCost: 3, midCost: 6, highCost: 10, unit: 'sqft', defaultQuantity: 1500 },
      { id: 'hardwood', name: 'Hardwood', lowCost: 6, midCost: 12, highCost: 20, unit: 'sqft', defaultQuantity: 1500 },
      { id: 'tile', name: 'Tile', lowCost: 5, midCost: 10, highCost: 20, unit: 'sqft', defaultQuantity: 200 },
      { id: 'carpet', name: 'Carpet', lowCost: 2, midCost: 5, highCost: 10, unit: 'sqft', defaultQuantity: 500 },
    ]
  },
  {
    id: 'paint',
    name: 'Paint & Walls',
    icon: '🎨',
    items: [
      { id: 'interior_paint', name: 'Interior Paint', lowCost: 1.5, midCost: 3, highCost: 5, unit: 'sqft', defaultQuantity: 2000 },
      { id: 'exterior_paint', name: 'Exterior Paint', lowCost: 2000, midCost: 5000, highCost: 12000, unit: 'house', defaultQuantity: 1 },
      { id: 'drywall_repair', name: 'Drywall Repair', lowCost: 200, midCost: 500, highCost: 1500, unit: 'room', defaultQuantity: 3 },
    ]
  },
  {
    id: 'systems',
    name: 'Major Systems',
    icon: '⚡',
    items: [
      { id: 'hvac', name: 'HVAC System', lowCost: 4000, midCost: 8000, highCost: 15000, unit: 'system', defaultQuantity: 1 },
      { id: 'water_heater', name: 'Water Heater', lowCost: 800, midCost: 1500, highCost: 3500, unit: 'each', defaultQuantity: 1 },
      { id: 'electrical_panel', name: 'Electrical Panel', lowCost: 1500, midCost: 3000, highCost: 6000, unit: 'panel', defaultQuantity: 1 },
      { id: 'plumbing_repipe', name: 'Plumbing Repipe', lowCost: 4000, midCost: 8000, highCost: 15000, unit: 'house', defaultQuantity: 1 },
    ]
  },
  {
    id: 'exterior',
    name: 'Exterior',
    icon: '🏡',
    items: [
      { id: 'roof', name: 'Roof Replacement', lowCost: 8000, midCost: 15000, highCost: 30000, unit: 'roof', defaultQuantity: 1 },
      { id: 'siding', name: 'Siding', lowCost: 5000, midCost: 12000, highCost: 25000, unit: 'house', defaultQuantity: 1 },
      { id: 'windows', name: 'Windows', lowCost: 300, midCost: 600, highCost: 1200, unit: 'each', defaultQuantity: 10 },
      { id: 'front_door', name: 'Front Door', lowCost: 500, midCost: 1500, highCost: 4000, unit: 'each', defaultQuantity: 1 },
      { id: 'landscaping', name: 'Landscaping', lowCost: 1000, midCost: 3000, highCost: 10000, unit: 'yard', defaultQuantity: 1 },
    ]
  },
  {
    id: 'other',
    name: 'Other',
    icon: '🔧',
    items: [
      { id: 'permits', name: 'Permits', lowCost: 500, midCost: 1500, highCost: 5000, unit: 'project', defaultQuantity: 1 },
      { id: 'dumpster', name: 'Dumpster Rental', lowCost: 400, midCost: 600, highCost: 1000, unit: 'load', defaultQuantity: 2 },
      { id: 'cleaning', name: 'Deep Cleaning', lowCost: 200, midCost: 500, highCost: 1000, unit: 'house', defaultQuantity: 1 },
      { id: 'staging', name: 'Staging', lowCost: 500, midCost: 2000, highCost: 5000, unit: 'house', defaultQuantity: 1 },
    ]
  }
]

export function calculateRehabEstimate(
  selections: RehabSelection[],
  contingencyPct: number = 0.10
): RehabEstimate {
  const breakdown: { category: string; cost: number }[] = []
  let totalCost = 0
  
  // Group by category
  const categoryTotals: Record<string, number> = {}
  
  for (const selection of selections) {
    // Find the item
    let foundItem: RehabItem | null = null
    let foundCategory = ''
    
    for (const cat of REHAB_CATEGORIES) {
      const item = cat.items.find(i => i.id === selection.itemId)
      if (item) {
        foundItem = item
        foundCategory = cat.name
        break
      }
    }
    
    if (foundItem) {
      const unitCost = selection.tier === 'low' ? foundItem.lowCost :
                       selection.tier === 'mid' ? foundItem.midCost :
                       foundItem.highCost
      const itemTotal = unitCost * selection.quantity
      totalCost += itemTotal
      
      categoryTotals[foundCategory] = (categoryTotals[foundCategory] || 0) + itemTotal
    }
  }
  
  // Convert to breakdown array
  for (const [category, cost] of Object.entries(categoryTotals)) {
    breakdown.push({ category, cost })
  }
  
  // Sort by cost descending
  breakdown.sort((a, b) => b.cost - a.cost)
  
  const contingency = totalCost * contingencyPct
  
  return {
    totalCost,
    breakdown,
    contingency,
    grandTotal: totalCost + contingency
  }
}

// Quick rehab presets
export interface RehabPreset {
  id: string
  name: string
  description: string
  estimatedCost: { low: number; mid: number; high: number }
  selections: RehabSelection[]
}

export const REHAB_PRESETS: RehabPreset[] = [
  {
    id: 'cosmetic',
    name: 'Cosmetic Refresh',
    description: 'Paint, flooring, light fixtures',
    estimatedCost: { low: 8000, mid: 15000, high: 25000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2000, tier: 'mid' },
      { itemId: 'lvp', quantity: 1200, tier: 'mid' },
      { itemId: 'cleaning', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'light',
    name: 'Light Rehab',
    description: 'Cosmetic + kitchen/bath updates',
    estimatedCost: { low: 20000, mid: 35000, high: 55000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2000, tier: 'mid' },
      { itemId: 'lvp', quantity: 1500, tier: 'mid' },
      { itemId: 'countertops', quantity: 1, tier: 'mid' },
      { itemId: 'appliances', quantity: 1, tier: 'mid' },
      { itemId: 'vanity', quantity: 2, tier: 'mid' },
      { itemId: 'cleaning', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'medium',
    name: 'Medium Rehab',
    description: 'Full kitchen/bath remodel + flooring',
    estimatedCost: { low: 40000, mid: 65000, high: 100000 },
    selections: [
      { itemId: 'interior_paint', quantity: 2500, tier: 'mid' },
      { itemId: 'lvp', quantity: 1800, tier: 'mid' },
      { itemId: 'cabinets', quantity: 1, tier: 'mid' },
      { itemId: 'countertops', quantity: 1, tier: 'mid' },
      { itemId: 'appliances', quantity: 1, tier: 'mid' },
      { itemId: 'full_bath', quantity: 2, tier: 'mid' },
      { itemId: 'windows', quantity: 8, tier: 'mid' },
      { itemId: 'permits', quantity: 1, tier: 'mid' },
    ]
  },
  {
    id: 'heavy',
    name: 'Heavy Rehab',
    description: 'Everything + systems',
    estimatedCost: { low: 80000, mid: 120000, high: 180000 },
    selections: [
      { itemId: 'interior_paint', quantity: 3000, tier: 'mid' },
      { itemId: 'exterior_paint', quantity: 1, tier: 'mid' },
      { itemId: 'hardwood', quantity: 1500, tier: 'mid' },
      { itemId: 'tile', quantity: 300, tier: 'mid' },
      { itemId: 'cabinets', quantity: 1, tier: 'high' },
      { itemId: 'countertops', quantity: 1, tier: 'high' },
      { itemId: 'appliances', quantity: 1, tier: 'high' },
      { itemId: 'full_bath', quantity: 2, tier: 'high' },
      { itemId: 'half_bath', quantity: 1, tier: 'mid' },
      { itemId: 'hvac', quantity: 1, tier: 'mid' },
      { itemId: 'water_heater', quantity: 1, tier: 'mid' },
      { itemId: 'roof', quantity: 1, tier: 'mid' },
      { itemId: 'windows', quantity: 15, tier: 'mid' },
      { itemId: 'permits', quantity: 1, tier: 'high' },
      { itemId: 'dumpster', quantity: 3, tier: 'mid' },
    ]
  }
]
