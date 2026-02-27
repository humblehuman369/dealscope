/**
 * usePropertyData — shared property data hook for mobile.
 *
 * Mirrors the web frontend's usePropertyData hook. Uses React Query's
 * ensureQueryData so the first call hits the network and subsequent
 * calls for the same address return cached data within staleTime.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

type PropertyResponseCompat = PropertyResponse & Record<string, unknown>;

const PROPERTY_STALE_TIME = 5 * 60 * 1000;

function finiteOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function validatePropertyResponse(
  data: PropertyResponseCompat,
): PropertyResponseCompat {
  const v = data.valuations as Record<string, unknown> | undefined;
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

  const r = data.rentals as Record<string, unknown> | undefined;
  if (r) {
    if (r.monthly_rent_ltr != null) r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr);
    const rs = r.rental_stats as Record<string, unknown> | undefined;
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

export function usePropertyData() {
  const queryClient = useQueryClient();

  const fetchProperty = useCallback(
    async (address: string): Promise<PropertyResponseCompat> => {
      return queryClient.ensureQueryData({
        queryKey: ['property-search', address],
        queryFn: async () => {
          const raw = await api.post<PropertyResponseCompat>(
            '/api/v1/properties/search',
            { address },
          );
          return validatePropertyResponse(raw);
        },
        staleTime: PROPERTY_STALE_TIME,
      });
    },
    [queryClient],
  );

  const invalidateProperty = useCallback(
    (address: string) => {
      queryClient.invalidateQueries({ queryKey: ['property-search', address] });
    },
    [queryClient],
  );

  return { fetchProperty, invalidateProperty };
}
