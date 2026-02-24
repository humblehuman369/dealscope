/**
 * Worksheet Types — Single Source of Truth
 *
 * WorksheetMetrics represents the backend-calculated worksheet result.
 * Both frontend and mobile define this identically — this shared definition
 * prevents drift.
 *
 * Field names use snake_case to match the backend worksheet calculation
 * response payload.
 */

export interface WorksheetMetrics {
  gross_income: number;
  annual_gross_rent: number;
  vacancy_loss: number;
  gross_expenses: number;
  property_taxes: number;
  insurance: number;
  property_management: number;
  maintenance: number;
  maintenance_only: number;
  capex: number;
  hoa_fees: number;
  loan_amount: number;
  down_payment: number;
  closing_costs: number;
  monthly_payment: number;
  annual_debt_service: number;
  noi: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  cap_rate: number;
  cash_on_cash_return: number;
  dscr: number;
  grm: number;
  one_percent_rule: number;
  arv: number;
  arv_psf: number;
  price_psf: number;
  rehab_psf: number;
  equity: number;
  equity_after_rehab: number;
  mao: number;
  total_cash_needed: number;
  ltv: number;
  deal_score: number;
}
