/**
 * Shared property data hook backed by React Query's client-side cache.
 *
 * Mirrors frontend/src/hooks/usePropertyData.ts — both Verdict and Strategy
 * screens call fetchProperty(address). The first call hits the network;
 * subsequent calls for the same address return cached data instantly
 * (within staleTime), eliminating redundant /api/v1/properties/search
 * round-trips when navigating between pages for the same property.
 *
 * Also provides finiteOrNull() validation to prevent NaN/Infinity from
 * propagating into financial calculations (M12 parity fix).
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import type { PropertyResponse } from '@dealscope/shared';

export type { PropertyResponse };

/**
 * Extended PropertyResponse that allows dynamic field access for backward
 * compatibility. Matches frontend's PropertyResponseCompat approach.
 */
type PropertyResponseCompat = PropertyResponse & Record<string, any>;

const PROPERTY_STALE_TIME = 5 * 60 * 1000; // 5 min — matches frontend

/** Return the value as a finite number, or null if it's missing/invalid. */
export function finiteOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sanitize critical numeric fields in the API response to prevent NaN /
 * Infinity from propagating into financial calculations.
 * Field list matches frontend validatePropertyResponse exactly.
 */
export function validatePropertyResponse(
  data: PropertyResponseCompat,
): PropertyResponseCompat {
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
    if (r.monthly_rent_ltr != null)
      r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr);
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

/**
 * Shared property data hook.
 *
 * Uses React Query's ensureQueryData so the first call for a given
 * address hits the network, and subsequent calls within staleTime
 * return the cached response immediately.
 */
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
      queryClient.invalidateQueries({
        queryKey: ['property-search', address],
      });
    },
    [queryClient],
  );

  return { fetchProperty, invalidateProperty };
}
