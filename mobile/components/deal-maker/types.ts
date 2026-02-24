/**
 * DEAL MAKER IQ Worksheet Types
 * TypeScript interfaces for the Deal Maker IQ worksheet system
 */

import React from 'react';
import { HomeIcon, BankIcon, WrenchIcon, DollarIcon, ChartIcon } from './icons';

// =============================================================================
// DESIGN CONSTANTS (exact from design spec)
// =============================================================================

export const DEAL_MAKER_PRO_COLORS = {
  // Header
  header: '#0A1628',
  titleWhite: '#FFFFFF',
  titleCyan: '#00D4FF',
  
  // Metrics
  metricLabel: '#94A3B8',
  metricValue: '#FFFFFF',
  dealGapCyan: '#00D4FF',
  annualProfitTeal: '#06B6D4',
  
  // Content
  contentBg: '#F1F5F9',
  cardBg: '#FFFFFF',
  cardBorder: '#F1F5F9',
  activeRing: 'rgba(8, 145, 178, 0.2)',
  
  // Accents
  iconTeal: '#0891B2',
  chevron: '#94A3B8',
  
  // Slider
  sliderTrack: '#E2E8F0',
  sliderFill: '#0891B2',
  sliderThumb: '#0891B2',
  
  // Summary box
  summaryBg: '#F8FAFC',
  summaryBorder: '#E2E8F0',
  summaryLabel: '#64748B',
  summaryValue: '#0A1628',
  
  // Labels
  inputLabel: '#0A1628',
  inputValue: '#0891B2',
  rangeText: '#94A3B8',
  
  // CTA Button
  ctaButton: '#0891B2',
  ctaButtonActive: '#0E7490',
  ctaText: '#FFFFFF',
};

// =============================================================================
// DEAL MAKER STATE
// =============================================================================

export interface DealMakerState {
  // Tab 1: Buy Price
  buyPrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;
  
  // Tab 2: Financing
  loanType: LoanType;
  interestRate: number;
  loanTermYears: number;
  
  // Tab 3: Rehab & Valuation
  rehabBudget: number;
  arv: number;
  
  // Tab 4: Income
  monthlyRent: number;
  otherIncome: number;
  
  // Tab 5: Expenses
  vacancyRate: number;
  maintenanceRate: number;
  managementRate: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
}

export type LoanType = '15-year' | '30-year' | 'arm';

// =============================================================================
// CALCULATED METRICS
// =============================================================================

export interface DealMakerMetrics {
  // From Buy Price tab
  cashNeeded: number;
  downPaymentAmount: number;
  closingCostsAmount: number;
  
  // From Financing tab
  loanAmount: number;
  monthlyPayment: number;
  
  // From Rehab & Valuation tab
  equityCreated: number;
  totalInvestment: number;
  
  // From Income tab
  grossMonthlyIncome: number;
  
  // From Expenses tab
  totalMonthlyExpenses: number;
  monthlyOperatingExpenses: number;
  
  // Key metrics (header)
  dealGap: number;
  annualProfit: number;
  capRate: number;
  cocReturn: number;
  
  // Scores
  dealScore: number;
  dealGrade: DealGrade;
  profitQuality: ProfitGrade;
}

export type DealGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type ProfitGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

// =============================================================================
// TAB CONFIGURATION
// =============================================================================

export type TabId = 'buyPrice' | 'financing' | 'rehabValuation' | 'income' | 'expenses';

export type TabStatus = 'active' | 'completed' | 'pending';

export interface TabConfig {
  id: TabId;
  title: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  status: TabStatus;
  order: number;
}

export const TAB_CONFIGS: TabConfig[] = [
  { id: 'buyPrice', title: 'Buy Price', icon: HomeIcon, status: 'active', order: 1 },
  { id: 'financing', title: 'Financing', icon: BankIcon, status: 'pending', order: 2 },
  { id: 'rehabValuation', title: 'Rehab & Valuation', icon: WrenchIcon, status: 'pending', order: 3 },
  { id: 'income', title: 'Income', icon: DollarIcon, status: 'pending', order: 4 },
  { id: 'expenses', title: 'Expenses', icon: ChartIcon, status: 'pending', order: 5 },
];

// =============================================================================
// SLIDER CONFIGURATION
// =============================================================================

