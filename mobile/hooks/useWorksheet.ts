import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

export interface WorksheetData {
  strategy_id: string;
  purchase_price: number;
  monthly_rent: number;
  down_payment: number;
  loan_amount: number;
  monthly_mortgage: number;
  monthly_expenses: number;
  vacancy_cost: number;
  management_cost: number;
  maintenance_cost: number;
  insurance_cost: number;
  property_taxes_monthly: number;
  monthly_cash_flow: number;
  annual_cash_flow: number;
  noi: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  total_cash_needed: number;
  [key: string]: any;
}

const STRATEGY_ENDPOINTS: Record<string, string> = {
  ltr: '/api/v1/worksheet/ltr/calculate',
  str: '/api/v1/worksheet/str/calculate',
  brrrr: '/api/v1/worksheet/brrrr/calculate',
  flip: '/api/v1/worksheet/flip/calculate',
  house_hack: '/api/v1/worksheet/househack/calculate',
  wholesale: '/api/v1/worksheet/wholesale/calculate',
};

function buildInput(property: PropertyResponse, strategyId: string) {
  const v = property.valuations;
  const r = property.rentals;
  const m = property.market;
  const d = property.details;

  const purchasePrice = v.market_price ?? v.value_iq_estimate ?? v.zestimate ?? 0;
  const monthlyRent = r.monthly_rent_ltr ?? 0;
  const propertyTaxes = m.property_taxes_annual ?? 0;
  const arv = v.arv ?? v.value_iq_estimate ?? purchasePrice;

  const base = {
    purchase_price: purchasePrice,
    monthly_rent: monthlyRent,
    property_taxes_annual: propertyTaxes,
    insurance_annual: null,
    arv,
    sqft: d.square_footage ?? null,
  };

  switch (strategyId) {
    case 'str':
      return {
        ...base,
        average_daily_rate: r.average_daily_rate ?? Math.round(monthlyRent / 20),
        occupancy_rate: r.occupancy_rate ?? 0.75,
      };
    case 'brrrr':
      return {
        ...base,
        rehab_costs: 0,
        purchase_costs: 0,
      };
    case 'flip':
      return {
        ...base,
        rehab_costs: 0,
        purchase_costs: 0,
        inspection_costs: 500,
      };
    case 'house_hack':
      return {
        ...base,
        unit_rents: [monthlyRent],
        owner_market_rent: monthlyRent,
      };
    case 'wholesale':
      return {
        ...base,
        contract_price: Math.round(purchasePrice * 0.7),
        investor_price: Math.round(purchasePrice * 0.75),
        rehab_costs: 0,
        marketing_costs: 500,
        earnest_money: 1000,
        tax_rate: 0.25,
      };
    default:
      return base;
  }
}

function normalizeResponse(raw: any, strategyId: string): WorksheetData {
  return {
    strategy_id: strategyId,
    purchase_price: raw.purchase_price ?? raw.purchasePrice ?? 0,
    monthly_rent: raw.monthly_rent ?? raw.monthlyRent ?? 0,
    down_payment: raw.down_payment ?? raw.downPayment ?? 0,
    loan_amount: raw.loan_amount ?? raw.loanAmount ?? 0,
    monthly_mortgage: raw.monthly_mortgage ?? raw.monthlyMortgage ?? raw.mortgage_payment ?? 0,
    monthly_expenses: raw.monthly_expenses ?? raw.total_monthly_expenses ?? 0,
    vacancy_cost: raw.vacancy_cost ?? raw.vacancy ?? 0,
    management_cost: raw.management_cost ?? raw.property_management ?? 0,
    maintenance_cost: raw.maintenance_cost ?? raw.maintenance ?? 0,
    insurance_cost: raw.insurance_cost ?? raw.insurance_monthly ?? 0,
    property_taxes_monthly: raw.property_taxes_monthly ?? raw.taxes_monthly ?? 0,
    monthly_cash_flow: raw.monthly_cash_flow ?? raw.cashFlow ?? 0,
    annual_cash_flow: raw.annual_cash_flow ?? raw.annualCashFlow ?? (raw.monthly_cash_flow ?? 0) * 12,
    noi: raw.noi ?? raw.net_operating_income ?? 0,
    cash_on_cash: raw.cash_on_cash ?? raw.cashOnCash ?? 0,
    cap_rate: raw.cap_rate ?? raw.capRate ?? 0,
    dscr: raw.dscr ?? raw.debt_service_coverage_ratio ?? 0,
    total_cash_needed: raw.total_cash_needed ?? raw.totalCashNeeded ?? raw.cash_to_close ?? 0,
    ...raw,
  };
}

export function useWorksheet(
  property: PropertyResponse | undefined,
  strategyId: string | undefined,
) {
  return useQuery<WorksheetData>({
    queryKey: ['worksheet', property?.property_id, strategyId],
    queryFn: async () => {
      const endpoint = STRATEGY_ENDPOINTS[strategyId!];
      if (!endpoint) {
        throw new Error(`Unknown strategy: ${strategyId}`);
      }

      const input = buildInput(property!, strategyId!);
      const { data } = await api.post(endpoint, input);
      return normalizeResponse(data, strategyId!);
    },
    enabled: !!property && !!strategyId && !!STRATEGY_ENDPOINTS[strategyId!],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
