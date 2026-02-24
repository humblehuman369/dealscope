/**
 * Defaults Service — mobile equivalent of frontend/src/services/defaults.ts
 *
 * Fetches resolved investment calculation defaults from the backend,
 * including market adjustments per zip code and user preferences.
 * Uses AsyncStorage for offline fallback caching.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { get } from './apiClient';

const CACHE_KEY = 'dealgapiq_defaults';
const CACHE_TS_KEY = 'dealgapiq_defaults_ts';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let memoryCache: ResolvedDefaults | null = null;
let memoryCacheTs = 0;

export interface ResolvedDefaults {
  financing?: {
    down_payment_pct?: number;
    closing_costs_pct?: number;
    interest_rate?: number;
    loan_term_years?: number;
  };
  operating?: {
    vacancy_rate?: number;
    property_management_pct?: number;
    maintenance_pct?: number;
  };
  appreciation_rate?: number;
  rent_growth_rate?: number;
  [key: string]: unknown;
}

export interface ResolvedDefaultsResponse {
  system_defaults: Record<string, unknown>;
  market_adjustments: Record<string, unknown> | null;
  user_overrides: Record<string, unknown> | null;
  resolved: ResolvedDefaults;
  zip_code: string | null;
  region: string | null;
}

/**
 * Fetch resolved defaults, optionally scoped to a zip code.
 * Uses memory + AsyncStorage cache with 5-minute TTL.
 */
export async function getResolvedDefaults(
  zipCode?: string,
): Promise<ResolvedDefaultsResponse | null> {
  if (memoryCache && Date.now() - memoryCacheTs < CACHE_TTL_MS) {
    return { resolved: memoryCache } as ResolvedDefaultsResponse;
  }

  try {
    const params = zipCode ? `?zip_code=${encodeURIComponent(zipCode)}` : '';
    const response = await get<ResolvedDefaultsResponse>(
      `/api/v1/defaults/resolved${params}`,
    );

    if (response?.resolved) {
      memoryCache = response.resolved;
      memoryCacheTs = Date.now();
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.resolved)).catch(
        () => {},
      );
      AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now())).catch(() => {});
    }

    return response;
  } catch (error) {
    // Fallback to AsyncStorage cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        console.warn('[DefaultsService] Using cached defaults due to API error');
        return { resolved: JSON.parse(cached) } as ResolvedDefaultsResponse;
      }
    } catch {
      /* ignore storage errors */
    }
    return null;
  }
}

export function clearDefaultsCache(): void {
  memoryCache = null;
  memoryCacheTs = 0;
  AsyncStorage.multiRemove([CACHE_KEY, CACHE_TS_KEY]).catch(() => {});
}
