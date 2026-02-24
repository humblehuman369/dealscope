/**
 * IQ Target — Income value estimation and Deal Opportunity Score
 * Matches frontend/src/lib/iqTarget.ts (non-deprecated parts only)
 *
 * The full IQ calculation engine lives on the backend. This module
 * provides:
 * 1. Type exports used across the mobile codebase
 * 2. Client-side income value estimators for initial price recommendations
 * 3. Deal Opportunity Score types (scoring is backend-driven)
 *
 * DO NOT add new calculation logic here — calculations are backend-driven.
 */

import { calculateMonthlyMortgage } from '../utils/mortgagePayment';
import type { StrategyId } from '../types/analytics';

// ============================================
// TYPES
// ============================================

export interface IQTargetResult {
  targetPrice: number;
  discountFromList: number;
  discountPercent: number;
  breakeven: number;
  breakevenPercent: number;
  incomeValue?: number;
  incomeValuePercent?: number;
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

/** Default buy discount below income value (5% → buy at 95% of income value) */
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
// INCOME VALUE ESTIMATION
// ============================================

/**
 * Estimate income value (purchase price) for LTR.
 * Income value is where monthly cash flow = $0 (NOI = Annual Debt Service).
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
 * Calculate buy price as income value minus the buy discount.
 * Formula: Buy Price = Income Value × (1 - Buy Discount %)
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
    return { grade: 'A', label: 'Good Opportunity', color: '#22c55e' };
  if (score >= 55)
    return { grade: 'B', label: 'Moderate Opportunity', color: '#84cc16' };
  if (score >= 40)
    return { grade: 'C', label: 'Marginal Opportunity', color: '#f97316' };
  if (score >= 25)
    return { grade: 'D', label: 'Unlikely Opportunity', color: '#ef4444' };
  return { grade: 'F', label: 'Pass', color: '#dc2626' };
}

// ============================================
// STRATEGY-SPECIFIC CALCULATIONS (PRICE RECOMMENDATION UI ONLY)
// ============================================
//
// @deprecated These functions are for price recommendation UI only.
// Backend handles actual calculations. Do not add new logic here.

function calculateLTRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const downPayment = purchasePrice * a.downPaymentPct;
  const closingCosts = purchasePrice * a.closingCostsPct;
  const loanAmount = purchasePrice - downPayment;
  const totalCashRequired = downPayment + closingCosts;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = a.monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - a.vacancyRate);
  const totalOpEx = a.propertyTaxes + a.insurance + (annualGrossRent * a.managementPct) + (annualGrossRent * a.maintenancePct);
  const noi = effectiveGrossIncome - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  return { monthlyCashFlow, annualCashFlow, capRate, cashOnCash, dscr, noi, totalCashRequired };
}

function calculateSTRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const downPayment = purchasePrice * a.downPaymentPct;
  const closingCosts = purchasePrice * a.closingCostsPct;
  const loanAmount = purchasePrice - downPayment;
  const totalCashRequired = downPayment + closingCosts;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = a.averageDailyRate * 365 * a.occupancyRate;
  const managementFee = annualGrossRent * 0.20;
  const platformFees = annualGrossRent * 0.03;
  const utilities = 3600;
  const supplies = 2400;
  const totalOpEx = a.propertyTaxes + a.insurance + managementFee + platformFees + utilities + supplies + (annualGrossRent * a.maintenancePct);
  const noi = annualGrossRent - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  return { monthlyCashFlow, annualCashFlow, capRate, cashOnCash, dscr, noi, annualGrossRent, totalCashRequired };
}

function calculateBRRRRMetrics(purchasePrice: number, a: TargetAssumptions) {
  const initialCash = (purchasePrice * 0.30) + a.rehabCost + (purchasePrice * a.closingCostsPct);
  const allInCost = purchasePrice + a.rehabCost + (purchasePrice * a.closingCostsPct);
  const refinanceLoanAmount = a.arv * 0.75;
  const cashBack = refinanceLoanAmount - (purchasePrice * 0.70);
  const cashLeftInDeal = Math.max(0, initialCash - Math.max(0, cashBack));
  const cashRecoveryPercent = initialCash > 0 ? ((initialCash - cashLeftInDeal) / initialCash) * 100 : 0;
  const monthlyPI = calculateMonthlyMortgage(refinanceLoanAmount, a.interestRate, a.loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = a.monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - a.vacancyRate);
  const totalOpEx = a.propertyTaxes + a.insurance + (annualGrossRent * a.managementPct) + (annualGrossRent * a.maintenancePct);
  const noi = effectiveGrossIncome - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;
  const cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal : Infinity;
  const equityCreated = a.arv - refinanceLoanAmount;

  return {
    monthlyCashFlow, annualCashFlow, cashOnCash,
    initialCash, allInCost, cashBack, cashLeftInDeal, cashRecoveryPercent, equityCreated,
    noi, refinanceLoanAmount
  };
}

function calculateFlipMetrics(purchasePrice: number, a: TargetAssumptions) {
  const purchaseCosts = purchasePrice * a.closingCostsPct;
  const holdingCosts = (purchasePrice * (a.interestRate / 12) * a.holdingPeriodMonths) +
    ((a.propertyTaxes / 12) * a.holdingPeriodMonths) +
    ((a.insurance / 12) * a.holdingPeriodMonths);
  const sellingCosts = a.arv * a.sellingCostsPct;
  const totalInvestment = purchasePrice + purchaseCosts + a.rehabCost + holdingCosts;
  const netProfit = a.arv - totalInvestment - sellingCosts;
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0;
  const annualizedROI = roi * (12 / a.holdingPeriodMonths);
  const flipMargin = a.arv - purchasePrice - a.rehabCost;

  // 70% Rule check
  const maxPurchase70Rule = (a.arv * 0.70) - a.rehabCost;
  const passes70Rule = purchasePrice <= maxPurchase70Rule;

  return {
    netProfit, roi, annualizedROI, totalInvestment, flipMargin,
    holdingCosts, sellingCosts, purchaseCosts, passes70Rule, maxPurchase70Rule
  };
}

function calculateHouseHackMetrics(purchasePrice: number, a: TargetAssumptions) {
  const totalBedrooms = a.totalBedrooms ?? 4;
  const roomsRented = a.roomsRented ?? Math.max(1, totalBedrooms - 1);
  const rentPerRoom = a.monthlyRent / totalBedrooms;
  const monthlyRentalIncome = rentPerRoom * roomsRented;
  const downPayment = purchasePrice * 0.035; // FHA
  const closingCosts = purchasePrice * a.closingCostsPct;
  const totalCashRequired = downPayment + closingCosts;
  const loanAmount = purchasePrice - downPayment;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, a.interestRate, a.loanTermYears);
  const monthlyTaxes = a.propertyTaxes / 12;
  const monthlyInsurance = a.insurance / 12;
  const pmi = loanAmount * 0.0085 / 12; // PMI estimate for FHA
  const monthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + pmi + (monthlyRentalIncome * a.vacancyRate) + (monthlyRentalIncome * a.maintenancePct);
  const effectiveHousingCost = monthlyExpenses - monthlyRentalIncome;
  const marketRent = rentPerRoom * 1.2;
  const monthlySavings = marketRent - effectiveHousingCost;
  const housingCostOffset = monthlyRentalIncome / monthlyExpenses;

  return {
    totalCashRequired, monthlyRentalIncome, effectiveHousingCost, monthlySavings,
    monthlyPI, roomsRented, totalBedrooms, rentPerRoom, housingCostOffset, monthlyExpenses, pmi
  };
}

function calculateWholesaleMetrics(purchasePrice: number, a: TargetAssumptions) {
  const wholesaleFee = a.listPrice * a.wholesaleFeePct;
  const mao = (a.arv * 0.70) - a.rehabCost - wholesaleFee;
  const assignmentFee = mao - purchasePrice;
  const purchasePctOfArv = a.arv > 0 ? purchasePrice / a.arv : 1;
  const endBuyerProfit = a.arv - mao - a.rehabCost;
  const roiOnEMD = (assignmentFee / 5000) * 100; // Assuming $5K EMD

  return {
    mao, assignmentFee, wholesaleFee, purchasePctOfArv,
    endBuyerProfit, roiOnEMD
  };
}

// ============================================
// IQ TARGET CALCULATION - Main Functions
// ============================================

/**
 * Calculate IQ Target Price for Long-Term Rental
 * Target: $200+/month cash flow with 8%+ Cash-on-Cash
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateLTRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  // Binary search to find price that yields ~$200/month cash flow
  let low = listPrice * 0.60;
  let high = listPrice;
  let targetPrice = listPrice * 0.85; // Initial guess

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const metrics = calculateLTRMetrics(mid, a);

    if (metrics.monthlyCashFlow >= 200 && metrics.monthlyCashFlow <= 600) {
      targetPrice = mid;
      break;
    } else if (metrics.monthlyCashFlow < 200) {
      high = mid;
    } else {
      low = mid;
    }
    targetPrice = mid;
  }

  // Calculate final metrics at target price
  const finalMetrics = calculateLTRMetrics(targetPrice, a);

  // Find Income Value (where cash flow = $0) using binary search
  let searchLow = listPrice * 0.30;
  let searchHigh = listPrice * 1.10;
  let incomeValue = targetPrice;

  // Check if Income Value exists within range
  const lowMetrics = calculateLTRMetrics(searchLow, a);
  const highMetrics = calculateLTRMetrics(searchHigh, a);

  if (lowMetrics.monthlyCashFlow > 0 && highMetrics.monthlyCashFlow < 0) {
    // Binary search to find exact Income Value
    for (let i = 0; i < 30; i++) {
      const mid = (searchLow + searchHigh) / 2;
      const midMetrics = calculateLTRMetrics(mid, a);

      if (Math.abs(midMetrics.monthlyCashFlow) < 10) {
        // Close enough to zero
        incomeValue = mid;
        break;
      } else if (midMetrics.monthlyCashFlow > 0) {
        // Still positive, go higher (higher price = lower cash flow)
        searchLow = mid;
      } else {
        // Negative, go lower
        searchHigh = mid;
      }
      incomeValue = mid;
    }
  } else if (lowMetrics.monthlyCashFlow <= 0) {
    // Even at 30% of list, cash flow is negative - no viable Income Value
    incomeValue = searchLow;
  } else {
    // Cash flow is positive even at 110% of list - Income Value is above list
    incomeValue = searchHigh;
  }

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(incomeValue / 1000) * 1000,
    incomeValuePercent: (incomeValue / listPrice) * 100,
    rationale: 'At this price you achieve positive',
    highlightedMetric: `${formatCurrency(finalMetrics.monthlyCashFlow)}/mo cash flow`,
    secondaryMetric: formatPercent(finalMetrics.cashOnCash),
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: finalMetrics.capRate,
    dscr: finalMetrics.dscr
  };
}

/**
 * Calculate IQ Target Price for Short-Term Rental
 * Target: $500+/month cash flow with higher CoC than LTR
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateSTRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  let low = listPrice * 0.60;
  let high = listPrice;
  let targetPrice = listPrice * 0.85;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const metrics = calculateSTRMetrics(mid, a);

    if (metrics.monthlyCashFlow >= 500 && metrics.monthlyCashFlow <= 1500) {
      targetPrice = mid;
      break;
    } else if (metrics.monthlyCashFlow < 500) {
      high = mid;
    } else {
      low = mid;
    }
    targetPrice = mid;
  }

  const finalMetrics = calculateSTRMetrics(targetPrice, a);

  // Find Income Value (where cash flow = $0) using binary search
  let searchLow = listPrice * 0.30;
  let searchHigh = listPrice * 1.10;
  let incomeValue = targetPrice;

  const lowMetrics = calculateSTRMetrics(searchLow, a);
  const highMetrics = calculateSTRMetrics(searchHigh, a);

  if (lowMetrics.monthlyCashFlow > 0 && highMetrics.monthlyCashFlow < 0) {
    for (let i = 0; i < 30; i++) {
      const mid = (searchLow + searchHigh) / 2;
      const midMetrics = calculateSTRMetrics(mid, a);

      if (Math.abs(midMetrics.monthlyCashFlow) < 10) {
        incomeValue = mid;
        break;
      } else if (midMetrics.monthlyCashFlow > 0) {
        searchLow = mid;
      } else {
        searchHigh = mid;
      }
      incomeValue = mid;
    }
  } else if (lowMetrics.monthlyCashFlow <= 0) {
    incomeValue = searchLow;
  } else {
    incomeValue = searchHigh;
  }

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(incomeValue / 1000) * 1000,
    incomeValuePercent: (incomeValue / listPrice) * 100,
    rationale: 'At this price you achieve strong STR',
    highlightedMetric: `${formatCurrency(finalMetrics.monthlyCashFlow)}/mo cash flow`,
    secondaryMetric: formatPercent(finalMetrics.cashOnCash),
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: finalMetrics.capRate,
    dscr: finalMetrics.dscr
  };
}

/**
 * Calculate IQ Target Price for BRRRR
 * Target: 100% cash recovery (infinite returns)
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateBRRRRTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  // For BRRRR, target is where cash recovery >= 100%
  let low = listPrice * 0.50;
  let high = listPrice * 0.80;
  let targetPrice = listPrice * 0.65;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const metrics = calculateBRRRRMetrics(mid, a);

    // Aim for 95-105% cash recovery
    if (metrics.cashRecoveryPercent >= 95 && metrics.cashRecoveryPercent <= 105) {
      targetPrice = mid;
      break;
    } else if (metrics.cashRecoveryPercent < 95) {
      high = mid;
    } else {
      low = mid;
    }
    targetPrice = mid;
  }

  const finalMetrics = calculateBRRRRMetrics(targetPrice, a);

  // Income Value is where we get 80% cash recovery using binary search
  let searchLow = listPrice * 0.30;
  let searchHigh = listPrice * 0.90;
  let incomeValue = targetPrice;

  const lowMetrics = calculateBRRRRMetrics(searchLow, a);
  const highMetrics = calculateBRRRRMetrics(searchHigh, a);

  // Target 80% recovery as Income Value
  const targetRecovery = 80;
  if (lowMetrics.cashRecoveryPercent > targetRecovery && highMetrics.cashRecoveryPercent < targetRecovery) {
    for (let i = 0; i < 30; i++) {
      const mid = (searchLow + searchHigh) / 2;
      const midMetrics = calculateBRRRRMetrics(mid, a);

      if (Math.abs(midMetrics.cashRecoveryPercent - targetRecovery) < 2) {
        incomeValue = mid;
        break;
      } else if (midMetrics.cashRecoveryPercent > targetRecovery) {
        searchLow = mid;
      } else {
        searchHigh = mid;
      }
      incomeValue = mid;
    }
  } else if (lowMetrics.cashRecoveryPercent <= targetRecovery) {
    incomeValue = searchLow;
  } else {
    incomeValue = searchHigh;
  }

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(incomeValue / 1000) * 1000,
    incomeValuePercent: (incomeValue / listPrice) * 100,
    rationale: 'At this price you recover',
    highlightedMetric: `${Math.round(finalMetrics.cashRecoveryPercent)}% of your cash`,
    secondaryMetric: `${formatCurrency(finalMetrics.equityCreated)} equity`,
    monthlyCashFlow: finalMetrics.monthlyCashFlow,
    cashOnCash: finalMetrics.cashOnCash,
    capRate: 0,
    dscr: 0,
    cashLeftInDeal: finalMetrics.cashLeftInDeal,
    cashRecoveryPercent: finalMetrics.cashRecoveryPercent,
    equityCreated: finalMetrics.equityCreated
  };
}

/**
 * Calculate IQ Target Price for Fix & Flip
 * Target: $30K+ profit with 25%+ ROI
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateFlipTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  // For flip, use 70% rule as baseline, then refine
  const maxPer70Rule = (a.arv * 0.70) - a.rehabCost;
  let targetPrice = Math.min(maxPer70Rule, listPrice * 0.75);

  // Find price that yields $30K+ profit
  let low = listPrice * 0.50;
  let high = Math.min(maxPer70Rule, listPrice);

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const metrics = calculateFlipMetrics(mid, a);

    if (metrics.netProfit >= 30000 && metrics.netProfit <= 80000) {
      targetPrice = mid;
      break;
    } else if (metrics.netProfit < 30000) {
      high = mid;
    } else {
      low = mid;
    }
    targetPrice = mid;
  }

  const finalMetrics = calculateFlipMetrics(targetPrice, a);

  // Income Value is where profit = $0 using binary search
  let searchLow = listPrice * 0.30;
  let searchHigh = listPrice * 1.10;
  let incomeValue = targetPrice;

  const lowMetrics = calculateFlipMetrics(searchLow, a);
  const highMetrics = calculateFlipMetrics(searchHigh, a);

  if (lowMetrics.netProfit > 0 && highMetrics.netProfit < 0) {
    for (let i = 0; i < 30; i++) {
      const mid = (searchLow + searchHigh) / 2;
      const midMetrics = calculateFlipMetrics(mid, a);

      if (Math.abs(midMetrics.netProfit) < 1000) {
        incomeValue = mid;
        break;
      } else if (midMetrics.netProfit > 0) {
        searchLow = mid;
      } else {
        searchHigh = mid;
      }
      incomeValue = mid;
    }
  } else if (lowMetrics.netProfit <= 0) {
    incomeValue = searchLow;
  } else {
    incomeValue = searchHigh;
  }

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(incomeValue / 1000) * 1000,
    incomeValuePercent: (incomeValue / listPrice) * 100,
    rationale: 'At this price you achieve',
    highlightedMetric: formatCurrency(finalMetrics.netProfit) + ' profit',
    secondaryMetric: formatPercent(finalMetrics.roi) + ' ROI',
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    netProfit: finalMetrics.netProfit,
    roi: finalMetrics.roi
  };
}

/**
 * Calculate IQ Target Price for House Hack
 * Target: $0 or negative housing cost (free living)
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateHouseHackTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  // Target is where effective housing cost <= $0
  let low = listPrice * 0.60;
  let high = listPrice;
  let targetPrice = listPrice * 0.85;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const metrics = calculateHouseHackMetrics(mid, a);

    // Aim for $0-$200 effective cost
    if (metrics.effectiveHousingCost <= 200 && metrics.effectiveHousingCost >= -200) {
      targetPrice = mid;
      break;
    } else if (metrics.effectiveHousingCost > 200) {
      high = mid;
    } else {
      low = mid;
    }
    targetPrice = mid;
  }

  const finalMetrics = calculateHouseHackMetrics(targetPrice, a);

  // Income Value is where housing cost equals typical rent using binary search
  const totalBedrooms = a.totalBedrooms ?? 4;
  const typicalRent = a.monthlyRent / totalBedrooms * 1.2;
  let searchLow = listPrice * 0.30;
  let searchHigh = listPrice * 1.10;
  let incomeValue = targetPrice;

  const lowMetrics = calculateHouseHackMetrics(searchLow, a);
  const highMetrics = calculateHouseHackMetrics(searchHigh, a);

  // For house hack, Income Value is where effective cost = typical rent
  if (lowMetrics.effectiveHousingCost < typicalRent && highMetrics.effectiveHousingCost > typicalRent) {
    for (let i = 0; i < 30; i++) {
      const mid = (searchLow + searchHigh) / 2;
      const midMetrics = calculateHouseHackMetrics(mid, a);

      if (Math.abs(midMetrics.effectiveHousingCost - typicalRent) < 50) {
        incomeValue = mid;
        break;
      } else if (midMetrics.effectiveHousingCost < typicalRent) {
        searchLow = mid;
      } else {
        searchHigh = mid;
      }
      incomeValue = mid;
    }
  } else if (lowMetrics.effectiveHousingCost >= typicalRent) {
    incomeValue = searchLow;
  } else {
    incomeValue = searchHigh;
  }

  const formatCurrency = (v: number) => `$${Math.abs(Math.round(v)).toLocaleString()}`;

  const isFreeHousing = finalMetrics.effectiveHousingCost <= 0;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(incomeValue / 1000) * 1000,
    incomeValuePercent: (incomeValue / listPrice) * 100,
    rationale: isFreeHousing ? 'At this price you live for' : 'At this price your housing cost is only',
    highlightedMetric: isFreeHousing ? 'FREE' : `${formatCurrency(finalMetrics.effectiveHousingCost)}/mo`,
    secondaryMetric: `Save ${formatCurrency(finalMetrics.monthlySavings)}/mo`,
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    effectiveHousingCost: finalMetrics.effectiveHousingCost,
    monthlySavings: finalMetrics.monthlySavings
  };
}

/**
 * Calculate IQ Target Price for Wholesale
 * Target: $10K+ assignment fee
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateWholesaleTarget(a: TargetAssumptions): IQTargetResult {
  const listPrice = a.listPrice;

  // MAO is the ceiling - find price that leaves $10K+ fee
  const maoCalc = calculateWholesaleMetrics(listPrice, a);
  const mao = maoCalc.mao;

  // Target = MAO - desired assignment fee
  let targetPrice = mao - 12000; // Leave $12K assignment fee room
  targetPrice = Math.max(targetPrice, listPrice * 0.50); // Don't go below 50% of list

  const finalMetrics = calculateWholesaleMetrics(targetPrice, a);

  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;

  return {
    targetPrice: Math.round(targetPrice / 1000) * 1000,
    discountFromList: listPrice - targetPrice,
    discountPercent: ((listPrice - targetPrice) / listPrice) * 100,
    incomeValue: Math.round(mao / 1000) * 1000, // MAO is Income Value for wholesale
    incomeValuePercent: (mao / listPrice) * 100,
    rationale: 'At this price you earn',
    highlightedMetric: formatCurrency(finalMetrics.assignmentFee) + ' assignment fee',
    secondaryMetric: `${Math.round(finalMetrics.roiOnEMD)}% ROI on EMD`,
    monthlyCashFlow: 0,
    cashOnCash: 0,
    capRate: 0,
    dscr: 0,
    assignmentFee: finalMetrics.assignmentFee,
    mao: mao
  };
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * @deprecated For price recommendation UI only. Backend handles actual calculations.
 */
export function calculateIQTarget(strategyId: StrategyId, assumptions: TargetAssumptions): IQTargetResult {
  switch (strategyId) {
    case 'ltr':
      return calculateLTRTarget(assumptions);
    case 'str':
      return calculateSTRTarget(assumptions);
    case 'brrrr':
      return calculateBRRRRTarget(assumptions);
    case 'flip':
      return calculateFlipTarget(assumptions);
    case 'house_hack':
      return calculateHouseHackTarget(assumptions);
    case 'wholesale':
      return calculateWholesaleTarget(assumptions);
    default:
      return calculateLTRTarget(assumptions);
  }
}
