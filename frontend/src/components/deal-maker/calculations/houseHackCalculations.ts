/**
 * House Hack Calculations
 * Owner-occupied multi-unit investment analysis
 * 
 * House Hack = Live in one unit, rent the others
 * Primary goal: Reduce/eliminate housing costs
 * 
 * Based on mobile/components/analytics/strategies/houseHackCalculations.ts
 * and backend/app/services/calculators.py house hack calculations
 */

import { 
  HouseHackDealMakerState, 
  HouseHackMetrics,
  DealGrade,
} from '../types'

/**
 * Calculate monthly mortgage payment (P&I only)
 */
function calculateMonthlyPI(principal: number, annualRate: number, termYears: number): number {
  if (annualRate === 0) {
    return principal / (termYears * 12)
  }
  const monthlyRate = annualRate / 12
  const numPayments = termYears * 12
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1)
}

/**
 * Calculate House Hack deal score (0-100)
 * 
 * Scoring weights:
 * - Housing cost reduction: 30 points (PRIMARY GOAL)
 * - Cash flow from rentals: 20 points
 * - Cash-on-Cash return: 20 points
 * - Down payment efficiency: 15 points (lower is better)
 * - Unit count/scale: 15 points
 */
export function calculateHouseHackScore(
  effectiveHousingCost: number,
  housingOffsetPercent: number,
  netRentalIncome: number,
  cashOnCashReturn: number,
  downPaymentPercent: number,
  totalUnits: number
): number {
  let score = 0

  // Housing cost reduction (max 30 points) - PRIMARY GOAL
  if (effectiveHousingCost <= 0) {
    score += 30 // Living for FREE or getting paid
  } else if (housingOffsetPercent >= 80) {
    score += 25
  } else if (housingOffsetPercent >= 60) {
    score += 20
  } else if (housingOffsetPercent >= 40) {
    score += 15
  } else if (housingOffsetPercent >= 20) {
    score += 10
  } else if (housingOffsetPercent > 0) {
    score += 5
  }

  // Cash flow from rentals (max 20 points)
  if (netRentalIncome >= 2000) {
    score += 20
  } else if (netRentalIncome >= 1500) {
    score += 15
  } else if (netRentalIncome >= 1000) {
    score += 10
  } else if (netRentalIncome >= 500) {
    score += 5
  } else if (netRentalIncome > 0) {
    score += 2
  }

  // Cash-on-Cash return (max 20 points)
  if (cashOnCashReturn >= 15) {
    score += 20
  } else if (cashOnCashReturn >= 10) {
    score += 15
  } else if (cashOnCashReturn >= 5) {
    score += 10
  } else if (cashOnCashReturn > 0) {
    score += 5
  }

  // Down payment efficiency (max 15 points) - lower is better for House Hack
  if (downPaymentPercent <= 0.05) {
    score += 15 // FHA/VA territory
  } else if (downPaymentPercent <= 0.10) {
    score += 10
  } else if (downPaymentPercent <= 0.15) {
    score += 5
  }

  // Unit count/scale potential (max 15 points)
  if (totalUnits >= 4) {
    score += 15
  } else if (totalUnits >= 3) {
    score += 10
  } else if (totalUnits >= 2) {
    score += 5
  }

  return Math.round(Math.min(100, Math.max(0, score)))
}

/**
 * Get deal grade based on score
 */
function getDealGrade(score: number): DealGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

/**
 * Calculate House Hack metrics from state
 * 
 * The House Hack strategy has 5 phases:
 * 1. BUY: Purchase multi-unit property
 * 2. FINANCE: FHA/VA/Conventional with low down payment
 * 3. RENT: Income from rented units (owner unit excluded)
 * 4. EXPENSES: Operating costs
 * 5. RESULTS: Effective housing cost analysis
 */
