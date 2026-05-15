'use client'

import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api-client'
import type { CachedMetrics } from '@/stores/dealMakerStore'

const METRICS_STALE_TIME = 60 * 1000 // 1 minute

export interface UseCalculatedMetricsOptions {
  enabled?: boolean
}

/**
 * useCalculatedMetrics
 *
 * React Query backed metrics derivation.
 * In the long term this should call a dedicated backend calculation endpoint.
 * For now it re-uses the cached_metrics returned after a save.
 *
 * Consumers can combine:
 *   const snapshot = useDealSnapshot(id)
 *   const assumptions = useAssumptions(id)
 *   const metrics = useCalculatedMetrics(id, assumptions.pendingUpdates)
 */
export function useCalculatedMetrics(
  propertyId: string | null,
  pendingUpdates?: Record<string, unknown>,
  options?: UseCalculatedMetricsOptions,
) {
  const query = useQuery({
    queryKey: ['deal-maker', 'metrics', propertyId, pendingUpdates],
    queryFn: async () => {
      if (!propertyId) return null
      // In a future iteration this would POST pendingUpdates to a /metrics endpoint.
      // Current backend returns fresh metrics on PATCH, so we return cached for now.
      const data = await apiRequest<{ cached_metrics: CachedMetrics | null }>(
        `/api/v1/properties/saved/${propertyId}/deal-maker`,
      )
      return data.cached_metrics ?? null
    },
    enabled: !!propertyId && (options?.enabled ?? true),
    staleTime: METRICS_STALE_TIME,
  })

  return {
    metrics: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
