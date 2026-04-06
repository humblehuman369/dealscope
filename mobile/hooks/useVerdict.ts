import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { usePropertyData } from './usePropertyData';
import type { PropertyResponse, IQVerdictResponse } from '@dealscope/shared';

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
      const { data } = await api.post<IQVerdictResponse>(
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
