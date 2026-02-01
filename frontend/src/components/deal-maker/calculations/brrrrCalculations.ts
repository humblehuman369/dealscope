/**
 * BRRRR (Buy, Rehab, Rent, Refinance, Repeat) Calculations
 * Multi-phase investment analysis for capital recycling strategy
 * 
 * Based on mobile/components/analytics/strategies/brrrrCalculations.ts
 * Adapted for web frontend with BRRRRDealMakerState interface
 */

import { 
  BRRRRDealMakerState, 
  BRRRRMetrics,
  DealGrade,
} from '../types'

/**
 * Calculate mortgage payment using standard amortization formula
 */
function calculateMortgagePayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0
  const monthlyRate = annualRate / 12
  const numPayments = years * 12
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  return isFinite(payment) ? payment : 0
}

/**
 * Calculate BRRRR deal score (0-100)
 * 
 * Scoring weights:
 * - Cash recoup: 30 points (most important - recovering capital)
 * - Equity creation: 25 points
 * - Monthly cash flow: 20 points
 * - Cash-on-cash/Infinite return: 15 points
 * - ARV accuracy buffer: 10 points (all-in < 75% of ARV)
 */
export function calculateBRRRRScore(
  capitalRecycledPct: number,
  equityPct: number,
  postRefiMonthlyCashFlow: number,
  postRefiCashOnCash: number,
  allInPctOfArv: number
): number {
  let score = 0

  // Cash recoup (max 30 points) - most important for BRRRR
  if (capitalRecycledPct >= 100) {
    score += 30 // Full recovery = max points
  } else if (capitalRecycledPct >= 80) {
    score += 24 + (capitalRecycledPct - 80) * 0.3
  } else if (capitalRecycledPct >= 50) {
    score += 15 + (capitalRecycledPct - 50) * 0.3
  } else {
    score += capitalRecycledPct * 0.3
  }

  // Equity creation (max 25 points)
  if (equityPct >= 30) {
    score += 25
  } else if (equityPct >= 25) {
    score += 20 + (equityPct - 25)
  } else if (equityPct >= 20) {
    score += 15 + (equityPct - 20)
  } else {
    score += equityPct * 0.75
  }

  // Monthly cash flow (max 20 points)
  if (postRefiMonthlyCashFlow >= 500) {
    score += 20
  } else if (postRefiMonthlyCashFlow >= 300) {
    score += 12 + (postRefiMonthlyCashFlow - 300) * 0.04
  } else if (postRefiMonthlyCashFlow > 0) {
    score += postRefiMonthlyCashFlow * 0.04
  }

  // Cash-on-cash return (max 15 points)
  // For infinite ROI (when cash left = 0), give max points
  if (!isFinite(postRefiCashOnCash) || postRefiCashOnCash > 100) {
    score += 15 // Infinite or very high return
  } else if (postRefiCashOnCash >= 20) {
    score += 15
  } else if (postRefiCashOnCash >= 10) {
    score += 8 + (postRefiCashOnCash - 10) * 0.7
  } else if (postRefiCashOnCash > 0) {
    score += postRefiCashOnCash * 0.8
  }

  // ARV buffer (max 10 points) - all-in cost as % of ARV
  // Lower is better - target is <= 75%
  if (allInPctOfArv <= 70) {
    score += 10
  } else if (allInPctOfArv <= 75) {
    score += 8 + (75 - allInPctOfArv) * 0.4
  } else if (allInPctOfArv <= 80) {
    score += 4 + (80 - allInPctOfArv) * 0.8
  } else if (allInPctOfArv <= 85) {
    score += (85 - allInPctOfArv) * 0.8
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
 * Calculate BRRRR metrics from state
 * 
 * The BRRRR strategy has 5 phases:
 * 1. BUY: Purchase at discount with hard money
 * 2. REHAB: Renovate property (+ holding costs)
 * 3. RENT: Stabilize with tenants
 * 4. REFINANCE: Cash-out refi based on ARV
 * 5. REPEAT: Analyze capital recycling
 */
export function calculateBRRRRMetrics(state: BRRRRDealMakerState): BRRRRMetrics {
  // ==========================================================================
  // PHASE 1: BUY
  // ==========================================================================
  
  const initialDownPayment = state.purchasePrice * state.downPaymentPercent
  const initialClosingCosts = state.purchasePrice * state.closingCostsPercent
  const initialLoanAmount = state.purchasePrice - initialDownPayment
  const cashRequiredPhase1 = initialDownPayment + initialClosingCosts

  // ==========================================================================
  // PHASE 2: REHAB
  // ==========================================================================
  
  const contingency = state.rehabBudget * state.contingencyPct
  const totalRehabCost = state.rehabBudget + contingency
  const holdingCosts = state.holdingCostsMonthly * state.holdingPeriodMonths
  const cashRequiredPhase2 = totalRehabCost + holdingCosts
  
  // All-in cost before refinance
  const allInCost = state.purchasePrice + totalRehabCost + holdingCosts + initialClosingCosts
  
  // Total cash invested before refinance
  const totalCashInvested = cashRequiredPhase1 + cashRequiredPhase2

  // ==========================================================================
  // PHASE 3: RENT
  // ==========================================================================
  
  // Calculate NOI using post-rehab rent
  const effectiveRent = state.postRehabMonthlyRent * (1 - state.vacancyRate)
  const annualEffectiveRent = effectiveRent * 12
  
  // Operating expenses (annual)
  const annualMaintenance = annualEffectiveRent * state.maintenanceRate
  const annualManagement = annualEffectiveRent * state.managementRate
  const totalAnnualOperatingExpenses = (
    state.annualPropertyTax +
    state.annualInsurance +
    annualMaintenance +
    annualManagement +
    (state.monthlyHoa * 12)
  )
  
  const estimatedNoi = annualEffectiveRent - totalAnnualOperatingExpenses
  const estimatedCapRate = state.arv > 0 ? (estimatedNoi / state.arv) * 100 : 0

  // ==========================================================================
  // PHASE 4: REFINANCE
  // ==========================================================================
  
  const refinanceLoanAmount = state.arv * state.refinanceLtv
  const refinanceClosingCosts = refinanceLoanAmount * state.refinanceClosingCostsPct
  
  // Cash out at refinance = new loan - payoff old loan - closing costs
  const cashOutAtRefinance = refinanceLoanAmount - initialLoanAmount - refinanceClosingCosts
  
  // New mortgage payment after refinance
  const newMonthlyPayment = calculateMortgagePayment(
    refinanceLoanAmount,
    state.refinanceInterestRate,
    state.refinanceTermYears
  )

  // ==========================================================================
  // PHASE 5: REPEAT (Capital Recycling)
  // ==========================================================================
  
  // Cash left in deal after refinance
  const cashLeftInDeal = Math.max(0, totalCashInvested - Math.max(0, cashOutAtRefinance))
  
  // Capital recycling metrics
  const capitalRecycledPct = totalCashInvested > 0 
    ? (Math.max(0, cashOutAtRefinance) / totalCashInvested) * 100 
    : 0
  
  // Infinite ROI achieved when all capital is recovered
  const infiniteRoiAchieved = cashOutAtRefinance >= totalCashInvested
  
  // Equity position after refinance
  const equityPosition = state.arv - refinanceLoanAmount
  const equityPct = state.arv > 0 ? (equityPosition / state.arv) * 100 : 0

  // ==========================================================================
  // POST-REFINANCE PERFORMANCE
  // ==========================================================================
  
  // Monthly operating expenses
  const monthlyOperatingExpenses = totalAnnualOperatingExpenses / 12
  
  // Post-refinance cash flow
  const postRefiMonthlyCashFlow = effectiveRent - monthlyOperatingExpenses - newMonthlyPayment
  const postRefiAnnualCashFlow = postRefiMonthlyCashFlow * 12
  
  // Post-refi cash-on-cash (uses cash left in deal as denominator)
  // If cash left is 0 or negative, return is infinite
  const postRefiCashOnCash = cashLeftInDeal > 0 
    ? (postRefiAnnualCashFlow / cashLeftInDeal) * 100 
    : (postRefiAnnualCashFlow > 0 ? Infinity : 0)

  // ==========================================================================
  // SCORING
  // ==========================================================================
  
  const allInPctOfArv = state.arv > 0 ? (allInCost / state.arv) * 100 : 100
  
  const dealScore = calculateBRRRRScore(
    capitalRecycledPct,
    equityPct,
    postRefiMonthlyCashFlow,
    postRefiCashOnCash,
    allInPctOfArv
  )
  const dealGrade = getDealGrade(dealScore)

  return {
    // Phase 1: Buy
    initialLoanAmount,
    initialDownPayment,
    initialClosingCosts,
    cashRequiredPhase1,
    
    // Phase 2: Rehab
    totalRehabCost,
    holdingCosts,
    cashRequiredPhase2,
    allInCost,
    
    // Phase 3: Rent
    estimatedNoi,
    estimatedCapRate,
    
    // Phase 4: Refinance
    refinanceLoanAmount,
    refinanceClosingCosts,
    cashOutAtRefinance,
    newMonthlyPayment,
    
    // Phase 5: Repeat
    totalCashInvested,
    cashLeftInDeal,
    capitalRecycledPct,
    infiniteRoiAchieved,
    equityPosition,
    equityPct,
    
    // Post-Refinance Performance
    postRefiMonthlyCashFlow,
    postRefiAnnualCashFlow,
    postRefiCashOnCash,
    
    // Scores
    dealScore,
    dealGrade,
  }
}

/**
 * Format currency value for display
 */
export function formatBRRRRCurrency(value: number, showDecimals = false): string {
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
export function formatBRRRRPercent(value: number, decimals = 1): string {
  if (!isFinite(value)) return 'Infinite'
  return `${value.toFixed(decimals)}%`
}

/**
 * Get BRRRR-specific insights based on metrics
 */
export interface BRRRRInsight {
  type: 'strength' | 'concern' | 'tip'
  text: string
  highlight?: string
}

export function generateBRRRRInsights(state: BRRRRDealMakerState, metrics: BRRRRMetrics): BRRRRInsight[] {
  const insights: BRRRRInsight[] = []

  // Infinite ROI achieved
  if (metrics.infiniteRoiAchieved) {
    insights.push({
      type: 'strength',
      text: 'Infinite ROI achieved - all capital recovered at refinance!',
      highlight: 'Perfect BRRRR',
    })
  } else if (metrics.capitalRecycledPct >= 80) {
    insights.push({
      type: 'strength',
      text: `${formatBRRRRPercent(metrics.capitalRecycledPct)} capital recovery - excellent BRRRR execution`,
    })
  } else if (metrics.capitalRecycledPct < 50) {
    insights.push({
      type: 'concern',
      text: `Only ${formatBRRRRPercent(metrics.capitalRecycledPct)} capital recovery - significant cash left in deal`,
    })
  }

  // Equity position
  if (metrics.equityPct >= 25) {
    insights.push({
      type: 'strength',
      text: `${formatBRRRRPercent(metrics.equityPct)} equity position - strong wealth building`,
    })
  }

  // All-in cost vs ARV
  const allInPctOfArv = state.arv > 0 ? (metrics.allInCost / state.arv) * 100 : 100
  if (allInPctOfArv > 80) {
    insights.push({
      type: 'concern',
      text: `All-in cost is ${formatBRRRRPercent(allInPctOfArv)} of ARV - limited equity margin`,
    })
  } else if (allInPctOfArv <= 70) {
    insights.push({
      type: 'strength',
      text: `All-in at ${formatBRRRRPercent(allInPctOfArv)} of ARV - excellent equity buffer`,
    })
  }

  // Post-refi cash flow
  if (metrics.postRefiMonthlyCashFlow >= 300) {
    insights.push({
      type: 'strength',
      text: `${formatBRRRRCurrency(metrics.postRefiMonthlyCashFlow)}/mo cash flow after refinance`,
    })
  } else if (metrics.postRefiMonthlyCashFlow < 0) {
    insights.push({
      type: 'concern',
      text: 'Negative cash flow after refinance - consider higher rent or lower LTV',
    })
  }

  // Holding period
  if (state.holdingPeriodMonths > 6) {
    insights.push({
      type: 'tip',
      text: `${state.holdingPeriodMonths} month holding period - consider ways to accelerate rehab`,
    })
  }

  return insights.slice(0, 4)
}
