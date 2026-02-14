'use client'

/**
 * useSearchHistory — React Query hooks for the Search History feature.
 *
 * Same pattern as useSavedProperties: proper caching, deduplication,
 * keepPreviousData for pagination, and optimistic deletes.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { api } from '@/lib/api-client'

// ─── Types (co-located — only used by this feature) ────────

export interface SearchHistoryItem {
  id: string
  user_id?: string
  search_query: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  property_cache_id?: string
  zpid?: string
  result_summary?: {
    property_type?: string
    bedrooms?: number
    bathrooms?: number
    square_footage?: number
    estimated_value?: number
    rent_estimate?: number
  }
  search_source?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
}

export interface SearchHistoryStats {
  total_searches: number
  successful_searches: number
  saved_from_search: number
  searches_this_week: number
  searches_this_month: number
  top_markets: { state: string; count: number }[]
  recent_searches: SearchHistoryItem[]
}

/** Shape returned by the paginated list endpoint. */
interface SearchHistoryListResponse {
  items: SearchHistoryItem[]
}

// ─── Query keys ────────────────────────────────────────────

export const SEARCH_HISTORY_KEYS = {
  all: ['search-history'] as const,
  lists: () => [...SEARCH_HISTORY_KEYS.all, 'list'] as const,
  list: (params: { page: number; pageSize: number; successfulOnly: boolean }) =>
    [...SEARCH_HISTORY_KEYS.lists(), params] as const,
  stats: () => [...SEARCH_HISTORY_KEYS.all, 'stats'] as const,
}

// ─── Queries ───────────────────────────────────────────────

/**
 * Fetch paginated search history entries.
 * Returns the unwrapped `items` array for easier consumption.
 */
export function useSearchHistory(params: {
  page: number
  pageSize: number
  successfulOnly: boolean
}) {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list(params),
    queryFn: async () => {
      const data = await api.get<SearchHistoryListResponse>(
        `/api/v1/search-history?limit=${params.pageSize}&offset=${
          params.page * params.pageSize
        }&successful_only=${params.successfulOnly}`,
      )
      return data.items ?? []
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/** Fetch aggregate search history stats. */
export function useSearchHistoryStats() {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.stats(),
    queryFn: () =>
      api.get<SearchHistoryStats>('/api/v1/search-history/stats'),
    staleTime: 30_000,
  })
}

// ─── Mutations ─────────────────────────────────────────────

/** Delete a single search history entry with optimistic removal. */
export function useDeleteSearchHistoryEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/search-history/${id}`),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      })

      const previousLists = queryClient.getQueriesData<SearchHistoryItem[]>({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      })

      queryClient.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        (old) => old?.filter((h) => h.id !== deletedId),
      )

      return { previousLists }
    },

    onError: (_err, _id, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      })
    },
  })
}

/** Clear all search history. */
export function useClearSearchHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.delete('/api/v1/search-history'),

    onSuccess: () => {
      // Wipe all cached lists immediately
      queryClient.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        () => [],
      )
      // Refetch stats to get updated counts
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      })
    },
  })
}
