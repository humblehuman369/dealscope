/**
 * IQ Verdict Types for Web
 * Type definitions for the IQ Verdict flow
 * 
 * DYNAMIC SCORING: Strategies are scored 0-100 based on actual property economics
 */

// ===================
// PROPERTY TYPES
// ===================

export interface IQProperty {
  id?: string;
  zpid?: string | number;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  imageUrl?: string;
  yearBuilt?: number;
  lotSize?: number;
  propertyType?: 'single_family' | 'multi_family' | 'condo' | 'townhouse';
  // Optional enriched data from API
  monthlyRent?: number;
  propertyTaxes?: number;
  insurance?: number;
  hoa?: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  arv?: number;
}

// ===================
// STRATEGY TYPES
// ===================

export type IQStrategyId = 
  | 'long-term-rental'
  | 'short-term-rental'
  | 'brrrr'
  | 'fix-and-flip'
  | 'house-hack'
  | 'wholesale';

export interface IQStrategy {
  id: IQStrategyId;
  name: string;
  icon: string;
  metric: string;           // Display value: "18.1%", "$52K", "75%"
  metricLabel: string;      // "CoC Return", "Profit", "Savings"
  metricValue: number;      // Raw value for sorting/calculations
  score: number;            // 0-100 Deal Score for this strategy
  rank: number;             // 1-6 ranking
  badge: IQStrategyBadge | null;
}

export type IQStrategyBadge = 'Best Match' | 'Strong' | 'Good';

// ===================
// ANALYSIS RESULT
// ===================

export interface IQAnalysisResult {
  propertyId?: string;
  analyzedAt: string;           // ISO timestamp
  dealScore: number;            // Overall score 0-100 (based on discount from list to breakeven)
  dealVerdict: IQDealVerdict;
  verdictDescription: string;
  discountPercent?: number;     // Discount % from list price to breakeven
  purchasePrice?: number;       // Recommended purchase price (95% of breakeven)
  breakevenPrice?: number;      // Price where cash flow = 0
  listPrice?: number;           // Original list price
  strategies: IQStrategy[];     // Sorted by rank (1-6)
  // Inputs used for calculation (for transparency/debugging)
  inputsUsed?: {
    monthly_rent: number;
    property_taxes: number;
    insurance: number;
    arv: number;
    rehab_cost: number;
    bedrooms: number;
    provided_rent: number | null;
    provided_taxes: number | null;
    provided_insurance: number | null;
  };
  // NEW: Grade-based display (replaces numeric scores in UI)
  opportunity?: ScoreDisplay;
  opportunityFactors?: OpportunityFactors;
  returnRating?: ScoreDisplay;
  returnFactors?: ReturnFactors;
  // NEW: Profit Score (0-100) based on 5 financial metrics
  profitScore?: number;
  profitGrade?: ProfitGrade;
}

/**
 * Profit grade based on the profit score (0-100)
 * Used for displaying profit quality in the UI
 */
export type ProfitGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type IQDealVerdict = 
  | 'Strong Opportunity'
  | 'Great Opportunity'
  | 'Moderate Opportunity'
  | 'Potential Opportunity'
  | 'Mild Opportunity'
  | 'Weak Opportunity'
  | 'Poor Opportunity'
  // Legacy values for backwards compatibility
  | 'Excellent Investment'
  | 'Strong Investment'
  | 'Good Investment'
  | 'Fair Investment'
  | 'Weak Investment'
  | 'Poor Investment';

// ===================
// GRADE-BASED SCORING (NEW)
// ===================

/**
 * Grade labels for score display
 * Used instead of numeric scores to avoid confusion with percentages
 */
export type ScoreLabel = 'STRONG' | 'GOOD' | 'MODERATE' | 'POTENTIAL' | 'WEAK' | 'POOR';
export type ScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Score display with grade and label
 * Replaces numeric scores in the UI
 */
export interface ScoreDisplay {
  score: number;      // Internal 0-100 score (not displayed)
  grade: ScoreGrade;  // Letter grade: A+, A, B, C, D, F
  label: ScoreLabel;  // Word label: STRONG, GOOD, MODERATE, POTENTIAL, WEAK, POOR
  color: string;      // UI color for the grade
}

