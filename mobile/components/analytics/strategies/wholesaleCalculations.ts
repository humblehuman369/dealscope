/**
 * @deprecated — LOCAL CALCULATIONS. All financial calculations should use
 * the backend API via useStrategyWorksheet hook. This file is kept for
 * legacy scoring/insight logic only. Do not add new calculation logic here.
 */

import { WholesaleInputs, WholesaleMetrics, Insight, StrategyAnalysis } from '../types';

export const DEFAULT_WHOLESALE_INPUTS: WholesaleInputs = {
  // Contract
  contractPrice: 150000,
  earnestMoney: 1000,
  inspectionPeriodDays: 14,
  
  // Property
  arv: 250000,
  estimatedRepairs: 50000,
  
  // Assignment
  assignmentFee: 15000,
  
  // Costs
  marketingCosts: 500,
  closingCosts: 500,
};

/**
 * Calculate Wholesale metrics from inputs
 */
export function calculateWholesaleMetrics(inputs: WholesaleInputs): WholesaleMetrics {
  const {
    contractPrice,
    earnestMoney,
    arv,
    estimatedRepairs,
    assignmentFee,
    marketingCosts,
    closingCosts,
  } = inputs;

  // Total cash required
  const totalCashRequired = earnestMoney + marketingCosts + closingCosts;

  // Net profit
  const netProfit = assignmentFee - marketingCosts - closingCosts;

  // ROI
  const roi = totalCashRequired > 0 ? (netProfit / totalCashRequired) * 100 : 0;

  // End buyer analysis
  const endBuyerAllInPrice = contractPrice + assignmentFee;
  
  // What end buyer could make (assuming fix & flip)
  // ARV - All-in price - repairs - selling costs (8%)
  const endBuyerSellingCosts = arv * 0.08;
  const endBuyerMaxProfit = arv - endBuyerAllInPrice - estimatedRepairs - endBuyerSellingCosts;
  
  // Spread between MAO and contract
  const endBuyerSpread = endBuyerMaxProfit;

  // 70% Rule — standard MAO: ARV * 0.70 - repairs (matches frontend)
  const maxAllowableOffer = (arv * 0.70) - estimatedRepairs;
  const meetsSeventyPercentRule = contractPrice <= maxAllowableOffer;

  return {
    netProfit,
    roi,
    endBuyerAllInPrice,
    endBuyerMaxProfit,
    endBuyerSpread,
    meetsSeventyPercentRule,
    maxAllowableOffer,
    totalCashRequired,
  };
}

/**
 * Generate Wholesale-specific insights
 */
