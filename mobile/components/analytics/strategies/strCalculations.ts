/**
 * Short-Term Rental (STR) Calculations
 * Airbnb/VRBO style rental analysis
 */

import { STRInputs, STRMetrics, Insight, StrategyAnalysis } from '../types';
import { calculateMortgagePayment } from '../calculations';

export const DEFAULT_STR_INPUTS: STRInputs = {
  purchasePrice: 400000,
  downPaymentPercent: 0.25,
  closingCostsPercent: 0.03,
  interestRate: 0.0725,
  loanTermYears: 30,
  
  averageDailyRate: 200,
  occupancyRate: 0.70,
  cleaningFee: 150,
  cleaningCostPerTurn: 100,
  averageStayLength: 3,
  
  annualPropertyTax: 5000,
  annualInsurance: 2400,
  monthlyHoa: 0,
  utilities: 300,
  maintenanceRate: 0.08,
  managementRate: 0.20,
  platformFeeRate: 0.03,
  
  furnishingBudget: 25000,
};

/**
 * Calculate STR metrics from inputs
 */
export function calculateSTRMetrics(inputs: STRInputs): STRMetrics {
  const {
    purchasePrice,
    downPaymentPercent,
    closingCostsPercent,
    interestRate,
    loanTermYears,
    averageDailyRate,
    occupancyRate,
    cleaningFee,
    cleaningCostPerTurn,
    averageStayLength,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
    utilities,
    maintenanceRate,
    managementRate,
    platformFeeRate,
    furnishingBudget,
  } = inputs;

  // Loan calculations
  const downPayment = purchasePrice * downPaymentPercent;
  const closingCosts = purchasePrice * closingCostsPercent;
  const loanAmount = purchasePrice - downPayment;
  const totalCashRequired = downPayment + closingCosts + furnishingBudget;
  const mortgagePayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);

  // Revenue calculations
  const daysPerMonth = 30.44;
  const occupiedNightsPerMonth = daysPerMonth * occupancyRate;
  const turnsPerMonth = occupiedNightsPerMonth / averageStayLength;
  
  const nightlyRevenue = occupiedNightsPerMonth * averageDailyRate;
  const cleaningRevenue = turnsPerMonth * cleaningFee;
  const monthlyGrossRevenue = nightlyRevenue + cleaningRevenue;
  const annualGrossRevenue = monthlyGrossRevenue * 12;
  
  // RevPAR (Revenue Per Available Room/Night)
  const revPAR = monthlyGrossRevenue / daysPerMonth;

  // Expense calculations
  const monthlyTaxes = annualPropertyTax / 12;
  const monthlyInsurance = annualInsurance / 12;
  const monthlyMaintenance = monthlyGrossRevenue * maintenanceRate;
  const monthlyManagement = monthlyGrossRevenue * managementRate;
  const monthlyPlatformFees = monthlyGrossRevenue * platformFeeRate;
  const monthlyCleaning = turnsPerMonth * cleaningCostPerTurn;

  const monthlyExpenses = {
    mortgage: mortgagePayment,
    taxes: monthlyTaxes,
    insurance: monthlyInsurance,
    hoa: monthlyHoa,
    utilities,
    maintenance: monthlyMaintenance,
    management: monthlyManagement,
    platformFees: monthlyPlatformFees,
    cleaning: monthlyCleaning,
  };

  const totalMonthlyExpenses = Object.values(monthlyExpenses).reduce((a, b) => a + b, 0);
  
  // Net calculations
  const monthlyNetRevenue = monthlyGrossRevenue - (totalMonthlyExpenses - mortgagePayment);
  const monthlyCashFlow = monthlyGrossRevenue - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // Returns
  const cashOnCash = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const noi = annualGrossRevenue - (totalMonthlyExpenses - mortgagePayment) * 12;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

  return {
    grossNightlyRevenue: nightlyRevenue,
    monthlyGrossRevenue,
    annualGrossRevenue,
    revPAR,
    monthlyNetRevenue,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCash,
    capRate,
    totalCashRequired,
    loanAmount,
    mortgagePayment,
    monthlyExpenses,
  };
}