/**
 * Opportunity factors breakdown
 * Shows the components that contribute to the Opportunity score
 */
export interface OpportunityFactors {
  dealGap: number;             // Discount % from list to breakeven
  motivation: number;          // Seller motivation score (0-100)
  motivationLabel: string;     // "High", "Medium", "Low"
  daysOnMarket: number | null; // Days property has been listed
  buyerMarket: 'cold' | 'warm' | 'hot' | null;  // Market temperature
  distressedSale: boolean;     // Is foreclosure/bank-owned
}

/**
 * Return factors breakdown
 * Shows the components that contribute to the Return rating
 */
export interface ReturnFactors {
  capRate: number | null;      // Cap rate %
  cashOnCash: number | null;   // Cash-on-Cash return %
  dscr: number | null;         // Debt Service Coverage Ratio
  annualRoi: number | null;    // Annual ROI/Cash Flow $
  annualProfit: number | null; // Annual Profit $
  strategyName: string;        // Name of the top strategy
}

// ===================
// BRAND COLORS
// ===================

export const IQ_COLORS = {
  deepNavy: '#0A1628',
  electricCyan: '#00D4FF',
  pacificTeal: '#0891B2',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  slate: '#64748B',
  slateLight: '#94A3B8',
  light: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
} as const;

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Get the appropriate badge for a strategy based on rank and score
 */
export const getStrategyBadge = (rank: number, score: number): IQStrategyBadge | null => {
  if (rank === 1 && score >= 70) return 'Best Match';
  if (rank === 2 && score >= 70) return 'Strong';
  if (rank === 3 && score >= 60) return 'Good';
  return null;
};

/**
 * Get deal verdict based on overall score
 */
export const getDealVerdict = (score: number): IQDealVerdict => {
  if (score >= 90) return 'Excellent Investment';
  if (score >= 75) return 'Strong Investment';
  if (score >= 60) return 'Good Investment';
  if (score >= 45) return 'Fair Investment';
  if (score >= 30) return 'Weak Investment';
  return 'Poor Investment';
};

/**
 * Get verdict description based on score and top strategy
 */
export const getVerdictDescription = (
  score: number, 
  topStrategy: IQStrategy
): string => {
  if (score >= 80) {
    return `Excellent potential across multiple strategies. ${topStrategy.name} shows best returns.`;
  }
  if (score >= 60) {
    return `Good investment opportunity. ${topStrategy.name} is your strongest option at ${topStrategy.metric} ${topStrategy.metricLabel}.`;
  }
  if (score >= 40) {
    return `Moderate opportunity. Consider ${topStrategy.name} for best results, but review numbers carefully.`;
  }
  return `This property shows limited investment potential. ${topStrategy.name} is the best option available.`;
};

/**
 * Get badge colors based on rank
 */
export const getBadgeColors = (rank: number) => {
  if (rank === 1) return { bg: `${IQ_COLORS.success}20`, text: IQ_COLORS.success };
  if (rank <= 3) return { bg: `${IQ_COLORS.pacificTeal}20`, text: IQ_COLORS.pacificTeal };
  return { bg: `${IQ_COLORS.slate}20`, text: IQ_COLORS.slate };
};

/**
 * Get rank indicator color
 */
export const getRankColor = (rank: number) => {
  if (rank === 1) return IQ_COLORS.success;
  if (rank <= 3) return IQ_COLORS.pacificTeal;
  return IQ_COLORS.border;
};

/**
 * Get deal score color
 */
export const getDealScoreColor = (score: number) => {
  if (score >= 80) return IQ_COLORS.success;
  if (score >= 60) return IQ_COLORS.pacificTeal;
  if (score >= 40) return IQ_COLORS.warning;
  return IQ_COLORS.danger;
};

/**
 * Convert a numeric score (0-100) to grade, label, and color
 * 
 * Grade mapping:
 * - 85-100: A+ / STRONG / green
 * - 70-84:  A  / GOOD / green  
 * - 55-69:  B  / MODERATE / lime
 * - 40-54:  C  / POTENTIAL / orange
 * - 25-39:  D  / WEAK / orange
 * - 0-24:   F  / POOR / red
 */
