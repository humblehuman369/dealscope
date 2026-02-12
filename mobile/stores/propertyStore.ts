/**
 * Property Store — Current property tracking and search history.
 *
 * Mirrors frontend/src/stores/index.ts (usePropertyStore).
 *
 * Persisted to AsyncStorage so search history survives app restarts.
 * Keeps the last 20 searches (mobile gets more since users may not
 * have easy access to browser history).
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

export interface SavedProperty {
  id: string;
  address: string;
  price: number;
  status: 'watching' | 'analyzing' | 'offer_sent' | 'under_contract' | 'closed' | 'passed';
  savedAt: number;
  notes?: string;
  thumbnailUrl?: string | null;
}

const MAX_RECENT_SEARCHES = 20;

// ─── Store ───────────────────────────────────────────────────────────────────

interface PropertyStore {
  // Current property being viewed
  currentPropertyId: string | null;
  currentProperty: CurrentPropertyInfo | null;

  // Recent searches
  recentSearches: RecentSearch[];

  // Saved / pipeline properties
  savedProperties: SavedProperty[];

  // Actions — Current property
  setCurrentProperty: (propertyId: string) => void;
  setCurrentPropertyInfo: (info: CurrentPropertyInfo) => void;
  clearCurrentProperty: () => void;

  // Actions — Search history
  addRecentSearch: (search: Omit<RecentSearch, 'timestamp'>) => void;
  removeRecentSearch: (propertyId: string) => void;
  clearRecentSearches: () => void;

  // Actions — Saved properties
  saveProperty: (property: Omit<SavedProperty, 'savedAt'>) => void;
  updatePropertyStatus: (id: string, status: SavedProperty['status']) => void;
  updatePropertyNotes: (id: string, notes: string) => void;
  removeProperty: (id: string) => void;
  clearSavedProperties: () => void;
}

export const usePropertyStore = create<PropertyStore>()(
  persist(
    (set) => ({
      currentPropertyId: null,
      currentProperty: null,
      recentSearches: [],
      savedProperties: [],

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

      // ── Saved properties ──────────────────────────────────────────

      saveProperty: (property) =>
        set((state) => {
          const exists = state.savedProperties.find((p) => p.id === property.id);
          if (exists) {
            return {
              savedProperties: state.savedProperties.map((p) =>
                p.id === property.id ? { ...p, ...property, savedAt: Date.now() } : p
              ),
            };
          }
          return {
            savedProperties: [
              { ...property, savedAt: Date.now() },
              ...state.savedProperties,
            ],
          };
        }),

      updatePropertyStatus: (id, status) =>
        set((state) => ({
          savedProperties: state.savedProperties.map((p) =>
            p.id === id ? { ...p, status } : p
          ),
        })),

      updatePropertyNotes: (id, notes) =>
        set((state) => ({
          savedProperties: state.savedProperties.map((p) =>
            p.id === id ? { ...p, notes } : p
          ),
        })),

      removeProperty: (id) =>
        set((state) => ({
          savedProperties: state.savedProperties.filter((p) => p.id !== id),
        })),

      clearSavedProperties: () =>
        set({ savedProperties: [] }),
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

/** Get saved properties filtered by status */
export const useSavedByStatus = (status: SavedProperty['status']) =>
  usePropertyStore((state) =>
    state.savedProperties.filter((p) => p.status === status)
  );

/** Check if a property is saved */
export const useIsPropertySaved = (propertyId: string) =>
  usePropertyStore((state) =>
    state.savedProperties.some((p) => p.id === propertyId)
  );
