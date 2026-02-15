/**
 * Proforma types - matching backend schemas/proforma.py exactly
 */

import { DepreciationMethod, ProformaFormat, StrategyType } from './api';

// ===========================================
// Depreciation Config
// ===========================================
export interface DepreciationConfig {
  purchase_price: number;
  land_value_percent: number;
  land_value: number;
  improvement_value: number;
  capitalized_closing_costs: number;
  rehab_costs: number;
  total_depreciable_basis: number;
  depreciation_method: DepreciationMethod;
  depreciation_years: number;
  annual_depreciation: number;
  monthly_depreciation: number;
}

// ===========================================
// Annual Tax Projection
// ===========================================
export interface AnnualTaxProjection {
  year: number;

  // Income
  gross_rental_income: number;
  effective_gross_income: number;
  other_income: number;
  total_income: number;

  // Expenses
  operating_expenses: number;
  property_taxes: number;
  insurance: number;
  management: number;
  maintenance: number;
  utilities: number;
  hoa_fees: number;
  other_expenses: number;

  // Financing
  mortgage_interest: number;
  mortgage_principal: number;
  total_debt_service: number;

  // Depreciation
  depreciation: number;

  // Tax calculation
  net_operating_income: number;
  taxable_income: number;
  marginal_tax_rate: number;
  estimated_tax_liability: number;
  tax_benefit: number;

  // Cash flows
  pre_tax_cash_flow: number;
  after_tax_cash_flow: number;
}

// ===========================================
// Amortization Row
// ===========================================
export interface AmortizationRow {
  month: number;
  year: number;
  payment_number: number;
  beginning_balance: number;
  scheduled_payment: number;
  principal_payment: number;
  interest_payment: number;
  ending_balance: number;
  cumulative_principal: number;
  cumulative_interest: number;
}

// ===========================================
// Amortization Summary
// ===========================================
export interface AmortizationSummary {
  monthly_payment: number;
  total_payments: number;
  total_principal: number;
  total_interest: number;
  principal_percent: number;
  interest_percent: number;
  payoff_date: string;
}

// ===========================================
// Exit Analysis
// ===========================================
export interface ExitAnalysis {
  hold_period_years: number;
  initial_value: number;
  appreciation_rate: number;
  projected_sale_price: number;

  // Sale costs
  broker_commission_percent: number;
  broker_commission: number;
  closing_costs_percent: number;
  closing_costs: number;
  total_sale_costs: number;

  // Payoff
  remaining_loan_balance: number;
  prepayment_penalty: number;

  // Proceeds
  gross_sale_proceeds: number;
  net_sale_proceeds: number;

  // Capital gains
  adjusted_cost_basis: number;
  accumulated_depreciation: number;
  total_gain: number;
  depreciation_recapture: number;
  depreciation_recapture_tax: number;
  capital_gain: number;
  capital_gains_tax_rate: number;
  capital_gains_tax: number;
  total_tax_on_sale: number;
  after_tax_proceeds: number;
}

// ===========================================
// Investment Returns
// ===========================================
export interface InvestmentReturns {
  irr: number;
  mirr?: number | null;
  total_cash_flows: number;
  total_distributions: number;
  equity_multiple: number;
  payback_period_months?: number | null;
  average_annual_return: number;
  cagr: number;
}

// ===========================================
// Sensitivity Scenario
// ===========================================
export interface SensitivityScenario {
  variable: string;
  change_percent: number;
  absolute_value: number;
  irr: number;
  cash_on_cash: number;
  net_profit: number;
}

// ===========================================
// Property Summary
// ===========================================
export interface ProformaPropertySummary {
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  year_built: number;
  lot_size: number;
}

// ===========================================
// Acquisition Details
// ===========================================
export interface AcquisitionDetails {
  purchase_price: number;
  list_price: number;
  discount_from_list: number;
  closing_costs: number;
  closing_costs_percent: number;
  inspection_costs: number;
  rehab_costs: number;
  total_acquisition_cost: number;
}

// ===========================================
// Financing Details
// ===========================================
export interface FinancingDetails {
  down_payment: number;
  down_payment_percent: number;
  loan_amount: number;
  interest_rate: number;
  loan_term_years: number;
  loan_type: string;
  monthly_payment: number;
  monthly_payment_with_escrow: number;
  total_interest_over_life: number;
  apr: number;
}

// ===========================================
// Income Details
// ===========================================
export interface IncomeDetails {
  monthly_rent: number;
  annual_gross_rent: number;
  other_income: number;
  vacancy_allowance: number;
  vacancy_percent: number;
  effective_gross_income: number;
}

