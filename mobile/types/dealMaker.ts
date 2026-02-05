/**
 * DealMakerRecord types - matching backend schemas/deal_maker.py exactly
 *
 * The DealMakerRecord is the heart of the analysis engine. It combines:
 * 1. Property data from API at search time (immutable)
 * 2. Resolved default assumptions at first view (immutable snapshot)
 * 3. User adjustments via Deal Maker (mutable)
 * 4. Cached computed metrics (recalculated on edit)
 */

import { StrategyType } from './api';

// ===========================================
// Initial Assumptions (locked at creation)
// ===========================================
export interface InitialAssumptions {
  // Financing
  down_payment_pct: number;
  closing_costs_pct: number;
  interest_rate: number;
  loan_term_years: number;

  // Operating
  vacancy_rate: number;
  maintenance_pct: number;
  management_pct: number;
  insurance_pct: number;
  capex_pct: number;

  // Growth
  appreciation_rate: number;
  rent_growth_rate: number;
  expense_growth_rate: number;

  // Strategy-specific (optional)
  str_defaults?: Record<string, unknown> | null;
  brrrr_defaults?: Record<string, unknown> | null;
  flip_defaults?: Record<string, unknown> | null;

  // Metadata
  resolved_at?: string | null;
  zip_code?: string | null;
  market_region?: string | null;
}

// ===========================================
// Cached Metrics (computed on every change)
// ===========================================
export interface CachedMetrics {
  // Core metrics
  cap_rate?: number | null;
  cash_on_cash?: number | null;
  monthly_cash_flow?: number | null;
  annual_cash_flow?: number | null;

  // Financing
  loan_amount?: number | null;
  down_payment?: number | null;
  closing_costs?: number | null;
  monthly_payment?: number | null;
  total_cash_needed?: number | null;

  // NOI components
  gross_income?: number | null;
  vacancy_loss?: number | null;
  total_expenses?: number | null;
  noi?: number | null;

  // Ratios
  dscr?: number | null;
  ltv?: number | null;
  one_percent_rule?: number | null;
  grm?: number | null;

  // Equity
  equity?: number | null;
  equity_after_rehab?: number | null;

  // Deal analysis
  deal_gap_pct?: number | null;
  breakeven_price?: number | null;

  // Metadata
  calculated_at?: string | null;
}

// ===========================================
// Deal Maker Record (central data structure)
// ===========================================
export interface DealMakerRecord {
  // === Property Data (from API at search time) ===
  list_price: number;
  rent_estimate: number;
  property_taxes: number;
  insurance: number;
  arv_estimate?: number | null;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  property_type?: string | null;

  // === Initial Assumptions (locked at creation) ===
  initial_assumptions: InitialAssumptions;

  // === User Adjustments (editable via Deal Maker) ===

  // Purchase
  buy_price: number;
  down_payment_pct: number;
  closing_costs_pct: number;

  // Financing
  interest_rate: number;
  loan_term_years: number;

  // Rehab & Valuation
  rehab_budget: number;
  arv: number;

  // Income
  monthly_rent: number;
  other_income: number;

  // Operating Expenses (rates)
  vacancy_rate: number;
  maintenance_pct: number;
  management_pct: number;
  capex_pct: number;

  // Operating Expenses (fixed)
  annual_property_tax: number;
  annual_insurance: number;
  monthly_hoa: number;
  monthly_utilities: number;

  // === STR-Specific Fields ===
  furniture_setup_cost?: number | null;
  average_daily_rate?: number | null;
  occupancy_rate?: number | null;
  cleaning_fee_revenue?: number | null;
  avg_length_of_stay_days?: number | null;
  platform_fee_rate?: number | null;
  str_management_rate?: number | null;
  cleaning_cost_per_turnover?: number | null;
  supplies_monthly?: number | null;
  additional_utilities_monthly?: number | null;

  // === BRRRR-Specific Fields ===
  buy_discount_pct?: number | null;
  hard_money_rate?: number | null;
  contingency_pct?: number | null;
  holding_period_months?: number | null;
  holding_costs_monthly?: number | null;
  post_rehab_monthly_rent?: number | null;
  post_rehab_rent_increase_pct?: number | null;
  refinance_ltv?: number | null;
  refinance_interest_rate?: number | null;
  refinance_term_years?: number | null;
  refinance_closing_costs_pct?: number | null;

  // === Flip-Specific Fields ===
  purchase_discount_pct?: number | null;
  financing_type?: string | null;
  hard_money_ltv?: number | null;
  loan_points?: number | null;
  rehab_time_months?: number | null;
  days_on_market?: number | null;
  selling_costs_pct?: number | null;
  capital_gains_rate?: number | null;

