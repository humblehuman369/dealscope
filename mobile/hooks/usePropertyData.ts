import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

function finiteOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function validatePropertyResponse(data: PropertyResponse): PropertyResponse {
  const v = data.valuations as Record<string, any> | undefined;
  if (v) {
    for (const k of [
      'zestimate',
      'current_value_avm',
      'market_price',
      'tax_assessed_value',
      'value_iq_estimate',
      'rentcast_avm',
      'redfin_estimate',
    ]) {
      if (v[k] != null) v[k] = finiteOrNull(v[k]);
    }
  }

  const r = data.rentals as Record<string, any> | undefined;
  if (r) {
    if (r.monthly_rent_ltr != null) r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr);
    const rs = r.rental_stats as Record<string, any> | undefined;
    if (rs) {
      for (const k of [
        'iq_estimate',
        'zillow_estimate',
        'rentcast_estimate',
        'redfin_estimate',
      ]) {
        if (rs[k] != null) rs[k] = finiteOrNull(rs[k]);
      }
    }
  }

  return data;
}

export function usePropertySearch(address: string | null) {
  return useQuery<PropertyResponse>({
    queryKey: ['property-search', address],
    queryFn: async () => {
      const { data } = await api.post<PropertyResponse>(
        '/api/v1/properties/search',
        { address },
      );
      return validatePropertyResponse(data);
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
