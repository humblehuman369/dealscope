// ============================================
// InvestIQ Property Analytics - Calculations
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
} from '../types/analytics';

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
// DEAL SCORE CALCULATION
// ============================================

/**
 * Calculate Deal Score from metrics
 */
export const calculateDealScore = (
  metrics: CalculatedMetrics,
  inputs: AnalyticsInputs
): DealScore => {
  const breakdown: ScoreBreakdown[] = [];

  // 1. Cash Flow (max 20 points)
  const cfPoints = calculateCashFlowPoints(metrics.monthlyCashFlow);
  breakdown.push({
    category: 'Cash Flow',
    points: cfPoints,
    maxPoints: 20,
    icon: '💵',
    description: `$${Math.round(metrics.monthlyCashFlow)}/mo`,
    status: getPointsStatus(cfPoints, 20),
  });

  // 2. Cash-on-Cash (max 20 points)
  const cocPoints = calculateCoCPoints(metrics.cashOnCash);
  breakdown.push({
    category: 'Cash-on-Cash',
    points: cocPoints,
    maxPoints: 20,
    icon: '%',
    description: `${metrics.cashOnCash.toFixed(1)}%`,
    status: getPointsStatus(cocPoints, 20),
  });

  // 3. Cap Rate (max 15 points)
  const capPoints = calculateCapRatePoints(metrics.capRate);
  breakdown.push({
    category: 'Cap Rate',
    points: capPoints,
    maxPoints: 15,
    icon: '📈',
    description: `${metrics.capRate.toFixed(1)}%`,
    status: getPointsStatus(capPoints, 15),
  });

  // 4. 1% Rule (max 15 points)
  const onePercentPoints = calculateOnePercentPoints(metrics.onePercentRule);
  breakdown.push({
    category: '1% Rule',
    points: onePercentPoints,
    maxPoints: 15,
    icon: '📊',
    description: `${metrics.onePercentRule.toFixed(2)}%`,
    status: getPointsStatus(onePercentPoints, 15),
  });

  // 5. DSCR (max 15 points)
  const dscrPoints = calculateDSCRPoints(metrics.dscr);
  breakdown.push({
    category: 'DSCR',
    points: dscrPoints,
    maxPoints: 15,
    icon: '🛡️',
    description: `${metrics.dscr.toFixed(2)}`,
    status: getPointsStatus(dscrPoints, 15),
  });

  // 6. Equity Potential (max 10 points)
  const equityPoints = calculateEquityPoints(inputs, metrics);
  breakdown.push({
    category: 'Equity Potential',
    points: equityPoints,
    maxPoints: 10,
    icon: '⚡',
    description: 'Year 1 growth',
    status: getPointsStatus(equityPoints, 10),
  });

  // 7. Risk Buffer (max 5 points)
  const riskPoints = calculateRiskPoints(metrics);
  breakdown.push({
    category: 'Risk Buffer',
    points: riskPoints,
    maxPoints: 5,
    icon: '🔒',
    description: 'Safety margin',
    status: getPointsStatus(riskPoints, 5),
  });

  // Total score
  const score = Math.round(breakdown.reduce((sum, item) => sum + item.points, 0));
  const { grade, verdict, color } = getGradeInfo(score);

  // Generate insights
  const strengths = generateStrengths(metrics, breakdown);
  const concerns = generateConcerns(metrics, breakdown);
  const improvements = generateImprovements(inputs, metrics, score);

  return {
    score,
    grade,
    verdict,
    color,
    breakdown,
    strengths,
    concerns,
    improvements,
  };
};

// Point calculation helpers
const calculateCashFlowPoints = (monthlyCF: number): number => {
  if (monthlyCF <= 0) return 0;
  if (monthlyCF <= 100) return monthlyCF / 20;
  if (monthlyCF <= 300) return 5 + (monthlyCF - 100) / 40;
  if (monthlyCF <= 500) return 10 + (monthlyCF - 300) / 40;
  return Math.min(20, 15 + (monthlyCF - 500) / 100);
};

const calculateCoCPoints = (coc: number): number => {
  if (coc <= 0) return 0;
  if (coc <= 4) return coc * 1.25;
  if (coc <= 8) return 5 + (coc - 4) * 1.25;
  if (coc <= 12) return 10 + (coc - 8) * 1.25;
  return Math.min(20, 15 + (coc - 12) * 0.5);
};

const calculateCapRatePoints = (cap: number): number => {
  if (cap <= 0) return 0;
  if (cap <= 4) return cap * 0.75;
  if (cap <= 6) return 3 + (cap - 4) * 2;
  if (cap <= 8) return 7 + (cap - 6) * 2;
  return Math.min(15, 11 + (cap - 8) * 0.5);
};

