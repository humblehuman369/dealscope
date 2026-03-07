import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { usePropertyData } from './usePropertyData';
import type { PropertyResponse } from '@dealscope/shared';

export interface VerdictAnalysis {
  deal_score: number;
  deal_verdict: string;
  verdict_description: string;
  discount_percent: number;
  purchase_price: number;
  income_value: number;
  list_price: number;
  income_gap_percent: number;
  income_gap_amount: number;
  deal_gap_percent: number;
  deal_gap_amount: number;
  deal_narrative: string;
  discount_bracket_label: string;
  wholesale_price?: number;
  strategies: Record<string, StrategyResult>;
  deal_factors: DealFactor[];
  opportunity_factors?: OpportunityFactors;
  return_factors?: ReturnFactors;
  component_scores?: Record<string, number>;
}

export interface StrategyResult {
  strategy_id: string;
  strategy_name: string;
  deal_score: number;
  verdict: string;
  monthly_cash_flow: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  annual_noi: number;
  cash_needed: number;
  total_roi_5yr?: number;
  annual_roi?: number;
}

export interface DealFactor {
  label: string;
  value: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface OpportunityFactors {
  deal_gap: number;
  motivation: number;
  motivation_label: string;
  days_on_market: number;
  buyer_market: boolean;
  distressed_sale: boolean;
}

export interface ReturnFactors {
  capRate: number;
  cashOnCash: number;
  dscr: number;
  annualRoi: number;
  annualProfit: number;
}

function buildVerdictBody(property: PropertyResponse) {
  const listPrice = property.listing?.list_price
    ?? property.valuations?.value_iq_estimate
    ?? property.valuations?.zestimate
    ?? property.valuations?.market_price
    ?? 0;

  const monthlyRent = property.rentals?.monthly_rent_ltr
    ?? property.rentals?.rental_stats?.iq_estimate
    ?? 0;

  const taxes = property.market?.property_taxes_annual ?? undefined;
  const insurance = undefined;
  const isListed = property.listing?.listing_status
    ? !property.listing.is_off_market
    : true;

  return {
    list_price: listPrice,
    monthly_rent: monthlyRent,
    property_taxes: taxes,
    insurance,
    bedrooms: property.details?.bedrooms ?? undefined,
    bathrooms: property.details?.bathrooms ?? undefined,
    sqft: property.details?.square_footage ?? undefined,
    arv: property.valuations?.arv ?? undefined,
    average_daily_rate: property.rentals?.average_daily_rate ?? undefined,
    occupancy_rate: property.rentals?.occupancy_rate ?? undefined,
    is_listed: isListed,
    zestimate: property.valuations?.zestimate ?? undefined,
    current_value_avm: property.valuations?.current_value_avm ?? undefined,
    tax_assessed_value: property.valuations?.tax_assessed_value ?? undefined,
    listing_status: property.listing?.listing_status ?? undefined,
    days_on_market: property.listing?.days_on_market ?? undefined,
    seller_type: property.listing?.seller_type ?? undefined,
    is_foreclosure: property.listing?.is_foreclosure ?? false,
    is_bank_owned: property.listing?.is_bank_owned ?? false,
    is_fsbo: property.listing?.is_fsbo ?? false,
    market_temperature: property.market?.market_stats?.market_temperature ?? undefined,
  };
}

export function useVerdict(address: string | undefined) {
  const { getCached } = usePropertyData();
  const property = address ? getCached(address) : undefined;

  return useQuery<VerdictAnalysis>({
    queryKey: ['verdict', address],
    queryFn: async () => {
      if (!property) throw new Error('Property data not available');
      const body = buildVerdictBody(property);
      const { data } = await api.post<VerdictAnalysis>(
        '/api/v1/analysis/verdict',
        body,
      );
      return data;
    },
    enabled: !!address && !!property,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
