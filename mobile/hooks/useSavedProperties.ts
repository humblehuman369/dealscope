import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface SavedPropertySummary {
  id: string;
  address_street: string;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  nickname: string | null;
  status: string;
  tags: string[];
  best_strategy: string | null;
  best_cash_flow: number | null;
  best_coc_return: number | null;
  saved_at: string;
  updated_at: string;
}

interface SavePropertyInput {
  address_street: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  full_address: string;
  zpid?: string;
  property_data_snapshot?: Record<string, unknown>;
  status?: string;
}

const SAVED_KEY = ['saved-properties'] as const;

export function useSavedProperties(status?: string) {
  return useQuery<SavedPropertySummary[]>({
    queryKey: [...SAVED_KEY, status ?? 'all'],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '50' };
      if (status && status !== 'all') params.status = status;
      const { data } = await api.get<SavedPropertySummary[]>(
        '/api/v1/properties/saved',
        { params },
      );
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCheckSaved(address: string | null) {
  return useQuery({
    queryKey: ['saved-check', address],
    queryFn: async () => {
      const { data } = await api.get<{
        is_saved: boolean;
        saved_property_id: string | null;
      }>('/api/v1/properties/saved/check', {
        params: { address },
      });
      return data;
    },
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SavePropertyInput) => {
      const { data } = await api.post<{ id: string }>(
        '/api/v1/properties/saved',
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_KEY });
    },
  });
}

export function useDeleteSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (propertyId: string) => {
      await api.delete(`/api/v1/properties/saved/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_KEY });
    },
  });
}