export const scoreToGradeLabel = (score: number): ScoreDisplay => {
  if (score >= 85) {
    return { score, grade: 'A+', label: 'STRONG', color: '#22c55e' };
  } else if (score >= 70) {
    return { score, grade: 'A', label: 'GOOD', color: '#22c55e' };
  } else if (score >= 55) {
    return { score, grade: 'B', label: 'MODERATE', color: '#84cc16' };
  } else if (score >= 40) {
    return { score, grade: 'C', label: 'POTENTIAL', color: '#f97316' };
  } else if (score >= 25) {
    return { score, grade: 'D', label: 'WEAK', color: '#f97316' };
  } else {
    return { score, grade: 'F', label: 'POOR', color: '#ef4444' };
  }
};

/**
 * Get color for a grade
 */
export const getGradeColor = (grade: ScoreGrade): string => {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e'; // green
    case 'B':
      return '#84cc16'; // lime
    case 'C':
    case 'D':
      return '#f97316'; // orange
    case 'F':
      return '#ef4444'; // red
    default:
      return '#64748b'; // slate
  }
};

/**
 * Get background color class for a grade (for Tailwind)
 */
export const getGradeBgClass = (grade: ScoreGrade): string => {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-green-500/10 border-green-500/30';
    case 'B':
      return 'bg-lime-500/10 border-lime-500/30';
    case 'C':
    case 'D':
      return 'bg-orange-500/10 border-orange-500/30';
    case 'F':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-slate-500/10 border-slate-500/30';
  }
};

/**
 * Get text color class for a grade (for Tailwind)
 */
export const getGradeTextClass = (grade: ScoreGrade): string => {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'text-green-500';
    case 'B':
      return 'text-lime-500';
    case 'C':
    case 'D':
      return 'text-orange-500';
    case 'F':
      return 'text-red-500';
    default:
      return 'text-slate-500';
  }
};

/**
 * Calculate Profit Score from financial metrics
 * 
 * Composite score (0-100) based on 5 financial metrics, 20 points each:
 * - Cap Rate: >= 8% = 20pts, >= 5% = 10pts
 * - Cash on Cash: >= 10% = 20pts, >= 5% = 10pts
 * - DSCR: >= 1.25 = 20pts, >= 1.0 = 10pts
 * - Expense Ratio: <= 40% = 20pts, <= 50% = 10pts
 * - Breakeven Occupancy: <= 75% = 20pts, <= 85% = 10pts
 */
