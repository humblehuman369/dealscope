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

/**
 * Normalize the backend response which uses camelCase aliases
 * and nested objects for opportunity/return_rating into a flat shape.
 */
function normalizeVerdict(raw: any): VerdictResponse {
  return {
    deal_score: raw.dealScore ?? raw.deal_score ?? 0,
    deal_verdict: raw.dealVerdict ?? raw.deal_verdict ?? 'Unknown',
    verdict_description: raw.verdictDescription ?? raw.verdict_description ?? '',
    discount_percent: raw.discountPercent ?? raw.discount_percent ?? null,
    strategies: raw.strategies ?? [],
    purchase_price: raw.purchasePrice ?? raw.purchase_price ?? null,
    income_value: raw.incomeValue ?? raw.income_value ?? null,
    list_price: raw.listPrice ?? raw.list_price ?? null,
    opportunity: typeof raw.opportunity === 'string'
      ? raw.opportunity
      : raw.opportunity?.label ?? raw.opportunity?.grade ?? null,
    opportunity_factors: normalizeFactors(raw.opportunityFactors ?? raw.opportunity_factors),
    return_rating: typeof raw.returnRating === 'string'
      ? raw.returnRating
      : typeof raw.return_rating === 'string'
        ? raw.return_rating
        : raw.returnRating?.label ?? raw.return_rating?.label ?? null,
    return_factors: normalizeFactors(raw.returnFactors ?? raw.return_factors),
    income_gap_amount: raw.incomeGapAmount ?? raw.income_gap_amount ?? null,
    income_gap_percent: raw.incomeGapPercent ?? raw.income_gap_percent ?? null,
    deal_gap_amount: raw.dealGapAmount ?? raw.deal_gap_amount ?? null,
    deal_gap_percent: raw.dealGapPercent ?? raw.deal_gap_percent ?? null,
    deal_gap_score: raw.dealGapScore ?? raw.deal_gap_score ?? null,
    wholesale_mao: raw.wholesaleMao ?? raw.wholesale_mao ?? null,
    deal_narrative: raw.dealNarrative ?? raw.deal_narrative ?? null,
  };
}

function normalizeFactors(factors: any): string[] {
  if (!factors) return [];
  if (Array.isArray(factors)) return factors.filter((f: any) => typeof f === 'string');
  if (typeof factors === 'object') {
    return Object.entries(factors)
      .filter(([_, v]) => v != null && v !== false && v !== 0)
      .map(([k, v]) => {
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return `${k}: ${v}`;
        return k;
      });
  }
  return [];
}

export function useVerdict(property: PropertyResponse | undefined) {
  return useQuery<VerdictResponse>({
    queryKey: ['verdict', property?.property_id],
    queryFn: async () => {
      const input = buildVerdictInput(property!);
      const { data } = await api.post('/api/v1/analysis/verdict', input);
      return normalizeVerdict(data);
    },
    enabled: !!property,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