export function calculateHouseHackMetrics(state: HouseHackDealMakerState): HouseHackMetrics {
  // ==========================================================================
  // PHASE 2: FINANCING
  // ==========================================================================
  
  const downPayment = state.purchasePrice * state.downPaymentPercent
  const loanAmount = state.purchasePrice - downPayment
  const closingCosts = state.purchasePrice * state.closingCostsPercent
  const cashToClose = downPayment + closingCosts
  
  // Monthly mortgage (P&I)
  const monthlyPrincipalInterest = calculateMonthlyPI(
    loanAmount,
    state.interestRate,
    state.loanTermYears
  )
  
  // Monthly PMI/MIP
  const monthlyPmi = (loanAmount * state.pmiRate) / 12
  
  // Monthly taxes and insurance
  const monthlyTaxes = state.annualPropertyTax / 12
  const monthlyInsurance = state.annualInsurance / 12
  
  // Total PITI (Principal, Interest, Taxes, Insurance, PMI, HOA)
  const monthlyPITI = monthlyPrincipalInterest + 
    monthlyPmi + 
    monthlyTaxes + 
    monthlyInsurance + 
    state.monthlyHoa

  // ==========================================================================
  // PHASE 3: RENTAL INCOME
  // ==========================================================================
  
  const rentedUnits = state.totalUnits - state.ownerOccupiedUnits
  const grossRentalIncome = state.avgRentPerUnit * rentedUnits
  const effectiveRentalIncome = grossRentalIncome * (1 - state.vacancyRate)

  // ==========================================================================
  // PHASE 4: OPERATING EXPENSES
  // ==========================================================================
  
  const monthlyMaintenance = grossRentalIncome * state.maintenanceRate
  const monthlyCapex = grossRentalIncome * state.capexRate
  const monthlyOperatingExpenses = state.utilitiesMonthly + monthlyMaintenance + monthlyCapex

  // ==========================================================================
  // NET INCOME
  // ==========================================================================
  
  const netRentalIncome = effectiveRentalIncome - monthlyOperatingExpenses

  // ==========================================================================
  // CORE HOUSE HACK METRICS
  // ==========================================================================
  
  // Effective Housing Cost = PITI - Net Rental Income
  // If negative, owner is getting PAID to live there!
  const effectiveHousingCost = monthlyPITI - netRentalIncome
  
  // Savings vs current housing
  const housingCostSavings = state.currentHousingPayment - effectiveHousingCost
  
  // Housing offset % = what % of PITI is covered by rental income
  const housingOffsetPercent = monthlyPITI > 0 
    ? (netRentalIncome / monthlyPITI) * 100 
    : 0
  
  // "Lives for free" if effective cost is zero or negative
  const livesForFree = effectiveHousingCost <= 0

  // ==========================================================================
  // INVESTMENT RETURNS
  // ==========================================================================
  
  // Annual cash flow (treating the property purely as investment)
  const annualCashFlow = netRentalIncome * 12 - (monthlyPITI * 12)
  
  // Cash-on-Cash return
  const cashOnCashReturn = cashToClose > 0 
    ? ((netRentalIncome - monthlyPITI) * 12 / cashToClose) * 100 
    : 0

  // ==========================================================================
  // MOVE-OUT SCENARIO (Full Rental)
  // ==========================================================================
  
  // If owner moves out, all units generate income
  const fullRentalIncome = state.avgRentPerUnit * state.totalUnits * (1 - state.vacancyRate)
  const fullRentalMaintenance = (state.avgRentPerUnit * state.totalUnits) * state.maintenanceRate
  const fullRentalCapex = (state.avgRentPerUnit * state.totalUnits) * state.capexRate
  // Add management fee for full rental (8%)
  const fullRentalManagement = fullRentalIncome * 0.08
  const fullRentalNetIncome = fullRentalIncome - fullRentalMaintenance - fullRentalCapex - 
    state.utilitiesMonthly - fullRentalManagement
  const fullRentalCashFlow = fullRentalNetIncome - monthlyPITI
  const fullRentalCoCReturn = cashToClose > 0 
    ? (fullRentalCashFlow * 12 / cashToClose) * 100 
    : 0

  // ==========================================================================
  // SCORING
  // ==========================================================================
  
  const dealScore = calculateHouseHackScore(
    effectiveHousingCost,
    housingOffsetPercent,
    netRentalIncome,
    cashOnCashReturn,
    state.downPaymentPercent,
    state.totalUnits
  )
  const dealGrade = getDealGrade(dealScore)

  return {
    // Financing
    loanAmount,
    monthlyPrincipalInterest,
    monthlyPmi,
    monthlyTaxes,
    monthlyInsurance,
    monthlyPITI,
    downPayment,
    closingCosts,
    cashToClose,
    
    // Rental Income
    rentedUnits,
    grossRentalIncome,
    effectiveRentalIncome,
    
    // Operating Expenses
    monthlyMaintenance,
    monthlyCapex,
    monthlyOperatingExpenses,
    
    // Net Income
    netRentalIncome,
    
    // Core House Hack Metrics
    effectiveHousingCost,
    housingCostSavings,
    housingOffsetPercent,
    livesForFree,
    
    // Investment Returns
    annualCashFlow,
    cashOnCashReturn,
    
    // Move-Out Scenario
    fullRentalIncome,
    fullRentalCashFlow,
    fullRentalCoCReturn,
    
    // Scores
    dealScore,
    dealGrade,
  }
}

