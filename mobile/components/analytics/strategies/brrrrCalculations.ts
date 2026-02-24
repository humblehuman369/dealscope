/**
 * @deprecated — LOCAL CALCULATIONS. All financial calculations should use
 * the backend API via useStrategyWorksheet hook. This file is kept for
 * legacy scoring/insight logic only. Do not add new calculation logic here.
 */

import { BRRRRInputs, BRRRRMetrics, Insight, StrategyAnalysis } from '../types';
import { calculateMortgagePayment } from '../calculations';

export const DEFAULT_BRRRR_INPUTS: BRRRRInputs = {
  // Purchase
  purchasePrice: 200000,
  closingCostsPercent: 2,        // percentage
  
  // Rehab
  rehabBudget: 50000,
  rehabTimeMonths: 3,
  holdingCostsMonthly: 1500,
  
  // ARV
  arv: 300000,
  
  // Refinance
  refinanceLTV: 75,              // percentage (75 = 75% LTV)
  refinanceRate: 6.0,            // percentage — matches frontend default
  refinanceTermYears: 30,
  refinanceCosts: 4000,
  
  // Rental
  monthlyRent: 2200,
  vacancyRate: 5,                // percentage
  maintenanceRate: 8,            // percentage
  managementRate: 10,            // percentage
  annualPropertyTax: 3600,
  annualInsurance: 1800,
  monthlyHoa: 0,
};

/**
 * Calculate BRRRR metrics from inputs
 */
export function calculateBRRRRMetrics(inputs: BRRRRInputs): BRRRRMetrics {
  const {
    purchasePrice,
    closingCostsPercent,
    rehabBudget,
    rehabTimeMonths,
    holdingCostsMonthly,
    arv,
    refinanceLTV,
    refinanceRate,
    refinanceTermYears,
    refinanceCosts,
    monthlyRent,
    vacancyRate,
    maintenanceRate,
    managementRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
  } = inputs;

  // Initial investment calculations
  const purchaseCosts = purchasePrice + (purchasePrice * (closingCostsPercent / 100));
  const rehabCosts = rehabBudget;
  const holdingCosts = holdingCostsMonthly * rehabTimeMonths;
  const totalInitialInvestment = purchaseCosts + rehabCosts + holdingCosts;

  // Refinance calculations
  const refinanceLoanAmount = arv * (refinanceLTV / 100);
  const cashOutAmount = refinanceLoanAmount - refinanceCosts;
  const cashLeftInDeal = Math.max(0, totalInitialInvestment - cashOutAmount);
  // Cash recoup — measures % of YOUR initial cash recovered (matches frontend)
  const cashRecoupPercent = totalInitialInvestment > 0
    ? ((totalInitialInvestment - cashLeftInDeal) / totalInitialInvestment) * 100
    : 0;
  const infiniteReturn = cashRecoupPercent >= 100;

  // Equity calculations
  const equityCreated = arv - refinanceLoanAmount;
  const equityPercent = (equityCreated / arv) * 100;

  // New mortgage payment
  const newMortgagePayment = calculateMortgagePayment(
    refinanceLoanAmount,
    refinanceRate,
    refinanceTermYears
  );

  // Monthly income/expenses (post-refinance)
  const effectiveRent = monthlyRent * (1 - vacancyRate / 100);
  const maintenance = monthlyRent * (maintenanceRate / 100);
  const management = monthlyRent * (managementRate / 100);
  const propertyTax = annualPropertyTax / 12;
  const insurance = annualInsurance / 12;

  const totalMonthlyExpenses = newMortgagePayment + maintenance + management + 
                                propertyTax + insurance + monthlyHoa;
  
  const monthlyCashFlow = effectiveRent - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // Returns
  const cashOnCash = cashLeftInDeal > 0 
    ? (annualCashFlow / cashLeftInDeal) * 100 
    : annualCashFlow > 0 ? Infinity : 0;

  // Timeline
  const totalTimeMonths = rehabTimeMonths + 1; // +1 for refinance process

  return {
    totalInitialInvestment,
    purchaseCosts,
    rehabCosts,
    holdingCosts,
    refinanceLoanAmount,
    cashOutAmount,
    cashLeftInDeal,
    cashRecoupPercent,
    newMortgagePayment,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCash,
    infiniteReturn,
    equityCreated,
    equityPercent,
    totalTimeMonths,
  };
}

/**
 * Generate BRRRR-specific insights
 */