// ===========================================
// Expense Details
// ===========================================
export interface ExpenseDetails {
  property_taxes: number;
  insurance: number;
  hoa_fees: number;
  management: number;
  management_percent: number;
  maintenance: number;
  maintenance_percent: number;
  utilities: number;
  landscaping: number;
  pest_control: number;
  cap_ex_reserve: number;
  cap_ex_reserve_percent: number;
  other_expenses: number;
  total_operating_expenses: number;
  expense_ratio: number;
}

// ===========================================
// Key Metrics
// ===========================================
export interface ProformaKeyMetrics {
  net_operating_income: number;
  annual_debt_service: number;
  annual_cash_flow: number;
  monthly_cash_flow: number;
  cap_rate: number;
  cash_on_cash_return: number;
  dscr: number;
  gross_rent_multiplier: number;
  one_percent_rule: number;
  break_even_occupancy: number;
  price_per_unit: number;
  price_per_sqft: number;
  rent_per_sqft: number;
}

// ===========================================
// Projections
// ===========================================
export interface Projections {
  hold_period_years: number;
  appreciation_rate: number;
  rent_growth_rate: number;
  expense_growth_rate: number;
  annual_projections: AnnualTaxProjection[];
  cumulative_cash_flow: number[];
  property_values: number[];
  equity_positions: number[];
  loan_balances: number[];
}

// ===========================================
// Deal Score Summary
// ===========================================
export interface DealScoreSummary {
  score: number;
  grade: string;
  verdict: string;
  breakeven_price: number;
  discount_required: number;
}

// ===========================================
// Data Sources
// ===========================================
export interface DataSources {
  rent_estimate_source: string;
  property_value_source: string;
  tax_data_source: string;
  market_data_source: string;
  data_freshness: string;
}

// ===========================================
// Sensitivity Analysis
// ===========================================
export interface SensitivityAnalysis {
  purchase_price: SensitivityScenario[];
  interest_rate: SensitivityScenario[];
  rent: SensitivityScenario[];
  vacancy: SensitivityScenario[];
  appreciation: SensitivityScenario[];
}

// ===========================================
// Financial Proforma (complete structure)
// ===========================================
export interface FinancialProforma {
  // Metadata
  generated_at: string;
  property_id: string;
  property_address: string;
  strategy_type: StrategyType;

  // Property Summary
  property: ProformaPropertySummary;

  // Acquisition
  acquisition: AcquisitionDetails;

  // Financing
  financing: FinancingDetails;

  // Income (Year 1)
  income: IncomeDetails;

  // Operating Expenses (Year 1)
  expenses: ExpenseDetails;

  // Key Metrics
  metrics: ProformaKeyMetrics;

  // Depreciation & Tax
  depreciation: DepreciationConfig;

  // Multi-Year Projections
  projections: Projections;

  // Amortization
  amortization_schedule: AmortizationRow[];
  amortization_summary: AmortizationSummary;

  // Exit Analysis
  exit: ExitAnalysis;

  // Investment Returns
  returns: InvestmentReturns;

  // Sensitivity Analysis
  sensitivity: SensitivityAnalysis;

  // Deal Score
  deal_score: DealScoreSummary;

  // Data Sources
  sources: DataSources;
}

// ===========================================
// Proforma Request
// ===========================================
export interface ProformaRequest {
  property_id: string;
  address: string;
  strategy: StrategyType;

  // Optional overrides
  purchase_price?: number | null;
  monthly_rent?: number | null;

  // Tax configuration
  land_value_percent: number;
  marginal_tax_rate: number;
  capital_gains_tax_rate: number;

  // Projection settings
  hold_period_years: number;

  // Export format
  format: ProformaFormat;
}

// ===========================================
// Proforma Export Response
// ===========================================
export interface ProformaExportResponse {
  proforma_id: string;
  property_id: string;
  strategy: StrategyType;
  generated_at: string;
  download_url?: string | null;
  expires_at?: string | null;
  format: string;
  file_size_bytes?: number | null;
}

// ===========================================
// Proforma Defaults (matches frontend PROFORMA_DEFAULTS)
// ===========================================
export const PROFORMA_DEFAULTS = {
  land_value_percent: 0.20,
  marginal_tax_rate: 0.24,
  capital_gains_tax_rate: 0.15,
  hold_period_years: 10,
  depreciation_years_residential: 27.5,
  depreciation_years_commercial: 39,
  broker_commission_percent: 0.06,
  seller_closing_costs_percent: 0.015,
  cap_ex_reserve_percent: 0.05,
  depreciation_recapture_rate: 0.25,
} as const;
