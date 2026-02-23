// ============================================
// DealGapIQ Property Analytics - Calculations
// ============================================

import {
  AnalyticsInputs,
  CalculatedMetrics,
  YearProjection,
  ProjectionSummary,
  AmortizationRow,
  AmortizationSummary,
  DealScore,
  ScoreBreakdown,
  ScoreImprovement,
  OpportunityGrade,
} from '../types/analytics';

// ============================================
// SAFE VALUE UTILITIES
// ============================================

/**
 * Coerce a value to a finite number, returning `fallback` for null,
 * undefined, NaN, Infinity, and non-numeric types.
 */
export const safeNum = (
  value: unknown,
  fallback: number = 0,
): number => {
  if (value == null) return fallback
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

// ============================================
// MORTGAGE CALCULATIONS
// ============================================

/**
 * Calculate monthly mortgage payment (P&I only)
 */
export const calculateMortgagePayment = (
  principal: number,
  annualRate: number,
  termYears: number
): number => {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;

  const payment =
    principal *
    ((monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1));

  return payment;
};

/**
 * Calculate remaining loan balance after N years
 */
export const calculateRemainingBalance = (
  principal: number,
  annualRate: number,
  termYears: number,
  yearsElapsed: number
): number => {
  if (yearsElapsed >= termYears) return 0;
  if (annualRate <= 0) {
    return principal * (1 - yearsElapsed / termYears);
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = termYears * 12;
  const paymentsMade = yearsElapsed * 12;

  const balance =
    principal *
    ((Math.pow(1 + monthlyRate, totalPayments) -
      Math.pow(1 + monthlyRate, paymentsMade)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1));

  return Math.max(0, balance);
};

/**
 * Generate full amortization schedule
 */
export const calculateAmortizationSchedule = (
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationRow[] => {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let month = 1; month <= totalMonths; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;
    balance -= principalPayment;

    schedule.push({
      month,
      year: Math.ceil(month / 12),
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  return schedule;
};

/**
 * Get amortization summary
 */
export const getAmortizationSummary = (
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationSummary => {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const totalPayments = monthlyPayment * termYears * 12;
  const totalInterest = totalPayments - principal;

  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + termYears);

  return {
    monthlyPayment,
    totalPayments,
    totalPrincipal: principal,
    totalInterest,
    principalPercent: (principal / totalPayments) * 100,
    interestPercent: (totalInterest / totalPayments) * 100,
    payoffDate,
  };
};

// ============================================
// CORE METRICS CALCULATIONS
// ============================================

/**
 * Calculate all metrics from inputs
 */
export const calculateMetrics = (inputs: AnalyticsInputs): CalculatedMetrics => {
  // Loan calculations
  const downPayment = inputs.purchasePrice * (inputs.downPaymentPercent / 100);
  const loanAmount = inputs.purchasePrice - downPayment;
  const closingCosts = inputs.purchasePrice * (inputs.closingCostsPercent / 100);
  const totalCashRequired = downPayment + closingCosts + inputs.rehabCosts;
  const monthlyMortgage = calculateMortgagePayment(
    loanAmount,
    inputs.interestRate,
    inputs.loanTermYears
  );

  // Monthly income
  const grossMonthlyIncome = inputs.monthlyRent + inputs.otherIncome;

  // Monthly expenses
  const monthlyVacancy = inputs.monthlyRent * (inputs.vacancyRate / 100);
  const monthlyMaintenance = inputs.monthlyRent * (inputs.maintenanceRate / 100);
  const monthlyManagement = inputs.monthlyRent * (inputs.managementRate / 100);
  const monthlyPropertyTax = inputs.annualPropertyTax / 12;
  const monthlyInsurance = inputs.annualInsurance / 12;
  const monthlyHoa = inputs.monthlyHoa;
  const monthlyUtilities = inputs.utilities;

  const operatingExpenses =
    monthlyVacancy +
    monthlyMaintenance +
    monthlyManagement +
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyHoa +
    monthlyUtilities;

  const totalMonthlyExpenses = operatingExpenses + monthlyMortgage;

  // Cash flow
  const monthlyCashFlow = grossMonthlyIncome - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;

  // Annual figures
  const annualGrossIncome = grossMonthlyIncome * 12;
  const annualOperatingExpenses = operatingExpenses * 12;
  const annualNOI = annualGrossIncome - annualOperatingExpenses;
  const annualDebtService = monthlyMortgage * 12;

  // Key returns
  const cashOnCash = totalCashRequired > 0 
    ? (annualCashFlow / totalCashRequired) * 100 
    : 0;
  
  const capRate = inputs.purchasePrice > 0 
    ? (annualNOI / inputs.purchasePrice) * 100 
    : 0;
  
  const dscr = monthlyMortgage > 0 
    ? (grossMonthlyIncome - operatingExpenses + monthlyMortgage * (inputs.vacancyRate / 100)) / monthlyMortgage 
    : Infinity;
  
  const onePercentRule = inputs.purchasePrice > 0 
    ? (inputs.monthlyRent / inputs.purchasePrice) * 100 
    : 0;
  
  const grossRentMultiplier = inputs.monthlyRent > 0 
    ? inputs.purchasePrice / (inputs.monthlyRent * 12) 
    : Infinity;

  // Break-even points
  const breakEvenOccupancy = monthlyMortgage > 0
    ? ((totalMonthlyExpenses - monthlyVacancy) / grossMonthlyIncome) * 100
    : 0;

  const breakEvenRent = totalMonthlyExpenses / (1 - inputs.vacancyRate / 100);

  // Max purchase price for $200/mo cash flow target
  const targetCashFlow = 200;
  const maxPurchasePriceForTarget = calculateMaxPurchasePrice(inputs, targetCashFlow);

  return {
    loanAmount,
    downPayment,
    closingCosts,
    totalCashRequired,
    monthlyMortgage,
    grossMonthlyIncome,
    totalMonthlyExpenses,
    monthlyVacancy,
    monthlyMaintenance,
    monthlyManagement,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyUtilities,
    monthlyCashFlow,
    annualGrossIncome,
    annualOperatingExpenses,
    annualNOI,
    annualDebtService,
    annualCashFlow,
    cashOnCash,
    capRate,
    dscr,
    onePercentRule,
    grossRentMultiplier,
    breakEvenOccupancy,
    breakEvenRent,
    maxPurchasePriceForTarget,
  };
};

/**
 * Calculate max purchase price for target cash flow
 */
const calculateMaxPurchasePrice = (
  inputs: AnalyticsInputs,
  targetMonthlyCashFlow: number
): number => {
  // Binary search for max purchase price
  let low = 0;
  let high = inputs.purchasePrice * 2;
  let maxPrice = 0;

  while (high - low > 1000) {
    const mid = (low + high) / 2;
    const testInputs = { ...inputs, purchasePrice: mid };
    const testMetrics = calculateMetrics(testInputs);

    if (testMetrics.monthlyCashFlow >= targetMonthlyCashFlow) {
      maxPrice = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return maxPrice;
};

// ============================================
// 10-YEAR PROJECTIONS
// ============================================

/**
 * Generate 10-year projections
 */
export const calculateProjections = (
  inputs: AnalyticsInputs,
  metrics: CalculatedMetrics
): YearProjection[] => {
  const projections: YearProjection[] = [];

  let propertyValue = inputs.purchasePrice;
  let monthlyRent = inputs.monthlyRent;
  let annualExpenses = metrics.annualOperatingExpenses;
  let cumulativeCashFlow = 0;

  for (let year = 1; year <= 10; year++) {
    // Apply growth rates
    if (year > 1) {
      propertyValue *= 1 + inputs.appreciationRate / 100;
      monthlyRent *= 1 + inputs.rentGrowthRate / 100;
      annualExpenses *= 1 + inputs.expenseGrowthRate / 100;
    }

    // Calculate annual figures
    const annualRent = monthlyRent * 12;
    const annualMortgage = metrics.monthlyMortgage * 12;
    const annualCashFlow = annualRent - annualExpenses - annualMortgage;
    cumulativeCashFlow += annualCashFlow;

    // Calculate equity
    const loanBalance = calculateRemainingBalance(
      metrics.loanAmount,
      inputs.interestRate,
      inputs.loanTermYears,
      year
    );
    const equity = propertyValue - loanBalance;
    const equityGrowth = year === 1 
      ? equity - metrics.downPayment 
      : equity - projections[year - 2].equity;

    // Total wealth
    const totalWealth = cumulativeCashFlow + equity;
    const totalReturn = ((totalWealth - metrics.totalCashRequired) / metrics.totalCashRequired) * 100;
    const annualizedReturn = Math.pow(1 + totalReturn / 100, 1 / year) - 1;

    projections.push({
      year,
      annualRent,
      annualExpenses,
      annualMortgage,
      annualCashFlow,
      cumulativeCashFlow,
      propertyValue,
      loanBalance,
      equity,
      equityGrowth,
      totalWealth,
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
    });
  }

  return projections;
};

/**
 * Get projection summary
 */
export const getProjectionSummary = (
  projections: YearProjection[],
  initialInvestment: number
): ProjectionSummary => {
  const year10 = projections[9];

  // Calculate IRR (simplified)
  const cashFlows = [-initialInvestment, ...projections.map(p => p.annualCashFlow)];
  cashFlows[10] += year10.equity; // Add equity at sale
  const irr = calculateIRR(cashFlows);

  // Payback period
  let paybackPeriod: number | null = null;
  for (let i = 0; i < projections.length; i++) {
    if (projections[i].cumulativeCashFlow >= initialInvestment) {
      paybackPeriod = i + 1;
      break;
    }
  }

  return {
    totalCashFlow: year10.cumulativeCashFlow,
    totalEquity: year10.equity,
    totalWealth: year10.totalWealth,
    totalReturn: year10.totalReturn,
    irr,
    equityMultiple: year10.totalWealth / initialInvestment,
    paybackPeriod,
  };
};

/**
 * Calculate IRR using Newton-Raphson method
 */
const calculateIRR = (cashFlows: number[], guess: number = 0.1): number => {
  const maxIterations = 100;
  const tolerance = 0.0001;
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j);
      derivativeNpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1);
    }

    const newRate = rate - npv / derivativeNpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100;
    }

    rate = newRate;
  }

  return rate * 100;
};

// ============================================
// DEAL SCORE CALCULATION (Opportunity-Based)
// ============================================

/**
 * Calculate Deal Score based on Investment Opportunity
 * 
 * The score is based on how much discount from list price is needed
 * to reach Income Value. Lower discount = better opportunity.
 * 
 * Thresholds:
 * - 0-5% discount needed = Strong Opportunity (A+)
 * - 5-10% = Good Opportunity (A)
 * - 10-15% = Moderate Opportunity (B)
 * - 15-25% = Marginal Opportunity (C)
 * - 25-35% = Unlikely Opportunity (D)
 * - 35%+ = Pass (F)
 */
export const calculateDealScore = (
  incomeValue: number,
  listPrice: number,
  metrics?: CalculatedMetrics
): DealScore => {
  // Calculate discount percentage needed to reach Income Value
  // If Income Value > list price, property is already profitable at list
  const discountPercent = listPrice > 0 
    ? Math.max(0, ((listPrice - incomeValue) / listPrice) * 100)
    : 0;
  
  // Score is inverse of discount (lower discount = higher score)
  // 0% discount = 100 score, 45% discount = 0 score
  const score = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))));
  
  // Determine grade, label, and color based on discount percentage
  const { grade, label, verdict, color } = getOpportunityGradeInfo(discountPercent);
  
  // Build breakdown showing the discount needed
  const breakdown: ScoreBreakdown[] = [
    {
      category: 'Discount Required',
      points: Math.round(100 - discountPercent),
      maxPoints: 100,
      icon: '📉',
      description: `${discountPercent.toFixed(1)}% below list`,
      status: getDiscountStatus(discountPercent),
    }
  ];
  
  // Generate insights based on metrics if provided
  const strengths = metrics ? generateOpportunityStrengths(discountPercent, metrics) : [];
  const concerns = metrics ? generateOpportunityConcerns(discountPercent, metrics) : [];
  
  return {
    score,
    grade,
    verdict,
    label,
    color,
    discountPercent,
    incomeValue,
    listPrice,
    breakdown,
    strengths,
    concerns,
    improvements: [],
  };
};

