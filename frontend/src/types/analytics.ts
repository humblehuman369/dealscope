// ============================================
// InvestIQ Property Analytics - TypeScript Types
// ============================================

// ============================================
// PROPERTY DATA
// ============================================

export interface Property {
  id: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
  };
  listPrice: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  propertyType: 'single_family' | 'multi_family' | 'condo' | 'townhouse';
  images: string[];
  estimatedRent?: number;
  estimatedPropertyTax?: number;
  estimatedInsurance?: number;
  hoaFees?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// USER INPUTS (Slider Values)
// ============================================

export interface AnalyticsInputs {
  // Purchase Terms
  purchasePrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;
  rehabCosts: number;

  // Financing
  interestRate: number;
  loanTermYears: 15 | 20 | 25 | 30;
  loanType: 'conventional' | 'fha' | 'va' | 'hard_money' | 'seller_finance';

  // Property Income
  monthlyRent: number;
  otherIncome: number;

  // Operating Expenses
  vacancyRate: number;
  maintenanceRate: number;
  managementRate: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
  utilities: number;

  // Projection Assumptions
  appreciationRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  sellingCostsPercent: number;
}

export const DEFAULT_INPUTS: AnalyticsInputs = {
  // Purchase Terms
  purchasePrice: 0,
  downPaymentPercent: 20,
  closingCostsPercent: 3,
  rehabCosts: 0,

  // Financing
  interestRate: 7.0,
  loanTermYears: 30,
  loanType: 'conventional',

  // Property Income
  monthlyRent: 0,
  otherIncome: 0,

  // Operating Expenses
  vacancyRate: 5,
  maintenanceRate: 5,
  managementRate: 0,
  annualPropertyTax: 0,
  annualInsurance: 0,
  monthlyHoa: 0,
  utilities: 0,

  // Projection Assumptions
  appreciationRate: 3,
  rentGrowthRate: 3,
  expenseGrowthRate: 2,
  sellingCostsPercent: 6,
};

// ============================================
// CALCULATED METRICS
// ============================================

export interface CalculatedMetrics {
  // Loan Details
  loanAmount: number;
  downPayment: number;
  closingCosts: number;
  totalCashRequired: number;
  monthlyMortgage: number;

  // Monthly Breakdown
  grossMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlyVacancy: number;
  monthlyMaintenance: number;
  monthlyManagement: number;
  monthlyPropertyTax: number;
  monthlyInsurance: number;
  monthlyHoa: number;
  monthlyUtilities: number;
  monthlyCashFlow: number;

  // Annual Figures
  annualGrossIncome: number;
  annualOperatingExpenses: number;
  annualNOI: number;
  annualDebtService: number;
  annualCashFlow: number;

  // Key Returns
  cashOnCash: number;
  capRate: number;
  dscr: number;
  onePercentRule: number;
  grossRentMultiplier: number;

  // Break-even Points
  breakEvenOccupancy: number;
  breakEvenRent: number;
  maxPurchasePriceForTarget: number;
}

// ============================================
// DEAL SCORE (Opportunity-Based Scoring)
// ============================================

/**
 * Deal Score is based on Investment Opportunity
 * 
 * The score is calculated based on how much discount from list price 
 * is needed to reach breakeven. Lower discount = better opportunity.
 * 
 * Thresholds:
 * - 0-5% discount needed = Strong Opportunity (A+)
 * - 5-10% = Great Opportunity (A)
 * - 10-15% = Moderate Opportunity (B)
 * - 15-25% = Potential Opportunity (C)
 * - 25-35% = Mild Opportunity (D)
 * - 35-45%+ = Weak Opportunity (F)
 */

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
  verdict: string;
  label: string;  // "Strong Opportunity", "Great Opportunity", etc.
  color: string;
  discountPercent: number;  // How much discount from list needed
  breakevenPrice: number;
  listPrice: number;
  breakdown: ScoreBreakdown[];
  strengths: string[];
  concerns: string[];
  improvements: ScoreImprovement[];
}

export interface ScoreImprovement {
  action: string;
  icon: string;
  pointsGain: number;
  newScore: number;
  newGrade: string;
}

// ============================================
// 10-YEAR PROJECTIONS
// ============================================

export interface YearProjection {
  year: number;
  
  // Income & Expenses
  annualRent: number;
  annualExpenses: number;
  annualMortgage: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;

  // Property Value & Equity
  propertyValue: number;
  loanBalance: number;
  equity: number;
  equityGrowth: number;

  // Total Wealth
  totalWealth: number;
  totalReturn: number;
  annualizedReturn: number;
}

export interface ProjectionSummary {
  totalCashFlow: number;
  totalEquity: number;
  totalWealth: number;
  totalReturn: number;
  irr: number;
  equityMultiple: number;
  paybackPeriod: number | null;
}

// ============================================
// AMORTIZATION
// ============================================

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

export interface AmortizationSummary {
  monthlyPayment: number;
  totalPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  principalPercent: number;
  interestPercent: number;
  payoffDate: Date;
}

// ============================================
// SCENARIOS
// ============================================

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  inputs: AnalyticsInputs;
  metrics: CalculatedMetrics;
  score: DealScore;
  createdAt: string;
  updatedAt: string;
  isBase: boolean;
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  winner: Scenario | null;
  deltas: Record<string, number>;
}

