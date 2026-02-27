/**
 * useSearchHistory — React Query hooks for the Search History feature.
 *
 * Mirrors the web frontend's useSearchHistory hook.
 * Pulls recent searches from the backend API and provides optimistic deletes.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '@/services/api';
import { useSession } from './useSession';

export interface SearchHistoryItem {
  id: string;
  user_id?: string;
  search_query: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  property_cache_id?: string;
  zpid?: string;
  result_summary?: {
    property_type?: string;
    bedrooms?: number;
    bathrooms?: number;
    square_footage?: number;
    estimated_value?: number;
    rent_estimate?: number;
  };
  search_source?: string;
  was_successful: boolean;
  was_saved: boolean;
  searched_at: string;
}

interface SearchHistoryListResponse {
  items: SearchHistoryItem[];
}

export const SEARCH_HISTORY_KEYS = {
  all: ['search-history'] as const,
  lists: () => [...SEARCH_HISTORY_KEYS.all, 'list'] as const,
  list: (params: { limit: number; offset: number }) =>
    [...SEARCH_HISTORY_KEYS.lists(), params] as const,
};

/**
 * Fetch recent search history entries.
 * Only runs when authenticated.
 */
export function useRecentSearches(limit = 10) {
  const { isAuthenticated } = useSession();

  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list({ limit, offset: 0 }),
    queryFn: async () => {
      const data = await api.get<SearchHistoryListResponse>(
        `/api/v1/search-history?limit=${limit}&offset=0&successful_only=true`,
      );
      return data.items ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useDeleteSearchHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/search-history/${id}`),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: SEARCH_HISTORY_KEYS.lists() });
      queryClient.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        (old) => old?.filter((h) => h.id !== deletedId),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SEARCH_HISTORY_KEYS.all });
    },
  });
}
