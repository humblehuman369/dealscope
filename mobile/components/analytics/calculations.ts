/**
 * @deprecated LOCAL CALCULATIONS — MIGRATION IN PROGRESS
 *
 * These functions duplicate backend logic and will be removed once
 * the remaining analytics breakdown/what-if tabs are migrated to
 * use backend endpoints (POST /api/v1/worksheet/{strategy}/calculate and
 * POST /api/v1/analysis/verdict).
 *
 * All primary screens (Deal Maker, Strategy Detail, StrategyAnalytics)
 * have already been migrated. See:
 *   - mobile/hooks/useDealMakerBackendCalc.ts
 *   - mobile/hooks/useBackendStrategies.ts
 *   - mobile/hooks/useStrategyWorksheet.ts
 *
 * DO NOT add new calculation logic here.
 */

import {
  AnalyticsInputs,
  CalculatedMetrics,
  DealScore,
  ScoreBreakdown,
  Insight,
  YearProjection,
  AmortizationRow,
} from './types';

// =============================================================================
// CORE CALCULATIONS
// =============================================================================

/**
 * Calculate monthly mortgage payment (P&I)
 */
export function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  
  if (monthlyRate === 0) return principal / numPayments;
  
  return principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Calculate all metrics from inputs
 */
export function calculateMetrics(inputs: AnalyticsInputs): CalculatedMetrics {
  const {
    purchasePrice,
    downPaymentPercent,
    closingCostsPercent,
    interestRate,
    loanTermYears,
    monthlyRent,
    otherIncome,
    vacancyRate,
    maintenanceRate,
    managementRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
    appreciationRate,
  } = inputs;

  // Loan calculations
  const downPayment = purchasePrice * downPaymentPercent;
  const closingCosts = purchasePrice * closingCostsPercent;
  const loanAmount = purchasePrice - downPayment;
  const totalCashRequired = downPayment + closingCosts;
  
  // Monthly mortgage
  const mortgagePayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);
  
  // Monthly income
  const grossMonthlyIncome = monthlyRent + otherIncome;
  
  // Monthly expenses (operating)
  const vacancy = grossMonthlyIncome * vacancyRate;
  const maintenance = grossMonthlyIncome * maintenanceRate;
  const management = grossMonthlyIncome * managementRate;
  const propertyTax = annualPropertyTax / 12;
  const insurance = annualInsurance / 12;
  
  const operatingExpenses = vacancy + maintenance + management + propertyTax + insurance + monthlyHoa;
  const totalMonthlyExpenses = operatingExpenses + mortgagePayment;
  
  // Cash flow
  const monthlyCashFlow = grossMonthlyIncome - totalMonthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  
  // NOI (before debt service)
  const noi = (grossMonthlyIncome - operatingExpenses) * 12;
  
  // Returns
  const cashOnCash = totalCashRequired > 0 ? (annualCashFlow / totalCashRequired) * 100 : 0;
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const dscr = mortgagePayment > 0 ? (grossMonthlyIncome - operatingExpenses + mortgagePayment) / mortgagePayment / 12 * 12 : 0;
  
  // Actually, DSCR = (Gross Income - Operating Expenses) / Debt Service
  const monthlyNOI = grossMonthlyIncome - vacancy - maintenance - management - propertyTax - insurance - monthlyHoa;
  const correctDscr = mortgagePayment > 0 ? monthlyNOI / mortgagePayment : 0;
  
  // 1% Rule
  const onePercentRule = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;
  
  // Year 1 equity growth (appreciation + principal paydown)
  const yearOneAppreciation = purchasePrice * appreciationRate;
  const yearOnePrincipal = calculateYearOnePrincipal(loanAmount, interestRate, loanTermYears);
  const yearOneEquityGrowth = yearOneAppreciation + yearOnePrincipal;
  
  // Break-even vacancy
  const fixedExpenses = propertyTax + insurance + monthlyHoa + mortgagePayment;
  const variableExpenseRate = maintenance + management; // as rate of rent
  const breakEvenVacancy = grossMonthlyIncome > 0 
    ? ((grossMonthlyIncome - fixedExpenses) / grossMonthlyIncome) - variableExpenseRate
    : 0;

  return {
    grossMonthlyIncome,
    totalMonthlyExpenses,
    mortgagePayment,
    monthlyCashFlow,
    annualCashFlow,
    noi,
    cashOnCash,
    capRate,
    dscr: correctDscr,
    onePercentRule,
    totalCashRequired,
    loanAmount,
    yearOneEquityGrowth,
    breakEvenVacancy: Math.max(0, breakEvenVacancy) * 100,
  };
}