/**
 * Legacy function signature for backwards compatibility
 * Calculates Income Value internally from metrics and inputs
 */
export const calculateDealScoreFromMetrics = (
  metrics: CalculatedMetrics,
  inputs: AnalyticsInputs
): DealScore => {
  // Calculate Income Value using binary search
  const incomeValue = calculateIncomeValue(inputs);
  return calculateDealScore(incomeValue, inputs.purchasePrice, metrics);
};

/**
 * Calculate Income Value (where monthly cash flow = 0)
 */
export const calculateIncomeValue = (inputs: AnalyticsInputs): number => {
  const listPrice = inputs.purchasePrice;
  let low = listPrice * 0.30;
  let high = listPrice * 1.10;
  let incomeValue = listPrice;
  
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const testInputs = { ...inputs, purchasePrice: mid };
    const testMetrics = calculateMetrics(testInputs);
    
    if (Math.abs(testMetrics.monthlyCashFlow) < 10) {
      incomeValue = mid;
      break;
    } else if (testMetrics.monthlyCashFlow > 0) {
      // Still positive, go higher
      low = mid;
    } else {
      // Negative, go lower
      high = mid;
    }
    incomeValue = mid;
  }
  
  return Math.round(incomeValue / 1000) * 1000;
};

const getOpportunityGradeInfo = (discountPercent: number): { 
  grade: OpportunityGrade; 
  label: string; 
  verdict: string; 
  color: string 
} => {
  if (discountPercent <= 5) {
    return { 
      grade: 'A+', 
      label: 'Strong Opportunity', 
      verdict: 'Excellent deal - minimal negotiation needed',
      color: '#22c55e' 
    };
  }
  if (discountPercent <= 10) {
    return { 
      grade: 'A', 
      label: 'Good Opportunity', 
      verdict: 'Very good deal - reasonable negotiation required',
      color: '#22c55e' 
    };
  }
  if (discountPercent <= 15) {
    return { 
      grade: 'B', 
      label: 'Moderate Opportunity', 
      verdict: 'Good potential - negotiate firmly',
      color: '#84cc16' 
    };
  }
  if (discountPercent <= 25) {
    return { 
      grade: 'C', 
      label: 'Marginal Opportunity', 
      verdict: 'Possible deal - significant discount needed',
      color: '#f97316' 
    };
  }
  if (discountPercent <= 35) {
    return { 
      grade: 'D', 
      label: 'Unlikely Opportunity', 
      verdict: 'Challenging deal - major price reduction required',
      color: '#f97316' 
    };
  }
  return { 
    grade: 'F', 
    label: 'Pass', 
    verdict: 'Not recommended - unrealistic discount needed',
    color: '#ef4444' 
  };
};

