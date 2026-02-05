/**
 * InvestIQ Analytics Redesign - Types
 * Mobile-specific types for the new analytics UI
 */

// ============================================
// STRATEGY TYPES
// ============================================

export type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

export interface StrategyInfo {
  id: StrategyId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  grade?: string;
  score?: number;
}

export const STRATEGY_CONFIG: Record<StrategyId, Omit<StrategyInfo, 'grade' | 'score'>> = {
  ltr: { id: 'ltr', name: 'Long-Term Rental', shortName: 'Long Rental', icon: '🏠', color: '#0097a7' },
  str: { id: 'str', name: 'Short-Term Rental', shortName: 'Short Rental', icon: '🏨', color: '#9333ea' },
  brrrr: { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', icon: '🔄', color: '#f97316' },
  flip: { id: 'flip', name: 'Fix & Flip', shortName: 'Fix & Flip', icon: '🔨', color: '#22c55e' },
  house_hack: { id: 'house_hack', name: 'House Hack', shortName: 'House Hack', icon: '🏡', color: '#3b82f6' },
  wholesale: { id: 'wholesale', name: 'Wholesale', shortName: 'Wholesale', icon: '📋', color: '#eab308' },
};

// ============================================
// SUB-TAB TYPES
// ============================================

export type SubTabId = 'metrics' | 'funding' | 'ten_year' | 'growth' | 'score' | 'what_if';

export interface SubTabInfo {
  id: SubTabId;
  label: string;
  icon: string;
}

export const SUB_TABS: SubTabInfo[] = [
  { id: 'metrics', label: 'Metrics', icon: '📊' },
  { id: 'funding', label: 'Funding', icon: '💰' },
  { id: 'ten_year', label: '10-Year', icon: '📈' },
  { id: 'growth', label: 'Growth', icon: '🌱' },
  { id: 'score', label: 'Score', icon: '⭐' },
  { id: 'what_if', label: 'What-If', icon: '🔧' },
];

// ============================================
// IQ TARGET TYPES
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

// ============================================
// PRICE LADDER TYPES
// ============================================

export interface PriceRung {
  id: string;
  label: string;
  price: number;
  percentOfList: number;
  isHighlighted?: boolean;
  description?: string;
  badge?: string;
}

// ============================================
// BENCHMARK TYPES
// ============================================

export type BenchmarkStatus = 'high' | 'average' | 'low';

export interface BenchmarkZone {
  label: string;
  range: string;
}

export interface BenchmarkConfig {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  status: BenchmarkStatus;
  markerPosition: number; // 0-100
  zones: {
    low: BenchmarkZone;
    average: BenchmarkZone;
    high: BenchmarkZone;
  };
  inverted?: boolean;
}

// ============================================
// NEGOTIATION TYPES
// ============================================

export interface OfferConfig {
  id: string;
  label: string;
  price: number;
  percentOfList: number;
  isRecommended?: boolean;
  rationale: string;
}

export interface LeveragePoint {
  id: string;
  icon: string;
  text: string;
  isPositive: boolean;
}

export interface NegotiationPlanData {
  openingOffer: OfferConfig;
  targetPrice: OfferConfig;
  walkAway: OfferConfig;
  leveragePoints: LeveragePoint[];
}

// ============================================
// TUNE SECTION TYPES
// ============================================

export interface SliderConfig {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

export interface TuneGroup {
  id: string;
  title: string;
  sliders: SliderConfig[];
}

// ============================================
// RETURNS GRID TYPES
// ============================================

export interface ReturnMetric {
  id: string;
  label: string;
  value: string;
  subValue?: string;
  status?: 'positive' | 'negative' | 'neutral';
}

// ============================================
// FORMULA CARD TYPES
// ============================================

export interface FormulaLine {
  label: string;
  value: string;
  isTotal?: boolean;
  isSubtract?: boolean;
  color?: string;
}

export interface FormulaCardData {
  title: string;
  icon: string;
  lines: FormulaLine[];
}

// ============================================
// INSIGHT TYPES
// ============================================

export type InsightType = 'success' | 'warning' | 'danger' | 'tip';

export interface InsightData {
  type: InsightType;
  icon: string;
  title: string;
  description: string;
}

// ============================================
// LOAN SUMMARY TYPES
// ============================================

export interface LoanSummaryData {
  loanAmount: number;
  monthlyPI: number;
  totalInterest: number;
  totalPayments: number;
  principalPercent: number;
  interestPercent: number;
  amortizationTable: AmortizationRow[];
}

export interface AmortizationRow {
  year: number;
  principal: number;
  interest: number;
  balance: number;
}

// ============================================
// DEAL SCORE TYPES
// ============================================

export interface ScoreBreakdownItem {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
}

export interface DealScoreData {
  score: number;
  grade: string;
  label: string;  // "Strong Opportunity", "Great Opportunity", etc.
  color: string;
  breakdown: ScoreBreakdownItem[];
  discountPercent?: number;  // How much discount from list needed
  breakevenPrice?: number;
  listPrice?: number;
}

// ============================================
// PROPERTY TYPES
// ============================================

export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  listPrice: number;
  monthlyRent: number;
  averageDailyRate?: number;
  occupancyRate?: number;
  propertyTaxes: number;
  insurance: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  arv?: number;
  thumbnailUrl?: string;
  photos?: string[];
  photoCount?: number;
}

// ============================================
// ASSUMPTIONS TYPES
// ============================================

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
}

// ============================================
// COMPARE VIEW TYPES
// ============================================

export type CompareView = 'target' | 'list';

// ============================================
// PROFIT ZONE DASHBOARD TYPES
// ============================================

export interface ProfitZoneMetrics {
  buyPrice: number;
  cashNeeded: number;
  monthlyCashFlow: number;
  cashOnCash: number;
  capRate: number;
  dealScore: number;
}

export interface ProfitZoneTip {
  type: InsightType | 'action';
  icon: string;
  title: string;
  description?: string;
}

export interface ProfitZoneDashboardData {
  metrics: ProfitZoneMetrics;
  projectedProfit: number;
  breakevenPrice: number;
  listPrice: number;
  tips: ProfitZoneTip[];
}

// ============================================
// API RESPONSE TYPES (from backend IQVerdictResponse)
// Re-exported from usePropertyAnalysis hook for convenience
// ============================================

export type {
  IQVerdictResponse,
  StrategyResultResponse,
  ScoreDisplayResponse,
  OpportunityFactorsResponse,
  ReturnFactorsResponse,
  StrategyGrades,
  PropertyAnalysisResult,
  VerdictInput,
} from '../../../hooks/usePropertyAnalysis';