export type SliderFormat =
  | 'currency'
  | 'percentage'
  | 'years'
  | 'currencyPerMonth'
  | 'currencyPerYear'
  | 'days'
  | 'months'
  | 'points'
  | 'units'
  | 'sqft';

export interface SliderConfig {
  id: keyof DealMakerState | string;
  label: string;
  min: number;
  max: number;
  step: number;
  format: SliderFormat;
  defaultValue?: number;
  sourceLabel?: string; // Data source attribution (e.g., "Freddie Mac weekly average")
  isEstimate?: boolean; // If true, shows as estimated vs. actual data
  lastUpdated?: Date; // When the source data was last updated
  staleThresholdDays?: number; // Days after which data is considered stale (default: 7)
}

// Tab 1: Buy Price sliders
export const BUY_PRICE_SLIDERS: SliderConfig[] = [
  { id: 'buyPrice', label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'IQ Income Value Analysis' },
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0.05, max: 0.50, step: 0.05, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Industry standard' },
];

// Tab 2: Financing sliders
// Note: lastUpdated for interestRate should be set dynamically from API response
export const FINANCING_SLIDERS: SliderConfig[] = [
  { id: 'interestRate', label: 'Interest Rate', min: 0.04, max: 0.12, step: 0.00125, format: 'percentage', sourceLabel: 'Freddie Mac weekly average', staleThresholdDays: 7 },
  { id: 'loanTermYears', label: 'Loan Term', min: 15, max: 30, step: 5, format: 'years', sourceLabel: 'Industry standard' },
];

// Tab 3: Rehab & Valuation sliders
export const REHAB_VALUATION_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 150000, step: 5000, format: 'currency', sourceLabel: '5% of ARV estimate', isEstimate: true },
  { id: 'arv', label: 'After Repair Value (ARV)', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
];

// Tab 4: Income sliders
export const INCOME_SLIDERS: SliderConfig[] = [
  { id: 'monthlyRent', label: 'Monthly Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth', sourceLabel: 'Rental comps analysis' },
  { id: 'otherIncome', label: 'Other Income', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
];

// Tab 5: Expenses sliders
export const EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Market-specific historical' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'managementRate', label: 'Property Management', min: 0, max: 0.12, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 5000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
];

// =============================================================================
// DEFAULT STATE
// =============================================================================

/**
 * FALLBACK DEFAULT STATE
 * 
 * These values are used only when the API hasn't loaded yet.
 * The DealMakerScreen should initialize from the centralized defaults API.
 * 
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 * DO NOT change these values here - update backend/app/core/defaults.py instead.
 * 
 * See docs/DEFAULTS_ARCHITECTURE.md for details.
 */
export const DEFAULT_DEAL_MAKER_STATE: DealMakerState = {
  // Tab 1: Buy Price
  buyPrice: 300000,
  downPaymentPercent: 0.20,      // Matches FINANCING.down_payment_pct
  closingCostsPercent: 0.03,     // Matches FINANCING.closing_costs_pct
  
  // Tab 2: Financing
  loanType: '30-year',
  interestRate: 0.06,            // Matches FINANCING.interest_rate
  loanTermYears: 30,             // Matches FINANCING.loan_term_years
  
  // Tab 3: Rehab & Valuation
  rehabBudget: 25000,            // Calculated from REHAB.renovation_budget_pct * ARV
  arv: 350000,
  
  // Tab 4: Income
  monthlyRent: 2500,
  otherIncome: 0,
  
  // Tab 5: Expenses
  vacancyRate: 0.01,             // Matches OPERATING.vacancy_rate (was 0.05)
  maintenanceRate: 0.05,         // Matches OPERATING.maintenance_pct
  managementRate: 0.00,          // Matches OPERATING.property_management_pct (was 0)
  annualPropertyTax: 3600,
  annualInsurance: 1500,
  monthlyHoa: 0,
};

// =============================================================================
// STR SLIDER CONFIGS (Rehab, Income, Expenses)
// =============================================================================

export const STR_REHAB_VALUATION_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 150000, step: 5000, format: 'currency', sourceLabel: '5% of ARV estimate', isEstimate: true },
  { id: 'arv', label: 'After Repair Value (ARV)', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
  { id: 'furnitureSetupCost', label: 'Furniture & Setup', min: 0, max: 30000, step: 1000, format: 'currency', sourceLabel: 'STR furnishing estimate' },
];

