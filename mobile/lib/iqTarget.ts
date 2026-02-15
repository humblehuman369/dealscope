/**
 * IQ Target — Breakeven estimation and Deal Opportunity Score
 * Matches frontend/src/lib/iqTarget.ts (non-deprecated parts only)
 *
 * The full IQ calculation engine lives on the backend. This module
 * provides:
 * 1. Type exports used across the mobile codebase
 * 2. Client-side breakeven estimators for initial price recommendations
 * 3. Deal Opportunity Score types (scoring is backend-driven)
 *
 * DO NOT add new calculation logic here — calculations are backend-driven.
 */

// ============================================
// TYPES
// ============================================

export interface IQTargetResult {
  targetPrice: number;
  discountFromList: number;
  discountPercent: number;
  breakeven: number;
  breakevenPercent: number;
  rationale: string;
  highlightedMetric: string;
  secondaryMetric: string;
  // Key metrics at target price
  monthlyCashFlow: number;
  cashOnCash: number;
  capRate: number;
  dscr: number;
  // For BRRRR
  cashLeftInDeal?: number;
  cashRecoveryPercent?: number;
  equityCreated?: number;
  // For Flip
  netProfit?: number;
  roi?: number;
  // For House Hack
  effectiveHousingCost?: number;
  monthlySavings?: number;
  // For Wholesale
  assignmentFee?: number;
  mao?: number;
}

export interface TargetAssumptions {
  listPrice: number;
  // Financing
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  closingCostsPct: number;
  // Income
  monthlyRent: number;
  averageDailyRate: number;
  occupancyRate: number;
  vacancyRate: number;
  // Expenses
  propertyTaxes: number;
  insurance: number;
  managementPct: number;
  maintenancePct: number;
  // Rehab/ARV (for BRRRR, Flip, Wholesale)
  rehabCost: number;
  arv: number;
  holdingPeriodMonths: number;
  sellingCostsPct: number;
  // House Hack
  roomsRented: number;
  totalBedrooms: number;
  // Wholesale
  wholesaleFeePct: number;
  // Growth assumptions (optional)
  rentGrowth?: number;
  appreciationRate?: number;
  expenseGrowth?: number;
}

// ============================================
// DEFAULT CONSTANTS (FALLBACKS ONLY)
// ============================================
//
// Components should use the useDefaults() hook to get values from the
// backend. These exist only as last-resort fallbacks matching
// backend/app/core/defaults.py.

/** Default buy discount below breakeven (5% → buy at 95% of breakeven) */
export const DEFAULT_BUY_DISCOUNT_PCT = 0.05;

/** Default insurance as percentage of purchase price */
export const DEFAULT_INSURANCE_PCT = 0.01;

/** Default renovation budget as percentage of ARV */
export const DEFAULT_RENOVATION_BUDGET_PCT = 0.05;

/** Default holding costs as percentage of purchase price (annual) */
export const DEFAULT_HOLDING_COSTS_PCT = 0.01;

/** Default refinance closing costs as percentage of refinance amount */
export const DEFAULT_REFINANCE_CLOSING_COSTS_PCT = 0.03;

// ============================================
// BREAKEVEN ESTIMATION
// ============================================

/**
 * Estimate breakeven purchase price for LTR.
 * Breakeven is where monthly cash flow = $0 (NOI = Annual Debt Service).
 *
 * Default parameter values are fallbacks matching backend/app/core/defaults.py.
 * Callers should provide values from useDefaults() when available.
 */
export function estimateLTRBreakeven(params: {
  monthlyRent: number;
  propertyTaxes: number;
  insurance: number;
  vacancyRate?: number;
  maintenancePct?: number;
  managementPct?: number;
  downPaymentPct?: number;
  interestRate?: number;
  loanTermYears?: number;
}): number {
  const {
    monthlyRent,
    propertyTaxes,
    insurance,
    vacancyRate = 0.01,
    maintenancePct = 0.05,
    managementPct = 0,
    downPaymentPct = 0.20,
    interestRate = 0.06,
    loanTermYears = 30,
  } = params;

  // Annual gross → effective gross income
  const annualGrossRent = monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);

  // Operating expenses (not including debt service)
  const annualMaintenance = effectiveGrossIncome * maintenancePct;
  const annualManagement = effectiveGrossIncome * managementPct;
  const operatingExpenses =
    propertyTaxes + insurance + annualMaintenance + annualManagement;

  // NOI
  const noi = effectiveGrossIncome - operatingExpenses;
  if (noi <= 0) return 0; // Can't break even

  // Solve for purchase price where NOI = Annual Debt Service
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const ltvRatio = 1 - downPaymentPct;

  // Mortgage constant (annual payment per $ of loan)
  const mortgageConstant =
    ((monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)) *
    12;

  // PurchasePrice = NOI / (LTV * MortgageConstant)
  const breakeven = noi / (ltvRatio * mortgageConstant);

  return Math.round(breakeven);
}