const getDiscountStatus = (discountPercent: number): ScoreBreakdown['status'] => {
  if (discountPercent <= 5) return 'excellent';
  if (discountPercent <= 15) return 'good';
  if (discountPercent <= 25) return 'average';
  return 'poor';
};

const generateOpportunityStrengths = (discountPercent: number, metrics: CalculatedMetrics): string[] => {
  const strengths: string[] = [];
  
  if (discountPercent <= 5) {
    strengths.push('Profitable near list price');
  } else if (discountPercent <= 10) {
    strengths.push('Achievable with typical negotiation');
  }
  
  if (metrics.monthlyCashFlow >= 300) {
    strengths.push(`Strong cash flow potential ($${Math.round(metrics.monthlyCashFlow)}/mo)`);
  }
  
  if (metrics.dscr >= 1.25) {
    strengths.push(`Good debt coverage (DSCR: ${metrics.dscr.toFixed(2)})`);
  }
  
  return strengths.slice(0, 3);
};

const generateOpportunityConcerns = (discountPercent: number, metrics: CalculatedMetrics): string[] => {
  const concerns: string[] = [];
  
  if (discountPercent > 25) {
    concerns.push(`Requires ${discountPercent.toFixed(0)}% discount - may be unrealistic`);
  } else if (discountPercent > 15) {
    concerns.push(`Needs significant negotiation (${discountPercent.toFixed(0)}% off)`);
  }
  
  if (metrics.monthlyCashFlow < 0) {
    concerns.push('Negative cash flow at list price');
  }
  
  if (metrics.dscr < 1.0) {
    concerns.push('Income may not cover debt service');
  }
  
  return concerns.slice(0, 3);
};

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

