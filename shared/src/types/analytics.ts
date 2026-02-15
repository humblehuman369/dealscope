/**
 * Analytics & Scoring Types — Single Source of Truth
 *
 * These types define the analytics inputs, calculated metrics, scoring,
 * amortization, and projection structures used across both platforms.
 *
 * NOTE: Field names use camelCase (frontend convention) since these are
 * client-side display types. Backend API types use snake_case (see deal-maker.ts).
 */

// =============================================================================
// ANALYTICS INPUTS
// =============================================================================

/**
 * All rate/percentage fields use whole-number percentages
 * (e.g. 20 = 20%, 6.0 = 6%) matching the frontend convention.
 */
export interface AnalyticsInputs {
  // Purchase Terms
  purchasePrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;

  // Financing
  interestRate: number;
  loanTermYears: number;

  // Income
  monthlyRent: number;
  otherIncome: number;

  // Expenses
  vacancyRate: number;
  maintenanceRate: number;
  managementRate: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;

  // Projections
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
}

// =============================================================================
// CALCULATED METRICS
// =============================================================================

export interface CalculatedMetrics {
  // Monthly
  grossMonthlyIncome: number;
  totalMonthlyExpenses: number;
  mortgagePayment: number;
  monthlyCashFlow: number;

  // Annual
  annualCashFlow: number;
  noi: number;

  // Returns
  cashOnCash: number;
  capRate: number;
  dscr: number;
  onePercentRule: number;
  grossRentMultiplier: number;

  // Investment
  totalCashRequired: number;
  loanAmount: number;

  // Year 1 projections
  yearOneEquityGrowth: number;
  breakEvenVacancy: number;
  breakEvenRent: number;

  // Max purchase price for $200/mo cash flow target
  maxPurchasePriceForTarget: number;
}

// =============================================================================
// SCORING
// =============================================================================

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreBreakdown {
  category: string;
  points: number;
  maxPoints: number;
  icon: string;
  description: string;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

export interface DealScore {
  score: number;
  grade: OpportunityGrade;
  label: string;
  verdict: string;
  color: string;
  discountPercent: number;
  breakevenPrice: number;
  listPrice: number;
  breakdown: ScoreBreakdown[];
}

export interface Insight {
  type: 'strength' | 'concern' | 'tip';
  icon: string;
  text: string;
  highlight?: string;
}

// =============================================================================
// AMORTIZATION
// =============================================================================

/**
 * Monthly-granularity amortization row.
 * Use aggregateAmortizationByYear() for annual display.
 */
export interface AmortizationRow {
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

// =============================================================================
// PROJECTIONS
// =============================================================================

export interface YearProjection {
  year: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  totalWealth: number;
}

// =============================================================================
// STRATEGY ANALYSIS
// =============================================================================

export type StrategyAnalysisType =
  | 'longTermRental'
  | 'shortTermRental'
  | 'brrrr'
  | 'fixAndFlip'
  | 'houseHack'
  | 'wholesale';

export interface StrategyAnalysis<T = unknown> {
  strategy: StrategyAnalysisType;
  score: number;
  grade: string;
  color: string;
  metrics: T;
  insights: Insight[];
  isViable: boolean;
  rank?: number;
}
