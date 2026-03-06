import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface SearchHistoryItem {
  id: string;
  address: string;
  searched_at: string;
  search_source?: string;
}

const KEY = ['search-history'] as const;

export function useSearchHistory() {
  return useQuery<SearchHistoryItem[]>({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<SearchHistoryItem[]>('/api/v1/search-history');
      return data;
    },
    staleTime: 30_000,
  });
}

export function useDeleteSearchHistoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/search-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/api/v1/search-history');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