export const calculateSensitivity = (
  inputs: AnalyticsInputs,
  variable: keyof AnalyticsInputs,
  min: number,
  max: number,
  steps: number = 7
): { value: number; cashFlow: number; cashOnCash: number; score: number }[] => {
  const results = [];
  const stepSize = (max - min) / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const value = min + stepSize * i;
    const testInputs = { ...inputs, [variable]: value };
    const testMetrics = calculateMetrics(testInputs);
    const incomeValue = calculateIncomeValue(testInputs);
    const testScore = calculateDealScore(incomeValue, testInputs.purchasePrice, testMetrics);

    results.push({
      value,
      cashFlow: testMetrics.monthlyCashFlow,
      cashOnCash: testMetrics.cashOnCash,
      score: testScore.score,
    });
  }

  return results;
};

/**
 * Calculate cash flow impact of a $1 change in a variable
 */
export const calculateImpactPerUnit = (
  inputs: AnalyticsInputs,
  variable: keyof AnalyticsInputs
): number => {
  const baseMetrics = calculateMetrics(inputs);
  
  // Small change to test sensitivity
  const delta = variable.includes('Rate') || variable.includes('Percent') ? 0.01 : 1;
  const testInputs = { ...inputs, [variable]: (inputs[variable] as number) + delta };
  const testMetrics = calculateMetrics(testInputs);

  return (testMetrics.monthlyCashFlow - baseMetrics.monthlyCashFlow) / delta;
};
