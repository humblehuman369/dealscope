/**
 * Defaults Service for Mobile
 * 
 * Centralized service for fetching and managing investment calculation defaults.
 * This is the ONLY source for default values in the mobile app.
 * 
 * NEVER hardcode default values - always use this service.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// Storage keys
const STORAGE_KEYS = {
  DEFAULTS: 'investiq_defaults',
  DEFAULTS_TIMESTAMP: 'investiq_defaults_timestamp',
  AUTH_TOKEN: 'auth_token',
};

// Cache TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Type definitions for defaults
 */
export interface FinancingDefaults {
  down_payment_pct: number;
  interest_rate: number;
  loan_term_years: number;
  closing_costs_pct: number;
}

export interface OperatingDefaults {
  vacancy_rate: number;
  property_management_pct: number;
  maintenance_pct: number;
  insurance_pct: number;
  utilities_monthly: number;
  landscaping_annual: number;
  pest_control_annual: number;
}

export interface STRDefaults {
  platform_fees_pct: number;
  str_management_pct: number;
  cleaning_cost_per_turnover: number;
  cleaning_fee_revenue: number;
  avg_length_of_stay_days: number;
  supplies_monthly: number;
  additional_utilities_monthly: number;
  furniture_setup_cost: number;
  str_insurance_pct: number;
  buy_discount_pct: number;
}

export interface RehabDefaults {
  renovation_budget_pct: number;
  contingency_pct: number;
  holding_period_months: number;
  holding_costs_pct: number;
}

export interface BRRRRDefaults {
  buy_discount_pct: number;
  refinance_ltv: number;
  refinance_interest_rate: number;
  refinance_term_years: number;
  refinance_closing_costs_pct: number;
  post_rehab_rent_increase_pct: number;
}

export interface FlipDefaults {
  hard_money_ltv: number;
  hard_money_rate: number;
  selling_costs_pct: number;
  holding_period_months: number;
}

export interface HouseHackDefaults {
  fha_down_payment_pct: number;
  fha_mip_rate: number;
  units_rented_out: number;
  buy_discount_pct: number;
}

export interface WholesaleDefaults {
  assignment_fee: number;
  marketing_costs: number;
  earnest_money_deposit: number;
  days_to_close: number;
  target_purchase_discount_pct: number;
}

export interface GrowthDefaults {
  appreciation_rate: number;
  rent_growth_rate: number;
  expense_growth_rate: number;
}

export interface AllDefaults {
  financing: FinancingDefaults;
  operating: OperatingDefaults;
  str: STRDefaults;
  rehab: RehabDefaults;
  brrrr: BRRRRDefaults;
  flip: FlipDefaults;
  house_hack: HouseHackDefaults;
  wholesale: WholesaleDefaults;
  growth: GrowthDefaults;
  buy_discount_pct: number;
}

export interface MarketAdjustments {
  zip_code: string;
  region: string;
  insurance_rate: number;
  property_tax_rate: number;
  vacancy_rate: number;
  rent_to_price_ratio: number;
  appreciation_rate: number;
}

export interface ResolvedDefaultsResponse {
  system_defaults: AllDefaults;
  market_adjustments: MarketAdjustments | null;
  user_overrides: Partial<AllDefaults> | null;
  resolved: AllDefaults;
  zip_code: string | null;
  region: string | null;
}

/**
 * Fallback defaults used when API is unavailable.
 * These should match backend/app/core/defaults.py
 */
export const FALLBACK_DEFAULTS: AllDefaults = {
  financing: {
    down_payment_pct: 0.20,
    interest_rate: 0.06,
    loan_term_years: 30,
    closing_costs_pct: 0.03,
  },
  operating: {
    vacancy_rate: 0.01,
    property_management_pct: 0.00,
    maintenance_pct: 0.05,
    insurance_pct: 0.01,
    utilities_monthly: 100,
    landscaping_annual: 0,
    pest_control_annual: 200,
  },
  str: {
    platform_fees_pct: 0.15,
    str_management_pct: 0.10,
    cleaning_cost_per_turnover: 150,
    cleaning_fee_revenue: 75,
    avg_length_of_stay_days: 6,
    supplies_monthly: 100,
    additional_utilities_monthly: 0,
    furniture_setup_cost: 6000,
    str_insurance_pct: 0.01,
    buy_discount_pct: 0.05,
  },
  rehab: {
    renovation_budget_pct: 0.05,
    contingency_pct: 0.05,
    holding_period_months: 4,
    holding_costs_pct: 0.01,
  },
  brrrr: {
    buy_discount_pct: 0.05,
    refinance_ltv: 0.75,
    refinance_interest_rate: 0.06,
    refinance_term_years: 30,
    refinance_closing_costs_pct: 0.03,
    post_rehab_rent_increase_pct: 0.10,
  },
  flip: {
    hard_money_ltv: 0.90,
    hard_money_rate: 0.12,
    selling_costs_pct: 0.06,
    holding_period_months: 6,
  },
  house_hack: {
    fha_down_payment_pct: 0.035,
    fha_mip_rate: 0.0085,
    units_rented_out: 2,
    buy_discount_pct: 0.05,
  },
  wholesale: {
    assignment_fee: 15000,
    marketing_costs: 500,
    earnest_money_deposit: 1000,
    days_to_close: 45,
    target_purchase_discount_pct: 0.30,
  },
  growth: {
    appreciation_rate: 0.05,
    rent_growth_rate: 0.05,
    expense_growth_rate: 0.03,
  },
  buy_discount_pct: 0.05,
};

