/**
 * Property Store — Current property tracking and recent search history.
 *
 * Persisted to AsyncStorage so recent searches survive app restarts.
 * Keeps the last 20 searches.
 *
 * NOTE: Saved/pipeline properties are NOT stored here — they live in
 * SQLite (saved_properties table) synced via syncManager. This store
 * only manages transient navigation state and the lightweight
 * recently-viewed list.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CurrentPropertyInfo {
  propertyId: string;
  zpid: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  estimatedValue: number | null;
  thumbnailUrl: string | null;
}

export interface RecentSearch {
  address: string;
  propertyId: string;
  timestamp: number;
  thumbnailUrl?: string | null;
  price?: number | null;
  beds?: number | null;
  baths?: number | null;
}

const MAX_RECENT_SEARCHES = 20;

// ─── Store ───────────────────────────────────────────────────────────────────

interface PropertyStore {
  // Current property being viewed (transient navigation state)
  currentPropertyId: string | null;
  currentProperty: CurrentPropertyInfo | null;

  // Recent searches (lightweight recently-viewed list)
  recentSearches: RecentSearch[];

  // Actions — Current property
  setCurrentProperty: (propertyId: string) => void;
  setCurrentPropertyInfo: (info: CurrentPropertyInfo) => void;
  clearCurrentProperty: () => void;

  // Actions — Search history
  addRecentSearch: (search: Omit<RecentSearch, 'timestamp'>) => void;
  removeRecentSearch: (propertyId: string) => void;
  clearRecentSearches: () => void;
}

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set) => ({
      currentPropertyId: null,
      currentProperty: null,
      recentSearches: [],

      // ── Current property ──────────────────────────────────────────

      setCurrentProperty: (propertyId) =>
        set({ currentPropertyId: propertyId }),

      setCurrentPropertyInfo: (info) =>
        set({ currentPropertyId: info.propertyId, currentProperty: info }),

      clearCurrentProperty: () =>
        set({ currentPropertyId: null, currentProperty: null }),

      // ── Search history ────────────────────────────────────────────

      addRecentSearch: (search) =>
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.propertyId !== search.propertyId
          );
          return {
            recentSearches: [
              { ...search, timestamp: Date.now() },
              ...filtered,
            ].slice(0, MAX_RECENT_SEARCHES),
          };
        }),

      removeRecentSearch: (propertyId) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter(
            (s) => s.propertyId !== propertyId
          ),
        })),

      clearRecentSearches: () =>
        set({ recentSearches: [] }),
    }),
    {
      name: 'investiq-property',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

/** Get recent searches sorted by most recent first */
export const useRecentSearches = () =>
  usePropertyStore((state) => state.recentSearches);
