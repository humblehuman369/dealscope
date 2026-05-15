'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import type { DealMakerResponse, DealMakerRecord } from '@/stores/dealMakerStore'

const SNAPSHOT_STALE_TIME = 5 * 60 * 1000 // 5 minutes

export interface UseDealSnapshotOptions {
  enabled?: boolean
}

/**
 * useDealSnapshot
 *
 * Single source of truth for the immutable Deal Maker snapshot loaded from backend.
 * This replaces the "record" portion of the old monolithic dealMakerStore.
 *
 * Consumers:
 * - DealMaker page
 * - Strategy worksheets
 * - Dashboard cards
 */
export function useDealSnapshot(propertyId: string | null, options?: UseDealSnapshotOptions) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['deal-maker', 'snapshot', propertyId],
    queryFn: async () => {
      if (!propertyId) return null
      const data = await apiRequest<DealMakerResponse>(
        `/api/v1/properties/saved/${propertyId}/deal-maker`,
      )
      return data.record
    },
    enabled: !!propertyId && (options?.enabled ?? true),
    staleTime: SNAPSHOT_STALE_TIME,
  })

  const invalidate = () => {
    if (propertyId) {
      queryClient.invalidateQueries({ queryKey: ['deal-maker', 'snapshot', propertyId] })
    }
  }

  return {
    record: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  }
}

export type DealMakerSnapshot = DealMakerRecord | null
