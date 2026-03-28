import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type QueryKey,
} from '@tanstack/react-query';
import api from '@/services/api';

// ------------------------------------------------------------------
// Types — kept in sync with frontend/src/types/savedProperty.ts
// ------------------------------------------------------------------

export type PropertyStatus =
  | 'watching'
  | 'analyzing'
  | 'contacted'
  | 'under_contract'
  | 'owned'
  | 'passed'
  | 'archived';

export interface SavedPropertySummary {
  id: string;
  address_street: string;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  nickname: string | null;
  status: PropertyStatus;
  tags: string[] | null;
  color_label: string | null;
  priority: number | null;
  best_strategy: string | null;
  best_cash_flow: number | null;
  best_coc_return: number | null;
  saved_at: string;
  last_viewed_at: string | null;
  updated_at: string;
}

export interface SavedPropertyStats {
  total: number;
  by_status: Record<string, number>;
}

// ------------------------------------------------------------------
// Query keys
// ------------------------------------------------------------------

export const SAVED_PROPERTIES_KEYS = {
  all: ['saved-properties'] as const,
  lists: () => [...SAVED_PROPERTIES_KEYS.all, 'list'] as const,
  list: (params: { page: number; pageSize: number; status: string; search: string }) =>
    [...SAVED_PROPERTIES_KEYS.lists(), params] as const,
  stats: () => [...SAVED_PROPERTIES_KEYS.all, 'stats'] as const,
};

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

export function useSavedProperties(params: {
  page: number;
  pageSize: number;
  status: string;
  search: string;
}) {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams({
        limit: String(params.pageSize),
        offset: String(params.page * params.pageSize),
      });
      if (params.status !== 'all') sp.set('status', params.status);
      if (params.search.trim()) sp.set('search', params.search.trim());

      const { data } = await api.get<SavedPropertySummary[]>(
        `/api/v1/properties/saved?${sp.toString()}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSavedPropertyStats() {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.stats(),
    queryFn: async () => {
      const { data } = await api.get<SavedPropertyStats>(
        '/api/v1/properties/saved/stats',
      );
      return data;
    },
    staleTime: 30_000,
  });
}

// ------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------

export function useSaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: string) => {
      const { data } = await api.post('/api/v1/properties/saved', { address });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      });
    },
  });
}

export function useDeleteSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/properties/saved/${id}`),

    onMutate: async (deletedId: string) => {
      await queryClient.cancelQueries({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      });

      const previousLists = queryClient.getQueriesData<SavedPropertySummary[]>({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      });

      queryClient.setQueriesData<SavedPropertySummary[]>(
        { queryKey: SAVED_PROPERTIES_KEYS.lists() },
        (old: SavedPropertySummary[] | undefined) =>
          old?.filter((p: SavedPropertySummary) => p.id !== deletedId),
      );

      return { previousLists };
    },

    onError: (
      _err: unknown,
      _id: string,
      context:
        | {
            previousLists: Array<
              [QueryKey, SavedPropertySummary[] | undefined]
            >;
          }
        | undefined,
    ) => {
      context?.previousLists?.forEach(
        ([key, data]: [QueryKey, SavedPropertySummary[] | undefined]) => {
          queryClient.setQueryData(key, data);
        },
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      });
    },
  });
}