export const STR_INCOME_SLIDERS: SliderConfig[] = [
  { id: 'averageDailyRate', label: 'Average Daily Rate (ADR)', min: 50, max: 1000, step: 10, format: 'currency', sourceLabel: 'Market ADR analysis' },
  { id: 'occupancyRate', label: 'Occupancy Rate', min: 0.30, max: 0.95, step: 0.01, format: 'percentage', sourceLabel: 'Market average' },
  { id: 'cleaningFeeRevenue', label: 'Cleaning Fee (Revenue)', min: 0, max: 300, step: 25, format: 'currency', sourceLabel: 'Per booking' },
  { id: 'avgLengthOfStayDays', label: 'Avg Length of Stay', min: 1, max: 30, step: 1, format: 'days', sourceLabel: 'Market data' },
];

export const STR_EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'platformFeeRate', label: 'Platform Fees (Airbnb/VRBO)', min: 0.10, max: 0.20, step: 0.01, format: 'percentage', sourceLabel: 'Airbnb host fee' },
  { id: 'strManagementRate', label: 'STR Management', min: 0, max: 0.25, step: 0.01, format: 'percentage', sourceLabel: 'STR manager rate' },
  { id: 'cleaningCostPerTurnover', label: 'Cleaning Cost', min: 50, max: 400, step: 25, format: 'currency', sourceLabel: 'Per turnover' },
  { id: 'suppliesMonthly', label: 'Supplies & Consumables', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
  { id: 'additionalUtilitiesMonthly', label: 'Additional Utilities', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 8000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
];

// =============================================================================
// BRRRR SLIDER CONFIGS (Buy, Rehab, Refinance, Rent)
// =============================================================================

export const BRRRR_BUY_SLIDERS: SliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'Discounted from ARV' },
  { id: 'buyDiscountPct', label: 'Discount from Market', min: 0, max: 0.30, step: 0.01, format: 'percentage', sourceLabel: 'Target: 5-15%' },
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0.10, max: 0.30, step: 0.05, format: 'percentage', sourceLabel: 'Hard money typical' },
  { id: 'hardMoneyRate', label: 'Hard Money Rate', min: 0.08, max: 0.15, step: 0.005, format: 'percentage', sourceLabel: 'Short-term rate' },
];

export const BRRRR_REHAB_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'contingencyPct', label: 'Contingency', min: 0, max: 0.25, step: 0.05, format: 'percentage', sourceLabel: 'Recommended: 10%' },
  { id: 'holdingPeriodMonths', label: 'Holding Period', min: 2, max: 12, step: 1, format: 'months', sourceLabel: 'Rehab + stabilize' },
  { id: 'holdingCostsMonthly', label: 'Monthly Holding Costs', min: 0, max: 3000, step: 100, format: 'currencyPerMonth', sourceLabel: 'Taxes, ins, utilities' },
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
];

export const BRRRR_RENT_SLIDERS: SliderConfig[] = [
  { id: 'postRehabMonthlyRent', label: 'Post-Rehab Rent', min: 500, max: 10000, step: 50, format: 'currencyPerMonth', sourceLabel: 'After improvements' },
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Market average' },
  { id: 'managementRate', label: 'Property Management', min: 0, max: 0.12, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Industry standard' },
];

export const BRRRR_REFINANCE_SLIDERS: SliderConfig[] = [
  { id: 'refinanceLtv', label: 'Refinance LTV', min: 0.65, max: 0.80, step: 0.05, format: 'percentage', sourceLabel: 'Conventional limit' },
  { id: 'refinanceInterestRate', label: 'Refinance Rate', min: 0.04, max: 0.10, step: 0.00125, format: 'percentage', sourceLabel: 'Conventional 30-yr' },
  { id: 'refinanceTermYears', label: 'Loan Term', min: 15, max: 30, step: 5, format: 'years', sourceLabel: 'Standard terms' },
  { id: 'refinanceClosingCostsPct', label: 'Closing Costs', min: 0.01, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Refi costs' },
];

export const BRRRR_EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 20000, step: 100, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 5000, step: 100, format: 'currencyPerYear', sourceLabel: 'ZIP-based estimate', isEstimate: true },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 500, step: 25, format: 'currencyPerMonth' },
];

