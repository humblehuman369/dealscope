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

export type SliderFormat = 'currency' | 'percentage' | 'years' | 'currencyPerMonth' | 'currencyPerYear';

export interface SliderConfig {
  id: keyof DealMakerState;
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
