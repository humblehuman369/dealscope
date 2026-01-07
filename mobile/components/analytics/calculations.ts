/**
 * Property Analytics Calculations
 * Pure functions for all financial calculations
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
// DEAL SCORE
// =============================================================================

/**
 * Calculate Deal Score (0-100) with breakdown
 */
export function calculateDealScore(metrics: CalculatedMetrics): DealScore {
  const breakdown: ScoreBreakdown[] = [];
  
  // 1. Cash Flow (max 20 points)
  const cfPoints = Math.min(20, Math.max(0, 
    metrics.monthlyCashFlow <= 0 ? 0 :
    metrics.monthlyCashFlow <= 100 ? metrics.monthlyCashFlow / 20 :
    metrics.monthlyCashFlow <= 300 ? 5 + (metrics.monthlyCashFlow - 100) / 40 :
    metrics.monthlyCashFlow <= 500 ? 10 + (metrics.monthlyCashFlow - 300) / 40 :
    15 + Math.min(5, (metrics.monthlyCashFlow - 500) / 100)
  ));
  breakdown.push({ category: 'Cash Flow', points: Math.round(cfPoints), maxPoints: 20, icon: '💵' });
  
  // 2. Cash-on-Cash (max 20 points)
  const cocPoints = Math.min(20, Math.max(0,
    metrics.cashOnCash <= 0 ? 0 :
    metrics.cashOnCash <= 4 ? metrics.cashOnCash * 1.25 :
    metrics.cashOnCash <= 8 ? 5 + (metrics.cashOnCash - 4) * 1.25 :
    metrics.cashOnCash <= 12 ? 10 + (metrics.cashOnCash - 8) * 1.25 :
    15 + Math.min(5, (metrics.cashOnCash - 12) * 0.5)
  ));
  breakdown.push({ category: 'Cash-on-Cash', points: Math.round(cocPoints), maxPoints: 20, icon: '%' });
  
  // 3. Cap Rate (max 15 points)
  const capPoints = Math.min(15, Math.max(0,
    metrics.capRate <= 4 ? metrics.capRate * 0.75 :
    metrics.capRate <= 6 ? 3 + (metrics.capRate - 4) * 2 :
    metrics.capRate <= 8 ? 7 + (metrics.capRate - 6) * 2 :
    11 + Math.min(4, (metrics.capRate - 8) * 0.5)
  ));
  breakdown.push({ category: 'Cap Rate', points: Math.round(capPoints), maxPoints: 15, icon: '📈' });
  
  // 4. 1% Rule (max 15 points)
  const onePercentPoints = Math.min(15, Math.max(0,
    metrics.onePercentRule < 0.5 ? metrics.onePercentRule * 6 :
    metrics.onePercentRule < 0.75 ? 3 + (metrics.onePercentRule - 0.5) * 16 :
    metrics.onePercentRule < 1.0 ? 7 + (metrics.onePercentRule - 0.75) * 16 :
    11 + Math.min(4, (metrics.onePercentRule - 1.0) * 8)
  ));
  breakdown.push({ category: '1% Rule', points: Math.round(onePercentPoints), maxPoints: 15, icon: '📊' });
  
  // 5. DSCR (max 15 points)
  const dscrPoints = Math.min(15, Math.max(0,
    metrics.dscr < 1.0 ? 0 :
    metrics.dscr < 1.25 ? (metrics.dscr - 1.0) * 28 :
    metrics.dscr < 1.5 ? 7 + (metrics.dscr - 1.25) * 20 :
    12 + Math.min(3, (metrics.dscr - 1.5) * 6)
  ));
  breakdown.push({ category: 'DSCR', points: Math.round(dscrPoints), maxPoints: 15, icon: '🛡️' });
  
  // 6. Equity Potential (max 10 points)
  const equityPoints = Math.min(10, Math.max(0, metrics.yearOneEquityGrowth / 1000));
  breakdown.push({ category: 'Equity Potential', points: Math.round(equityPoints), maxPoints: 10, icon: '⚡' });
  
  // 7. Risk Buffer (max 5 points)
  const riskPoints = Math.min(5, Math.max(0,
    (metrics.dscr - 1.0) * 5 + 
    (metrics.breakEvenVacancy > 15 ? 2 : metrics.breakEvenVacancy / 7.5)
  ));
  breakdown.push({ category: 'Risk Buffer', points: Math.round(riskPoints), maxPoints: 5, icon: '🔒' });
  
  const totalScore = Math.round(breakdown.reduce((sum, item) => sum + item.points, 0));
  const { grade, label, color } = getGrade(totalScore);
  
  return { score: totalScore, grade, label, color, breakdown };
}

/**
 * Get grade info from score
 */
function getGrade(score: number): { grade: string; label: string; color: string } {
  if (score >= 80) return { grade: 'A', label: 'Excellent Investment', color: '#22c55e' };
  if (score >= 70) return { grade: 'B+', label: 'Strong Investment', color: '#22c55e' };
  if (score >= 60) return { grade: 'B', label: 'Good Investment', color: '#84cc16' };
  if (score >= 50) return { grade: 'C+', label: 'Fair Investment', color: '#f97316' };
  if (score >= 40) return { grade: 'C', label: 'Below Average', color: '#f97316' };
  return { grade: 'D', label: 'Poor Investment', color: '#ef4444' };
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