// =============================================================================
// FLIP SLIDER CONFIGS (Purchase, Rehab, Financing, Sale)
// =============================================================================

export const FLIP_BUY_SLIDERS: SliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 50000, max: 2000000, step: 5000, format: 'currency', sourceLabel: 'Discounted from ARV' },
  { id: 'purchaseDiscountPct', label: 'Discount from ARV', min: 0, max: 0.40, step: 0.01, format: 'percentage', sourceLabel: 'Target: 20-30%' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Buyer closing' },
];

export const FLIP_FINANCING_SLIDERS: SliderConfig[] = [
  { id: 'hardMoneyLtv', label: 'Loan-to-Value', min: 0.70, max: 1.0, step: 0.05, format: 'percentage', sourceLabel: 'Hard money LTV' },
  { id: 'hardMoneyRate', label: 'Interest Rate', min: 0.08, max: 0.18, step: 0.005, format: 'percentage', sourceLabel: 'Hard money rate' },
  { id: 'loanPoints', label: 'Points', min: 0, max: 5, step: 0.5, format: 'points', sourceLabel: 'Origination fee' },
];

export const FLIP_REHAB_SLIDERS: SliderConfig[] = [
  { id: 'rehabBudget', label: 'Rehab Budget', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'contingencyPct', label: 'Contingency', min: 0, max: 0.25, step: 0.05, format: 'percentage', sourceLabel: 'Recommended: 10-15%' },
  { id: 'rehabTimeMonths', label: 'Rehab Time', min: 1, max: 12, step: 1, format: 'months', sourceLabel: 'Expected duration' },
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 3000000, step: 10000, format: 'currency', sourceLabel: 'Sales comps analysis' },
];

export const FLIP_HOLD_SLIDERS: SliderConfig[] = [
  { id: 'holdingCostsMonthly', label: 'Monthly Holding Costs', min: 0, max: 5000, step: 100, format: 'currencyPerMonth', sourceLabel: 'Taxes, ins, utilities' },
  { id: 'daysOnMarket', label: 'Days on Market', min: 15, max: 180, step: 15, format: 'days', sourceLabel: 'Market average' },
];

export const FLIP_SELL_SLIDERS: SliderConfig[] = [
  { id: 'sellingCostsPct', label: 'Selling Costs', min: 0.04, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: 'Agent + closing' },
  { id: 'capitalGainsRate', label: 'Capital Gains Tax Rate', min: 0, max: 0.40, step: 0.01, format: 'percentage', sourceLabel: 'Short-term rate' },
];

// =============================================================================
// HOUSE HACK SLIDER CONFIGS (Purchase, Units, Expenses)
// =============================================================================

export const HOUSEHACK_BUY_SLIDERS: SliderConfig[] = [
  { id: 'purchasePrice', label: 'Purchase Price', min: 100000, max: 2000000, step: 10000, format: 'currency', sourceLabel: 'Multi-unit property' },
  { id: 'totalUnits', label: 'Total Units', min: 2, max: 8, step: 1, format: 'units', sourceLabel: 'Duplex to 8-plex' },
  { id: 'ownerOccupiedUnits', label: 'Owner Units', min: 1, max: 2, step: 1, format: 'units', sourceLabel: 'Units you live in' },
  { id: 'ownerUnitMarketRent', label: 'Owner Unit Market Rent', min: 500, max: 5000, step: 50, format: 'currencyPerMonth', sourceLabel: 'For comparison' },
];

export const HOUSEHACK_FINANCE_SLIDERS: SliderConfig[] = [
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0, max: 0.25, step: 0.005, format: 'percentage', sourceLabel: 'FHA: 3.5% min' },
  { id: 'interestRate', label: 'Interest Rate', min: 0.04, max: 0.10, step: 0.00125, format: 'percentage', sourceLabel: 'Current rates' },
  { id: 'pmiRate', label: 'PMI/MIP Rate', min: 0, max: 0.015, step: 0.0005, format: 'percentage', sourceLabel: 'FHA: 0.85%' },
  { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage', sourceLabel: 'Buyer closing' },
];

export const HOUSEHACK_RENT_SLIDERS: SliderConfig[] = [
  { id: 'avgRentPerUnit', label: 'Avg Rent Per Unit', min: 500, max: 5000, step: 50, format: 'currencyPerMonth', sourceLabel: 'Market rent' },
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: 'Area average' },
  { id: 'currentHousingPayment', label: 'Current Housing Cost', min: 0, max: 5000, step: 100, format: 'currencyPerMonth', sourceLabel: 'What you pay now' },
];

