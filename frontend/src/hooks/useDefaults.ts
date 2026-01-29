/**
 * useDefaults Hook
 * 
 * React hook for accessing centralized investment calculation defaults.
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

import { useState, useEffect, useCallback, useRef } from 'react'
import { defaultsService, ResolvedDefaultsResponse } from '@/services/defaults'
import type { AllAssumptions } from '@/stores/index'

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
  const [defaults, setDefaults] = useState<AllAssumptions | null>(null)
  const [fullResponse, setFullResponse] = useState<ResolvedDefaultsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Track the ZIP code to detect changes
  const prevZipCodeRef = useRef<string | undefined>(zipCode)
  
  const fetchDefaults = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await defaultsService.getResolvedDefaults(zipCode)
      setFullResponse(response)
      setDefaults(response.resolved)
    } catch (err) {
      console.error('Failed to fetch defaults:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch defaults'))
      
      // Try to use basic system defaults as fallback
      try {
        const basicDefaults = await defaultsService.getDefaults()
        setDefaults(basicDefaults)
      } catch {
        // No fallback available
      }
    } finally {
      setLoading(false)
    }
  }, [zipCode])
  
  // Fetch on mount and when ZIP code changes
  useEffect(() => {
    fetchDefaults()
  }, [fetchDefaults])
  
  // Refetch when ZIP code changes
  useEffect(() => {
    if (prevZipCodeRef.current !== zipCode) {
      prevZipCodeRef.current = zipCode
      fetchDefaults()
    }
  }, [zipCode, fetchDefaults])
  
  // Check if a specific field is from user override
  const isUserOverride = useCallback(
    (category: keyof AllAssumptions, field: string): boolean => {
      if (!fullResponse?.user_overrides) return false
      const categoryOverrides = fullResponse.user_overrides[category]
      if (!categoryOverrides || typeof categoryOverrides !== 'object') return false
      return Object.prototype.hasOwnProperty.call(categoryOverrides, field)
    },
    [fullResponse]
  )
  
  return {
    defaults,
    fullResponse,
    loading,
    error,
    hasUserCustomizations: !!fullResponse?.user_overrides,
    region: fullResponse?.region ?? null,
    refetch: fetchDefaults,
    isUserOverride,
  }
}

/**
 * Hook for accessing system defaults only (no market/user adjustments).
 * Use this when you need the base system defaults regardless of context.
 */
export function useSystemDefaults(): {
  defaults: AllAssumptions | null
  loading: boolean
  error: Error | null
} {
  const [defaults, setDefaults] = useState<AllAssumptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    defaultsService
      .getDefaults()
      .then(setDefaults)
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to fetch defaults')))
      .finally(() => setLoading(false))
  }, [])
  
  return { defaults, loading, error }
}

/**
 * Hook for managing user's default assumptions.
 * Requires authentication.
 */
export function useUserAssumptions(): {
  assumptions: Partial<AllAssumptions> | null
  hasCustomizations: boolean
  loading: boolean
  error: Error | null
  updateAssumptions: (updates: Partial<AllAssumptions>) => Promise<void>
  resetToDefaults: () => Promise<void>
} {
  const [assumptions, setAssumptions] = useState<Partial<AllAssumptions> | null>(null)
  const [hasCustomizations, setHasCustomizations] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchAssumptions = useCallback(async () => {
    if (!defaultsService.isAuthenticated()) {
      setLoading(false)
      return
    }
    
    try {
      const response = await defaultsService.getUserAssumptions()
      setAssumptions(response.assumptions)
      setHasCustomizations(response.has_customizations)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user assumptions'))
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    fetchAssumptions()
  }, [fetchAssumptions])
  
  const updateAssumptions = useCallback(async (updates: Partial<AllAssumptions>) => {
    if (!defaultsService.isAuthenticated()) {
      throw new Error('Authentication required')
    }
    
    setLoading(true)
    try {
      const response = await defaultsService.updateUserAssumptions(updates)
      setAssumptions(response.assumptions)
      setHasCustomizations(response.has_customizations)
      
      // Clear the defaults cache so next fetch gets updated values
      defaultsService.clearCache()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update assumptions'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  const resetToDefaults = useCallback(async () => {
    if (!defaultsService.isAuthenticated()) {
      throw new Error('Authentication required')
    }
    
    setLoading(true)
    try {
      const response = await defaultsService.resetUserAssumptions()
      setAssumptions(response.assumptions)
      setHasCustomizations(response.has_customizations)
      
      // Clear the defaults cache
      defaultsService.clearCache()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset assumptions'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  return {
    assumptions,
    hasCustomizations,
    loading,
    error,
    updateAssumptions,
    resetToDefaults,
  }
}

export default useDefaults
