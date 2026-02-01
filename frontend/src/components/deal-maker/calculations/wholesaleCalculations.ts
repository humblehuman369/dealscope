/**
 * Wholesale Calculations
 * Assignment-based investment analysis
 * 
 * Wholesale = Contract property at discount, assign to end buyer for fee
 * No ownership, low capital, fast timeline
 * 
 * Based on mobile/components/analytics/strategies/wholesaleCalculations.ts
 * and backend/app/services/calculators.py wholesale calculations
 */

import { 
  WholesaleDealMakerState, 
  WholesaleMetrics,
  WholesaleDealViability,
  DealGrade,
} from '../types'

/**
 * Calculate Wholesale deal score (0-100)
 * 
 * Scoring weights:
 * - Assignment fee size: 30 points (PRIMARY GOAL)
 * - 70% Rule compliance: 25 points
 * - End buyer profit: 20 points
 * - Risk profile (low earnest money): 15 points
 * - Your ROI: 10 points
 */
export function calculateWholesaleScore(
  assignmentFee: number,
  meets70PercentRule: boolean,
  contractVsMAO: number,
  endBuyerProfit: number,
  earnestMoney: number,
  roi: number
): number {
  let score = 0

  // Assignment fee size (max 30 points) - PRIMARY GOAL
  if (assignmentFee >= 25000) {
    score += 30
  } else if (assignmentFee >= 20000) {
    score += 25
  } else if (assignmentFee >= 15000) {
    score += 20
  } else if (assignmentFee >= 10000) {
    score += 15
  } else if (assignmentFee >= 5000) {
    score += 10
  } else if (assignmentFee > 0) {
    score += 5
  }

  // 70% Rule compliance (max 25 points)
  if (meets70PercentRule) {
    // How much under MAO? (contractVsMAO is negative when under)
    const underMAO = -contractVsMAO
    if (underMAO >= 20000) {
      score += 25 // Well under MAO
    } else if (underMAO >= 10000) {
      score += 20
    } else if (underMAO >= 5000) {
      score += 15
    } else if (underMAO >= 0) {
      score += 10
    }
  } else {
    // Over MAO - penalize based on how much over
    const overMAO = contractVsMAO
    if (overMAO < 5000) {
      score += 5 // Just slightly over
    }
    // 0 points if significantly over MAO
  }

  // End buyer profit (max 20 points)
  if (endBuyerProfit >= 50000) {
    score += 20
  } else if (endBuyerProfit >= 30000) {
    score += 15
  } else if (endBuyerProfit >= 20000) {
    score += 10
  } else if (endBuyerProfit >= 10000) {
    score += 5
  }
  // 0 if buyer profit < $10K (hard to assign)

  // Risk profile (max 15 points) - lower earnest money = less risk
  if (earnestMoney <= 500) {
    score += 15
  } else if (earnestMoney <= 1000) {
    score += 12
  } else if (earnestMoney <= 2000) {
    score += 8
  } else if (earnestMoney <= 5000) {
    score += 4
  }
  // 0 if earnest money > $5K

  // Your ROI (max 10 points)
  if (roi >= 1000) {
    score += 10 // 1000%+ ROI
  } else if (roi >= 500) {
    score += 8
  } else if (roi >= 300) {
    score += 6
  } else if (roi >= 100) {
    score += 4
  } else if (roi > 0) {
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
 * Determine deal viability based on metrics
 */
function getDealViability(
  meets70PercentRule: boolean,
  contractVsMAO: number,
  endBuyerProfit: number,
  mao: number
): WholesaleDealViability {
  const overMaoPct = mao > 0 ? (contractVsMAO / mao) * 100 : 0

  if (meets70PercentRule && endBuyerProfit >= 30000) {
    return 'strong'
  }
  if (meets70PercentRule && endBuyerProfit >= 15000) {
    return 'moderate'
  }
  if (overMaoPct < 5 && endBuyerProfit >= 10000) {
    return 'tight'
  }
  return 'notViable'
}

/**
 * Calculate Wholesale metrics from state
 * 
 * The Wholesale strategy has 4 phases:
 * 1. PROPERTY: ARV and repairs analysis
 * 2. CONTRACT: Purchase contract terms
 * 3. ASSIGNMENT: Fee structure
 * 4. RESULTS: Deal and buyer analysis
 */
export function calculateWholesaleMetrics(state: WholesaleDealMakerState): WholesaleMetrics {
  // ==========================================================================
  // 70% RULE ANALYSIS
  // ==========================================================================
  
  // MAO = ARV × 70% - Repairs
  const maxAllowableOffer = (state.arv * 0.70) - state.estimatedRepairs
  
  // How does contract price compare to MAO?
  // Positive = over MAO (bad), Negative = under MAO (good)
  const contractVsMAO = state.contractPrice - maxAllowableOffer
  
  const meets70PercentRule = state.contractPrice <= maxAllowableOffer

  // ==========================================================================
  // END BUYER ANALYSIS
  // ==========================================================================
  
  // What does the end buyer pay for the contract?
  const endBuyerPrice = state.contractPrice + state.assignmentFee
  
  // Buyer's all-in cost (purchase + repairs + purchase costs)
  const buyerPurchaseCosts = endBuyerPrice * 0.03 // 3% closing costs
  const endBuyerAllIn = endBuyerPrice + state.estimatedRepairs + buyerPurchaseCosts
  
  // Buyer's potential profit
  const buyerSellingCosts = state.arv * 0.08 // 8% selling costs (agent + closing)
  const buyerSaleProceeds = state.arv - buyerSellingCosts
  const endBuyerProfit = buyerSaleProceeds - endBuyerAllIn
  
  // Buyer's ROI
  const endBuyerROI = endBuyerAllIn > 0 
    ? (endBuyerProfit / endBuyerAllIn) * 100 
    : 0

  // ==========================================================================
  // YOUR PROFIT ANALYSIS
  // ==========================================================================
  
  // Total cash at risk
  const totalCashAtRisk = state.earnestMoney + state.marketingCosts + state.closingCosts
  
  // Profit
  const grossProfit = state.assignmentFee
  const netProfit = state.assignmentFee - state.marketingCosts - state.closingCosts
  
  // ROI
  const roi = totalCashAtRisk > 0 
    ? (netProfit / totalCashAtRisk) * 100 
    : 0
  
  // Annualized ROI
  const annualizedROI = state.daysToClose > 0 
    ? roi * (365 / state.daysToClose) 
    : 0

  // ==========================================================================
  // DEAL QUALITY
  // ==========================================================================
  
  const dealViability = getDealViability(
    meets70PercentRule,
    contractVsMAO,
    endBuyerProfit,
    maxAllowableOffer
  )
  
  const dealScore = calculateWholesaleScore(
    state.assignmentFee,
    meets70PercentRule,
    contractVsMAO,
    endBuyerProfit,
    state.earnestMoney,
    roi
  )
  
  const dealGrade = getDealGrade(dealScore)

  return {
    // 70% Rule Analysis
    maxAllowableOffer,
    contractVsMAO,
    meets70PercentRule,
    
    // End Buyer Analysis
    endBuyerPrice,
    endBuyerAllIn,
    endBuyerProfit,
    endBuyerROI,
    
    // Your Profit
    totalCashAtRisk,
    grossProfit,
    netProfit,
    roi,
    annualizedROI,
    
    // Deal Quality
    dealViability,
    dealScore,
    dealGrade,
  }
}

/**
 * Format currency value for display
 */
export function formatWholesaleCurrency(value: number, showDecimals = false): string {
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
export function formatWholesalePercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get deal viability display info
 */
export function getViabilityDisplay(viability: WholesaleDealViability): { label: string; color: string; icon: string } {
  switch (viability) {
    case 'strong':
      return { label: 'Strong Deal', color: '#10B981', icon: '💪' }
    case 'moderate':
      return { label: 'Moderate Deal', color: '#0891B2', icon: '👍' }
    case 'tight':
      return { label: 'Tight Deal', color: '#F59E0B', icon: '⚠️' }
    case 'notViable':
      return { label: 'Not Viable', color: '#F43F5E', icon: '❌' }
  }
}

/**
 * Get Wholesale-specific insights based on metrics
 */
export interface WholesaleInsight {
  type: 'strength' | 'concern' | 'tip'
  text: string
  highlight?: string
}

export function generateWholesaleInsights(state: WholesaleDealMakerState, metrics: WholesaleMetrics): WholesaleInsight[] {
  const insights: WholesaleInsight[] = []

  // 70% Rule compliance
  if (metrics.meets70PercentRule) {
    const underMAO = -metrics.contractVsMAO
    insights.push({
      type: 'strength',
      text: `Under MAO by ${formatWholesaleCurrency(underMAO)} - good margin`,
      highlight: 'Meets 70% Rule',
    })
  } else {
    insights.push({
      type: 'concern',
      text: `Over MAO by ${formatWholesaleCurrency(metrics.contractVsMAO)} - hard to assign`,
      highlight: 'Over 70% Rule',
    })
  }

  // End buyer profit
  if (metrics.endBuyerProfit >= 30000) {
    insights.push({
      type: 'strength',
      text: `Buyer profit: ${formatWholesaleCurrency(metrics.endBuyerProfit)} - very attractive`,
    })
  } else if (metrics.endBuyerProfit >= 15000) {
    insights.push({
      type: 'tip',
      text: `Buyer profit: ${formatWholesaleCurrency(metrics.endBuyerProfit)} - decent but tight`,
    })
  } else if (metrics.endBuyerProfit > 0) {
    insights.push({
      type: 'concern',
      text: `Buyer profit: ${formatWholesaleCurrency(metrics.endBuyerProfit)} - hard to find buyer`,
    })
  } else {
    insights.push({
      type: 'concern',
      text: 'Negative buyer profit - deal not assignable',
    })
  }

  // Your ROI
  if (metrics.roi >= 500) {
    insights.push({
      type: 'strength',
      text: `${metrics.roi.toFixed(0)}% ROI on ${formatWholesaleCurrency(metrics.totalCashAtRisk)} at risk`,
    })
  } else if (metrics.roi >= 200) {
    insights.push({
      type: 'tip',
      text: `${metrics.roi.toFixed(0)}% ROI - good return for low risk`,
    })
  }

  // Earnest money risk
  if (state.earnestMoney <= 1000) {
    insights.push({
      type: 'strength',
      text: 'Low earnest money minimizes your risk',
    })
  } else if (state.earnestMoney >= 5000) {
    insights.push({
      type: 'concern',
      text: `${formatWholesaleCurrency(state.earnestMoney)} earnest money - high risk if deal fails`,
    })
  }

  return insights.slice(0, 4)
}