export const HOUSEHACK_EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 30000, step: 500, format: 'currencyPerYear', sourceLabel: 'County assessment' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 10000, step: 100, format: 'currencyPerYear', sourceLabel: 'Multi-unit rate' },
  { id: 'monthlyHoa', label: 'HOA', min: 0, max: 1000, step: 25, format: 'currencyPerMonth' },
  { id: 'utilitiesMonthly', label: 'Shared Utilities', min: 0, max: 1000, step: 25, format: 'currencyPerMonth', sourceLabel: 'Owner paid' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0, max: 0.15, step: 0.01, format: 'percentage', sourceLabel: '% of rent' },
  { id: 'capexRate', label: 'CapEx Reserve', min: 0, max: 0.10, step: 0.01, format: 'percentage', sourceLabel: '% of rent' },
];

// =============================================================================
// WHOLESALE SLIDER CONFIGS (Contract, Property, Assignment)
// =============================================================================

export const WHOLESALE_PROPERTY_SLIDERS: SliderConfig[] = [
  { id: 'arv', label: 'After Repair Value', min: 50000, max: 2000000, step: 10000, format: 'currency', sourceLabel: 'Comps analysis' },
  { id: 'estimatedRepairs', label: 'Estimated Repairs', min: 0, max: 200000, step: 5000, format: 'currency', sourceLabel: 'Contractor estimate' },
  { id: 'squareFootage', label: 'Square Footage', min: 500, max: 5000, step: 100, format: 'sqft', sourceLabel: 'Property details' },
];

export const WHOLESALE_CONTRACT_SLIDERS: SliderConfig[] = [
  { id: 'contractPrice', label: 'Contract Price', min: 25000, max: 1500000, step: 5000, format: 'currency', sourceLabel: 'Negotiated with seller' },
  { id: 'earnestMoney', label: 'Earnest Money', min: 100, max: 10000, step: 100, format: 'currency', sourceLabel: 'At risk if deal fails' },
  { id: 'inspectionPeriodDays', label: 'Inspection Period', min: 7, max: 30, step: 1, format: 'days', sourceLabel: 'Due diligence window' },
  { id: 'daysToClose', label: 'Days to Close', min: 21, max: 90, step: 7, format: 'days', sourceLabel: 'Total timeline' },
];

export const WHOLESALE_ASSIGNMENT_SLIDERS: SliderConfig[] = [
  { id: 'assignmentFee', label: 'Assignment Fee', min: 5000, max: 50000, step: 1000, format: 'currency', sourceLabel: 'Your wholesale fee' },
  { id: 'marketingCosts', label: 'Marketing Costs', min: 0, max: 5000, step: 100, format: 'currency', sourceLabel: 'Finding the deal' },
  { id: 'closingCosts', label: 'Closing Costs', min: 0, max: 2000, step: 100, format: 'currency', sourceLabel: 'Minimal for assignment' },
];

// =============================================================================
// STRATEGY DEFAULT STATES
// =============================================================================

