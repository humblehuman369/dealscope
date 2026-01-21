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
  analyzedAt: string;       // ISO timestamp
  dealScore: number;        // Overall score 0-100
  dealVerdict: IQDealVerdict;
  verdictDescription: string;
  strategies: IQStrategy[];   // Sorted by rank (1-6)
}

export type IQDealVerdict = 
  | 'Excellent Investment'
  | 'Strong Investment'
  | 'Good Investment'
  | 'Fair Investment'
  | 'Weak Investment'
  | 'Poor Investment';

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
 * Score normalizer - converts a metric to 0-100 scale
 */
function normalizeScore(value: number, minValue: number, maxValue: number): number {
  if (value <= minValue) return 0;
  if (value >= maxValue) return 100;
  return Math.round(((value - minValue) / (maxValue - minValue)) * 100);
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
  downPaymentPct: number = 0.20,
  interestRate: number = 0.0725,
  loanTermYears: number = 30,
  vacancyRate: number = 0.05,
  managementPct: number = 0.08,
  maintenancePct: number = 0.05
): StrategyCalculationResult {
  const downPayment = price * downPaymentPct;
  const closingCosts = price * 0.03;
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
  
  // Score: 0% CoC = 0, 12%+ CoC = 100
  const score = normalizeScore(cashOnCash * 100, 0, 12);
  
  return {
    id: 'long-term-rental',
    name: 'Long-Term Rental',
    icon: '🏠',
    metric: `${(cashOnCash * 100).toFixed(1)}%`,
    metricLabel: 'CoC Return',
    metricValue: cashOnCash * 100,
    score,
  };
}

