/**
 * Shared verdict POST so Discovery and the Plan workbench cannot fire two
 * in-flight `/analysis/verdict` calls for the same house.
 */

import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'

export function verdictAnalysisQueryKey(address: string) {
  return ['analysis-verdict', canonicalizeAddressForIdentity(address)] as const
}

export function fetchVerdictAnalysis<T>(
  queryClient: QueryClient,
  address: string,
  payload: unknown,
): Promise<T> {
  return queryClient.ensureQueryData({
    queryKey: verdictAnalysisQueryKey(address),
    queryFn: () => api.post<T>('/api/v1/analysis/verdict', payload),
    staleTime: 30_000,
  })
}

export function refetchVerdictAnalysis<T>(
  queryClient: QueryClient,
  address: string,
  payload: unknown,
): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: verdictAnalysisQueryKey(address),
    queryFn: () => api.post<T>('/api/v1/analysis/verdict', payload),
    staleTime: 0,
  })
}
