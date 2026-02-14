'use client'

/**
 * useSavedProperties — React Query hooks for the Saved Properties feature.
 *
 * Replaces the manual useState/useEffect/api.get pattern with proper
 * caching, deduplication, and optimistic mutations.
 *
 * Query keys are hierarchical so invalidating the root key automatically
 * refetches both the list and stats queries.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  SavedPropertySummary,
  SavedPropertyStats,
} from '@/types/savedProperty'

// Re-export types for consumer convenience
export type { SavedPropertySummary, SavedPropertyStats }

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
}

// ─── Queries ───────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of saved properties.
 *
 * Uses `keepPreviousData` so old results stay visible during
 * pagination / filter transitions (no loading flash).
 */
export function useSavedProperties(params: {
  page: number
  pageSize: number
  status: string   // 'all' or a PropertyStatus value
  search: string
}) {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.list(params),
    queryFn: () => {
      const sp = new URLSearchParams({
        limit: String(params.pageSize),
        offset: String(params.page * params.pageSize),
      })
      if (params.status !== 'all') sp.set('status', params.status)
      if (params.search.trim()) sp.set('search', params.search.trim())

      return api.get<SavedPropertySummary[]>(
        `/api/v1/properties/saved?${sp.toString()}`,
      )
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 s — saved properties don't change often
  })
}

/** Fetch aggregate stats (total count + breakdown by status). */
export function useSavedPropertyStats() {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.stats(),
    queryFn: () =>
      api.get<SavedPropertyStats>('/api/v1/properties/saved/stats'),
    staleTime: 30_000,
  })
}

// ─── Mutations ─────────────────────────────────────────────

/**
 * Delete a saved property.
 *
 * Performs an **optimistic update**: the item is removed from every
 * cached list immediately.  If the server call fails, the previous
 * state is rolled back and a background refetch corrects the UI.
 */
export function useDeleteSavedProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/v1/properties/saved/${id}`),

    onMutate: async (deletedId) => {
      // Cancel in-flight refetches so they don't overwrite optimistic data
      await queryClient.cancelQueries({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      })

      // Snapshot every active list query for rollback
      const previousLists = queryClient.getQueriesData<SavedPropertySummary[]>({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      })

      // Optimistically remove the item from all cached list queries
      queryClient.setQueriesData<SavedPropertySummary[]>(
        { queryKey: SAVED_PROPERTIES_KEYS.lists() },
        (old) => old?.filter((p) => p.id !== deletedId),
      )

      return { previousLists }
    },

    onError: (_err, _id, context) => {
      // Roll back to the snapshots
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
    },

    onSettled: () => {
      // Refetch list + stats to guarantee server consistency
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      })
    },
  })
}
