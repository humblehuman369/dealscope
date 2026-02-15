/**
 * House Hack Strategy Calculations
 * Owner-occupied multi-unit or room rental
 */

import {
  AnalyticsInputs,
  HouseHackInputs,
  HouseHackMetrics,
  CalculatedMetrics,
  Insight,
  StrategyAnalysis,
} from '../types';
import { calculateMetrics, calculateMortgagePayment } from '../calculations';

export const DEFAULT_HOUSE_HACK_INPUTS: HouseHackInputs = {
  // Base analytics inputs — all percentages as whole numbers (e.g. 3.5 = 3.5%)
  purchasePrice: 500000,
  downPaymentPercent: 3.5,       // FHA minimum down payment
  closingCostsPercent: 3,        // percentage
  interestRate: 6.0,             // percentage — matches frontend default
  loanTermYears: 30,
  monthlyRent: 0, // Calculated from units
  otherIncome: 0,
  vacancyRate: 5,                // percentage
  maintenanceRate: 5,            // percentage
  managementRate: 0,             // Self-managed
  annualPropertyTax: 6000,
  annualInsurance: 2400,
  monthlyHoa: 0,
  appreciationRate: 3,           // percentage
  rentGrowthRate: 3,             // percentage
  expenseGrowthRate: 2,          // percentage
  
  // House hack specific
  totalUnits: 4,
  ownerOccupiedUnits: 1,
  rentedUnits: 3,
  rentPerUnit: [1500, 1500, 1500], // Rent for each rented unit
  
  currentHousingPayment: 2000, // Current rent/housing cost
  sharedUtilities: 200,
  additionalMaintenance: 100,
};

/**
 * Calculate House Hack metrics from inputs
 */
export function calculateHouseHackMetrics(inputs: HouseHackInputs): HouseHackMetrics {
  // Calculate total rental income from rented units
  const totalRentalIncome = inputs.rentPerUnit.reduce((sum, rent) => sum + rent, 0);
  
  // Create base inputs for standard calculation
  const baseInputs: AnalyticsInputs = {
    ...inputs,
    monthlyRent: totalRentalIncome,
    managementRate: 0, // Self-managed
  };
  
  // Get base metrics
  const baseMetrics = calculateMetrics(baseInputs);
  
  // House hack specific calculations
  const mortgagePayment = baseMetrics.mortgagePayment;
  const effectiveHousingCost = mortgagePayment - baseMetrics.monthlyCashFlow;
  
  // What you'd pay if you didn't house hack
  const housingCostSavings = inputs.currentHousingPayment - effectiveHousingCost;
  const housingCostReductionPercent = inputs.currentHousingPayment > 0
    ? (housingCostSavings / inputs.currentHousingPayment) * 100
    : 0;
  
  // Per unit analysis
  const revenuePerRentedUnit = inputs.rentedUnits > 0 
    ? totalRentalIncome / inputs.rentedUnits 
    : 0;
  const cashFlowPerRentedUnit = inputs.rentedUnits > 0 
    ? baseMetrics.monthlyCashFlow / inputs.rentedUnits 
    : 0;
  
  // Rent vs buy comparison
  // Assume 10% down in stock market as alternative
  const opportunityCost = baseMetrics.totalCashRequired * 0.10 / 12; // Monthly opportunity cost
  const equityBuildup = baseMetrics.yearOneEquityGrowth / 12;
  const rentVsBuyBenefit = housingCostSavings + equityBuildup - opportunityCost;

  return {
    ...baseMetrics,
    effectiveHousingCost,
    housingCostSavings,
    housingCostReductionPercent,
    revenuePerRentedUnit,
    cashFlowPerRentedUnit,
    rentVsBuyBenefit,
  };
}

/**
 * Generate House Hack-specific insights
 */