  // === HouseHack-Specific Fields ===
  total_units?: number | null;
  owner_occupied_units?: number | null;
  owner_unit_market_rent?: number | null;
  loan_type?: string | null;
  pmi_rate?: number | null;
  avg_rent_per_unit?: number | null;
  current_housing_payment?: number | null;
  utilities_monthly?: number | null;
  capex_rate?: number | null;

  // === Wholesale-Specific Fields ===
  estimated_repairs?: number | null;
  contract_price?: number | null;
  earnest_money?: number | null;
  inspection_period_days?: number | null;
  days_to_close?: number | null;
  assignment_fee?: number | null;
  marketing_costs?: number | null;
  wholesale_closing_costs?: number | null;

  // Strategy type
  strategy_type?: StrategyType | null;

  // === Cached Metrics ===
  cached_metrics?: CachedMetrics | null;

  // === Metadata ===
  created_at?: string | null;
  updated_at?: string | null;
  version: number;
}

// ===========================================
// Deal Maker Record Create
// ===========================================
export interface DealMakerRecordCreate {
  list_price: number;
  rent_estimate: number;
  property_taxes?: number | null;
  insurance?: number | null;
  arv_estimate?: number | null;
  sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  property_type?: string | null;
  zip_code?: string | null;
  buy_price?: number | null;
  monthly_rent?: number | null;
}

// ===========================================
// Deal Maker Record Update (user-adjustable fields only)
// ===========================================
export interface DealMakerRecordUpdate {
  // Purchase
  buy_price?: number | null;
  down_payment_pct?: number | null;
  closing_costs_pct?: number | null;

  // Financing
  interest_rate?: number | null;
  loan_term_years?: number | null;

  // Rehab & Valuation
  rehab_budget?: number | null;
  arv?: number | null;

  // Income
  monthly_rent?: number | null;
  other_income?: number | null;

  // Operating Expenses (rates)
  vacancy_rate?: number | null;
  maintenance_pct?: number | null;
  management_pct?: number | null;
  capex_pct?: number | null;

  // Operating Expenses (fixed)
  annual_property_tax?: number | null;
  annual_insurance?: number | null;
  monthly_hoa?: number | null;
  monthly_utilities?: number | null;

  // STR-Specific Fields
  furniture_setup_cost?: number | null;
  average_daily_rate?: number | null;
  occupancy_rate?: number | null;
  cleaning_fee_revenue?: number | null;
  avg_length_of_stay_days?: number | null;
  platform_fee_rate?: number | null;
  str_management_rate?: number | null;
  cleaning_cost_per_turnover?: number | null;
  supplies_monthly?: number | null;
  additional_utilities_monthly?: number | null;

  // BRRRR-Specific Fields
  buy_discount_pct?: number | null;
  hard_money_rate?: number | null;
  contingency_pct?: number | null;
  holding_period_months?: number | null;
  holding_costs_monthly?: number | null;
  post_rehab_monthly_rent?: number | null;
  post_rehab_rent_increase_pct?: number | null;
  refinance_ltv?: number | null;
  refinance_interest_rate?: number | null;
  refinance_term_years?: number | null;
  refinance_closing_costs_pct?: number | null;

  // Flip-Specific Fields
  purchase_discount_pct?: number | null;
  financing_type?: string | null;
  hard_money_ltv?: number | null;
  loan_points?: number | null;
  rehab_time_months?: number | null;
  days_on_market?: number | null;
  selling_costs_pct?: number | null;
  capital_gains_rate?: number | null;

  // HouseHack-Specific Fields
  total_units?: number | null;
  owner_occupied_units?: number | null;
  owner_unit_market_rent?: number | null;
  loan_type?: string | null;
  pmi_rate?: number | null;
  avg_rent_per_unit?: number | null;
  current_housing_payment?: number | null;
  utilities_monthly?: number | null;
  capex_rate?: number | null;

  // Wholesale-Specific Fields
  estimated_repairs?: number | null;
  contract_price?: number | null;
  earnest_money?: number | null;
  inspection_period_days?: number | null;
  days_to_close?: number | null;
  assignment_fee?: number | null;
  marketing_costs?: number | null;
  wholesale_closing_costs?: number | null;

  // Strategy type
  strategy_type?: StrategyType | null;
}

// ===========================================
// Deal Maker Response
// ===========================================
export interface DealMakerResponse {
  record: DealMakerRecord;

  // Convenience fields for UI
  cash_needed?: number | null;
  deal_gap?: number | null;
  annual_profit?: number | null;
  cap_rate?: number | null;
  coc_return?: number | null;
  monthly_payment?: number | null;
}
