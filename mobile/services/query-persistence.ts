/**
 * React Query cache persistence — AsyncStorage backend.
 *
 * Persists the React Query cache to AsyncStorage so that previously
 * viewed Verdicts, Strategies, Property details, and DealVault data
 * are available offline.
 *
 * Only persists query keys matching a whitelist — no auth or mutation data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

const CACHE_KEY = 'dgiq_query_cache';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const PERSIST_KEY_PREFIXES = [
  'property-search',
  'verdict',
  'worksheet',
  'saved-properties',
  'search-history',
  'property',
  'photos',
  'billing',
  'user',
];

interface PersistedEntry {
  queryKey: unknown[];
  data: unknown;
  dataUpdatedAt: number;
}

function shouldPersist(queryKey: unknown[]): boolean {
  const first = String(queryKey[0] ?? '');
  return PERSIST_KEY_PREFIXES.some((prefix) => first.startsWith(prefix));
}

/**
 * Save the current query cache to AsyncStorage.
 * Called periodically and on app background.
 */
export async function persistQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const cache = queryClient.getQueryCache();
    const entries: PersistedEntry[] = [];

    for (const query of cache.getAll()) {
      if (
        query.state.status === 'success' &&
        query.state.data != null &&
        shouldPersist(query.queryKey as unknown[]) &&
        Date.now() - query.state.dataUpdatedAt < MAX_AGE_MS
      ) {
        entries.push({
          queryKey: query.queryKey as unknown[],
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        });
      }
    }

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('[QueryPersistence] Failed to save cache:', err);
  }
}

/**
 * Restore persisted cache into the QueryClient.
 * Called once at app startup, before rendering.
 */
export async function restoreQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const entries: PersistedEntry[] = JSON.parse(raw);
    const now = Date.now();

    for (const entry of entries) {
      if (now - entry.dataUpdatedAt > MAX_AGE_MS) continue;

      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }
  } catch (err) {
    console.warn('[QueryPersistence] Failed to restore cache:', err);
  }
}

/**
 * Clear the persisted cache (e.g., on logout).
 */
export async function clearPersistedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // silent
  }
}
