/**
 * Fix & Flip Calculations
 * Short-term investment analysis focused on renovation profit
 * 
 * Based on mobile/components/analytics/strategies/flipCalculations.ts
 * Adapted for web frontend with FlipDealMakerState interface
 */

import { 
  FlipDealMakerState, 
  FlipMetrics,
  DealGrade,
} from '../types'

/**
 * Calculate Fix & Flip deal score (0-100)
 * 
 * Scoring weights:
 * - Net Profit: 30 points (most important)
 * - ROI: 25 points
 * - 70% Rule compliance: 20 points
 * - Timeline efficiency: 15 points
 * - Profit margin buffer: 10 points
 */
export function calculateFlipScore(
  netProfit: number,
  roi: number,
  meets70PercentRule: boolean,
  purchasePrice: number,
  maxAllowableOffer: number,
  holdingPeriodMonths: number,
  profitMargin: number
): number {
  let score = 0

  // Net Profit (max 30 points)
  if (netProfit >= 50000) {
    score += 30
  } else if (netProfit >= 30000) {
    score += 20 + ((netProfit - 30000) / 20000) * 10
  } else if (netProfit >= 15000) {
    score += 10 + ((netProfit - 15000) / 15000) * 10
  } else if (netProfit > 0) {
    score += (netProfit / 15000) * 10
  }

  // ROI (max 25 points)
  if (roi >= 30) {
    score += 25
  } else if (roi >= 20) {
    score += 15 + ((roi - 20) / 10) * 10
  } else if (roi >= 10) {
    score += 5 + ((roi - 10) / 10) * 10
  } else if (roi > 0) {
    score += (roi / 10) * 5
  }

  // 70% Rule compliance (max 20 points)
  if (meets70PercentRule) {
    // How much under MAO?
    const underMAO = maxAllowableOffer - purchasePrice
    const maoPct = maxAllowableOffer > 0 ? (underMAO / maxAllowableOffer) * 100 : 0
    if (maoPct >= 10) {
      score += 20 // Well under MAO
    } else if (maoPct >= 5) {
      score += 15
    } else if (maoPct >= 0) {
      score += 10
    }
  } else {
    // Over MAO - penalize based on how much over
    const overMAO = purchasePrice - maxAllowableOffer
    const overPct = maxAllowableOffer > 0 ? (overMAO / maxAllowableOffer) * 100 : 0
    if (overPct < 5) {
      score += 5 // Just slightly over
    }
    // 0 points if significantly over MAO
  }

  // Timeline efficiency (max 15 points)
  // Faster flips are better - target is 4-6 months
  if (holdingPeriodMonths <= 4) {
    score += 15
  } else if (holdingPeriodMonths <= 6) {
    score += 12
  } else if (holdingPeriodMonths <= 8) {
    score += 8
  } else if (holdingPeriodMonths <= 10) {
    score += 4
  }
  // 0 points if over 10 months

  // Profit margin buffer (max 10 points)
  // Target is 15%+ margin for safety buffer
  if (profitMargin >= 20) {
    score += 10
  } else if (profitMargin >= 15) {
    score += 7
  } else if (profitMargin >= 10) {
    score += 4
  } else if (profitMargin >= 5) {
    score += 2
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
 * Calculate Fix & Flip metrics from state
 * 
 * The Fix & Flip strategy has 5 phases:
 * 1. BUY: Purchase below market
 * 2. FINANCE: Cash or hard money
 * 3. REHAB: Renovate property
 * 4. HOLD: Carry costs during reno + selling period
 * 5. SELL: Sell at ARV, calculate profit
 */
export function calculateFlipMetrics(state: FlipDealMakerState): FlipMetrics {
  // ==========================================================================
  // PHASE 1 & 2: BUY & FINANCE
  // ==========================================================================
  
  // Calculate loan amount based on financing type
  let loanAmount: number
  if (state.financingType === 'cash') {
    loanAmount = 0
  } else {
    loanAmount = state.purchasePrice * state.hardMoneyLtv
  }
  
  const downPayment = state.purchasePrice - loanAmount
  const closingCosts = state.purchasePrice * state.closingCostsPercent
  const loanPointsCost = loanAmount * (state.loanPoints / 100)
  const cashAtPurchase = downPayment + closingCosts + loanPointsCost

  // ==========================================================================
  // PHASE 3: REHAB
  // ==========================================================================
  
  const contingency = state.rehabBudget * state.contingencyPct
  const totalRehabCost = state.rehabBudget + contingency

  // ==========================================================================
  // PHASE 4: HOLD
  // ==========================================================================
  
  // Total holding period = rehab time + days on market
  const domMonths = state.daysOnMarket / 30
  const holdingPeriodMonths = state.rehabTimeMonths + domMonths
  
  // Total holding costs
  const totalHoldingCosts = state.holdingCostsMonthly * holdingPeriodMonths
  
  // Interest costs during holding period (for hard money)
  let interestCosts: number
  if (state.financingType === 'cash') {
    interestCosts = 0
  } else {
    const monthlyRate = state.hardMoneyRate / 12
    interestCosts = loanAmount * monthlyRate * holdingPeriodMonths
  }

  // ==========================================================================
  // TOTAL PROJECT COST
  // ==========================================================================
  
  const totalProjectCost = state.purchasePrice + closingCosts + 
    totalRehabCost + totalHoldingCosts + interestCosts + loanPointsCost

  // ==========================================================================
  // PHASE 5: SELL
  // ==========================================================================
  
  const grossSaleProceeds = state.arv
  const sellingCosts = state.arv * state.sellingCostsPct
  const netSaleProceeds = grossSaleProceeds - sellingCosts - loanAmount // Pay off loan

  // ==========================================================================
  // PROFIT ANALYSIS
  // ==========================================================================
  
  // Gross profit before selling costs
  const grossProfit = state.arv - totalProjectCost
  
  // Taxable profit (profit after selling costs)
  const taxableProfit = Math.max(0, grossProfit - sellingCosts)
  const capitalGainsTax = taxableProfit * state.capitalGainsRate
  
  // Net profit after all costs and taxes
  const netProfit = grossProfit - sellingCosts - capitalGainsTax

  // ==========================================================================
  // CASH REQUIRED
  // ==========================================================================
  
  // Total out-of-pocket costs (doesn't include borrowed funds)
  const cashRequired = cashAtPurchase + totalRehabCost + totalHoldingCosts + interestCosts

  // ==========================================================================
  // RETURN METRICS
  // ==========================================================================
  
  const roi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0
  
  // Annualized ROI - normalize to annual basis
  const annualizedRoi = holdingPeriodMonths > 0 
    ? roi * (12 / holdingPeriodMonths) 
    : 0
  
  // Profit margin as % of ARV
  const profitMargin = state.arv > 0 ? (netProfit / state.arv) * 100 : 0

  // ==========================================================================
  // 70% RULE
  // ==========================================================================
  
  // MAO = ARV × 70% - Rehab Costs
  const maxAllowableOffer = (state.arv * 0.70) - totalRehabCost
  const meets70PercentRule = state.purchasePrice <= maxAllowableOffer

  // ==========================================================================
  // SCORING
  // ==========================================================================
  
  const dealScore = calculateFlipScore(
    netProfit,
    roi,
    meets70PercentRule,
    state.purchasePrice,
    maxAllowableOffer,
    holdingPeriodMonths,
    profitMargin
  )
  const dealGrade = getDealGrade(dealScore)

  return {
    // Acquisition
    loanAmount,
    downPayment,
    closingCosts,
    loanPointsCost,
    cashAtPurchase,
    
    // Rehab
    totalRehabCost,
    
    // Holding
    holdingPeriodMonths,
    totalHoldingCosts,
    interestCosts,
    
    // Sale
    grossSaleProceeds,
    sellingCosts,
    netSaleProceeds,
    
    // Profit Analysis
    totalProjectCost,
    grossProfit,
    capitalGainsTax,
    netProfit,
    
    // Return Metrics
    cashRequired,
    roi,
    annualizedRoi,
    profitMargin,
    
    // 70% Rule
    maxAllowableOffer,
    meets70PercentRule,
    
    // Scores
    dealScore,
    dealGrade,
  }
}

/**
 * Format currency value for display
 */
export function formatFlipCurrency(value: number, showDecimals = false): string {
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
export function formatFlipPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get Fix & Flip-specific insights based on metrics
 */
export interface FlipInsight {
  type: 'strength' | 'concern' | 'tip'
  text: string
  highlight?: string
}

export function generateFlipInsights(state: FlipDealMakerState, metrics: FlipMetrics): FlipInsight[] {
  const insights: FlipInsight[] = []

  // 70% Rule compliance
  if (metrics.meets70PercentRule) {
    const underMAO = metrics.maxAllowableOffer - state.purchasePrice
    insights.push({
      type: 'strength',
      text: `Meets 70% Rule - ${formatFlipCurrency(underMAO)} under MAO`,
      highlight: 'Good margin',
    })
  } else {
    const overMAO = state.purchasePrice - metrics.maxAllowableOffer
    insights.push({
      type: 'concern',
      text: `${formatFlipCurrency(overMAO)} over MAO - higher risk`,
      highlight: 'Over 70% Rule',
    })
  }

  // Net profit analysis
  if (metrics.netProfit >= 40000) {
    insights.push({
      type: 'strength',
      text: `Strong profit potential: ${formatFlipCurrency(metrics.netProfit)} net`,
    })
  } else if (metrics.netProfit >= 20000) {
    insights.push({
      type: 'strength',
      text: `Solid profit: ${formatFlipCurrency(metrics.netProfit)} net`,
    })
  } else if (metrics.netProfit > 0) {
    insights.push({
      type: 'tip',
      text: `Thin margin: Only ${formatFlipCurrency(metrics.netProfit)} net profit`,
    })
  } else {
    insights.push({
      type: 'concern',
      text: 'Negative profit - reduce purchase price or rehab costs',
    })
  }

  // ROI analysis
  if (metrics.roi >= 25) {
    insights.push({
      type: 'strength',
      text: `Excellent ROI: ${formatFlipPercent(metrics.roi)}`,
    })
  } else if (metrics.roi >= 15) {
    insights.push({
      type: 'strength',
      text: `Good ROI: ${formatFlipPercent(metrics.roi)}`,
    })
  } else if (metrics.roi < 10 && metrics.roi > 0) {
    insights.push({
      type: 'tip',
      text: `Low ROI (${formatFlipPercent(metrics.roi)}) - consider other investments`,
    })
  }

  // Timeline
  if (metrics.holdingPeriodMonths > 8) {
    insights.push({
      type: 'concern',
      text: `Long holding period (${metrics.holdingPeriodMonths.toFixed(1)} months) increases risk`,
    })
  } else if (metrics.holdingPeriodMonths <= 5) {
    insights.push({
      type: 'strength',
      text: `Quick flip: ${metrics.holdingPeriodMonths.toFixed(1)} month timeline`,
    })
  }

  // Financing
  if (state.financingType === 'cash') {
    insights.push({
      type: 'tip',
      text: 'Cash deal - higher ROI but less leverage',
    })
  }

  return insights.slice(0, 4)
}