export function generateBRRRRInsights(inputs: BRRRRInputs, metrics: BRRRRMetrics): Insight[] {
  const insights: Insight[] = [];

  // Cash recoup analysis
  if (metrics.infiniteReturn) {
    insights.push({
      type: 'strength',
      icon: '🎯',
      text: `Infinite return achieved — all cash recovered at refinance`,
      highlight: 'Perfect BRRRR',
    });
  } else if (metrics.cashRecoupPercent >= 80) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `${metrics.cashRecoupPercent.toFixed(0)}% cash recouped — strong BRRRR execution`,
    });
  } else {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Only ${metrics.cashRecoupPercent.toFixed(0)}% cash recouped — consider negotiating lower purchase`,
    });
  }

  // Equity creation
  if (metrics.equityPercent >= 25) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Created $${Math.round(metrics.equityCreated / 1000)}K (${metrics.equityPercent.toFixed(0)}%) instant equity`,
    });
  }

  // Cash flow analysis
  if (metrics.monthlyCashFlow >= 300) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Strong $${Math.round(metrics.monthlyCashFlow)}/mo cash flow post-refinance`,
    });
  } else if (metrics.monthlyCashFlow < 100) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Low $${Math.round(metrics.monthlyCashFlow)}/mo cash flow — tight margins`,
    });
  }

  // LTV analysis
  if (inputs.refinanceLTV <= 70) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `Conservative ${inputs.refinanceLTV.toFixed(0)}% LTV — consider 75% for more cash out`,
    });
  }

  // Rehab efficiency
  const valueAdded = inputs.arv - inputs.purchasePrice;
  const rehabROI = ((valueAdded - inputs.rehabBudget) / inputs.rehabBudget) * 100;
  if (rehabROI >= 100) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Rehab creates ${rehabROI.toFixed(0)}% return on renovation dollars`,
    });
  }

  return insights.slice(0, 4);
}

/**
 * Calculate BRRRR deal score (0-100)
 */
export function calculateBRRRRScore(metrics: BRRRRMetrics, inputs: BRRRRInputs): number {
  let score = 0;

  // Cash recoup (max 30 points) - most important for BRRRR
  if (metrics.cashRecoupPercent >= 100) score += 30;
  else if (metrics.cashRecoupPercent >= 80) score += 24 + (metrics.cashRecoupPercent - 80) * 0.3;
  else if (metrics.cashRecoupPercent >= 50) score += 12 + (metrics.cashRecoupPercent - 50) * 0.4;
  else score += Math.max(0, metrics.cashRecoupPercent * 0.24);

  // Equity creation (max 25 points)
  if (metrics.equityPercent >= 30) score += 25;
  else if (metrics.equityPercent >= 25) score += 20 + (metrics.equityPercent - 25);
  else if (metrics.equityPercent >= 20) score += 15 + (metrics.equityPercent - 20);
  else score += Math.max(0, metrics.equityPercent * 0.75);

  // Monthly cash flow (max 20 points)
  if (metrics.monthlyCashFlow >= 500) score += 20;
  else if (metrics.monthlyCashFlow >= 200) score += 10 + (metrics.monthlyCashFlow - 200) * 0.033;
  else if (metrics.monthlyCashFlow > 0) score += metrics.monthlyCashFlow * 0.05;

  // Cash-on-Cash or infinite return (max 15 points)
  if (metrics.infiniteReturn) score += 15;
  else if (metrics.cashOnCash >= 20) score += 15;
  else if (metrics.cashOnCash >= 12) score += 10 + (metrics.cashOnCash - 12) * 0.625;
  else score += Math.max(0, metrics.cashOnCash * 0.83);

  // ARV accuracy buffer (max 10 points) - based on spread
  const spreadPercent = ((inputs.arv - inputs.purchasePrice - inputs.rehabBudget) / inputs.arv) * 100;
  if (spreadPercent >= 30) score += 10;
  else if (spreadPercent >= 20) score += 7 + (spreadPercent - 20) * 0.3;
  else score += Math.max(0, spreadPercent * 0.35);

  return Math.round(Math.min(100, score));
}

/**
 * Full BRRRR analysis
 */
export function analyzeBRRRR(inputs: BRRRRInputs): StrategyAnalysis<BRRRRMetrics> {
  const metrics = calculateBRRRRMetrics(inputs);
  const score = calculateBRRRRScore(metrics, inputs);
  const insights = generateBRRRRInsights(inputs, metrics);

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
    strategy: 'brrrr',
    score,
    grade,
    color,
    metrics,
    insights,
    isViable: metrics.cashRecoupPercent >= 50 && metrics.monthlyCashFlow > 0,
  };
}