const calculateOnePercentPoints = (onePercent: number): number => {
  if (onePercent < 0.5) return onePercent * 6;
  if (onePercent < 0.75) return 3 + (onePercent - 0.5) * 16;
  if (onePercent < 1.0) return 7 + (onePercent - 0.75) * 16;
  return Math.min(15, 11 + (onePercent - 1.0) * 8);
};

const calculateDSCRPoints = (dscr: number): number => {
  if (dscr < 1.0) return 0;
  if (dscr < 1.25) return (dscr - 1.0) * 28;
  if (dscr < 1.5) return 7 + (dscr - 1.25) * 20;
  return Math.min(15, 12 + (dscr - 1.5) * 6);
};

const calculateEquityPoints = (inputs: AnalyticsInputs, metrics: CalculatedMetrics): number => {
  // Estimate year 1 equity growth from appreciation + principal paydown
  const appreciation = inputs.purchasePrice * (inputs.appreciationRate / 100);
  const principalPaydown = metrics.loanAmount - calculateRemainingBalance(
    metrics.loanAmount,
    inputs.interestRate,
    inputs.loanTermYears,
    1
  );
  const equityGrowth = appreciation + principalPaydown;
  return Math.min(10, equityGrowth / 2000);
};

const calculateRiskPoints = (metrics: CalculatedMetrics): number => {
  const dscrMargin = Math.max(0, metrics.dscr - 1.0);
  const vacancyBuffer = Math.max(0, 100 - metrics.breakEvenOccupancy);
  return Math.min(5, dscrMargin * 3 + vacancyBuffer / 20);
};

const getPointsStatus = (points: number, max: number): ScoreBreakdown['status'] => {
  const ratio = points / max;
  if (ratio >= 0.8) return 'excellent';
  if (ratio >= 0.6) return 'good';
  if (ratio >= 0.4) return 'average';
  return 'poor';
};

const getGradeInfo = (score: number): { grade: DealScore['grade']; verdict: string; color: string } => {
  if (score >= 90) return { grade: 'A', verdict: 'Excellent Investment', color: '#22c55e' };
  if (score >= 85) return { grade: 'A-', verdict: 'Excellent Investment', color: '#22c55e' };
  if (score >= 80) return { grade: 'B+', verdict: 'Strong Investment', color: '#22c55e' };
  if (score >= 75) return { grade: 'B', verdict: 'Good Investment', color: '#84cc16' };
  if (score >= 70) return { grade: 'B-', verdict: 'Good Investment', color: '#84cc16' };
  if (score >= 65) return { grade: 'C+', verdict: 'Fair Investment', color: '#f97316' };
  if (score >= 60) return { grade: 'C', verdict: 'Below Average', color: '#f97316' };
  if (score >= 55) return { grade: 'C-', verdict: 'Below Average', color: '#f97316' };
  if (score >= 50) return { grade: 'D', verdict: 'Poor Investment', color: '#ef4444' };
  return { grade: 'F', verdict: 'Not Recommended', color: '#ef4444' };
};

// Insight generators
const generateStrengths = (metrics: CalculatedMetrics, breakdown: ScoreBreakdown[]): string[] => {
  const strengths: string[] = [];

  if (metrics.monthlyCashFlow >= 500) {
    strengths.push(`Strong cash flow ($${Math.round(metrics.monthlyCashFlow)}/mo)`);
  } else if (metrics.monthlyCashFlow >= 200) {
    strengths.push(`Positive cash flow ($${Math.round(metrics.monthlyCashFlow)}/mo)`);
  }

  if (metrics.cashOnCash >= 12) {
    strengths.push(`Excellent cash-on-cash return (${metrics.cashOnCash.toFixed(1)}%)`);
  } else if (metrics.cashOnCash >= 8) {
    strengths.push(`Good cash-on-cash return (${metrics.cashOnCash.toFixed(1)}%)`);
  }

  if (metrics.capRate >= 8) {
    strengths.push(`High cap rate (${metrics.capRate.toFixed(1)}%)`);
  }

  if (metrics.dscr >= 1.5) {
    strengths.push(`Strong debt coverage (DSCR: ${metrics.dscr.toFixed(2)})`);
  } else if (metrics.dscr >= 1.25) {
    strengths.push(`DSCR above lender minimum (${metrics.dscr.toFixed(2)})`);
  }

  if (metrics.onePercentRule >= 1.0) {
    strengths.push(`Meets 1% rule (${metrics.onePercentRule.toFixed(2)}%)`);
  }

  return strengths.slice(0, 3);
};

