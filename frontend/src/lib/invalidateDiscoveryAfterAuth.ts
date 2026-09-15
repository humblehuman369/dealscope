import type { QueryClient } from '@tanstack/react-query'
import { canonicalizeAddressForIdentity } from '@/utils/addressIdentity'
import { verdictAnalysisQueryKey } from '@/lib/verdictAnalysisQuery'

export function propertySearchQueryKey(address: string) {
  return ['property-search', canonicalizeAddressForIdentity(address)] as const
}

export function savedCheckQueryKey(address: string) {
  return ['saved-check', canonicalizeAddressForIdentity(address)] as const
}

/** True when a signed-out 403 (or any error) is still sitting in the cache. */
export function discoveryQueriesNeedAuthRefetch(
  queryClient: QueryClient,
  address: string,
  limitError: 'free' | 'anonymous' | null,
): boolean {
  if (!address.trim()) return false
  if (limitError) return true
  const propertyState = queryClient.getQueryState(propertySearchQueryKey(address))
  const verdictState = queryClient.getQueryState(verdictAnalysisQueryKey(address))
  return propertyState?.status === 'error' || verdictState?.status === 'error'
}

/**
 * Drop the signed-out 403s so Discovery's ensureQueryData calls refetch
 * as the signed-in user. Saved-check is local state in useSaveProperty;
 * removing this key is the contract the page uses to re-run checkSaved.
 */
export function invalidateDiscoveryQueriesAfterAuth(
  queryClient: QueryClient,
  address: string,
): void {
  const canonical = canonicalizeAddressForIdentity(address)
  queryClient.removeQueries({ queryKey: propertySearchQueryKey(canonical) })
  queryClient.removeQueries({ queryKey: verdictAnalysisQueryKey(canonical) })
  queryClient.removeQueries({ queryKey: savedCheckQueryKey(canonical) })
}
