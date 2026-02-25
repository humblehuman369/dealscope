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
 *
 * @param annualRate — percentage, e.g. 7.0 for 7 %.
 *   Delegates to the canonical implementation in utils/mortgagePayment.ts.
 */
export { calculateMortgagePaymentPct as calculateMortgagePayment } from '../../utils/mortgagePayment';

/**
 * Calculate all metrics from inputs
 *
 * All percentage fields (downPaymentPercent, interestRate, vacancyRate, etc.)
 * are expected as whole-number percentages, e.g. 20 for 20 %, matching the
 * frontend convention.
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
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const closingCosts = purchasePrice * (closingCostsPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const totalCashRequired = downPayment + closingCosts;
  
  // Monthly mortgage
  const mortgagePayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);
  
  // Monthly income
  const grossMonthlyIncome = monthlyRent + otherIncome;
  
  // Monthly expenses (operating)
  const vacancy = grossMonthlyIncome * (vacancyRate / 100);
  const maintenance = grossMonthlyIncome * (maintenanceRate / 100);
  const management = grossMonthlyIncome * (managementRate / 100);
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

  // DSCR — matches frontend formula (includes vacancy adjustment)
  const dscr = mortgagePayment > 0
    ? (grossMonthlyIncome - operatingExpenses + mortgagePayment * (vacancyRate / 100)) / mortgagePayment
    : Infinity;
  
  // 1% Rule
  const onePercentRule = purchasePrice > 0 ? (monthlyRent / purchasePrice) * 100 : 0;

  // Gross Rent Multiplier
  const grossRentMultiplier = monthlyRent > 0
    ? purchasePrice / (monthlyRent * 12)
    : Infinity;
  
  // Year 1 equity growth (appreciation + principal paydown)
  const yearOneAppreciation = purchasePrice * (appreciationRate / 100);
  const yearOnePrincipal = calculateYearOnePrincipal(loanAmount, interestRate, loanTermYears);
  const yearOneEquityGrowth = yearOneAppreciation + yearOnePrincipal;
  
  // Break-even occupancy (matches frontend)
  const breakEvenVacancy = mortgagePayment > 0
    ? ((totalMonthlyExpenses - vacancy) / grossMonthlyIncome) * 100
    : 0;

  // Break-even rent
  const breakEvenRent = totalMonthlyExpenses / (1 - vacancyRate / 100);

  // Max purchase price for $200/mo cash flow target (matches frontend)
  const maxPurchasePriceForTarget = calculateMaxPurchasePrice(inputs, 200);

  return {
    grossMonthlyIncome,
    totalMonthlyExpenses,
    mortgagePayment,
    monthlyCashFlow,
    annualCashFlow,
    noi,
    cashOnCash,
    capRate,
    dscr,
    onePercentRule,
    grossRentMultiplier,
    totalCashRequired,
    loanAmount,
    yearOneEquityGrowth,
    breakEvenVacancy: Math.max(0, breakEvenVacancy),
    breakEvenRent,
    maxPurchasePriceForTarget,
  };
}

/**
 * Lightweight monthly cash-flow estimator used by the binary search in
 * calculateMaxPurchasePrice.  Avoids calling calculateMetrics (which
 * itself calls calculateMaxPurchasePrice) so we don't create infinite
 * recursion.
 */
function estimateMonthlyCashFlow(inputs: AnalyticsInputs, testPrice: number): number {
  const downPayment = testPrice * (inputs.downPaymentPercent / 100);
  const loan = testPrice - downPayment;
  const mtg = calculateMortgagePayment(loan, inputs.interestRate, inputs.loanTermYears);

  const grossIncome = inputs.monthlyRent;
  const vacancy = grossIncome * (inputs.vacancyRate / 100);
  const management = grossIncome * (inputs.managementRate / 100);
  const maintenance = grossIncome * (inputs.maintenanceRate / 100);
  const propTax = inputs.annualPropertyTax / 12;
  const insurance = inputs.annualInsurance / 12;

  const totalExpenses = mtg + vacancy + management + maintenance + propTax + insurance + inputs.monthlyHoa;
  return grossIncome - totalExpenses;
}

/**
 * Calculate max purchase price for target monthly cash flow.
 * Uses binary search — matches frontend calculateMaxPurchasePrice.
 */
function calculateMaxPurchasePrice(
  inputs: AnalyticsInputs,
  targetMonthlyCashFlow: number,
): number {
  let low = 0;
  let high = inputs.purchasePrice * 2;
  let maxPrice = 0;

  while (high - low > 1000) {
    const mid = (low + high) / 2;

    if (estimateMonthlyCashFlow(inputs, mid) >= targetMonthlyCashFlow) {
      maxPrice = mid;
      low = mid;
    } else {
      high = mid;
    }
  }

  return maxPrice;
}

/**
 * Calculate principal paid in year 1
 */
