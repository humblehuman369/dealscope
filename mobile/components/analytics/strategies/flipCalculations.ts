/**
 * Fix & Flip Strategy Calculations
 */

import { FlipInputs, FlipMetrics, Insight, StrategyAnalysis } from '../types';

export const DEFAULT_FLIP_INPUTS: FlipInputs = {
  // Purchase
  purchasePrice: 200000,
  closingCostsPercent: 0.02,
  
  // Rehab
  rehabBudget: 50000,
  rehabTimeMonths: 4,
  holdingCostsMonthly: 2000,
  
  // Financing
  financingType: 'hardMoney',
  loanAmount: 175000,
  interestRate: 0.12,
  points: 2,
  
  // Sale
  arv: 325000,
  sellingCostsPercent: 0.08, // Agent fees + closing
  daysOnMarket: 30,
};

/**
 * Calculate Fix & Flip metrics from inputs
 */
export function calculateFlipMetrics(inputs: FlipInputs): FlipMetrics {
  const {
    purchasePrice,
    closingCostsPercent,
    rehabBudget,
    rehabTimeMonths,
    holdingCostsMonthly,
    financingType,
    loanAmount,
    interestRate,
    points,
    arv,
    sellingCostsPercent,
    daysOnMarket,
  } = inputs;

  // Purchase costs
  const purchaseClosing = purchasePrice * closingCostsPercent;
  const purchaseCosts = purchasePrice + purchaseClosing;

  // Rehab costs
  const rehabCosts = rehabBudget;

  // Holding costs (during rehab + marketing)
  const totalHoldingMonths = rehabTimeMonths + (daysOnMarket / 30);
  const holdingCosts = holdingCostsMonthly * totalHoldingMonths;

  // Financing costs
  let financingCosts = 0;
  if (financingType !== 'cash') {
    const pointsCost = loanAmount * (points / 100);
    const interestCost = loanAmount * (interestRate / 12) * totalHoldingMonths;
    financingCosts = pointsCost + interestCost;
  }

  // Selling costs
  const sellingCosts = arv * sellingCostsPercent;

  // Total costs
  const totalCost = purchaseCosts + rehabCosts + holdingCosts + financingCosts + sellingCosts;

  // Net profit
  const netProfit = arv - totalCost;

  // Cash required
  const cashRequired = financingType === 'cash' 
    ? purchaseCosts + rehabCosts + holdingCosts
    : (purchaseCosts - loanAmount) + rehabCosts + holdingCosts + (loanAmount * points / 100);

  // ROI calculations
  const roi = cashRequired > 0 ? (netProfit / cashRequired) * 100 : 0;
  const projectTimeMonths = totalHoldingMonths;
  const annualizedROI = projectTimeMonths > 0 ? (roi * 12) / projectTimeMonths : 0;
  const profitMargin = arv > 0 ? (netProfit / arv) * 100 : 0;

  // 70% Rule
  const maxAllowableOffer = (arv * 0.70) - rehabBudget;
  const meetsSeventyPercentRule = purchasePrice <= maxAllowableOffer;

  return {
    totalCost,
    purchaseCosts,
    rehabCosts,
    holdingCosts,
    financingCosts,
    sellingCosts,
    netProfit,
    roi,
    annualizedROI,
    profitMargin,
    cashRequired,
    totalProjectTime: projectTimeMonths,
    maxAllowableOffer,
    meetsSeventyPercentRule,
  };
}

/**
 * Generate Flip-specific insights
 */