export function generateWholesaleInsights(
  inputs: WholesaleInputs,
  metrics: WholesaleMetrics
): Insight[] {
  const insights: Insight[] = [];

  // Assignment fee analysis
  if (inputs.assignmentFee >= 20000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Strong $${Math.round(inputs.assignmentFee / 1000)}K assignment fee`,
      highlight: 'Excellent deal',
    });
  } else if (inputs.assignmentFee >= 10000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `$${Math.round(inputs.assignmentFee / 1000)}K fee — solid wholesale profit`,
    });
  } else if (inputs.assignmentFee >= 5000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `$${Math.round(inputs.assignmentFee / 1000)}K fee — meets minimum threshold`,
    });
  } else {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `$${Math.round(inputs.assignmentFee / 1000)}K fee may not justify time investment`,
    });
  }

  // End buyer attractiveness
  if (metrics.meetsSeventyPercentRule) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: 'Deal meets 70% rule — attractive to cash buyers',
    });
  } else {
    const overage = metrics.endBuyerAllInPrice - metrics.maxAllowableOffer;
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `$${Math.round(overage / 1000)}K over MAO — may be hard to assign`,
    });
  }

  // End buyer profit
  if (metrics.endBuyerMaxProfit >= 40000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `End buyer profit of $${Math.round(metrics.endBuyerMaxProfit / 1000)}K makes quick assignment likely`,
    });
  } else if (metrics.endBuyerMaxProfit >= 25000) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `$${Math.round(metrics.endBuyerMaxProfit / 1000)}K buyer profit — have backup buyers ready`,
    });
  } else if (metrics.endBuyerMaxProfit > 0) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Only $${Math.round(metrics.endBuyerMaxProfit / 1000)}K buyer profit — assignment may be difficult`,
    });
  }

  // ROI analysis
  if (metrics.roi >= 1000) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `${metrics.roi.toFixed(0)}% ROI — high leverage, low risk`,
    });
  }

  // Risk considerations
  if (inputs.inspectionPeriodDays >= 14) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `${inputs.inspectionPeriodDays}-day inspection period gives time to find buyers`,
    });
  } else {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Short ${inputs.inspectionPeriodDays}-day inspection period — have buyers lined up`,
    });
  }

  return insights.slice(0, 4);
}

/**
 * Calculate Wholesale deal score (0-100)
 */
export function calculateWholesaleScore(
  metrics: WholesaleMetrics,
  inputs: WholesaleInputs
): number {
  let score = 0;

  // Assignment fee (max 30 points) - main income metric
  if (inputs.assignmentFee >= 25000) score += 30;
  else if (inputs.assignmentFee >= 15000) score += 22 + (inputs.assignmentFee - 15000) * 0.0008;
  else if (inputs.assignmentFee >= 10000) score += 15 + (inputs.assignmentFee - 10000) * 0.0014;
  else if (inputs.assignmentFee >= 5000) score += 8 + (inputs.assignmentFee - 5000) * 0.0014;
  else score += Math.max(0, inputs.assignmentFee * 0.0016);

  // End buyer attractiveness - 70% rule (max 25 points)
  if (metrics.meetsSeventyPercentRule) {
    const marginBelow = (metrics.maxAllowableOffer - metrics.endBuyerAllInPrice) / metrics.maxAllowableOffer * 100;
    score += Math.min(25, 15 + marginBelow);
  } else {
    const overagePercent = ((metrics.endBuyerAllInPrice - metrics.maxAllowableOffer) / metrics.maxAllowableOffer) * 100;
    score += Math.max(0, 15 - overagePercent);
  }

  // End buyer profit (max 20 points)
  if (metrics.endBuyerMaxProfit >= 50000) score += 20;
  else if (metrics.endBuyerMaxProfit >= 35000) score += 15 + (metrics.endBuyerMaxProfit - 35000) * 0.00033;
  else if (metrics.endBuyerMaxProfit >= 25000) score += 10 + (metrics.endBuyerMaxProfit - 25000) * 0.0005;
  else if (metrics.endBuyerMaxProfit > 0) score += metrics.endBuyerMaxProfit * 0.0004;

  // Risk profile (max 15 points)
  // Based on inspection period and earnest money at risk
  const riskScore = inputs.inspectionPeriodDays >= 14 ? 10 : 5;
  const emRiskPercent = (inputs.earnestMoney / inputs.assignmentFee) * 100;
  const emScore = emRiskPercent <= 10 ? 5 : emRiskPercent <= 20 ? 3 : 1;
  score += riskScore + emScore;

  // ROI (max 10 points) - usually very high for wholesale
  if (metrics.roi >= 500) score += 10;
  else if (metrics.roi >= 200) score += 7 + (metrics.roi - 200) * 0.01;
  else score += Math.max(0, metrics.roi * 0.035);

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Full Wholesale analysis
 */
export function analyzeWholesale(inputs: WholesaleInputs): StrategyAnalysis<WholesaleMetrics> {
  const metrics = calculateWholesaleMetrics(inputs);
  const score = calculateWholesaleScore(metrics, inputs);
  const insights = generateWholesaleInsights(inputs, metrics);

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
    strategy: 'wholesale',
    score,
    grade,
    color,
    metrics,
    insights,
    isViable: inputs.assignmentFee >= 5000 && metrics.endBuyerMaxProfit >= 20000,
  };
}

