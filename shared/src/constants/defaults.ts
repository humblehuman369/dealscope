/**
 * Default Assumptions — Single Source of Truth
 *
 * Default financial assumptions for all strategies.
 * Matches backend/app/core/defaults.py.
 *
 * All rates are stored as decimals (0.06 = 6%).
 * Frontend/mobile convert to whole-number percentages for display.
 */

// =============================================================================
// DEFAULT ASSUMPTIONS
// =============================================================================

export const DEFAULT_ASSUMPTIONS = {
  financing: {
    purchase_price: null as number | null,
    down_payment_pct: 0.20,
    interest_rate: 0.06,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
  },
  operating: {
    vacancy_rate: 0.01,
    property_management_pct: 0.00,
    maintenance_pct: 0.05,
    insurance_pct: 0.01,
    utilities_monthly: 100,
    landscaping_annual: 0,
    pest_control_annual: 200,
  },
  ltr: {
    buy_discount_pct: 0.05,
  },
  str: {
    platform_fees_pct: 0.15,
    str_management_pct: 0.10,
    cleaning_cost_per_turnover: 150,
    cleaning_fee_revenue: 75,
    avg_length_of_stay_days: 6,
    supplies_monthly: 100,
    additional_utilities_monthly: 0,
    furniture_setup_cost: 6000,
    str_insurance_pct: 0.01,
    buy_discount_pct: 0.05,
  },
  rehab: {
    renovation_budget_pct: 0.05,
    contingency_pct: 0.05,
    holding_period_months: 4,
    holding_costs_pct: 0.01,
  },
  brrrr: {
    buy_discount_pct: 0.05,
    refinance_ltv: 0.75,
    refinance_interest_rate: 0.06,
    refinance_term_years: 30,
    refinance_closing_costs_pct: 0.03,
    post_rehab_rent_increase_pct: 0.10,
  },
  flip: {
    hard_money_ltv: 0.90,
    hard_money_rate: 0.12,
    selling_costs_pct: 0.06,
    holding_period_months: 6,
  },
  house_hack: {
    fha_down_payment_pct: 0.035,
    fha_mip_rate: 0.0085,
    units_rented_out: 2,
    buy_discount_pct: 0.05,
  },
  wholesale: {
    assignment_fee: 15000,
    marketing_costs: 500,
    earnest_money_deposit: 1000,
    days_to_close: 45,
    target_purchase_discount_pct: 0.30,
  },
  appreciation_rate: 0.05,
  rent_growth_rate: 0.05,
  expense_growth_rate: 0.03,
} as const;

// =============================================================================
// PROFORMA DEFAULTS
// =============================================================================

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

// =============================================================================
// CALCULATION CONSTANTS
// =============================================================================

export const CALC_CONSTANTS = {
  /** Default buy discount for IQ Target calculations */
  DEFAULT_BUY_DISCOUNT_PCT: 0.05,
  /** Debounce delay for worksheet calculations (ms) */
  CALC_DEBOUNCE_MS: 200,
  /** Debounce delay for auto-save (ms) */
  SAVE_DEBOUNCE_MS: 2000,
  /** Target monthly cash flow for max purchase price calculation */
  TARGET_MONTHLY_CASH_FLOW: 200,
  /** Maximum iterations for binary search calculations */
  MAX_ITERATIONS: 100,
} as const;