// In-memory cache
let memoryCache: AllDefaults | null = null;
let memoryCacheTimestamp: number = 0;

/**
 * Get auth token from AsyncStorage
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

/**
 * Make API request with optional auth
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = false } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error('Authentication required');
  }
  
  const config: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Defaults Service for Mobile
 */
export const defaultsService = {
  /**
   * Get system defaults (public, no auth required).
   * Uses in-memory cache and AsyncStorage for offline access.
   */
  async getDefaults(): Promise<AllDefaults> {
    // Return memory cache if valid
    if (memoryCache && Date.now() - memoryCacheTimestamp < CACHE_TTL_MS) {
      return memoryCache;
    }
    
    try {
      const response = await apiRequest<AllDefaults>('/api/v1/defaults');
      
      // Update caches
      memoryCache = response;
      memoryCacheTimestamp = Date.now();
      
      // Persist to AsyncStorage for offline access
      await AsyncStorage.setItem(STORAGE_KEYS.DEFAULTS, JSON.stringify(response));
      await AsyncStorage.setItem(STORAGE_KEYS.DEFAULTS_TIMESTAMP, String(Date.now()));
      
      return response;
    } catch (error) {
      console.warn('Failed to fetch defaults from API:', error);
      
      // Try AsyncStorage cache
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULTS);
        if (cached) {
          const parsed = JSON.parse(cached);
          memoryCache = parsed;
          memoryCacheTimestamp = Date.now();
          return parsed;
        }
      } catch {
        // Fall through to fallback
      }
      
      // Use fallback defaults
      return FALLBACK_DEFAULTS;
    }
  },
  
  /**
   * Get fully resolved defaults for a specific location.
   * Includes market adjustments and user preferences if authenticated.
   */
  async getResolvedDefaults(zipCode?: string): Promise<ResolvedDefaultsResponse> {
    const params = new URLSearchParams();
    if (zipCode) params.set('zip_code', zipCode);
    
    const endpoint = `/api/v1/defaults/resolved${params.toString() ? `?${params}` : ''}`;
    
    try {
      return await apiRequest<ResolvedDefaultsResponse>(endpoint);
    } catch (error) {
      console.warn('Failed to fetch resolved defaults:', error);
      
      // Return a fallback response
      return {
        system_defaults: FALLBACK_DEFAULTS,
        market_adjustments: null,
        user_overrides: null,
        resolved: FALLBACK_DEFAULTS,
        zip_code: zipCode ?? null,
        region: null,
      };
    }
  },
  
  /**
   * Get market-specific adjustments for a ZIP code.
   */
  async getMarketAdjustments(zipCode: string): Promise<MarketAdjustments | null> {
    try {
      return await apiRequest<MarketAdjustments>(`/api/v1/defaults/market/${zipCode}`);
    } catch {
      return null;
    }
  },
  
  /**
   * Check if user is authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getAuthToken();
    return !!token;
  },
  
  /**
   * Clear all caches.
   */
  async clearCache(): Promise<void> {
    memoryCache = null;
    memoryCacheTimestamp = 0;
    await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULTS);
    await AsyncStorage.removeItem(STORAGE_KEYS.DEFAULTS_TIMESTAMP);
  },
};

/**
 * React hook for accessing centralized defaults.
 * 
 * @param zipCode - Optional ZIP code for market-specific adjustments
 */
export function useDefaults(zipCode?: string): {
  defaults: AllDefaults;
  fullResponse: ResolvedDefaultsResponse | null;
  loading: boolean;
  error: Error | null;
  hasUserCustomizations: boolean;
  region: string | null;
  refetch: () => Promise<void>;
} {
  const [defaults, setDefaults] = useState<AllDefaults>(FALLBACK_DEFAULTS);
  const [fullResponse, setFullResponse] = useState<ResolvedDefaultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchDefaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await defaultsService.getResolvedDefaults(zipCode);
      setFullResponse(response);
      setDefaults(response.resolved);
    } catch (err) {
      console.error('Failed to fetch defaults:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch defaults'));
      
      // Use fallback
      setDefaults(FALLBACK_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [zipCode]);
  
  useEffect(() => {
    fetchDefaults();
  }, [fetchDefaults]);
  
  return {
    defaults,
    fullResponse,
    loading,
    error,
    hasUserCustomizations: !!fullResponse?.user_overrides,
    region: fullResponse?.region ?? null,
    refetch: fetchDefaults,
  };
}

/**
 * Helper to format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Helper to format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default defaultsService;
