import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

const PROPERTY_KEY = 'property-search';

function finiteOrNull(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  return val;
}

function validatePropertyResponse(data: PropertyResponse): PropertyResponse {
  return {
    ...data,
    valuations: data.valuations
      ? {
          ...data.valuations,
          value_iq_estimate: finiteOrNull(data.valuations.value_iq_estimate),
          rentcast_avm: finiteOrNull(data.valuations.rentcast_avm),
          zestimate: finiteOrNull(data.valuations.zestimate),
          redfin_estimate: finiteOrNull(data.valuations.redfin_estimate),
        }
      : data.valuations,
  };
}

export function usePropertyData() {
  const queryClient = useQueryClient();

  const fetchProperty = useCallback(
    async (address: string): Promise<PropertyResponse> => {
      return queryClient.ensureQueryData({
        queryKey: [PROPERTY_KEY, address],
        queryFn: async () => {
          const { data } = await api.post<PropertyResponse>('/api/v1/properties/search', {
            address,
            search_source: 'mobile',
          });
          return validatePropertyResponse(data);
        },
        staleTime: 5 * 60_000,
      });
    },
    [queryClient],
  );

  const getCached = useCallback(
    (address: string): PropertyResponse | undefined => {
      return queryClient.getQueryData<PropertyResponse>([PROPERTY_KEY, address]);
    },
    [queryClient],
  );

  const invalidate = useCallback(
    (address: string) => {
      queryClient.invalidateQueries({ queryKey: [PROPERTY_KEY, address] });
    },
    [queryClient],
  );

  return { fetchProperty, getCached, invalidate };
}
