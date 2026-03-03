import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface SearchHistoryEntry {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  search_source: string;
  successful: boolean;
  searched_at: string;
}

const HISTORY_KEY = ['search-history'] as const;

export function useSearchHistory(limit = 20) {
  return useQuery<SearchHistoryEntry[]>({
    queryKey: [...HISTORY_KEY, limit],
    queryFn: async () => {
      const { data } = await api.get<SearchHistoryEntry[]>(
        '/api/v1/search-history/recent',
        { params: { limit } },
      );
      return data;
    },
    staleTime: 30_000,
  });
}

export function useDeleteSearchEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      await api.delete(`/api/v1/search-history/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
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
      queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}