function calculateSTRStrategy(
  price: number,
  averageDailyRate: number,
  occupancyRate: number,
  propertyTaxes: number,
  insurance: number,
  downPaymentPct: number = 0.25,
  interestRate: number = 0.0725,
  loanTermYears: number = 30
): StrategyCalculationResult {
  const downPayment = price * downPaymentPct;
  const closingCosts = price * 0.03;
  const furnitureSetup = 6000;
  const loanAmount = price - downPayment;
  const totalCashRequired = downPayment + closingCosts + furnitureSetup;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRevenue = averageDailyRate * 365 * occupancyRate;
  const managementFee = annualGrossRevenue * 0.20;
  const platformFees = annualGrossRevenue * 0.03;
  const utilities = 3600;
  const supplies = 2400;
  const maintenance = annualGrossRevenue * 0.05;
  const totalOpEx = propertyTaxes + insurance + managementFee + platformFees + utilities + supplies + maintenance;
  const noi = annualGrossRevenue - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = totalCashRequired > 0 ? annualCashFlow / totalCashRequired : 0;
  
  // Score: 0% CoC = 0, 15%+ CoC = 100
  const score = normalizeScore(cashOnCash * 100, 0, 15);
  
  return {
    id: 'short-term-rental',
    name: 'Short-Term Rental',
    icon: '🏨',
    metric: `${(cashOnCash * 100).toFixed(1)}%`,
    metricLabel: 'CoC Return',
    metricValue: cashOnCash * 100,
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
  interestRate: number = 0.0725,
  loanTermYears: number = 30
): StrategyCalculationResult {
  // Initial investment (30% down on purchase + rehab + closing)
  const initialCash = (price * 0.30) + rehabCost + (price * 0.03);
  
  // Refinance at 75% of ARV
  const refinanceLoanAmount = arv * 0.75;
  const cashBack = refinanceLoanAmount - (price * 0.70); // Pay off initial loan
  const cashLeftInDeal = Math.max(0, initialCash - Math.max(0, cashBack));
  const cashRecoveryPercent = initialCash > 0 ? ((initialCash - cashLeftInDeal) / initialCash) * 100 : 0;
  
  // Post-refi cash flow
  const monthlyPI = calculateMonthlyMortgage(refinanceLoanAmount, interestRate, loanTermYears);
  const annualDebtService = monthlyPI * 12;
  const annualGrossRent = monthlyRent * 12;
  const effectiveGrossIncome = annualGrossRent * 0.95;
  const totalOpEx = propertyTaxes + insurance + (annualGrossRent * 0.08) + (annualGrossRent * 0.05);
  const noi = effectiveGrossIncome - totalOpEx;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal : (annualCashFlow > 0 ? 999 : 0);
  
  // Score: 0% recovery = 0, 100%+ recovery = 100
  const score = normalizeScore(cashRecoveryPercent, 0, 100);
  
  // Display the better metric
  const displayCoC = cashOnCash > 100 ? 'Infinite' : `${(cashOnCash * 100).toFixed(1)}%`;
  
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
  const purchaseCosts = price * 0.03;
  const holdingCosts = 
    (price * 0.12 / 12 * holdingPeriodMonths) + // Hard money interest
    (propertyTaxes / 12 * holdingPeriodMonths) +
    (insurance / 12 * holdingPeriodMonths);
  const sellingCosts = arv * 0.08; // 6% commission + 2% closing
  const totalInvestment = price + purchaseCosts + rehabCost + holdingCosts;
  const netProfit = arv - totalInvestment - sellingCosts;
  const roi = totalInvestment > 0 ? netProfit / totalInvestment : 0;
  
  // Score: 0% ROI = 0, 30%+ ROI = 100
  const score = normalizeScore(roi * 100, 0, 30);
  
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
  interestRate: number = 0.0725,
  loanTermYears: number = 30
): StrategyCalculationResult {
  const totalBedrooms = Math.max(beds, 2);
  const roomsRented = Math.max(1, totalBedrooms - 1);
  const rentPerRoom = monthlyRent / totalBedrooms;
  const monthlyRentalIncome = rentPerRoom * roomsRented;
  
  // FHA financing (3.5% down)
  const downPayment = price * 0.035;
  const closingCosts = price * 0.03;
  const loanAmount = price - downPayment;
  const monthlyPI = calculateMonthlyMortgage(loanAmount, interestRate, loanTermYears);
  const monthlyTaxes = propertyTaxes / 12;
  const monthlyInsurance = insurance / 12;
  const pmi = loanAmount * 0.0085 / 12;
  const maintenance = monthlyRentalIncome * 0.05;
  const vacancy = monthlyRentalIncome * 0.05;
  
  const monthlyExpenses = monthlyPI + monthlyTaxes + monthlyInsurance + pmi + maintenance + vacancy;
  const effectiveHousingCost = monthlyExpenses - monthlyRentalIncome;
  const housingCostOffset = monthlyExpenses > 0 ? (monthlyRentalIncome / monthlyExpenses) * 100 : 0;
  
  // Score: 0% offset = 0, 100%+ offset (free living) = 100
  const score = normalizeScore(housingCostOffset, 0, 100);
  
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
  const assignmentFeePercent = price > 0 ? (assignmentFee / price) * 100 : 0;
  
  // Score: 0% assignment fee = 0, 3%+ assignment fee = 100
  const score = normalizeScore(assignmentFeePercent, 0, 3);
  
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
 * Calculate dynamic deal analysis based on actual property economics
 * Scores each strategy 0-100 and ranks them from best to worst
 */
export function calculateDynamicAnalysis(property: IQProperty): IQAnalysisResult {
  const price = property.price;
  
  // Use provided data or estimate from price
  // Note: Use nullish coalescing (??) for numeric values to properly handle 0
  const monthlyRent = property.monthlyRent ?? price * 0.007; // 0.7% rule
  const propertyTaxes = property.propertyTaxes ?? price * 0.012; // 1.2% estimate
  const insurance = property.insurance ?? 1800; // Default estimate
  const arv = property.arv ?? price * 1.15; // 15% above list
  const rehabCost = price * 0.05; // 5% of price for light rehab
  const averageDailyRate = property.averageDailyRate ?? (monthlyRent / 30) * 1.5;
  const occupancyRate = property.occupancyRate ?? 0.65; // Properly handles 0% occupancy
  const beds = property.beds || 3; // beds=0 is invalid, so || is fine here
  
  // Calculate all strategies
  const strategyResults: StrategyCalculationResult[] = [
    calculateLTRStrategy(price, monthlyRent, propertyTaxes, insurance),
    calculateSTRStrategy(price, averageDailyRate, occupancyRate, propertyTaxes, insurance),
    calculateBRRRRStrategy(price, monthlyRent, propertyTaxes, insurance, arv, rehabCost),
    calculateFlipStrategy(price, arv, rehabCost, propertyTaxes, insurance),
    calculateHouseHackStrategy(price, monthlyRent, beds, propertyTaxes, insurance),
    calculateWholesaleStrategy(price, arv, rehabCost),
  ];
  
  // Sort by score (highest first)
  strategyResults.sort((a, b) => b.score - a.score);
  
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
 * @deprecated Use calculateDynamicAnalysis instead
 */
export function generateMockAnalysis(property: IQProperty): IQAnalysisResult {
  // Now just calls the dynamic analysis
  return calculateDynamicAnalysis(property);
}
