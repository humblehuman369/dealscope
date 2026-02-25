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
import {
  finiteOrNull,
  validatePropertyResponse,
  type PropertyResponseCompat,
} from '../utils/validation';

export type { PropertyResponse };
export { finiteOrNull, validatePropertyResponse };

const PROPERTY_STALE_TIME = 5 * 60 * 1000; // 5 min — matches frontend

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