/**
 * Calculate buy price as breakeven minus the buy discount.
 * Formula: Buy Price = Breakeven × (1 - Buy Discount %)
 */
export function calculateBuyPrice(params: {
  monthlyRent: number;
  propertyTaxes: number;
  insurance: number;
  listPrice: number;
  vacancyRate?: number;
  maintenancePct?: number;
  managementPct?: number;
  downPaymentPct?: number;
  interestRate?: number;
  loanTermYears?: number;
  buyDiscountPct?: number;
}): number {
  const discountPct = params.buyDiscountPct ?? DEFAULT_BUY_DISCOUNT_PCT;
  const breakeven = estimateLTRBreakeven(params);

  if (breakeven <= 0) return params.listPrice;

  const buyPrice = Math.round(breakeven * (1 - discountPct));
  return Math.min(buyPrice, params.listPrice);
}

/** Alias for calculateBuyPrice */
export const calculateInitialPurchasePrice = calculateBuyPrice;

/** Calculate initial rehab budget as 5% of ARV */
export function calculateInitialRehabBudget(arv: number): number {
  return Math.round(arv * DEFAULT_RENOVATION_BUDGET_PCT);
}

// ============================================
// DEAL OPPORTUNITY SCORE TYPES
// ============================================

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type AvailabilityStatus =
  | 'WITHDRAWN'
  | 'PRICE_REDUCED'
  | 'BANK_OWNED'
  | 'FSBO'
  | 'AGENT_LISTED'
  | 'OFF_MARKET'
  | 'FOR_RENT'
  | 'PENDING'
  | 'SOLD'
  | 'UNKNOWN';

export interface AvailabilityInfo {
  status: AvailabilityStatus;
  rank: number;
  score: number;
  label: string;
  motivationLevel: 'high' | 'medium' | 'low';
}

export interface DealOpportunityFactors {
  dealGap: {
    breakevenPrice: number;
    listPrice: number;
    gapAmount: number;
    gapPercent: number;
    score: number;
  };
  availability: AvailabilityInfo;
  daysOnMarket: {
    days: number | null;
    score: number;
    leverage: 'high' | 'medium' | 'low' | 'unknown';
  };
  weights: {
    dealGap: number;
    availability: number;
    daysOnMarket: number;
  };
}

export interface DealOpportunityScore {
  score: number;
  grade: OpportunityGrade;
  label: string;
  color: string;
  factors: DealOpportunityFactors;
  discountPercent: number;
  breakevenPrice: number;
  listPrice: number;
}

/** Convenience alias */
export type OpportunityScore = DealOpportunityScore;

// ============================================
// OPPORTUNITY GRADE HELPER (matches frontend)
// ============================================

/**
 * Map a deal score (0-100) to a letter grade with label/color.
 */
export function getOpportunityGradeFromScore(score: number): {
  grade: OpportunityGrade;
  label: string;
  color: string;
} {
  if (score >= 85)
    return { grade: 'A+', label: 'Strong Opportunity', color: '#22c55e' };
  if (score >= 70)
    return { grade: 'A', label: 'Great Opportunity', color: '#22c55e' };
  if (score >= 55)
    return { grade: 'B', label: 'Moderate Opportunity', color: '#84cc16' };
  if (score >= 40)
    return { grade: 'C', label: 'Potential Opportunity', color: '#f97316' };
  if (score >= 25)
    return { grade: 'D', label: 'Mild Opportunity', color: '#ef4444' };
  return { grade: 'F', label: 'Weak Opportunity', color: '#dc2626' };
}
