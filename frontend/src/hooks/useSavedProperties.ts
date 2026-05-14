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
  type QueryKey,
} from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { RehabSelection } from '@/lib/analytics'
import type { RehabBudgetSummary } from '@/types/rehabBudget'
import type {
  ActiveFlipSummary,
  SavedPropertySummary,
  SavedPropertyStats,
  PropertyStatus,
} from '@/types/savedProperty'

// Re-export types for consumer convenience
export type { SavedPropertySummary, SavedPropertyStats }

// ─── Query keys ────────────────────────────────────────────

export const SAVED_PROPERTIES_KEYS = {
  /** Root — invalidating this refetches everything. */
  all: ['saved-properties'] as const,
  activeFlips: () => [...SAVED_PROPERTIES_KEYS.all, 'active-flips'] as const,
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
  status: string // 'all' or a PropertyStatus value
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

      return api.get<SavedPropertySummary[]>(`/api/v1/properties/saved?${sp.toString()}`)
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 s — saved properties don't change often
  })
}

/** Fetch aggregate stats (total count + breakdown by status). */
export function useSavedPropertyStats() {
  return useQuery({
    queryKey: SAVED_PROPERTIES_KEYS.stats(),
    queryFn: () => api.get<SavedPropertyStats>('/api/v1/properties/saved/stats'),
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
    mutationFn: (id: string) => api.delete(`/api/v1/properties/saved/${id}`),

    onMutate: async (deletedId: string) => {
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
        (old: SavedPropertySummary[] | undefined) =>
          old?.filter((p: SavedPropertySummary) => p.id !== deletedId),
      )

      return { previousLists }
    },

    onError: (
      _err: unknown,
      _id: string,
      context: { previousLists: Array<[QueryKey, SavedPropertySummary[] | undefined]> } | undefined,
    ) => {
      // Roll back to the snapshots
      context?.previousLists?.forEach(
        ([key, data]: [QueryKey, SavedPropertySummary[] | undefined]) => {
          queryClient.setQueryData(key, data)
        },
      )
    },

    onSettled: () => {
      // Refetch list + stats to guarantee server consistency
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      })
    },
  })
}

/**
 * Update a saved property's pipeline status (Watching → Analyzing → ...).
 *
 * Optimistically moves the card across kanban columns by patching every
 * cached list query. If the PATCH fails, rolls back to the snapshot and
 * a background refetch corrects the UI.
 */
export function useUpdateSavedPropertyStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PropertyStatus }) =>
      api.patch(`/api/v1/properties/saved/${id}`, { status }),

    onMutate: async ({ id, status }: { id: string; status: PropertyStatus }) => {
      await queryClient.cancelQueries({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      })

      const previousLists = queryClient.getQueriesData<SavedPropertySummary[]>({
        queryKey: SAVED_PROPERTIES_KEYS.lists(),
      })

      queryClient.setQueriesData<SavedPropertySummary[]>(
        { queryKey: SAVED_PROPERTIES_KEYS.lists() },
        (old: SavedPropertySummary[] | undefined) =>
          old?.map((p: SavedPropertySummary) =>
            p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p,
          ),
      )

      return { previousLists }
    },

    onError: (
      _err: unknown,
      _vars: { id: string; status: PropertyStatus },
      context: { previousLists: Array<[QueryKey, SavedPropertySummary[] | undefined]> } | undefined,
    ) => {
      context?.previousLists?.forEach(
        ([key, data]: [QueryKey, SavedPropertySummary[] | undefined]) => {
          queryClient.setQueryData(key, data)
        },
      )
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: SAVED_PROPERTIES_KEYS.all,
      })
    },
  })
}

/** Active flips (Acquisition / Rehab / Listed / Sold) — flip-cycle pipeline. */
export function useActiveFlips(includeSold = false) {
  return useQuery({
    queryKey: [...SAVED_PROPERTIES_KEYS.activeFlips(), includeSold],
    queryFn: () =>
      api.get<ActiveFlipSummary[]>(
        `/api/v1/properties/saved/active-flips?include_sold=${includeSold}`,
      ),
    staleTime: 30_000,
  })
}