/**
 * Calculate principal paid in year 1
 */
function calculateYearOnePrincipal(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  
  let balance = principal;
  let totalPrincipal = 0;
  
  for (let month = 1; month <= 12; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    totalPrincipal += principalPayment;
    balance -= principalPayment;
  }
  
  return totalPrincipal;
}

// =============================================================================
// DEAL SCORE (Opportunity-Based)
// =============================================================================

import { OpportunityGrade } from './types';

/**
 * Calculate Deal Score based on Investment Opportunity
 * 
 * The score is based on how much discount from list price is needed
 * to reach breakeven. Lower discount = better opportunity.
 * 
 * Thresholds:
 * - 0-5% discount needed = Strong Opportunity (A+)
 * - 5-10% = Great Opportunity (A)
 * - 10-15% = Moderate Opportunity (B)
 * - 15-25% = Potential Opportunity (C)
 * - 25-35% = Mild Opportunity (D)
 * - 35-45%+ = Weak Opportunity (F)
 */
export function calculateDealScore(
  breakevenPrice: number,
  listPrice: number,
  metrics?: CalculatedMetrics
): DealScore {
  // Calculate discount percentage needed to reach breakeven
  const discountPercent = listPrice > 0 
    ? Math.max(0, ((listPrice - breakevenPrice) / listPrice) * 100)
    : 0;
  
  // Score is inverse of discount (lower discount = higher score)
  // 0% discount = 100 score, 45% discount = 0 score
  const score = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))));
  
  // Determine grade, label, verdict based on discount percentage
  const { grade, label, verdict, color } = getOpportunityGrade(discountPercent);
  
  // Build breakdown showing the discount needed
  const breakdown: ScoreBreakdown[] = [
    {
      category: 'Discount Required',
      points: Math.round(100 - discountPercent),
      maxPoints: 100,
      icon: '📉',
    }
  ];
  
  return { 
    score, 
    grade, 
    label, 
    verdict,
    color, 
    discountPercent,
    breakevenPrice,
    listPrice,
    breakdown 
  };
}

/**
 * Legacy function for backwards compatibility
 * Uses metrics to calculate breakeven internally
 */
export function calculateDealScoreFromMetrics(
  metrics: CalculatedMetrics,
  inputs: AnalyticsInputs
): DealScore {
  const breakevenPrice = calculateBreakevenPrice(inputs);
  return calculateDealScore(breakevenPrice, inputs.purchasePrice, metrics);
}

/**
 * Calculate breakeven price (where monthly cash flow = 0)
 */
export function calculateBreakevenPrice(inputs: AnalyticsInputs): number {
  const listPrice = inputs.purchasePrice;
  let low = listPrice * 0.30;
  let high = listPrice * 1.10;
  let breakeven = listPrice;
  
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const testInputs = { ...inputs, purchasePrice: mid };
    const testMetrics = calculateMetrics(testInputs);
    
    if (Math.abs(testMetrics.monthlyCashFlow) < 10) {
      breakeven = mid;
      break;
    } else if (testMetrics.monthlyCashFlow > 0) {
      low = mid;
    } else {
      high = mid;
    }
    breakeven = mid;
  }
  
  return Math.round(breakeven / 1000) * 1000;
}

/**
 * Get opportunity grade info from discount percentage
 */
function getOpportunityGrade(discountPercent: number): { 
  grade: OpportunityGrade; 
  label: string; 
  verdict: string;
  color: string 
} {
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
      label: 'Great Opportunity', 
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
      label: 'Potential Opportunity', 
      verdict: 'Possible deal - significant discount needed',
      color: '#f97316' 
    };
  }
  if (discountPercent <= 35) {
    return { 
      grade: 'D', 
      label: 'Mild Opportunity', 
      verdict: 'Challenging deal - major price reduction required',
      color: '#f97316' 
    };
  }
  return { 
    grade: 'F', 
    label: 'Weak Opportunity', 
    verdict: 'Not recommended - unrealistic discount needed',
    color: '#ef4444' 
  };
}

// =============================================================================
// INSIGHTS
// =============================================================================

/**
 * Generate smart insights based on metrics
 */