/**
 * STR FALLBACK DEFAULT STATE
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_STR_DEAL_MAKER_STATE = {
  buyPrice: 300000,
  downPaymentPercent: 0.20,
  closingCostsPercent: 0.03,
  loanType: '30-year' as LoanType,
  interestRate: 0.06,
  loanTermYears: 30,
  rehabBudget: 25000,
  arv: 350000,
  furnitureSetupCost: 6000,
  averageDailyRate: 200,
  occupancyRate: 0.70,
  cleaningFeeRevenue: 75,
  avgLengthOfStayDays: 6,
  platformFeeRate: 0.15,
  strManagementRate: 0.10,
  cleaningCostPerTurnover: 150,
  suppliesMonthly: 100,
  additionalUtilitiesMonthly: 0,
  maintenanceRate: 0.05,
  annualPropertyTax: 3600,
  annualInsurance: 3000,
  monthlyHoa: 0,
};

/**
 * BRRRR FALLBACK DEFAULT STATE
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_BRRRR_DEAL_MAKER_STATE = {
  purchasePrice: 250000,
  buyDiscountPct: 0.05,
  downPaymentPercent: 0.20,
  closingCostsPercent: 0.02,
  hardMoneyRate: 0.12,
  rehabBudget: 40000,
  contingencyPct: 0.10,
  holdingPeriodMonths: 4,
  holdingCostsMonthly: 1500,
  arv: 350000,
  postRehabMonthlyRent: 2800,
  postRehabRentIncreasePct: 0.10,
  refinanceLtv: 0.75,
  refinanceInterestRate: 0.06,
  refinanceTermYears: 30,
  refinanceClosingCostsPct: 0.03,
  vacancyRate: 0.05,
  maintenanceRate: 0.05,
  managementRate: 0.08,
  annualPropertyTax: 4200,
  annualInsurance: 1800,
  monthlyHoa: 0,
};

/**
 * FLIP FALLBACK DEFAULT STATE
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_FLIP_DEAL_MAKER_STATE = {
  purchasePrice: 200000,
  purchaseDiscountPct: 0.20,
  closingCostsPercent: 0.03,
  financingType: 'hardMoney' as const,
  hardMoneyLtv: 0.90,
  hardMoneyRate: 0.12,
  loanPoints: 2,
  rehabBudget: 50000,
  contingencyPct: 0.10,
  rehabTimeMonths: 4,
  arv: 325000,
  holdingCostsMonthly: 1500,
  daysOnMarket: 45,
  sellingCostsPct: 0.08,
  capitalGainsRate: 0.22,
};

/**
 * HOUSE HACK FALLBACK DEFAULT STATE
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_HOUSEHACK_DEAL_MAKER_STATE = {
  purchasePrice: 400000,
  totalUnits: 4,
  ownerOccupiedUnits: 1,
  ownerUnitMarketRent: 1500,
  loanType: 'fha' as const,
  downPaymentPercent: 0.035,
  interestRate: 0.065,
  loanTermYears: 30,
  pmiRate: 0.0085,
  closingCostsPercent: 0.03,
  avgRentPerUnit: 1500,
  vacancyRate: 0.05,
  currentHousingPayment: 2000,
  annualPropertyTax: 6000,
  annualInsurance: 2400,
  monthlyHoa: 0,
  utilitiesMonthly: 200,
  maintenanceRate: 0.05,
  capexRate: 0.05,
};

/**
 * WHOLESALE FALLBACK DEFAULT STATE
 * Values should match backend/app/core/defaults.py to minimize visual jumps.
 */
export const DEFAULT_WHOLESALE_DEAL_MAKER_STATE = {
  arv: 300000,
  estimatedRepairs: 40000,
  squareFootage: 1500,
  contractPrice: 170000,
  earnestMoney: 1000,
  inspectionPeriodDays: 14,
  daysToClose: 45,
  assignmentFee: 15000,
  marketingCosts: 500,
  closingCosts: 500,
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface DealMakerSliderProps {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
  isDark?: boolean;
  defaultValue?: number; // For reset functionality
  onReset?: () => void; // Called when reset button is pressed
  showReset?: boolean; // Whether to show reset button (when value differs from default)
}

export interface ScoreBadgeProps {
  type: 'dealScore' | 'profitQuality';
  score?: number;
  grade?: DealGrade | ProfitGrade;
  size?: 'small' | 'medium' | 'large';
}

export interface MetricsHeaderProps {
  state: DealMakerState;
  metrics: DealMakerMetrics;
  listPrice?: number;
  propertyAddress?: string;
  onBackPress?: () => void;
}

export interface WorksheetTabProps {
  config: TabConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onContinue: () => void;
  children: React.ReactNode;
  derivedOutput?: {
    label: string;
    value: string;
  };
  isLastTab?: boolean;
}

export interface DealMakerScreenProps {
  propertyAddress: string;
  listPrice?: number;
  initialState?: Partial<DealMakerState>;
  propertyTax?: number;
  insurance?: number;
  rentEstimate?: number;
  onBackPress?: () => void;
}

// =============================================================================
// CTA BUTTON CONFIG
// =============================================================================

export const CTA_BUTTON_TEXT: Record<TabId, string> = {
  buyPrice: 'Continue to Financing →',
  financing: 'Continue to Rehab & Valuation →',
  rehabValuation: 'Continue to Income →',
  income: 'Continue to Expenses →',
  expenses: 'Finish & Save Deal ✓',
};
