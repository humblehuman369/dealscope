'use client'

/**
 * useDashboardData — centralised, auth-gated data fetching for the dashboard.
 *
 * Key design decisions:
 *  1. Every query is `enabled: isAuthenticated` so nothing fires until
 *     the session cookie has been confirmed by useSession.
 *  2. `softAuth: true` on every call so a stale 401 doesn't hard-redirect
 *     the user away from the dashboard — it surfaces as an error instead.
 *  3. Console tracing on success AND error so we can diagnose issues on
 *     the live site via the browser console.
 *  4. Types match the backend Pydantic models exactly.
 */

import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api-client'

// ------------------------------------------------------------------
// Types — exact mirrors of backend Pydantic schemas
// ------------------------------------------------------------------

export interface PropertyStats {
  total: number
  by_status: Record<string, number>
  total_estimated_value?: number
  total_monthly_cash_flow?: number
  average_coc_return?: number
}

export interface SavedProperty {
  id: string
  address_street: string
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  nickname: string | null
  status: string
  tags: string[] | null
  color_label: string | null
  priority: number | null
  best_strategy: string | null
  best_cash_flow: number | null
  best_coc_return: number | null
  saved_at: string
  last_viewed_at: string | null
  updated_at: string
}

export interface SearchHistoryItem {
  id: string
  search_query: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  result_summary?: {
    property_type?: string
    bedrooms?: number
    bathrooms?: number
    square_footage?: number
    estimated_value?: number
    rent_estimate?: number
  }
  search_source?: string
  was_successful: boolean
  was_saved: boolean
  searched_at: string
}

export interface SearchStats {
  total_searches: number
  successful_searches: number
  saved_from_search: number
  searches_this_week: number
  searches_this_month: number
  top_markets: { state: string; count: number }[]
}

// ------------------------------------------------------------------
// Traced fetch wrapper
// ------------------------------------------------------------------

async function tracedGet<T>(label: string, endpoint: string): Promise<T> {
  try {
    const data = await api.get<T>(endpoint, { softAuth: true })
    console.log(`[DealHub] ${label} OK:`, data)
    return data
  } catch (err) {
    console.error(`[DealHub] ${label} FAILED:`, err)
    throw err
  }
}

// ------------------------------------------------------------------
// Hook: overview data (stats + recent 5 properties + recent 5 searches)
// ------------------------------------------------------------------

export function useDashboardOverview() {
  const { isAuthenticated } = useSession()

  const stats = useQuery<PropertyStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => tracedGet<PropertyStats>('stats', '/api/v1/properties/saved/stats'),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })

  const recentProperties = useQuery<SavedProperty[]>({
    queryKey: ['dashboard', 'recentProperties'],
    queryFn: () => tracedGet<SavedProperty[]>('recentProperties', '/api/v1/properties/saved?limit=5'),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })

  const recentSearches = useQuery<SearchHistoryItem[]>({
    queryKey: ['dashboard', 'recentSearches'],
    queryFn: () => tracedGet<SearchHistoryItem[]>('recentSearches', '/api/v1/search-history/recent?limit=5'),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })

  return { stats, recentProperties, recentSearches }
}

// ------------------------------------------------------------------
// Hook: full property list (for /dashboard/properties)
// ------------------------------------------------------------------

export function useSavedProperties(statusFilter: string) {
  const { isAuthenticated } = useSession()

  const params = new URLSearchParams({ limit: '100' })
  if (statusFilter !== 'all') params.set('status', statusFilter)

  const properties = useQuery<SavedProperty[]>({
    queryKey: ['savedProperties', statusFilter],
    queryFn: () => tracedGet<SavedProperty[]>('savedProperties', `/api/v1/properties/saved?${params}`),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })

  const stats = useQuery<PropertyStats>({
    queryKey: ['savedProperties', 'stats'],
    queryFn: () => tracedGet<PropertyStats>('propertyStats', '/api/v1/properties/saved/stats'),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  return { properties, stats }
}

// ------------------------------------------------------------------
// Hook: search activity log (for /dashboard/activity)
// ------------------------------------------------------------------

interface SearchHistoryResponse {
  items: SearchHistoryItem[]
  total: number
  limit: number
  offset: number
}

export function useActivityLog(successfulOnly: boolean) {
  const { isAuthenticated } = useSession()

  const history = useQuery<SearchHistoryResponse>({
    queryKey: ['activityLog', successfulOnly],
    queryFn: () => tracedGet<SearchHistoryResponse>(
      'activityLog',
      `/api/v1/search-history?limit=50&successful_only=${successfulOnly}`
    ),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  })

  const stats = useQuery<SearchStats>({
    queryKey: ['activityLog', 'stats'],
    queryFn: () => tracedGet<SearchStats>('searchStats', '/api/v1/search-history/stats'),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  return { history, stats }
}