const generateConcerns = (metrics: CalculatedMetrics, breakdown: ScoreBreakdown[]): string[] => {
  const concerns: string[] = [];

  if (metrics.monthlyCashFlow < 0) {
    concerns.push(`Negative cash flow (-$${Math.abs(Math.round(metrics.monthlyCashFlow))}/mo)`);
  } else if (metrics.monthlyCashFlow < 100) {
    concerns.push(`Low cash flow ($${Math.round(metrics.monthlyCashFlow)}/mo) — little margin`);
  }

  if (metrics.dscr < 1.0) {
    concerns.push(`DSCR below 1.0 — income doesn't cover debt`);
  } else if (metrics.dscr < 1.25) {
    concerns.push(`DSCR of ${metrics.dscr.toFixed(2)} is below lender requirements`);
  }

  if (metrics.cashOnCash < 4) {
    concerns.push(`Low cash-on-cash return (${metrics.cashOnCash.toFixed(1)}%)`);
  }

  if (metrics.onePercentRule < 0.7) {
    concerns.push(`Well below 1% rule (${metrics.onePercentRule.toFixed(2)}%)`);
  }

  if (metrics.breakEvenOccupancy > 85) {
    concerns.push(`High break-even occupancy (${metrics.breakEvenOccupancy.toFixed(0)}%)`);
  }

  return concerns.slice(0, 3);
};

const generateImprovements = (
  inputs: AnalyticsInputs,
  metrics: CalculatedMetrics,
  currentScore: number
): ScoreImprovement[] => {
  const improvements: ScoreImprovement[] = [];

  // Test price reduction
  const reducedPriceInputs = { ...inputs, purchasePrice: inputs.purchasePrice * 0.9 };
  const reducedPriceMetrics = calculateMetrics(reducedPriceInputs);
  const reducedPriceScore = calculateDealScore(reducedPriceMetrics, reducedPriceInputs).score;
  if (reducedPriceScore > currentScore) {
    improvements.push({
      action: `Negotiate purchase price down 10% to $${(inputs.purchasePrice * 0.9).toLocaleString()}`,
      icon: '📉',
      pointsGain: reducedPriceScore - currentScore,
      newScore: reducedPriceScore,
      newGrade: getGradeInfo(reducedPriceScore).grade,
    });
  }

  // Test increased down payment
  if (inputs.downPaymentPercent < 25) {
    const higherDownInputs = { ...inputs, downPaymentPercent: 25 };
    const higherDownMetrics = calculateMetrics(higherDownInputs);
    const higherDownScore = calculateDealScore(higherDownMetrics, higherDownInputs).score;
    if (higherDownScore > currentScore) {
      improvements.push({
        action: `Increase down payment to 25%`,
        icon: '💰',
        pointsGain: higherDownScore - currentScore,
        newScore: higherDownScore,
        newGrade: getGradeInfo(higherDownScore).grade,
      });
    }
  }

  // Test rent increase
  const higherRentInputs = { ...inputs, monthlyRent: inputs.monthlyRent * 1.1 };
  const higherRentMetrics = calculateMetrics(higherRentInputs);
  const higherRentScore = calculateDealScore(higherRentMetrics, higherRentInputs).score;
  if (higherRentScore > currentScore) {
    improvements.push({
      action: `Increase rent 10% to $${Math.round(inputs.monthlyRent * 1.1).toLocaleString()}`,
      icon: '📈',
      pointsGain: higherRentScore - currentScore,
      newScore: higherRentScore,
      newGrade: getGradeInfo(higherRentScore).grade,
    });
  }

  // Test lower interest rate
  if (inputs.interestRate > 5) {
    const lowerRateInputs = { ...inputs, interestRate: inputs.interestRate - 0.5 };
    const lowerRateMetrics = calculateMetrics(lowerRateInputs);
    const lowerRateScore = calculateDealScore(lowerRateMetrics, lowerRateInputs).score;
    if (lowerRateScore > currentScore) {
      improvements.push({
        action: `Shop for 0.5% lower rate (${(inputs.interestRate - 0.5).toFixed(2)}%)`,
        icon: '🏦',
        pointsGain: lowerRateScore - currentScore,
        newScore: lowerRateScore,
        newGrade: getGradeInfo(lowerRateScore).grade,
      });
    }
  }

  // Sort by points gain and return top 3
  return improvements
    .sort((a, b) => b.pointsGain - a.pointsGain)
    .slice(0, 3);
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
    const testScore = calculateDealScore(testMetrics, testInputs);

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
