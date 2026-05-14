/**
 * useDefaults Hook
 *
 * React Query hook for accessing centralized investment calculation defaults.
 * This is the ONLY way to access default values in components.
 *
 * NEVER hardcode default values - always use this hook.
 *
 * Usage:
 * ```tsx
 * import { useDefaults } from '@/hooks/useDefaults'
 *
 * function MyComponent({ zipCode }) {
 *   const { defaults, loading, error, refetch } = useDefaults(zipCode)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error.message} />
 *
 *   return <div>Interest Rate: {defaults.financing.interest_rate * 100}%</div>
 * }
 * ```
 */

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { defaultsService, ResolvedDefaultsResponse } from '@/services/defaults'
import type { AllAssumptions } from '@/stores/index'

// ─── Query keys ────────────────────────────────────────────

export const DEFAULTS_KEYS = {
  /** Root — invalidating this refetches every defaults query. */
  all: ['defaults'] as const,
  /** Resolved defaults (system + market + user overrides) for a ZIP. */
  resolved: (zipCode?: string) => [...DEFAULTS_KEYS.all, 'resolved', zipCode ?? null] as const,
  /** The signed-in user's saved assumption overrides. */
  userAssumptions: () => [...DEFAULTS_KEYS.all, 'user-assumptions'] as const,
}

// 5 minutes — defaults don't change often, and the underlying service has its
// own 5-minute cache. This staleTime aligns the React Query layer to that.
const DEFAULTS_STALE_TIME_MS = 5 * 60 * 1000

export interface UseDefaultsResult {
  /** Resolved defaults ready for use */
  defaults: AllAssumptions | null
  /** Full response including market adjustments and user overrides */
  fullResponse: ResolvedDefaultsResponse | null
  /** Loading state */
  loading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Whether user has customizations applied */
  hasUserCustomizations: boolean
  /** Market region if ZIP code provided */
  region: string | null
  /** Refetch defaults */
  refetch: () => Promise<void>
  /** Check if a specific field has been overridden by user */
  isUserOverride: (category: keyof AllAssumptions, field: string) => boolean
}

/**
 * Hook for accessing centralized defaults.
 *
 * @param zipCode - Optional ZIP code for market-specific adjustments
 * @returns Defaults and status
 */
export function useDefaults(zipCode?: string): UseDefaultsResult {
  const query = useQuery<ResolvedDefaultsResponse, Error>({
    queryKey: DEFAULTS_KEYS.resolved(zipCode),
    queryFn: () => defaultsService.getResolvedDefaults(zipCode),
    staleTime: DEFAULTS_STALE_TIME_MS,
    // Defaults rarely change between window-focus events, so don't refetch on focus.
    refetchOnWindowFocus: false,
  })

  const fullResponse = query.data ?? null

  const isUserOverride = useCallback(
    (category: keyof AllAssumptions, field: string): boolean => {
      if (!fullResponse?.user_overrides) return false
      const categoryOverrides = fullResponse.user_overrides[category]
      if (!categoryOverrides || typeof categoryOverrides !== 'object') return false
      return Object.prototype.hasOwnProperty.call(categoryOverrides, field)
    },
    [fullResponse],
  )

  const refetch = useCallback(async () => {
    await query.refetch()
  }, [query])

  return {
    defaults: fullResponse?.resolved ?? null,
    fullResponse,
    loading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    hasUserCustomizations: !!fullResponse?.user_overrides,
    region: fullResponse?.region ?? null,
    refetch,
    isUserOverride,
  }
}

/**
 * Hook for managing the signed-in user's saved default assumptions.
 *
 * Reads via React Query and writes via React Query mutations so the cache
 * stays consistent across screens. After every successful write/reset the
 * resolved-defaults cache is also invalidated so any open `useDefaults`
 * consumer recomputes against the new overrides.
 */
export interface UseUserAssumptionsResult {
  assumptions: Partial<AllAssumptions> | null
  hasCustomizations: boolean
  loading: boolean
  error: Error | null
  updateAssumptions: (updates: Partial<AllAssumptions>) => Promise<void>
  resetToDefaults: () => Promise<void>
}

export function useUserAssumptions(): UseUserAssumptionsResult {
  const queryClient = useQueryClient()
  const [error, setError] = useState<Error | null>(null)

  const query = useQuery({
    queryKey: DEFAULTS_KEYS.userAssumptions(),
    queryFn: async () => {
      if (!defaultsService.isAuthenticated()) return null
      return defaultsService.getUserAssumptions()
    },
    staleTime: DEFAULTS_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  })

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<AllAssumptions>) => {
      if (!defaultsService.isAuthenticated()) {
        throw new Error('Authentication required')
      }
      return defaultsService.updateUserAssumptions(updates)
    },
    onSuccess: (response) => {
      // Push the fresh user-assumptions payload into the cache so callers
      // re-render against the new state without a round-trip.
      queryClient.setQueryData(DEFAULTS_KEYS.userAssumptions(), response)
      // Resolved-defaults depends on user overrides; clear the service-level
      // cache and invalidate the query so the next read recomputes.
      defaultsService.clearCache()
      queryClient.invalidateQueries({ queryKey: DEFAULTS_KEYS.all })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to update assumptions'))
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!defaultsService.isAuthenticated()) {
        throw new Error('Authentication required')
      }
      return defaultsService.resetUserAssumptions()
    },
    onSuccess: (response) => {
      queryClient.setQueryData(DEFAULTS_KEYS.userAssumptions(), response)
      defaultsService.clearCache()
      queryClient.invalidateQueries({ queryKey: DEFAULTS_KEYS.all })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to reset assumptions'))
    },
  })

  const updateAssumptions = useCallback(
    async (updates: Partial<AllAssumptions>) => {
      setError(null)
      await updateMutation.mutateAsync(updates)
    },
    [updateMutation],
  )

  const resetToDefaults = useCallback(async () => {
    setError(null)
    await resetMutation.mutateAsync()
  }, [resetMutation])

  return {
    assumptions: query.data?.assumptions ?? null,
    hasCustomizations: query.data?.has_customizations ?? false,
    loading: query.isLoading || updateMutation.isPending || resetMutation.isPending,
    error: error ?? (query.error as Error | null) ?? null,
    updateAssumptions,
    resetToDefaults,
  }
}

export default useDefaults
