import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

export function usePropertySearch(address: string | null) {
  return useQuery<PropertyResponse>({
    queryKey: ['property-search', address],
    queryFn: async () => {
      const { data } = await api.post<PropertyResponse>(
        '/api/v1/properties/search',
        { address },
      );
      return data;
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
