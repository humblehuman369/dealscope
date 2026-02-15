/**
 * Property Analytics Types
 * TypeScript interfaces for the Deal Score system
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

  // Max purchase price for $200/mo cash flow target (matches frontend)
  maxPurchasePriceForTarget: number;
}

export interface ScoreBreakdown {
  category: string;
  points: number;
  maxPoints: number;
  icon: string;
  description: string;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

export type OpportunityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Deal Score based on Investment Opportunity
 * 
 * The score is calculated based on how much discount from list price 
 * is needed to reach breakeven. Lower discount = better opportunity.
 */
export interface DealScore {
  score: number;
  grade: OpportunityGrade;
  label: string;  // "Strong Opportunity", "Great Opportunity", etc.
  verdict: string;
  color: string;
  discountPercent: number;  // How much discount from list needed
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

export interface YearProjection {
  year: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  totalWealth: number;
}

export interface AmortizationRow {
  // Monthly-granularity fields (matches frontend)
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
}

export interface Scenario {
  id: string;
  name: string;
  inputs: AnalyticsInputs;
  metrics: CalculatedMetrics;
  score: number;
  createdAt: Date;
}

export interface SliderConfig {
  id: keyof AnalyticsInputs;
  label: string;
  min: number;
  max: number;
  step: number;
  format: 'currency' | 'percentage' | 'years';
}

export interface SliderGroup {
  id: string;
  title: string;
  icon: string;
  sliders: SliderConfig[];
}

/**
 * Default analytics inputs — all rate/percentage fields use whole-number
 * percentages (e.g. 20 = 20 %, 6.0 = 6 %) matching the frontend convention.
 */
export const DEFAULT_INPUTS: AnalyticsInputs = {
  purchasePrice: 400000,
  downPaymentPercent: 20,        // 20%
  closingCostsPercent: 3,        // 3%
  interestRate: 6.0,             // 6.0% — matches frontend default
  loanTermYears: 30,
  monthlyRent: 2500,
  otherIncome: 0,
  vacancyRate: 5,                // 5%
  maintenanceRate: 5,            // 5%
  managementRate: 0,
  annualPropertyTax: 4800,
  annualInsurance: 1800,
  monthlyHoa: 0,
  appreciationRate: 3,           // 3%
  rentGrowthRate: 3,             // 3%
  expenseGrowthRate: 2,          // 2%
};

export const SLIDER_GROUPS: SliderGroup[] = [
  {
    id: 'purchase',
    title: 'Purchase Terms',
    icon: '1',
    sliders: [
      { id: 'purchasePrice', label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency' },
      { id: 'downPaymentPercent', label: 'Down Payment', min: 5, max: 40, step: 5, format: 'percentage' },
      { id: 'closingCostsPercent', label: 'Closing Costs', min: 2, max: 5, step: 0.5, format: 'percentage' },
    ],
  },
  {
    id: 'financing',
    title: 'Financing',
    icon: '2',
    sliders: [
      { id: 'interestRate', label: 'Interest Rate', min: 4, max: 10, step: 0.125, format: 'percentage' },
      { id: 'loanTermYears', label: 'Loan Term', min: 15, max: 30, step: 5, format: 'years' },
    ],
  },
  {
    id: 'income',
    title: 'Property Income',
    icon: '3',
    sliders: [
      { id: 'monthlyRent', label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currency' },
      { id: 'otherIncome', label: 'Other Income', min: 0, max: 500, step: 25, format: 'currency' },
    ],
  },
  {
    id: 'expenses',
    title: 'Operating Expenses',
    icon: '4',
    sliders: [
      { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 15, step: 1, format: 'percentage' },
      { id: 'maintenanceRate', label: 'Maintenance', min: 3, max: 10, step: 1, format: 'percentage' },
      { id: 'managementRate', label: 'Property Management', min: 0, max: 12, step: 1, format: 'percentage' },
    ],
  },
];

// =============================================================================
// STRATEGY TYPES
// =============================================================================

export type StrategyType = 
  | 'longTermRental'
  | 'shortTermRental'
  | 'brrrr'
  | 'fixAndFlip'
  | 'houseHack'
  | 'wholesale';

export interface StrategyBase {
  type: StrategyType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// Short-Term Rental (STR)
export interface STRInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;
  interestRate: number;
  loanTermYears: number;
  
  // STR specific
  averageDailyRate: number;
  occupancyRate: number;
  cleaningFee: number;
  cleaningCostPerTurn: number;
  averageStayLength: number;
  
  // Expenses
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
  utilities: number;
  maintenanceRate: number;
  managementRate: number;
  platformFeeRate: number;
  
  // Furnishing
  furnishingBudget: number;
}

export interface STRMetrics {
  grossNightlyRevenue: number;
  monthlyGrossRevenue: number;
  annualGrossRevenue: number;
  revPAR: number; // Revenue Per Available Room
  
  // Net
  monthlyNetRevenue: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  
  // Returns
  cashOnCash: number;
  capRate: number;
  
  // Investment
  totalCashRequired: number;
  loanAmount: number;
  mortgagePayment: number;
  
  // Expenses breakdown
  monthlyExpenses: {
    mortgage: number;
    taxes: number;
    insurance: number;
    hoa: number;
    utilities: number;
    maintenance: number;
    management: number;
    platformFees: number;
    cleaning: number;
  };
}

// BRRRR Strategy
export interface BRRRRInputs {
  // Purchase
  purchasePrice: number;
  closingCostsPercent: number;
  
  // Rehab
  rehabBudget: number;
  rehabTimeMonths: number;
  holdingCostsMonthly: number;
  
  // After Repair Value
  arv: number;
  
  // Refinance
  refinanceLTV: number;
  refinanceRate: number;
  refinanceTermYears: number;
  refinanceCosts: number;
  
  // Rental
  monthlyRent: number;
  vacancyRate: number;
  maintenanceRate: number;
  managementRate: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
}

export interface BRRRRMetrics {
  // Initial investment
  totalInitialInvestment: number;
  purchaseCosts: number;
  rehabCosts: number;
  holdingCosts: number;
  
  // Refinance
  refinanceLoanAmount: number;
  cashOutAmount: number;
  cashLeftInDeal: number;
  cashRecoupPercent: number;
  
  // Post-Refinance
  newMortgagePayment: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  
  // Returns
  cashOnCash: number; // Based on cash left in deal
  infiniteReturn: boolean; // If 100%+ cash recouped
  equityCreated: number;
  equityPercent: number;
  
  // Timeline
  totalTimeMonths: number;
}

// Fix & Flip
export interface FlipInputs {
  // Purchase
  purchasePrice: number;
  closingCostsPercent: number;
  
  // Rehab
  rehabBudget: number;
  rehabTimeMonths: number;
  holdingCostsMonthly: number;
  
  // Financing
  financingType: 'cash' | 'hardMoney' | 'conventional';
  loanAmount: number;
  interestRate: number;
  points: number;
  
  // Sale
  arv: number;
  sellingCostsPercent: number;
  daysOnMarket: number;
}

export interface FlipMetrics {
  // Costs
  totalCost: number;
  purchaseCosts: number;
  rehabCosts: number;
  holdingCosts: number;
  financingCosts: number;
  sellingCosts: number;
  
  // Returns
  netProfit: number;
  roi: number;
  annualizedROI: number;
  profitMargin: number;
  
  // Cash requirements
  cashRequired: number;
  
  // Timeline
  totalProjectTime: number;
  
  // 70% Rule check
  maxAllowableOffer: number;
  meetsSeventyPercentRule: boolean;
}

// House Hack
export interface HouseHackInputs extends AnalyticsInputs {
  // Additional units
  totalUnits: number;
  ownerOccupiedUnits: number;
  rentedUnits: number;
  rentPerUnit: number[];
  
  // Owner costs
  currentHousingPayment: number;
  
  // House hack specific
  sharedUtilities: number;
  additionalMaintenance: number;
}

export interface HouseHackMetrics extends CalculatedMetrics {
  // Housing cost analysis
  effectiveHousingCost: number;
  housingCostSavings: number;
  housingCostReductionPercent: number;
  
  // Per unit breakdown
  revenuePerRentedUnit: number;
  cashFlowPerRentedUnit: number;
  
  // Comparison to renting
  rentVsBuyBenefit: number;
}

// Wholesale
export interface WholesaleInputs {
  // Contract
  contractPrice: number;
  earnestMoney: number;
  inspectionPeriodDays: number;
  
  // Property
  arv: number;
  estimatedRepairs: number;
  
  // Assignment
  assignmentFee: number;
  
  // Marketing/costs
  marketingCosts: number;
  closingCosts: number;
}

export interface WholesaleMetrics {
  // Profit
  netProfit: number;
  roi: number;
  
  // Buyer analysis
  endBuyerAllInPrice: number;
  endBuyerMaxProfit: number;
  endBuyerSpread: number;
  
  // Deal quality
  meetsSeventyPercentRule: boolean;
  maxAllowableOffer: number;
  
  // Investment
  totalCashRequired: number;
}

// Unified Strategy Result
export interface StrategyAnalysis<T = unknown> {
  strategy: StrategyType;
  score: number;
  grade: string;
  color: string;
  metrics: T;
  insights: Insight[];
  isViable: boolean;
  rank?: number;
}