export const calculateProfitScore = (factors: ReturnFactors): number => {
  let score = 0;
  
  // Cap Rate (20 points max)
  if (factors.capRate !== null) {
    if (factors.capRate >= 8) score += 20;
    else if (factors.capRate >= 5) score += 10;
  }
  
  // Cash on Cash (20 points max)
  if (factors.cashOnCash !== null) {
    if (factors.cashOnCash >= 10) score += 20;
    else if (factors.cashOnCash >= 5) score += 10;
  }
  
  // DSCR (20 points max)
  if (factors.dscr !== null) {
    if (factors.dscr >= 1.25) score += 20;
    else if (factors.dscr >= 1.0) score += 10;
  }
  
  // Expense Ratio - calculated from annual profit relative to income
  // Lower is better: <= 40% gets full points
  // Note: If annualRoi is available, we can estimate this
  // For now, award points based on positive cash flow
  if (factors.annualRoi !== null) {
    if (factors.annualRoi > 5000) score += 20;
    else if (factors.annualRoi > 0) score += 10;
  }
  
  // Annual Profit (substitute for breakeven occupancy)
  // Higher profit indicates better margins
  if (factors.annualProfit !== null) {
    if (factors.annualProfit > 10000) score += 20;
    else if (factors.annualProfit > 0) score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
};

/**
 * Convert a profit score (0-100) to a letter grade
 */
export const scoreToProfitGrade = (score: number): ProfitGrade => {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
};

/**
 * Get color for a profit grade
 */
export const getProfitGradeColor = (grade: ProfitGrade): string => {
  switch (grade) {
    case 'A+':
      return '#22c55e'; // green-500
    case 'A':
      return '#4ade80'; // green-400
    case 'B':
      return '#a3e635'; // lime-400
    case 'C':
      return '#fbbf24'; // amber-400
    case 'D':
      return '#fb923c'; // orange-400
    case 'F':
      return '#f87171'; // red-400
    default:
      return '#94a3b8'; // slate-400
  }
};

/**
 * Format price for display
 */
export const formatPrice = (price: number) => {
  return '$' + price.toLocaleString();
};

// ===================
// STRATEGY INFO
// ===================

export const STRATEGY_INFO: Record<IQStrategyId, { name: string; icon: string }> = {
  'long-term-rental': { name: 'Long-Term Rental', icon: '🏠' },
  'short-term-rental': { name: 'Short-Term Rental', icon: '🏨' },
  'brrrr': { name: 'BRRRR', icon: '🔄' },
  'fix-and-flip': { name: 'Fix & Flip', icon: '🔨' },
  'house-hack': { name: 'House Hack', icon: '🏡' },
  'wholesale': { name: 'Wholesale', icon: '📋' },
};

// ===================
// ROUTE PATHS
// ===================

// Maps IQ strategy IDs to the strategy param used by /property page
export const STRATEGY_ROUTE_MAP: Record<IQStrategyId, string> = {
  'long-term-rental': 'ltr',
  'short-term-rental': 'str',
  'brrrr': 'brrrr',
  'fix-and-flip': 'flip',
  'house-hack': 'househack',
  'wholesale': 'wholesale',
};

// ===================
// DEFAULT ASSUMPTIONS (aligned with stores/index.ts)
// ===================

const DEFAULT_ASSUMPTIONS = {
  interestRate: 0.06,           // 6% (was 7.25%)
  downPaymentPct: 0.20,         // 20%
  loanTermYears: 30,
  closingCostsPct: 0.03,        // 3%
  vacancyRate: 0.01,            // 1% (was 5%)
  managementPct: 0.00,          // 0% (was 8%)
  maintenancePct: 0.05,         // 5%
  insurancePct: 0.01,           // 1% of purchase price
  strManagementPct: 0.10,       // 10% (was 20%)
  platformFeesPct: 0.15,        // 15%
  sellingCostsPct: 0.06,        // 6% (was 8%)
  rehabBudgetPct: 0.05,         // 5% of ARV
  buyDiscountPct: 0.05,         // 5% below breakeven
  refinanceRate: 0.06,          // 6%
  refinanceLtv: 0.75,           // 75%
} as const;

// ===================
// CALCULATION HELPERS
// ===================

/**
 * Calculate monthly mortgage payment (P&I)
 */
function calculateMonthlyMortgage(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12);
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Estimate breakeven purchase price for LTR
 * Breakeven is where monthly cash flow = $0 (NOI = Debt Service)
 */
function estimateBreakevenPrice(
  monthlyRent: number,
  propertyTaxes: number,
  insurance: number
): number {
  const annualGrossRent = monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - DEFAULT_ASSUMPTIONS.vacancyRate);
  const annualMaintenance = effectiveGrossIncome * DEFAULT_ASSUMPTIONS.maintenancePct;
  const annualManagement = effectiveGrossIncome * DEFAULT_ASSUMPTIONS.managementPct;
  const operatingExpenses = propertyTaxes + insurance + annualMaintenance + annualManagement;
  const noi = effectiveGrossIncome - operatingExpenses;
  
  if (noi <= 0) return 0;
  
  const monthlyRate = DEFAULT_ASSUMPTIONS.interestRate / 12;
  const numPayments = DEFAULT_ASSUMPTIONS.loanTermYears * 12;
  const ltvRatio = 1 - DEFAULT_ASSUMPTIONS.downPaymentPct;
  const mortgageConstant = (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                           (Math.pow(1 + monthlyRate, numPayments) - 1) * 12;
  
  const breakeven = noi / (ltvRatio * mortgageConstant);
  return Math.round(breakeven);
}

/**
 * Calculate initial purchase price as 95% of breakeven
 */
function calculateTargetPurchasePrice(
  listPrice: number,
  monthlyRent: number,
  propertyTaxes: number,
  insurance: number
): number {
  const breakeven = estimateBreakevenPrice(monthlyRent, propertyTaxes, insurance);
  if (breakeven <= 0) return listPrice;
  const buyPrice = Math.round(breakeven * (1 - DEFAULT_ASSUMPTIONS.buyDiscountPct));
  return Math.min(buyPrice, listPrice);
}

/**
 * Score normalizer - converts a metric to 0-100 scale
 * @deprecated Use performanceScore for consistency with worksheets
 */
function normalizeScore(value: number, minValue: number, maxValue: number): number {
  if (value <= minValue) return 0;
  if (value >= maxValue) return 100;
  return Math.round(((value - minValue) / (maxValue - minValue)) * 100);
}

/**
 * Calculate performance score using the worksheet formula: 50 + (metric × multiplier)
 * 
 * This formula centers at 50 for 0% return (breakeven), with:
 * - Positive returns increasing the score
 * - Negative returns decreasing the score
 * - Score clamped to 0-100 range
 * 
 * Each strategy uses a different multiplier based on typical return ranges:
 * - LTR: 5 (10% CoC = 100 score)
 * - STR: 3.33 (15% CoC = 100 score)
 * - BRRRR: 1 (50% recovery = 100 score)
 * - Flip: 2.5 (20% ROI = 100 score)
 * - House Hack: 1 (50% offset = 100 score)
 * - Wholesale: 0.5 (100% ROI = 100 score)
 */
function performanceScore(metricValue: number, multiplier: number): number {
  const score = Math.round(50 + (metricValue * multiplier));
  return Math.max(0, Math.min(100, score));
}

/**
 * Format currency for compact display
 */
function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

// ===================
// STRATEGY CALCULATORS
// ===================

interface StrategyCalculationResult {
  id: IQStrategyId;
  name: string;
  icon: string;
  metric: string;
  metricLabel: string;
  metricValue: number;
  score: number;
}

function calculateLTRStrategy(
  price: number,
  monthlyRent: number,
  propertyTaxes: number,
  insurance: number,
  downPaymentPct: number = DEFAULT_ASSUMPTIONS.downPaymentPct,
  interestRate: number = DEFAULT_ASSUMPTIONS.interestRate,
  loanTermYears: number = DEFAULT_ASSUMPTIONS.loanTermYears,
  vacancyRate: number = DEFAULT_ASSUMPTIONS.vacancyRate,
  managementPct: number = DEFAULT_ASSUMPTIONS.managementPct,
  maintenancePct: number = DEFAULT_ASSUMPTIONS.maintenancePct
): StrategyCalculationResult {
  const downPayment = price * downPaymentPct;
  const closingCosts = price * DEFAULT_ASSUMPTIONS.closingCostsPct;
  const loanAmount = price - downPayment;
  const totalCashRequired = downPayment + closingCosts;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);
  const totalOpEx = propertyTaxes + insurance + (annualGrossRent * managementPct) + (annualGrossRent * maintenancePct);
  const noi = effectiveGrossIncome - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0;
  const cocPct = cashOnCash * 100;
  
  // Performance score: 50 + (CoC% × 5)
  // 0% CoC = 50, 10% CoC = 100, -10% CoC = 0
  const score = performanceScore(cocPct, 5);
  
  return {
    id: 'long-term-rental',
    name: 'Long-Term Rental',
    icon: '🏠',
    metric: `${cocPct.toFixed(1)}%`,
    metricLabel: 'CoC Return',
    metricValue: cocPct,
    score,
  };
}

