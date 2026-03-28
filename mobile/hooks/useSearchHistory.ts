import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryKey,
} from '@tanstack/react-query';
import api from '@/services/api';

// ------------------------------------------------------------------
// Types — kept in sync with frontend/src/hooks/useSearchHistory.ts
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// Query keys
// ------------------------------------------------------------------

export const SEARCH_HISTORY_KEYS = {
  all: ['search-history'] as const,
  lists: () => [...SEARCH_HISTORY_KEYS.all, 'list'] as const,
  list: (params: {
    page: number;
    pageSize: number;
    successfulOnly: boolean;
  }) => [...SEARCH_HISTORY_KEYS.lists(), params] as const,
  stats: () => [...SEARCH_HISTORY_KEYS.all, 'stats'] as const,
};

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

export function useSearchHistory(params: {
  page: number;
  pageSize: number;
  successfulOnly: boolean;
}) {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.list(params),
    queryFn: async () => {
      const { data } = await api.get<SearchHistoryListResponse>(
        `/api/v1/search-history?limit=${params.pageSize}&offset=${
          params.page * params.pageSize
        }&successful_only=${params.successfulOnly}`,
      );
      return data.items ?? [];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSearchHistoryStats() {
  return useQuery({
    queryKey: SEARCH_HISTORY_KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get<SearchHistoryStats>(
        '/api/v1/search-history/stats',
      );
      return data;
    },
    staleTime: 30_000,
  });
}

// ------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------

export function useDeleteSearchHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/search-history/${id}`),

    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      });

      const previousLists = queryClient.getQueriesData<SearchHistoryItem[]>({
        queryKey: SEARCH_HISTORY_KEYS.lists(),
      });

      queryClient.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        (old: SearchHistoryItem[] | undefined) =>
          old?.filter((h: SearchHistoryItem) => h.id !== deletedId),
      );

      return { previousLists };
    },

    onError: (
      _err: unknown,
      _id: string,
      context:
        | {
            previousLists: Array<
              [QueryKey, SearchHistoryItem[] | undefined]
            >;
          }
        | undefined,
    ) => {
      context?.previousLists?.forEach(
        ([key, data]: [QueryKey, SearchHistoryItem[] | undefined]) => {
          queryClient.setQueryData(key, data);
        },
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      });
    },
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete('/api/v1/search-history'),

    onSuccess: () => {
      queryClient.setQueriesData<SearchHistoryItem[]>(
        { queryKey: SEARCH_HISTORY_KEYS.lists() },
        () => [],
      );
      queryClient.invalidateQueries({
        queryKey: SEARCH_HISTORY_KEYS.all,
      });
    },
  });
}
