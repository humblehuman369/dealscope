/**
 * useSearchHistory — React Query hooks for Search History feature.
 * Matches frontend/src/hooks/useSearchHistory.ts
 *
 * Wraps searchHistoryService with proper caching, deduplication,
 * keepPreviousData for pagination, and optimistic deletes.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '../services/apiClient';
import type {
  SearchHistoryResponse,
  SearchHistoryList,
  SearchHistoryStats,
} from '../types';

// ─── Query keys ────────────────────────────────────────────

export const SEARCH_HISTORY_KEYS = {
  all: ['search-history'] as const,
  lists: () => [...SEARCH_HISTORY_KEYS.all, 'list'] as const,
  list: (params: { page: number; pageSize: number; successfulOnly: boolean }) =>
    [...SEARCH_HISTORY_KEYS.lists(), params] as const,
  stats: () => [...SEARCH_HISTORY_KEYS.all, 'stats'] as const,
};

// ─── Queries ───────────────────────────────────────────────

/**
 * Fetch paginated search history entries.
 * Uses keepPreviousData so old results stay visible during pagination.
 */
export function useSearchHistory(params: {
  page: number;
  pageSize: number;
  successfulOnly: boolean;
}) {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list(params),
    queryFn: async () => {
      const data = await api.get<SearchHistoryList>(
        `/api/v1/search-history`,
        {
          limit: params.pageSize,
          offset: params.page * params.pageSize,
          successful_only: params.successfulOnly,
        },
      );
      return data.items ?? [];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Fetch recent searches (quick-access shortcut).
 */
export function useRecentSearches(limit: number = 10) {
  return useQuery({
    queryKey: [...SEARCH_HISTORY_KEYS.all, 'recent', limit] as const,
    queryFn: () =>
      api.get<SearchHistoryResponse[]>('/api/v1/search-history/recent', { limit }),
    staleTime: 30_000,
  });
}

/**
 * Fetch aggregate search history stats.
 */
export function useSearchHistoryStats() {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.stats(),
    queryFn: () =>
      api.get<SearchHistoryStats>('/api/v1/search-history/stats'),
    staleTime: 30_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────

/**
 * Delete a single search history entry with optimistic removal.
 */
export function useDeleteSearchHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del(`/api/v1/search-history/${id}`),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      });

      const previousLists = queryClient.getQueriesData<SearchHistoryResponse[]>({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      });

      queryClient.setQueriesData<SearchHistoryResponse[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        (old) => old?.filter((h) => h.id !== deletedId),
      );

      return { previousLists };
    },

    onError: (_err, _id, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      });
    },
  });
}

/**
 * Clear all search history.
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.del('/api/v1/search-history'),

    onSuccess: () => {
      queryClient.setQueriesData<SearchHistoryResponse[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        () => [],
      );
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      });
    },
  });
}