function calculateSTRStrategy(
  price: number,
  averageDailyRate: number,
  occupancyRate: number,
  propertyTaxes: number,
  insurance: number,
  downPaymentPct: number = DEFAULT_ASSUMPTIONS.downPaymentPct,
  interestRate: number = DEFAULT_ASSUMPTIONS.interestRate,
  loanTermYears: number = DEFAULT_ASSUMPTIONS.loanTermYears
): StrategyCalculationResult {
  const downPayment = price * downPaymentPct;
  const closingCosts = price * DEFAULT_ASSUMPTIONS.closingCostsPct;
  const furnitureSetup = 6000;
  const loanAmount = price - downPayment;
  const totalCashRequired = downPayment + closingCosts + furnitureSetup;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRevenue = averageDailyRate * 365 * occupancyRate;
  const managementFee = annualGrossRevenue * DEFAULT_ASSUMPTIONS.strManagementPct;
  const platformFees = annualGrossRevenue * DEFAULT_ASSUMPTIONS.platformFeesPct;
  const utilities = 1200;  // $100/mo (was $300/mo)
  const supplies = 1200;   // $100/mo (was $200/mo)
  const maintenance = annualGrossRevenue * DEFAULT_ASSUMPTIONS.maintenancePct;
  const totalOpEx = propertyTaxes + insurance + managementFee + platformFees + utilities + supplies + maintenance;
  const noi = annualGrossRevenue - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0;
  const cocPct = cashOnCash * 100;
  
  // Performance score: 50 + (CoC% × 3.33)
  // 0% CoC = 50, 15% CoC = 100, -15% CoC = 0
  const score = performanceScore(cocPct, 3.33);
  
  return {
    id: 'short-term-rental',
    name: 'Short-Term Rental',
    icon: '🏨',
    metric: `${cocPct.toFixed(1)}%`,
    metricLabel: 'CoC Return',
    metricValue: cocPct,
    score,
  };
}