export function generateHouseHackInsights(
  inputs: HouseHackInputs,
  metrics: HouseHackMetrics
): Insight[] {
  const insights: Insight[] = [];

  // Housing cost analysis
  if (metrics.effectiveHousingCost <= 0) {
    insights.push({
      type: 'strength',
      icon: '🎯',
      text: 'Living for FREE! Tenants cover 100%+ of your housing',
      highlight: 'House hack success',
    });
  } else if (metrics.housingCostReductionPercent >= 50) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `${metrics.housingCostReductionPercent.toFixed(0)}% housing cost reduction — saving $${Math.round(metrics.housingCostSavings)}/mo`,
    });
  } else if (metrics.housingCostReductionPercent > 0) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Saving $${Math.round(metrics.housingCostSavings)}/mo vs renting`,
    });
  }

  // Low down payment advantage
  if (inputs.downPaymentPercent <= 5) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Only ${inputs.downPaymentPercent.toFixed(1)}% down with owner-occupant loan`,
    });
  }

  // Per door cash flow
  if (metrics.cashFlowPerRentedUnit >= 200) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `$${Math.round(metrics.cashFlowPerRentedUnit)}/unit meets investor benchmarks`,
    });
  }

  // Equity building
  const monthlyEquity = metrics.yearOneEquityGrowth / 12;
  if (monthlyEquity > 500) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Building $${Math.round(monthlyEquity)}/mo in equity while living there`,
    });
  }

  // Scale opportunity
  if (inputs.totalUnits >= 4) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `With ${inputs.totalUnits} units, move out after 1 year and keep as pure investment`,
    });
  }

  // Rent vs buy
  if (metrics.rentVsBuyBenefit > 500) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Net $${Math.round(metrics.rentVsBuyBenefit)}/mo better than renting`,
    });
  }

  return insights.slice(0, 4);
}

/**
 * Calculate House Hack deal score (0-100)
 */
export function calculateHouseHackScore(
  metrics: HouseHackMetrics,
  inputs: HouseHackInputs
): number {
  let score = 0;

  // Housing cost reduction (max 30 points) - primary goal
  if (metrics.effectiveHousingCost <= 0) score += 30;
  else if (metrics.housingCostReductionPercent >= 75) score += 25 + (metrics.housingCostReductionPercent - 75) * 0.2;
  else if (metrics.housingCostReductionPercent >= 50) score += 18 + (metrics.housingCostReductionPercent - 50) * 0.28;
  else if (metrics.housingCostReductionPercent >= 25) score += 10 + (metrics.housingCostReductionPercent - 25) * 0.32;
  else score += Math.max(0, metrics.housingCostReductionPercent * 0.4);

  // Cash flow (max 20 points)
  if (metrics.monthlyCashFlow >= 500) score += 20;
  else if (metrics.monthlyCashFlow >= 200) score += 12 + (metrics.monthlyCashFlow - 200) * 0.027;
  else if (metrics.monthlyCashFlow >= 0) score += 6 + metrics.monthlyCashFlow * 0.03;
  else score += Math.max(0, 6 + metrics.monthlyCashFlow * 0.02);

  // Cash-on-Cash (max 20 points)
  if (metrics.cashOnCash >= 20) score += 20;
  else if (metrics.cashOnCash >= 10) score += 12 + (metrics.cashOnCash - 10) * 0.8;
  else if (metrics.cashOnCash >= 5) score += 6 + (metrics.cashOnCash - 5) * 1.2;
  else score += Math.max(0, metrics.cashOnCash * 1.2);

  // Down payment efficiency (max 15 points) - lower is better
  if (inputs.downPaymentPercent <= 3.5) score += 15;
  else if (inputs.downPaymentPercent <= 5) score += 12;
  else if (inputs.downPaymentPercent <= 10) score += 8;
  else if (inputs.downPaymentPercent <= 20) score += 4;

  // Scale/unit potential (max 15 points)
  if (inputs.rentedUnits >= 3) score += 15;
  else if (inputs.rentedUnits >= 2) score += 10;
  else if (inputs.rentedUnits >= 1) score += 6;

  return Math.round(Math.min(100, score));
}

/**
 * Full House Hack analysis
 */
export function analyzeHouseHack(inputs: HouseHackInputs): StrategyAnalysis<HouseHackMetrics> {
  const metrics = calculateHouseHackMetrics(inputs);
  const score = calculateHouseHackScore(metrics, inputs);
  const insights = generateHouseHackInsights(inputs, metrics);

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
    strategy: 'houseHack',
    score,
    grade,
    color,
    metrics,
    insights,
    isViable: metrics.housingCostReductionPercent > 0 || metrics.monthlyCashFlow > 0,
  };
}