export function generateInsights(metrics: CalculatedMetrics, inputs: AnalyticsInputs): Insight[] {
  const insights: Insight[] = [];
  
  // Strengths
  if (metrics.monthlyCashFlow > 500) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Strong cash flow — $${Math.round(metrics.monthlyCashFlow).toLocaleString()}/mo`,
    });
  }
  
  if (metrics.capRate > 8) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `Excellent cap rate at ${metrics.capRate.toFixed(1)}% — well above market`,
    });
  }
  
  if (metrics.dscr > 1.5) {
    insights.push({
      type: 'strength',
      icon: '✅',
      text: `DSCR of ${metrics.dscr.toFixed(2)} provides solid debt coverage`,
    });
  }
  
  // Concerns
  if (metrics.monthlyCashFlow < 100 && metrics.monthlyCashFlow > 0) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Low cash flow — $${Math.round(metrics.monthlyCashFlow)}/mo leaves little margin`,
    });
  }
  
  if (metrics.monthlyCashFlow <= 0) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `Negative cash flow — losing $${Math.abs(Math.round(metrics.monthlyCashFlow))}/mo`,
    });
  }
  
  if (metrics.dscr < 1.25 && metrics.dscr > 0) {
    insights.push({
      type: 'concern',
      icon: '⚠️',
      text: `DSCR of ${metrics.dscr.toFixed(2)} is below lender requirements`,
    });
  }
  
  // Tips
  if (inputs.downPaymentPercent > 0.25) {
    const lowerDown = 0.20;
    const newLoan = inputs.purchasePrice * (1 - lowerDown);
    const newPayment = calculateMortgagePayment(newLoan, inputs.interestRate, inputs.loanTermYears);
    const currentLoan = inputs.purchasePrice * (1 - inputs.downPaymentPercent);
    const currentPayment = calculateMortgagePayment(currentLoan, inputs.interestRate, inputs.loanTermYears);
    const cashSaved = (inputs.downPaymentPercent - lowerDown) * inputs.purchasePrice;
    
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `Reducing down payment to 20% frees $${Math.round(cashSaved / 1000)}K for other investments`,
    });
  }
  
  if (metrics.cashOnCash < 8 && metrics.monthlyCashFlow > 0) {
    insights.push({
      type: 'tip',
      icon: '💡',
      text: `Negotiate 10% off asking price to boost returns significantly`,
    });
  }
  
  return insights.slice(0, 3); // Max 3 insights
}

// =============================================================================
// PROJECTIONS
// =============================================================================

/**
 * Project 10 years of wealth accumulation
 */
export function projectTenYears(inputs: AnalyticsInputs, metrics: CalculatedMetrics): YearProjection[] {
  const projections: YearProjection[] = [];
  
  let propertyValue = inputs.purchasePrice;
  let monthlyRent = inputs.monthlyRent;
  let loanBalance = metrics.loanAmount;
  let cumulativeCashFlow = 0;
  
  for (let year = 1; year <= 10; year++) {
    // Appreciation
    propertyValue *= (1 + inputs.appreciationRate);
    
    // Rent growth
    monthlyRent *= (1 + inputs.rentGrowthRate);
    
    // Recalculate annual cash flow with new rent
    const annualRent = monthlyRent * 12;
    const operatingExpenses = annualRent * (inputs.vacancyRate + inputs.maintenanceRate + inputs.managementRate) +
                              inputs.annualPropertyTax + inputs.annualInsurance + (inputs.monthlyHoa * 12);
    const annualMortgage = metrics.mortgagePayment * 12;
    const cashFlow = annualRent - operatingExpenses - annualMortgage;
    cumulativeCashFlow += cashFlow;
    
    // Loan balance reduction
    loanBalance = calculateRemainingBalance(
      metrics.loanAmount,
      inputs.interestRate,
      inputs.loanTermYears,
      year
    );
    
    const equity = propertyValue - loanBalance;
    
    projections.push({
      year,
      cashFlow,
      cumulativeCashFlow,
      propertyValue,
      loanBalance,
      equity,
      totalWealth: cumulativeCashFlow + equity,
    });
  }
  
  return projections;
}

/**
 * Calculate remaining loan balance after N years
 */
function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  yearsElapsed: number
): number {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  
  let balance = principal;
  const payments = yearsElapsed * 12;
  
  for (let i = 0; i < payments; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    balance -= principalPaid;
  }
  
  return Math.max(0, balance);
}

/**
 * Calculate amortization schedule
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number
): AmortizationRow[] {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  
  let balance = principal;
  const schedule: AmortizationRow[] = [];
  
  for (let year = 1; year <= termYears; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    
    for (let month = 1; month <= 12; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      
      yearPrincipal += principalPayment;
      yearInterest += interestPayment;
      balance -= principalPayment;
    }
    
    schedule.push({
      year,
      principal: yearPrincipal,
      interest: yearInterest,
      endingBalance: Math.max(0, balance),
    });
  }
  
  return schedule;
}

// =============================================================================
// FORMATTERS
// =============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return formatCurrency(value);
}