export function generateFlipInsights(inputs: FlipInputs, metrics: FlipMetrics): Insight[] {
  const insights: Insight[] = [];

  // 70% Rule check
  if (metrics.meetsSeventyPercentRule) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: 'Meets the 70% rule — solid acquisition price',
    });
  } else {
    const overage = inputs.purchasePrice - metrics.maxAllowableOffer;
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `$${Math.round(overage / 1000)}K over 70% rule MAO of $${Math.round(metrics.maxAllowableOffer / 1000)}K`,
    });
  }

  // Profit analysis
  if (metrics.netProfit >= 50000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Strong $${Math.round(metrics.netProfit / 1000)}K projected profit`,
    });
  } else if (metrics.netProfit >= 25000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `$${Math.round(metrics.netProfit / 1000)}K profit — meets minimum threshold`,
    });
  } else if (metrics.netProfit > 0) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Only $${Math.round(metrics.netProfit / 1000)}K profit — thin margin for errors`,
    });
  } else {
    insights.push({
      type: 'concern',
      icon: '❌',
      text: 'Negative profit — deal is not viable',
    });
  }

  // ROI analysis
  if (metrics.annualizedROI >= 50) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `${metrics.annualizedROI.toFixed(0)}% annualized ROI is excellent`,
    });
  }

  // Timeline considerations
  if (inputs.rehabTimeMonths > 6) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `${inputs.rehabTimeMonths} month rehab increases holding costs and market risk`,
    });
  }

  // Financing efficiency
  if (inputs.financingType === 'hardMoney' && inputs.interestRate > 0.14) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `${(inputs.interestRate * 100).toFixed(0)}% hard money rate is high — shop for better terms`,
    });
  }

  // Contingency buffer
  const bufferPercent = (metrics.netProfit / metrics.totalCost) * 100;
  if (bufferPercent < 15) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: 'Add 10-15% contingency to rehab budget for unexpected costs',
    });
  }

  return insights.slice(0, 4);
}

/**
 * Calculate Flip deal score (0-100)
 */
export function calculateFlipScore(metrics: FlipMetrics, inputs: FlipInputs): number {
  let score = 0;

  // Net Profit (max 30 points) - most important for flips
  if (metrics.netProfit >= 75000) score += 30;
  else if (metrics.netProfit >= 50000) score += 24 + (metrics.netProfit - 50000) * 0.00024;
  else if (metrics.netProfit >= 25000) score += 15 + (metrics.netProfit - 25000) * 0.00036;
  else if (metrics.netProfit > 0) score += metrics.netProfit * 0.0006;

  // ROI (max 25 points)
  if (metrics.roi >= 40) score += 25;
  else if (metrics.roi >= 25) score += 18 + (metrics.roi - 25) * 0.47;
  else if (metrics.roi >= 15) score += 10 + (metrics.roi - 15) * 0.8;
  else score += Math.max(0, metrics.roi * 0.67);

  // 70% Rule (max 20 points)
  if (metrics.meetsSeventyPercentRule) {
    const marginPercent = ((metrics.maxAllowableOffer - inputs.purchasePrice) / metrics.maxAllowableOffer) * 100;
    score += Math.min(20, 12 + marginPercent * 0.4);
  } else {
    const overagePercent = ((inputs.purchasePrice - metrics.maxAllowableOffer) / metrics.maxAllowableOffer) * 100;
    score += Math.max(0, 12 - overagePercent);
  }

  // Timeline efficiency (max 15 points) - faster is better
  const timeScore = Math.max(0, 15 - (inputs.rehabTimeMonths - 2) * 2);
  score += timeScore;

  // Profit margin buffer (max 10 points)
  if (metrics.profitMargin >= 20) score += 10;
  else if (metrics.profitMargin >= 15) score += 7 + (metrics.profitMargin - 15);
  else if (metrics.profitMargin >= 10) score += 4 + (metrics.profitMargin - 10) * 0.6;
  else score += Math.max(0, metrics.profitMargin * 0.4);

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Full Flip analysis
 */
export function analyzeFlip(inputs: FlipInputs): StrategyAnalysis<FlipMetrics> {
  const metrics = calculateFlipMetrics(inputs);
  const score = calculateFlipScore(metrics, inputs);
  const insights = generateFlipInsights(inputs, metrics);

  const getGrade = (s: number) => {
    if (s >= 80) return { grade: 'A', color: '#22c55e' };
    if (s >= 70) return { grade: 'B+', color: '#22c55e' };
    if (s >= 60) return { grade: 'B', color: '#84cc16' };
    if (s >= 50) return { grade: 'C+', color: '#f97316' };
    if (s >= 40) return { grade: 'C', color: '#f97316' };
    return { grade: 'D', color: '#ef4444' };
  };

  const { grade, color } = getGrade(score);

  return {
    strategy: 'fixAndFlip',
    score,
    grade,
    color,
    metrics,
    insights,
    isViable: metrics.netProfit >= 15000 && metrics.meetsSeventyPercentRule,
  };
}