/**
 * Generate STR-specific insights
 */
export function generateSTRInsights(inputs: STRInputs, metrics: STRMetrics): Insight[] {
  const insights: Insight[] = [];

  // Occupancy analysis
  if (inputs.occupancyRate >= 0.75) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Strong ${Math.round(inputs.occupancyRate * 100)}% occupancy rate`,
      highlight: 'above market average',
    });
  } else if (inputs.occupancyRate < 0.60) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Low ${Math.round(inputs.occupancyRate * 100)}% occupancy may indicate seasonality or pricing issues`,
    });
  }

  // RevPAR analysis
  if (metrics.revPAR >= 200) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `RevPAR of $${Math.round(metrics.revPAR)} is excellent`,
    });
  }

  // Cash-on-Cash analysis
  if (metrics.cashOnCash >= 15) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `${metrics.cashOnCash.toFixed(1)}% CoC return exceeds STR benchmarks`,
    });
  } else if (metrics.cashOnCash < 10) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: 'Consider dynamic pricing to boost ADR during peak seasons',
    });
  }

  // Management fee analysis
  if (inputs.managementRate > 0.25) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `${Math.round(inputs.managementRate * 100)}% management fee is high - consider self-managing`,
    });
  }

  // Furnishing ROI
  const furnishingROI = (metrics.annualCashFlow / inputs.furnishingBudget) * 100;
  if (furnishingROI > 50) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Furnishing investment pays back in ${(12 / (furnishingROI / 100)).toFixed(0)} months`,
    });
  }

  return insights.slice(0, 4);
}

/**
 * Calculate STR deal score (0-100)
 */
export function calculateSTRScore(metrics: STRMetrics, inputs: STRInputs): number {
  let score = 0;

  // Cash-on-Cash (max 25 points) - STR should be higher than LTR
  if (metrics.cashOnCash >= 25) score += 25;
  else if (metrics.cashOnCash >= 15) score += 20 + (metrics.cashOnCash - 15) * 0.5;
  else if (metrics.cashOnCash >= 10) score += 10 + (metrics.cashOnCash - 10);
  else score += Math.max(0, metrics.cashOnCash);

  // Occupancy (max 20 points)
  const occScore = Math.min(20, (inputs.occupancyRate / 0.80) * 20);
  score += occScore;

  // RevPAR (max 20 points)
  if (metrics.revPAR >= 250) score += 20;
  else if (metrics.revPAR >= 150) score += 12 + (metrics.revPAR - 150) * 0.08;
  else score += Math.max(0, metrics.revPAR * 0.08);

  // Monthly cash flow (max 20 points)
  if (metrics.monthlyCashFlow >= 2000) score += 20;
  else if (metrics.monthlyCashFlow >= 1000) score += 12 + (metrics.monthlyCashFlow - 1000) * 0.008;
  else if (metrics.monthlyCashFlow > 0) score += metrics.monthlyCashFlow * 0.012;

  // Expense ratio (max 15 points) - lower is better
  const expenseRatio = (metrics.monthlyGrossRevenue - metrics.monthlyCashFlow) / metrics.monthlyGrossRevenue;
  if (expenseRatio <= 0.50) score += 15;
  else if (expenseRatio <= 0.65) score += 10 + (0.65 - expenseRatio) * 33;
  else if (expenseRatio <= 0.80) score += (0.80 - expenseRatio) * 66;

  return Math.round(Math.min(100, score));
}

/**
 * Full STR analysis
 */
export function analyzeSTR(inputs: STRInputs): StrategyAnalysis<STRMetrics> {
  const metrics = calculateSTRMetrics(inputs);
  const score = calculateSTRScore(metrics, inputs);
  const insights = generateSTRInsights(inputs, metrics);

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
    strategy: 'shortTermRental',
    score,
    grade,
    color,
    metrics,
    insights,
    isViable: metrics.monthlyCashFlow > 0 && inputs.occupancyRate >= 0.50,
  };
}

