import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { usePropertyData } from './usePropertyData';
import type { PropertyResponse, IQVerdictResponse } from '@dealscope/shared';

/**
 * Normalize the verdict API response to snake_case to match IQVerdictResponse.
 * The backend serializes with camelCase aliases via Pydantic's alias_generator,
 * so we may receive either casing.
 */
function normalizeVerdict(raw: Record<string, unknown>): IQVerdictResponse {
  return {
    deal_score: (raw.deal_score ?? raw.dealScore ?? 0) as number,
    deal_verdict: (raw.deal_verdict ?? raw.dealVerdict ?? '') as string,
    verdict_description: (raw.verdict_description ?? raw.verdictDescription ?? '') as string,
    discount_percent: (raw.discount_percent ?? raw.discountPercent ?? 0) as number,
    purchase_price: (raw.purchase_price ?? raw.purchasePrice ?? 0) as number,
    income_value: (raw.income_value ?? raw.incomeValue ?? 0) as number,
    list_price: (raw.list_price ?? raw.listPrice ?? 0) as number,
    inputs_used: (raw.inputs_used ?? raw.inputsUsed ?? {}) as Record<string, unknown>,
    defaults_used: (raw.defaults_used ?? raw.defaultsUsed ?? {}) as Record<string, Record<string, number>>,
    opportunity: (raw.opportunity ?? {}) as IQVerdictResponse['opportunity'],
    opportunity_factors: (raw.opportunity_factors ?? raw.opportunityFactors ?? {}) as IQVerdictResponse['opportunity_factors'],
    return_rating: (raw.return_rating ?? raw.returnRating ?? {}) as IQVerdictResponse['return_rating'],
    return_factors: (raw.return_factors ?? raw.returnFactors ?? {}) as IQVerdictResponse['return_factors'],
    income_gap_amount: (raw.income_gap_amount ?? raw.incomeGapAmount ?? 0) as number,
    income_gap_percent: (raw.income_gap_percent ?? raw.incomeGapPercent ?? 0) as number,
    pricing_quality_tier: (raw.pricing_quality_tier ?? raw.pricingQualityTier ?? '') as string,
    deal_gap_amount: (raw.deal_gap_amount ?? raw.dealGapAmount ?? 0) as number,
    deal_gap_percent: (raw.deal_gap_percent ?? raw.dealGapPercent ?? 0) as number,
    wholesale_mao: (raw.wholesale_mao ?? raw.wholesaleMao ?? null) as number | null,
    strategies: (raw.strategies ?? []) as IQVerdictResponse['strategies'],
    deal_factors: (raw.deal_factors ?? raw.dealFactors ?? []) as IQVerdictResponse['deal_factors'],
    discount_bracket_label: (raw.discount_bracket_label ?? raw.discountBracketLabel ?? '') as string,
    deal_narrative: (raw.deal_narrative ?? raw.dealNarrative ?? null) as string | null,
  };
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

  return useQuery<IQVerdictResponse>({
    queryKey: ['verdict', address],
    queryFn: async () => {
      if (!property) throw new Error('Property data not available');
      const body = buildVerdictBody(property);
      const { data } = await api.post<Record<string, unknown>>(
        '/api/v1/analysis/verdict',
        body,
      );
      return normalizeVerdict(data);
    },
    enabled: !!address && !!property,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
