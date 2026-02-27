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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface SearchHistoryStats {
  total_searches: number;
  successful_searches: number;
  saved_from_search: number;
  searches_this_week: number;
  searches_this_month: number;
  top_markets: { state: string; count: number }[];
  recent_searches: SearchHistoryItem[];
}

interface SearchHistoryListResponse {
  items: SearchHistoryItem[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SEARCH_HISTORY_KEYS = {
  all: ['search-history'] as const,
  lists: () => [...SEARCH_HISTORY_KEYS.all, 'list'] as const,
  list: (params: { limit: number; offset: number; successfulOnly?: boolean }) =>
    [...SEARCH_HISTORY_KEYS.lists(), params] as const,
  stats: () => [...SEARCH_HISTORY_KEYS.all, 'stats'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useRecentSearches(limit = 10) {
  const { isAuthenticated } = useSession();
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list({ limit, offset: 0, successfulOnly: true }),
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

export function useSearchHistoryPaginated(params: {
  page: number;
  pageSize: number;
  successfulOnly: boolean;
}) {
  const { isAuthenticated } = useSession();
  const offset = params.page * params.pageSize;
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list({
      limit: params.pageSize,
      offset,
      successfulOnly: params.successfulOnly,
    }),
    queryFn: async () => {
      const data = await api.get<SearchHistoryListResponse>(
        `/api/v1/search-history?limit=${params.pageSize}&offset=${offset}&successful_only=${params.successfulOnly}`,
      );
      return data.items ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSearchHistoryStats() {
  const { isAuthenticated } = useSession();
  return useQuery<SearchHistoryStats>({
    queryKey: SEARCH_HISTORY_KEYS.stats(),
    queryFn: () => api.get<SearchHistoryStats>('/api/v1/search-history/stats'),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useDeleteSearchHistoryEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/search-history/${id}`),
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: SEARCH_HISTORY_KEYS.lists() });
      qc.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        (old) => old?.filter((h) => h.id !== deletedId),
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SEARCH_HISTORY_KEYS.all });
    },
  });
}

export function useClearSearchHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/api/v1/search-history'),
    onSuccess: () => {
      qc.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        () => [],
      );
      qc.invalidateQueries({ queryKey: SEARCH_HISTORY_KEYS.all });
    },
  });
}
