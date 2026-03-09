import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

const PROPERTY_KEY = 'property-search';

function canonicalizeAddressKey(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*USA$/i, '');
}

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
      const canonicalAddress = canonicalizeAddressKey(address);
      return queryClient.ensureQueryData({
        queryKey: [PROPERTY_KEY, canonicalAddress],
        queryFn: async () => {
          const { data } = await api.post<PropertyResponse>('/api/v1/properties/search', {
            address: canonicalAddress,
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
      const canonicalAddress = canonicalizeAddressKey(address);
      return queryClient.getQueryData<PropertyResponse>([PROPERTY_KEY, canonicalAddress]);
    },
    [queryClient],
  );

  const invalidate = useCallback(
    (address: string) => {
      const canonicalAddress = canonicalizeAddressKey(address);
      queryClient.invalidateQueries({ queryKey: [PROPERTY_KEY, canonicalAddress] });
    },
    [queryClient],
  );

  return { fetchProperty, getCached, invalidate };
}
