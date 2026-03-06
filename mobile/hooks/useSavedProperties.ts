import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface SavedProperty {
  id: string;
  address: string;
  property_id?: string;
  zpid?: string;
  created_at: string;
  deal_score?: number;
  list_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
}

const KEY = ['saved-properties'] as const;

export function useSavedProperties() {
  return useQuery<SavedProperty[]>({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<SavedProperty[]>('/api/v1/properties/saved');
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: string) => {
      const { data } = await api.post('/api/v1/properties/saved', { address });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/properties/saved/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