// ============================================
// SENSITIVITY ANALYSIS
// ============================================

export interface SensitivityVariable {
  id: keyof AnalyticsInputs;
  label: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  format: 'currency' | 'percentage' | 'decimal';
}

export interface SensitivityDataPoint {
  value: number;
  cashFlow: number;
  cashOnCash: number;
  score: number;
  isCurrent: boolean;
}

export interface SensitivityAnalysis {
  variable: SensitivityVariable;
  impact: 'high' | 'medium' | 'low';
  dataPoints: SensitivityDataPoint[];
  cashFlowRange: { min: number; max: number };
  breakEvenValue: number | null;
}

// ============================================
// INVESTMENT STRATEGIES
// ============================================

export type InvestmentStrategy = 
  | 'long_term_rental'
  | 'short_term_rental'
  | 'brrrr'
  | 'fix_and_flip'
  | 'house_hack'
  | 'wholesale';

export interface StrategyAnalysis {
  strategy: InvestmentStrategy;
  label: string;
  icon: string;
  color: string;
  estimatedROI: number;
  estimatedCashFlow: number;
  timeHorizon: string;
  riskLevel: 'low' | 'medium' | 'high';
  effortLevel: 'passive' | 'moderate' | 'active';
  keyMetrics: { label: string; value: string }[];
  pros: string[];
  cons: string[];
  isBestFit: boolean;
}

// ============================================
// UI STATE
// ============================================

export type BreakdownTab = 
  | 'cashflow' 
  | 'tenyear' 
  | 'score' 
  | 'whatif' 
  | 'compare' 
  | 'loan';

export interface TabConfig {
  id: BreakdownTab;
  label: string;
  icon: string;
}

export const BREAKDOWN_TABS: TabConfig[] = [
  { id: 'cashflow', label: 'Cash Flow', icon: '💵' },
  { id: 'tenyear', label: '10-Year', icon: '📈' },
  { id: 'score', label: 'Score', icon: '🎯' },
  { id: 'whatif', label: 'What-If', icon: '🔮' },
  { id: 'compare', label: 'Compare', icon: '⚖️' },
  { id: 'loan', label: 'Loan', icon: '🏦' },
];

export interface SliderGroup {
  id: string;
  title: string;
  icon: string;
  stepNumber: number;
  isExpanded: boolean;
  sliders: SliderConfig[];
}

export interface SliderConfig {
  id: keyof AnalyticsInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: 'currency' | 'percentage' | 'decimal' | 'years';
  suffix?: string;
  prefix?: string;
  infoText?: string;
}

// ============================================
// SMART INSIGHTS
// ============================================

export interface Insight {
  id: string;
  type: 'strength' | 'concern' | 'tip';
  icon: string;
  text: string;
  highlight?: string;
  priority: number;
}

// ============================================
// BENCHMARKS
// ============================================

export interface Benchmark {
  metric: string;
  threshold: number;
  comparison: 'above' | 'below' | 'between';
  upperThreshold?: number;
  label: string;
  description: string;
}

export const BENCHMARKS: Record<string, Benchmark> = {
  cashOnCash: {
    metric: 'Cash-on-Cash',
    threshold: 8,
    comparison: 'above',
    label: '> 8%',
    description: 'Target 8%+ for good returns',
  },
  capRate: {
    metric: 'Cap Rate',
    threshold: 6,
    comparison: 'above',
    label: '> 6%',
    description: 'Target 6%+ for investment properties',
  },
  dscr: {
    metric: 'DSCR',
    threshold: 1.25,
    comparison: 'above',
    label: '> 1.25',
    description: 'Lenders typically require 1.25+',
  },
  onePercentRule: {
    metric: '1% Rule',
    threshold: 1.0,
    comparison: 'above',
    label: '≥ 1%',
    description: 'Monthly rent should be 1% of purchase price',
  },
  cashFlow: {
    metric: 'Cash Flow',
    threshold: 0,
    comparison: 'above',
    label: '> $0',
    description: 'Property should generate positive cash flow',
  },
};

// ============================================
// THEME
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  surfaceHover: string;
  
  // Borders
  border: string;
  borderLight: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Semantic
  primary: string;
  primaryDark: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
}

// ============================================
// NAVIGATION
// ============================================

export type RootStackParamList = {
  Home: undefined;
  PropertyDetails: { propertyId: string };
  PropertyAnalytics: { property: Property };
  FullBreakdown: { property: Property; inputs: AnalyticsInputs };
  ScenarioEditor: { scenarioId?: string };
  Settings: undefined;
};

// ============================================
// API RESPONSES (if fetching from backend)
// ============================================

export interface PropertyEstimates {
  estimatedRent: {
    low: number;
    mid: number;
    high: number;
  };
  estimatedValue: {
    low: number;
    mid: number;
    high: number;
  };
  propertyTax: number;
  insurance: number;
  comparables: Property[];
}

export interface MarketData {
  medianPrice: number;
  medianRent: number;
  averageCapRate: number;
  averageCashOnCash: number;
  appreciationRate: number;
  rentGrowthRate: number;
  vacancyRate: number;
}
