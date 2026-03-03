import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

export interface StrategyResult {
  id: string;
  name: string;
  metric: string;
  metric_label: string;
  metric_value: number | null;
  score: number;
  rank: number;
  badge: string | null;
  cap_rate: number | null;
  cash_on_cash: number | null;
  dscr: number | null;
  annual_cash_flow: number | null;
  monthly_cash_flow: number | null;
}

export interface VerdictResponse {
  deal_score: number;
  deal_verdict: string;
  verdict_description: string;
  discount_percent: number | null;
  strategies: StrategyResult[];
  purchase_price: number | null;
  income_value: number | null;
  list_price: number | null;
  opportunity: string | null;
  opportunity_factors: string[];
  return_rating: string | null;
  return_factors: string[];
  income_gap_amount: number | null;
  income_gap_percent: number | null;
  deal_gap_amount: number | null;
  deal_gap_percent: number | null;
  deal_gap_score: number | null;
  wholesale_mao: number | null;
  deal_narrative: string | null;
}

function buildVerdictInput(property: PropertyResponse) {
  const v = property.valuations;
  const r = property.rentals;
  const m = property.market;
  const d = property.details;
  const l = property.listing;

  return {
    list_price: v.market_price ?? v.value_iq_estimate ?? v.zestimate,
    purchase_price: v.market_price ?? v.value_iq_estimate ?? v.zestimate,
    monthly_rent: r.monthly_rent_ltr,
    property_taxes: m.property_taxes_annual ? m.property_taxes_annual / 12 : null,
    insurance: null,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    sqft: d.square_footage,
    arv: v.arv ?? v.value_iq_estimate,
    average_daily_rate: r.average_daily_rate,
    occupancy_rate: r.occupancy_rate,
    listing_status: l?.listing_status ?? null,
    zestimate: v.zestimate,
    current_value_avm: v.current_value_avm,
    tax_assessed_value: v.tax_assessed_value,
    is_listed: l?.listing_status === 'active',
    days_on_market: l?.days_on_market ?? null,
  };
}

export function useVerdict(property: PropertyResponse | undefined) {
  return useQuery<VerdictResponse>({
    queryKey: ['verdict', property?.property_id],
    queryFn: async () => {
      const input = buildVerdictInput(property!);
      const { data } = await api.post<VerdictResponse>(
        '/api/v1/analysis/verdict',
        input,
      );
      return data;
    },
    enabled: !!property,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
