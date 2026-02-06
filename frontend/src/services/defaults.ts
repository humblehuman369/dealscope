/**
 * Defaults Service
 * 
 * Centralized service for fetching and managing investment calculation defaults.
 * This is the ONLY source for default values in the frontend.
 * 
 * NEVER hardcode default values - always use this service.
 */

import type { AllAssumptions } from '@/stores/index'
import { getAccessToken } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

// Cache for defaults to avoid repeated API calls
let defaultsCache: AllAssumptions | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Response types from the defaults API
 */
export interface ResolvedDefaultsResponse {
  system_defaults: AllAssumptions
  market_adjustments: MarketAdjustments | null
  user_overrides: Partial<AllAssumptions> | null
  resolved: AllAssumptions
  zip_code: string | null
  region: string | null
}

export interface MarketAdjustments {
  zip_code: string
  region: string
  insurance_rate: number
  property_tax_rate: number
  vacancy_rate: number
  rent_to_price_ratio: number
  appreciation_rate: number
}

export interface UserAssumptionsResponse {
  assumptions: Partial<AllAssumptions>
  has_customizations: boolean
  updated_at: string | null
}

/**
 * Get auth token from in-memory store
 */
function getAuthToken(): string | null {
  return getAccessToken()
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    requireAuth?: boolean
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = false } = options
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  } else if (requireAuth) {
    throw new Error('Authentication required')
  }
  
  const config: RequestInit = {
    method,
    headers,
  }
  
  if (body) {
    config.body = JSON.stringify(body)
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `API Error: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Defaults Service
 * 
 * Central service for managing investment calculation defaults.
 */
export const defaultsService = {
  /**
   * Get system defaults (public, no auth required).
   * Cached for 5 minutes.
   */
  async getDefaults(): Promise<AllAssumptions> {
    // Return cached value if valid
    if (defaultsCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      return defaultsCache
    }
    
    try {
      const response = await apiRequest<AllAssumptions>('/api/v1/defaults')
      
      // Update cache
      defaultsCache = response
      cacheTimestamp = Date.now()
      
      // Also cache in localStorage for offline access
      if (typeof window !== 'undefined') {
        localStorage.setItem('investiq_defaults', JSON.stringify(response))
        localStorage.setItem('investiq_defaults_timestamp', String(Date.now()))
      }
      
      return response
    } catch (error) {
      // Fallback to localStorage cache on error
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('investiq_defaults')
        if (cached) {
          console.warn('Using cached defaults due to API error:', error)
          return JSON.parse(cached)
        }
      }
      throw error
    }
  },
  
  /**
   * Get fully resolved defaults for a specific location.
   * Includes market adjustments and user preferences if authenticated.
   */
  async getResolvedDefaults(zipCode?: string): Promise<ResolvedDefaultsResponse> {
    const params = new URLSearchParams()
    if (zipCode) params.set('zip_code', zipCode)
    
    const endpoint = `/api/v1/defaults/resolved${params.toString() ? `?${params}` : ''}`
    return apiRequest<ResolvedDefaultsResponse>(endpoint)
  },
  
  /**
   * Get market-specific adjustments for a ZIP code.
   */
  async getMarketAdjustments(zipCode: string): Promise<MarketAdjustments> {
    return apiRequest<MarketAdjustments>(`/api/v1/defaults/market/${zipCode}`)
  },
  
  /**
   * Get user's saved default assumptions (requires auth).
   */
  async getUserAssumptions(): Promise<UserAssumptionsResponse> {
    return apiRequest<UserAssumptionsResponse>('/api/v1/users/me/assumptions', {
      requireAuth: true,
    })
  },
  
  /**
   * Update user's default assumptions (requires auth).
   * Supports partial updates - only include fields to change.
   */
  async updateUserAssumptions(
    assumptions: Partial<AllAssumptions>
  ): Promise<UserAssumptionsResponse> {
    return apiRequest<UserAssumptionsResponse>('/api/v1/users/me/assumptions', {
      method: 'PUT',
      body: { assumptions },
      requireAuth: true,
    })
  },
  
  /**
   * Reset user's default assumptions to system defaults (requires auth).
   */
  async resetUserAssumptions(): Promise<UserAssumptionsResponse> {
    return apiRequest<UserAssumptionsResponse>('/api/v1/users/me/assumptions', {
      method: 'DELETE',
      requireAuth: true,
    })
  },
  
  /**
   * Clear the local cache.
   */
  clearCache(): void {
    defaultsCache = null
    cacheTimestamp = 0
    if (typeof window !== 'undefined') {
      localStorage.removeItem('investiq_defaults')
      localStorage.removeItem('investiq_defaults_timestamp')
    }
  },
  
  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!getAuthToken()
  },
}

export default defaultsService