export function useUpdateFlipStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      stage,
      sold_price,
    }: {
      id: string
      stage: string
      sold_price?: number | null
    }) => api.patch(`/api/v1/properties/saved/${id}/flip-stage`, { stage, sold_price }),

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all })
    },
  })
}

export function useRehabBudgetSummary(propertyId: string | null | undefined) {
  return useQuery({
    queryKey: ['rehab-budget', propertyId],
    queryFn: () => api.get<RehabBudgetSummary>(`/api/v1/properties/saved/${propertyId}/budget`),
    enabled: Boolean(propertyId),
    staleTime: 15_000,
  })
}

export function useSeedRehabBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      selections,
      contingency_pct,
      notes,
    }: {
      propertyId: string
      selections: RehabSelection[]
      contingency_pct: number
      notes?: string | null
    }) =>
      api.post<RehabBudgetSummary>(`/api/v1/properties/saved/${propertyId}/budget/seed`, {
        selections,
        contingency_pct,
        notes,
      }),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rehab-budget', variables.propertyId] })
      queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all })
    },
  })
}

export function useAddBudgetExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      amount,
      spent_on,
      budget_line_id,
      vendor,
      description,
      receipt_document_id,
    }: {
      propertyId: string
      amount: number
      spent_on: string
      budget_line_id?: string | null
      vendor?: string | null
      description?: string | null
      receipt_document_id?: string | null
    }) =>
      api.post(`/api/v1/properties/saved/${propertyId}/budget/expenses`, {
        amount,
        spent_on,
        budget_line_id,
        vendor,
        description,
        receipt_document_id,
      }),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rehab-budget', variables.propertyId] })
    },
  })
}

/**
 * Upload a receipt image (or PDF) and run AI extraction in one round trip.
 * Returns ``{document_id, parsed}`` — caller pre-fills an expense form with
 * ``parsed`` and links via ``document_id`` when the user saves.
 */
export interface ParsedReceipt {
  vendor: string | null
  amount: string | null
  spent_on: string | null
  suggested_line_id: string | null
  description: string | null
}

export interface ReceiptUploadResponse {
  document_id: string
  parsed: ParsedReceipt | null
}

async function postReceipt(propertyId: string, file: File): Promise<ReceiptUploadResponse> {
  const fd = new FormData()
  fd.append('file', file)
  const resp = await fetch(`/api/v1/properties/saved/${propertyId}/budget/receipts/parse`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    let detail = text
    try {
      detail = (JSON.parse(text) as { detail?: string }).detail ?? text
    } catch {
      // Body wasn't JSON — keep raw text.
    }
    throw new Error(detail || `Receipt parse failed (${resp.status})`)
  }
  return (await resp.json()) as ReceiptUploadResponse
}

export function useParseReceipt(propertyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => postReceipt(propertyId, file),
    onSuccess: () => {
      // Invalidate budget so the document count reflects the upload, even
      // if the user doesn't go on to save the expense.
      queryClient.invalidateQueries({ queryKey: ['rehab-budget', propertyId] })
    },
  })
}

export function useDeleteBudgetExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ propertyId, expenseId }: { propertyId: string; expenseId: string }) =>
      api.delete(`/api/v1/properties/saved/${propertyId}/budget/expenses/${expenseId}`),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rehab-budget', variables.propertyId] })
    },
  })
}

/**
 * Update % complete on a single budget line. Returns the recomputed budget
 * summary (projected/variance update server-side based on the new value).
 */
export function useUpdateBudgetLinePctComplete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      lineId,
      pct_complete,
    }: {
      propertyId: string
      lineId: string
      pct_complete: number
    }) =>
      api.patch<RehabBudgetSummary>(
        `/api/v1/properties/saved/${propertyId}/budget/lines/${lineId}/pct_complete`,
        { pct_complete },
      ),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rehab-budget', variables.propertyId] })
      queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}
