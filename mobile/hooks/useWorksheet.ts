import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface WorksheetResult {
  strategy_id: string;
  deal_score: number;
  verdict: string;
  purchase_price: number;
  down_payment: number;
  down_payment_pct: number;
  loan_amount: number;
  interest_rate: number;
  loan_term_years: number;
  monthly_pi: number;
  monthly_rent: number;
  gross_scheduled_rent: number;
  vacancy_allowance: number;
  effective_gross_income: number;
  property_taxes: number;
  insurance: number;
  hoa: number;
  management: number;
  maintenance: number;
  capex: number;
  total_operating_expenses: number;
  noi: number;
  annual_debt_service: number;
  pre_tax_cash_flow: number;
  monthly_cash_flow: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  cash_needed: number;
  expense_ratio: number;
  breakeven_occupancy: number;
  total_roi_5yr?: number;
  annual_roi?: number;
  rehab_budget?: number;
  arv?: number;
  refinance_ltv?: number;
  post_refi_cash_flow?: number;
  equity_created?: number;
  cash_recoup_pct?: number;
  net_profit?: number;
  holding_costs?: number;
  selling_costs?: number;
  assignment_fee?: number;
  mao?: number;
  effective_housing_cost?: number;
  cost_reduction_pct?: number;
  adr?: number;
  occupancy_rate?: number;
  revpar?: number;
}

const ENDPOINT_MAP: Record<string, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

export function useWorksheet(address: string | undefined, strategyId: string) {
  const endpoint = ENDPOINT_MAP[strategyId] ?? ENDPOINT_MAP.ltr;

  return useQuery<WorksheetResult>({
    queryKey: ['worksheet', address, strategyId],
    queryFn: async () => {
      const { data } = await api.post<WorksheetResult>(endpoint, { address });
      return data;
    },
    enabled: !!address,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