function calculateYearOnePrincipal(
  principal: number,
  annualRate: number, // percentage, e.g. 7.0
  termYears: number
): number {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  
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
 * to reach income value. Lower discount = better opportunity.
 * 
 * Thresholds:
 * - 0-5% discount needed = Strong Opportunity (A+)
 * - 5-10% = Good Opportunity (A)
 * - 10-15% = Moderate Opportunity (B)
 * - 15-25% = Marginal Opportunity (C)
 * - 25-35% = Unlikely Opportunity (D)
 * - 35%+ = Pass (F)
 */
export function calculateDealScore(
  incomeValue: number,
  listPrice: number,
  metrics?: CalculatedMetrics
): DealScore {
  const discountPercent = listPrice > 0 
    ? Math.max(0, ((listPrice - incomeValue) / listPrice) * 100)
    : 0;
  
  // Score is inverse of discount (lower discount = higher score)
  // 0% discount = 100 score, 45% discount = 0 score
  const score = Math.max(0, Math.min(100, Math.round(100 - (discountPercent * 100 / 45))));
  
  // Determine grade, label, verdict based on discount percentage
  const { grade, label, verdict, color } = getOpportunityGrade(discountPercent);
  
  // Build breakdown showing the discount needed (includes description + status per frontend)
  const discountPoints = Math.round(100 - discountPercent);
  const breakdown: ScoreBreakdown[] = [
    {
      category: 'Discount Required',
      points: discountPoints,
      maxPoints: 100,
      icon: '📉',
      description: discountPercent <= 5
        ? 'Minimal negotiation needed'
        : discountPercent <= 15
          ? 'Moderate discount required'
          : 'Significant discount needed',
      status: discountPoints >= 80 ? 'excellent' : discountPoints >= 60 ? 'good' : discountPoints >= 40 ? 'average' : 'poor',
    }
  ];
  
  return { 
    score, 
    grade, 
    label, 
    verdict,
    color, 
    discountPercent,
    incomeValue,
    listPrice,
    breakdown 
  };
}

/**
 * Legacy function for backwards compatibility
 * Uses metrics to calculate income value internally
 */
export function calculateDealScoreFromMetrics(
  metrics: CalculatedMetrics,
  inputs: AnalyticsInputs
): DealScore {
  const incomeValue = calculateIncomeValue(inputs);
  return calculateDealScore(incomeValue, inputs.purchasePrice, metrics);
}

/**
 * Calculate income value (where monthly cash flow = 0)
 */
export function calculateIncomeValue(inputs: AnalyticsInputs): number {
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
      low = mid;
    } else {
      high = mid;
    }
    incomeValue = mid;
  }
  
  return Math.round(incomeValue / 1000) * 1000;
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
  if (inputs.downPaymentPercent > 25) {
    const lowerDown = 20;
    const newLoan = inputs.purchasePrice * (1 - lowerDown / 100);
    const newPayment = calculateMortgagePayment(newLoan, inputs.interestRate, inputs.loanTermYears);
    const currentLoan = inputs.purchasePrice * (1 - inputs.downPaymentPercent / 100);
    const currentPayment = calculateMortgagePayment(currentLoan, inputs.interestRate, inputs.loanTermYears);
    const cashSaved = ((inputs.downPaymentPercent - lowerDown) / 100) * inputs.purchasePrice;
    
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
    propertyValue *= (1 + inputs.appreciationRate / 100);
    
    // Rent growth
    monthlyRent *= (1 + inputs.rentGrowthRate / 100);
    
    // Recalculate annual cash flow with new rent
    const annualRent = monthlyRent * 12;
    const operatingExpenses = annualRent * ((inputs.vacancyRate + inputs.maintenanceRate + inputs.managementRate) / 100) +
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
 * Calculate remaining loan balance after N years using closed-form formula.
 * More accurate than iterative approach (no floating-point accumulation error).
 */
function calculateRemainingBalance(
  principal: number,
  annualRate: number, // percentage, e.g. 7.0
  termYears: number,
  yearsElapsed: number
): number {
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
}

/**
 * Calculate amortization schedule — monthly granularity (matches frontend).
 *
 * Returns one row per month over the full loan term, including cumulative
 * totals. Use {@link aggregateAmortizationByYear} when the UI only needs
 * annual summaries.
 */
export function calculateAmortizationSchedule(
  principal: number,
  annualRate: number, // percentage, e.g. 7.0
  termYears: number
): AmortizationRow[] {
  const monthlyPayment = calculateMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = termYears * 12;

  let balance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const schedule: AmortizationRow[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;

    cumulativePrincipal += principalPayment;
    cumulativeInterest += interestPayment;
    balance -= principalPayment;

    schedule.push({
      month: m,
      year: Math.ceil(m / 12),
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, balance),
      cumulativePrincipal,
      cumulativeInterest,
    });
  }

  return schedule;
}

/**
 * Aggregate a monthly amortization schedule into annual summaries.
 * Useful for the LoanTab display which shows per-year rows.
 */
export function aggregateAmortizationByYear(
  schedule: AmortizationRow[]
): { year: number; principal: number; interest: number; balance: number }[] {
  const byYear = new Map<number, { principal: number; interest: number; balance: number }>();

  for (const row of schedule) {
    const entry = byYear.get(row.year) ?? { principal: 0, interest: 0, balance: 0 };
    entry.principal += row.principal;
    entry.interest += row.interest;
    entry.balance = row.balance; // last month's ending balance
    byYear.set(row.year, entry);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, data]) => ({ year, ...data }));
}

// =============================================================================
// FORMATTERS — re-exported from the canonical formatters module.
// Do not duplicate definitions here.
// =============================================================================

export { formatCurrency, formatPercent, formatCompact } from './formatters';

