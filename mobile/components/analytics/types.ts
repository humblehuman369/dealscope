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
  
  // Investment
  totalCashRequired: number;
  loanAmount: number;
  
  // Year 1 projections
  yearOneEquityGrowth: number;
  breakEvenVacancy: number;
}

export interface ScoreBreakdown {
  category: string;
  points: number;
  maxPoints: number;
  icon: string;
}

export interface DealScore {
  score: number;
  grade: string;
  label: string;
  color: string;
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
  year: number;
  principal: number;
  interest: number;
  endingBalance: number;
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

export const DEFAULT_INPUTS: AnalyticsInputs = {
  purchasePrice: 400000,
  downPaymentPercent: 0.20,
  closingCostsPercent: 0.03,
  interestRate: 0.0685,
  loanTermYears: 30,
  monthlyRent: 2500,
  otherIncome: 0,
  vacancyRate: 0.05,
  maintenanceRate: 0.05,
  managementRate: 0,
  annualPropertyTax: 4800,
  annualInsurance: 1800,
  monthlyHoa: 0,
  appreciationRate: 0.03,
  rentGrowthRate: 0.03,
  expenseGrowthRate: 0.02,
};

export const SLIDER_GROUPS: SliderGroup[] = [
  {
    id: 'purchase',
    title: 'Purchase Terms',
    icon: '1',
    sliders: [
      { id: 'purchasePrice', label: 'Purchase Price', min: 50000, max: 2000000, step: 5000, format: 'currency' },
      { id: 'downPaymentPercent', label: 'Down Payment', min: 0.05, max: 0.40, step: 0.05, format: 'percentage' },
      { id: 'closingCostsPercent', label: 'Closing Costs', min: 0.02, max: 0.05, step: 0.005, format: 'percentage' },
    ],
  },
  {
    id: 'financing',
    title: 'Financing',
    icon: '2',
    sliders: [
      { id: 'interestRate', label: 'Interest Rate', min: 0.04, max: 0.10, step: 0.00125, format: 'percentage' },
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
      { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.15, step: 0.01, format: 'percentage' },
      { id: 'maintenanceRate', label: 'Maintenance', min: 0.03, max: 0.10, step: 0.01, format: 'percentage' },
      { id: 'managementRate', label: 'Property Management', min: 0, max: 0.12, step: 0.01, format: 'percentage' },
    ],
  },
];

