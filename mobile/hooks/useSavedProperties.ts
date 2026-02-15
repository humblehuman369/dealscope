/**
 * useSavedProperties — React Query hooks for Saved Properties feature.
 * Matches frontend/src/hooks/useSavedProperties.ts
 *
 * Proper caching, deduplication, keepPreviousData for pagination,
 * and optimistic delete mutations.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api } from '../services/apiClient';
import type {
  SavedPropertySummary,
  PortfolioStats,
  PropertyStatus,
} from '../types';

// Re-export for consumer convenience
export type { SavedPropertySummary, PortfolioStats };

// ─── Query keys ────────────────────────────────────────────

export const SAVED_PROPERTIES_KEYS = {
  /** Root — invalidating this refetches everything. */
  all: ['saved-properties'] as const,
  /** All list queries (any param combination). */
  lists: () => [...SAVED_PROPERTIES_KEYS.all, 'list'] as const,
  /** A specific list query (page + filters). */
  list: (params: { page: number; pageSize: number; status: string; search: string }) =>
    [...SAVED_PROPERTIES_KEYS.lists(), params] as const,
  /** Stats query. */
  stats: () => [...SAVED_PROPERTIES_KEYS.all, 'stats'] as const,
};

// ─── Queries ───────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of saved properties.
 *
 * Uses keepPreviousData so old results stay visible during
 * pagination / filter transitions (no loading flash).
 */
export function useSavedProperties(params: {
  page: number;
  pageSize: number;
  status: string;
  search: string;
}) {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.list(params),
    queryFn: () => {
      const queryParams: Record<string, unknown> = {
        limit: params.pageSize,
        offset: params.page * params.pageSize,
      };
      if (params.status !== 'all') queryParams.status = params.status;
      if (params.search.trim()) queryParams.search = params.search.trim();

      return api.get<SavedPropertySummary[]>(
        '/api/v1/properties/saved',
        queryParams,
      );
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Fetch aggregate stats (total count + breakdown by status).
 */
export function useSavedPropertyStats() {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.stats(),
    queryFn: () =>
      api.get<PortfolioStats>('/api/v1/properties/saved/stats'),
    staleTime: 30_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────

/**
 * Delete a saved property with optimistic removal.
 *
 * The item is removed from every cached list immediately.
 * If the server call fails, the previous state is rolled back.
 */
export function useDeleteSavedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del(`/api/v1/properties/saved/${id}`),

    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      });

      const previousLists = queryClient.getQueriesData<SavedPropertySummary[]>({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      });

      queryClient.setQueriesData<SavedPropertySummary[]>(
        { queryKey: SAVED_PROPERTIES_KEYS.lists() },
        (old) => old?.filter((p) => p.id !== deletedId),
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
        queryKey: SAVED_PROPERTIES_KEYS.all,
      });
    },
  });
}

/**
 * Save a new property to portfolio.
 */
export function useSaveProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      address_street: string;
      property_data_snapshot: Record<string, unknown>;
      status?: PropertyStatus;
    }) => api.post('/api/v1/properties/saved', data),

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      });
    },
  });
}