function calculateBRRRRStrategy(
  price: number,
  monthlyRent: number,
  propertyTaxes: number,
  insurance: number,
  arv: number,
  rehabCost: number,
  interestRate: number = DEFAULT_ASSUMPTIONS.refinanceRate,
  loanTermYears: number = DEFAULT_ASSUMPTIONS.loanTermYears
): StrategyCalculationResult {
  // Initial investment (10% down on purchase via hard money + rehab + closing)
  const initialCash = (price * 0.10) + rehabCost + (price * DEFAULT_ASSUMPTIONS.closingCostsPct);
  
  // Refinance at 75% of ARV
  const refinanceLoanAmount = arv * DEFAULT_ASSUMPTIONS.refinanceLtv;
  const cashBack = refinanceLoanAmount - (price * 0.90); // Pay off initial loan
  const cashLeftInDeal = Math.max(0, initialCash - Math.max(0, cashBack));
  const cashRecoveryPercent = initialCash > 0 ? ((initialCash - cashLeftInDeal) / initialCash) * 100 : 0;
  
  // Post-refi cash flow
  const monthlyPI = calculateMonthlyMortgage(refinanceLoanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * (1 - DEFAULT_ASSUMPTIONS.vacancyRate);
  const totalOpEx = propertyTaxes + insurance + (annualGrossRent * DEFAULT_ASSUMPTIONS.managementPct) + (annualGrossRent * DEFAULT_ASSUMPTIONS.maintenancePct);
  const noi = effectiveGrossIncome - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  
  // Calculate CoC with safeguards for edge cases
  // Use minimum threshold to avoid extreme percentages when cash_left is tiny
  const minCashForCoC = Math.max(cashLeftInDeal, initialCash * 0.10);
  let cashOnCash: number;
  if (cashLeftInDeal <= 0) {
    cashOnCash = annualCashFlow > 0 ? 999 : 0;
  } else {
    cashOnCash = annualCashFlow / minCashForCoC;
  }
  
  // Performance score: 50 + (cashRecoveryPct × 1)
  // 0% recovery = 50, 50% recovery = 100, -50% recovery = 0
  const score = performanceScore(cashRecoveryPercent, 1);
  
  // Cap CoC display at reasonable limits (-100% to Infinite)
  let displayCoC: string;
  if (cashOnCash > 100) {
    displayCoC = 'Infinite';
  } else if (cashOnCash < -1) {
    displayCoC = '<-100%';
  } else {
    displayCoC = `${(cashOnCash * 100).toFixed(1)}%`;
  }
  
  return {
    id: 'brrrr',
    name: 'BRRRR',
    icon: '🔄',
    metric: displayCoC,
    metricLabel: 'CoC Return',
    metricValue: cashRecoveryPercent, // Use recovery % for sorting
    score,
  };
}

function calculateFlipStrategy(
  price: number,
  arv: number,
  rehabCost: number,
  propertyTaxes: number,
  insurance: number,
  holdingPeriodMonths: number = 6
): StrategyCalculationResult {
  const purchaseCosts = price * DEFAULT_ASSUMPTIONS.closingCostsPct;
  const holdingCosts = 
    (price * 0.12 / 12 * holdingPeriodMonths) + // Hard money interest
    (propertyTaxes / 12 * holdingPeriodMonths) +
    (insurance / 12 * holdingPeriodMonths);
  const sellingCosts = arv * DEFAULT_ASSUMPTIONS.sellingCostsPct; // 6%
  const totalInvestment = price + purchaseCosts + rehabCost + holdingCosts;
  const netProfit = arv - totalInvestment - sellingCosts;
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0;
  const roiPct = roi * 100;
  
  // Performance score: 50 + (ROI% × 2.5)
  // 0% ROI = 50, 20% ROI = 100, -20% ROI = 0
  const score = performanceScore(roiPct, 2.5);
  
  return {
    id: 'fix-and-flip',
    name: 'Fix & Flip',
    icon: '🔨',
    metric: formatCompactCurrency(netProfit),
    metricLabel: 'Profit',
    metricValue: netProfit,
    score,
  };
}

function calculateHouseHackStrategy(
  price: number,
  monthlyRent: number,
  beds: number,
  propertyTaxes: number,
  insurance: number,
  interestRate: number = DEFAULT_ASSUMPTIONS.interestRate,
  loanTermYears: number = DEFAULT_ASSUMPTIONS.loanTermYears
): StrategyCalculationResult {
  const totalBedrooms = Math.max(beds, 2);
  const roomsRented = Math.max(1, totalBedrooms - 1);
  const rentPerRoom = monthlyRent / totalBedrooms;
  const monthlyRentalIncome = rentPerRoom * roomsRented;
  
  // FHA financing (3.5% down)
  const downPayment = price * 0.035;
  const closingCosts = price * DEFAULT_ASSUMPTIONS.closingCostsPct;
  const loanAmount = price - downPayment;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const monthlyTaxes = propertyTaxes / 12;
  const monthlyInsurance = insurance / 12;
  const pmi = loanAmount * 0.0085 / 12;
  const maintenance = monthlyRentalIncome * DEFAULT_ASSUMPTIONS.maintenancePct;
  const vacancy = monthlyRentalIncome * DEFAULT_ASSUMPTIONS.vacancyRate;
  
  const monthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + pmi + maintenance + vacancy;
  const effectiveHousingCost = monthlyExpenses - monthlyRentalIncome;
  const housingCostOffset = monthlyExpenses > 0 ? (monthlyRentalIncome / monthlyExpenses) * 100 : 0;
  
  // Performance score: 50 + (housingOffsetPct × 1)
  // 0% offset = 50, 50% offset = 100, -50% offset = 0
  const score = performanceScore(housingCostOffset, 1);
  
  return {
    id: 'house-hack',
    name: 'House Hack',
    icon: '🏡',
    metric: `${Math.round(housingCostOffset)}%`,
    metricLabel: 'Savings',
    metricValue: housingCostOffset,
    score,
  };
}

function calculateWholesaleStrategy(
  price: number,
  arv: number,
  rehabCost: number
): StrategyCalculationResult {
  // Maximum Allowable Offer using 70% rule
  const wholesaleFee = price * 0.007; // Target fee
  const mao = (arv * 0.70) - rehabCost - wholesaleFee;
  const assignmentFee = mao - (price * 0.85); // Assume we can get 15% off list
  // Calculate ROI on EMD (assuming $5K earnest money deposit)
  const emd = 5000;
  const roiPct = emd > 0 ? (assignmentFee / emd) * 100 : 0;
  
  // Performance score: 50 + (ROI% × 0.5)
  // 0% ROI = 50, 100% ROI = 100, -100% ROI = 0
  const score = performanceScore(roiPct, 0.5);
  
  return {
    id: 'wholesale',
    name: 'Wholesale',
    icon: '📋',
    metric: formatCompactCurrency(Math.max(0, assignmentFee)),
    metricLabel: 'Assignment',
    metricValue: assignmentFee,
    score,
  };
}

// ===================
// DYNAMIC ANALYSIS GENERATOR
// ===================

/**
 * @deprecated USE BACKEND API INSTEAD: POST /api/v1/analysis/verdict
 * 
 * This frontend calculation function is kept for backwards compatibility only.
 * All new code should call the backend API which uses centralized defaults
 * from backend/app/core/defaults.py.
 * 
 * The backend ensures consistent calculations across all pages.
 * 
 * ---
 * 
 * Calculate dynamic deal analysis based on actual property economics
 * Scores each strategy 0-100 and ranks them from best to worst
 * 
 * KEY: Uses 95% of breakeven as the target purchase price (not list price)
 * This aligns with the worksheet analysis page calculations.
 */
export function calculateDynamicAnalysis(property: IQProperty): IQAnalysisResult {
  const listPrice = property.price;
  
  // Use provided data or estimate from list price
  // Note: Use nullish coalescing (??) for numeric values to properly handle 0
  const monthlyRent = property.monthlyRent ?? listPrice * 0.007; // 0.7% rule
  const propertyTaxes = property.propertyTaxes ?? listPrice * 0.012; // 1.2% estimate
  const insurance = property.insurance ?? listPrice * DEFAULT_ASSUMPTIONS.insurancePct; // 1% of price
  const arv = property.arv ?? listPrice * 1.15; // 15% above list
  const rehabCost = arv * DEFAULT_ASSUMPTIONS.rehabBudgetPct; // 5% of ARV
  const averageDailyRate = property.averageDailyRate ?? (monthlyRent / 30) * 1.5;
  const occupancyRate = property.occupancyRate ?? 0.65; // Properly handles 0% occupancy
  const beds = property.beds || 3; // beds=0 is invalid, so || is fine here
  
  // Calculate target purchase price as 95% of breakeven (aligned with worksheets)
  const targetPrice = calculateTargetPurchasePrice(listPrice, monthlyRent, propertyTaxes, insurance);
  
  // Calculate all strategies in fixed display order:
  // 1. Long-term Rental, 2. Short-term Rental, 3. BRRRR, 4. Fix & Flip, 5. House Hack, 6. Wholesale
  // Use targetPrice (95% of breakeven) instead of listPrice for consistent analysis
  const strategyResults: StrategyCalculationResult[] = [
    calculateLTRStrategy(targetPrice, monthlyRent, propertyTaxes, insurance),
    calculateSTRStrategy(targetPrice, averageDailyRate, occupancyRate, propertyTaxes, insurance),
    calculateBRRRRStrategy(targetPrice, monthlyRent, propertyTaxes, insurance, arv, rehabCost),
    calculateFlipStrategy(targetPrice, arv, rehabCost, propertyTaxes, insurance),
    calculateHouseHackStrategy(targetPrice, monthlyRent, beds, propertyTaxes, insurance),
    calculateWholesaleStrategy(targetPrice, arv, rehabCost),
  ];
  
  // Strategies are kept in fixed order (no sorting by score)
  
  // Convert to IQStrategy with ranks and badges
  const strategies: IQStrategy[] = strategyResults.map((result, index) => {
    const rank = index + 1;
    let badge: IQStrategyBadge | null = null;
    
    // Assign badges based on rank and score
    if (rank === 1 && result.score >= 70) {
      badge = 'Best Match';
    } else if (rank === 2 && result.score >= 70) {
      badge = 'Strong';
    } else if (rank === 3 && result.score >= 60) {
      badge = 'Good';
    }
    
    return {
      id: result.id,
      name: result.name,
      icon: result.icon,
      metric: result.metric,
      metricLabel: result.metricLabel,
      metricValue: result.metricValue,
      score: result.score,
      rank,
      badge,
    };
  });
  
  // Overall deal score is the top strategy's score
  const topStrategy = strategies[0];
  const dealScore = topStrategy.score;
  
  return {
    analyzedAt: new Date().toISOString(),
    dealScore,
    dealVerdict: getDealVerdict(dealScore),
    verdictDescription: getVerdictDescription(dealScore, topStrategy),
    strategies,
  };
}

// ===================
// LEGACY MOCK GENERATOR (for backwards compatibility)
// ===================

/**
 * @deprecated USE BACKEND API INSTEAD: POST /api/v1/analysis/verdict
 * 
 * This function is completely deprecated. Use the backend API for all analysis.
 */
export function generateMockAnalysis(property: IQProperty): IQAnalysisResult {
  // Now just calls the dynamic analysis
  return calculateDynamicAnalysis(property);
}
