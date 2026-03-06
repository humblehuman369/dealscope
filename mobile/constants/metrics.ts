/**
 * Metric definitions and tooltip content — matches frontend
 * frontend/src/config/strategyMetrics.ts + AdminAssumptions FIELD_DESCRIPTIONS
 */

export interface MetricDefinition {
  id: string;
  label: string;
  format: 'currency' | 'currencyMonthly' | 'percent' | 'percentInt' | 'number';
  description: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  cashFlow: { id: 'cashFlow', label: 'Cash Flow', format: 'currencyMonthly', description: 'Monthly cash flow after all expenses' },
  cashNeeded: { id: 'cashNeeded', label: 'Cash Needed', format: 'currency', description: 'Total cash required to close' },
  capRate: { id: 'capRate', label: 'Cap Rate', format: 'percent', description: 'Capitalization rate (NOI / Purchase Price)' },
  occupancy: { id: 'occupancy', label: 'Break-Even Occ.', format: 'percentInt', description: 'Minimum occupancy to break even' },
  revpar: { id: 'revpar', label: 'RevPAR', format: 'currency', description: 'Revenue per available room' },
  cashRecoup: { id: 'cashRecoup', label: 'Cash Recoup', format: 'percent', description: 'Percentage of cash recovered at refinance' },
  equityCreated: { id: 'equityCreated', label: 'Equity Created', format: 'currency', description: 'Equity position after rehab and refinance' },
  postRefiCashFlow: { id: 'postRefiCashFlow', label: 'Post-Refi Cash Flow', format: 'currencyMonthly', description: 'Monthly cash flow after refinancing' },
  cashLeftInDeal: { id: 'cashLeftInDeal', label: 'Cash Left in Deal', format: 'currency', description: 'Cash remaining after refinance' },
  netProfit: { id: 'netProfit', label: 'Net Profit', format: 'currency', description: 'Total profit after all costs' },
  roi: { id: 'roi', label: 'ROI', format: 'percent', description: 'Return on investment' },
  annualizedRoi: { id: 'annualizedRoi', label: 'Annualized ROI', format: 'percent', description: 'Return on investment annualized' },
  assignmentFee: { id: 'assignmentFee', label: 'Assignment Fee', format: 'currency', description: 'Fee earned by assigning the contract' },
};

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  down_payment_pct: 'Standard down payment as a percentage of purchase price',
  interest_rate: 'Conventional mortgage interest rate',
  loan_term_years: 'Standard mortgage term in years',
  closing_costs_pct: 'Buyer closing costs as a percentage of purchase price',
  vacancy_rate: 'Expected vacancy loss as a percentage of gross rent',
  property_management_pct: 'Property management fee as a percentage of gross rent',
  maintenance_pct: 'Annual maintenance reserve as a percentage of gross rent',
  insurance_pct: 'Annual insurance as a percentage of purchase price',
  platform_fees_pct: 'Airbnb/VRBO platform fees as a percentage of revenue',
  str_management_pct: 'STR property management as a percentage of revenue',
  renovation_budget_pct: 'Renovation budget as a percentage of ARV',
  contingency_pct: 'Contingency reserve as a percentage of rehab budget',
  holding_period_months: 'Expected rehab duration in months',
  buy_discount_pct: 'Purchase discount below breakeven price',
  refinance_ltv: 'Refinance loan-to-value ratio',
  hard_money_rate: 'Hard money loan annual interest rate',
  selling_costs_pct: 'Total selling costs as a percentage of sale price',
  fha_down_payment_pct: 'FHA loan minimum down payment percentage',
  assignment_fee: 'Default assignment fee in dollars',
  appreciation_rate: 'Annual property value appreciation rate',
  rent_growth_rate: 'Annual rent growth rate',
};