/**
 * Format currency value for display
 */
export function formatHouseHackCurrency(value: number, showDecimals = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value)
}

/**
 * Format percentage value for display
 */
export function formatHouseHackPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get House Hack-specific insights based on metrics
 */
export interface HouseHackInsight {
  type: 'strength' | 'concern' | 'tip'
  text: string
  highlight?: string
}

export function generateHouseHackInsights(state: HouseHackDealMakerState, metrics: HouseHackMetrics): HouseHackInsight[] {
  const insights: HouseHackInsight[] = []

  // Living for free check
  if (metrics.livesForFree) {
    if (metrics.effectiveHousingCost < 0) {
      insights.push({
        type: 'strength',
        text: `Getting PAID ${formatHouseHackCurrency(Math.abs(metrics.effectiveHousingCost))}/mo to live here!`,
        highlight: 'Paid to live',
      })
    } else {
      insights.push({
        type: 'strength',
        text: 'Living for FREE - tenants cover all housing costs',
        highlight: 'Live free',
      })
    }
  } else if (metrics.housingOffsetPercent >= 75) {
    insights.push({
      type: 'strength',
      text: `Tenants cover ${metrics.housingOffsetPercent.toFixed(0)}% of your housing`,
    })
  } else if (metrics.housingOffsetPercent >= 50) {
    insights.push({
      type: 'tip',
      text: `Housing offset: ${metrics.housingOffsetPercent.toFixed(0)}% - room for improvement`,
    })
  } else if (metrics.housingOffsetPercent < 50) {
    insights.push({
      type: 'concern',
      text: `Only ${metrics.housingOffsetPercent.toFixed(0)}% offset - consider higher rents or more units`,
    })
  }

  // Savings vs current housing
  if (metrics.housingCostSavings > 0) {
    insights.push({
      type: 'strength',
      text: `Saving ${formatHouseHackCurrency(metrics.housingCostSavings)}/mo vs current housing`,
    })
  } else if (metrics.housingCostSavings < 0) {
    insights.push({
      type: 'concern',
      text: `${formatHouseHackCurrency(Math.abs(metrics.housingCostSavings))}/mo MORE than current housing`,
    })
  }

  // Down payment efficiency
  if (state.downPaymentPercent <= 0.05) {
    insights.push({
      type: 'strength',
      text: 'Low down payment maximizes leverage',
    })
  } else if (state.downPaymentPercent >= 0.20) {
    insights.push({
      type: 'tip',
      text: 'Consider FHA (3.5%) or VA (0%) for lower down payment',
    })
  }

  // Move-out scenario
  if (metrics.fullRentalCashFlow > 0) {
    insights.push({
      type: 'strength',
      text: `Move-out option: ${formatHouseHackCurrency(metrics.fullRentalCashFlow)}/mo cash flow`,
    })
  }

  return insights.slice(0, 4)
}
