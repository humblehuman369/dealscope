/**
 * React hooks for database operations.
 * Provides convenient hooks for common database queries with React Query integration.
 */

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDatabase,
  ScannedProperty,
  PortfolioProperty,
  getScannedProperties,
  getScannedPropertyById,
  saveScannedProperty,
  togglePropertyFavorite,
  deleteScannedProperty,
  updatePropertyNotes,
  getPortfolioProperties,
  getPortfolioSummary,
  addPortfolioProperty,
  deletePortfolioProperty,
  getDatabaseStats,
  clearAllData,
  PropertyData,
  AnalyticsData,
} from '../database';

// Query keys for React Query
export const dbQueryKeys = {
  scannedProperties: ['scanned-properties'] as const,
  scannedProperty: (id: string) => ['scanned-property', id] as const,
  portfolioProperties: ['portfolio-properties'] as const,
  portfolioSummary: ['portfolio-summary'] as const,
  databaseStats: ['database-stats'] as const,
};

/**
 * Hook to ensure database is initialized.
 */
export function useDatabaseInit() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await getDatabase();
        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Database init failed'));
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return { isReady, error };
}

/**
 * Hook to get scanned properties list.
 */
export function useScannedProperties(options?: {
  favoritesOnly?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...dbQueryKeys.scannedProperties, options],
    queryFn: () => getScannedProperties(options),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get a single scanned property.
 */
export function useScannedProperty(id: string | null) {
  return useQuery({
    queryKey: dbQueryKeys.scannedProperty(id ?? ''),
    queryFn: () => (id ? getScannedPropertyById(id) : null),
    enabled: !!id,
  });
}

/**
 * Hook to save a scanned property.
 */
export function useSaveScannedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      address: string;
      city: string | null;
      state: string | null;
      zip: string | null;
      lat: number | null;
      lng: number | null;
      propertyData: PropertyData | null;
      analyticsData: AnalyticsData | null;
    }) => {
      return saveScannedProperty(
        params.address,
        params.city,
        params.state,
        params.zip,
        params.lat,
        params.lng,
        params.propertyData,
        params.analyticsData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
    },
  });
}

/**
 * Hook to toggle favorite status.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: togglePropertyFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
    },
  });
}

/**
 * Hook to delete a scanned property.
 */
export function useDeleteScannedProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteScannedProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
    },
  });
}

/**
 * Hook to update property notes.
 */
export function useUpdatePropertyNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updatePropertyNotes(id, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dbQueryKeys.scannedProperty(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
    },
  });
}

/**
 * Hook to get portfolio properties.
 */
export function usePortfolioProperties() {
  return useQuery({
    queryKey: dbQueryKeys.portfolioProperties,
    queryFn: getPortfolioProperties,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get portfolio summary.
 */
export function usePortfolioSummary() {
  return useQuery({
    queryKey: dbQueryKeys.portfolioSummary,
    queryFn: getPortfolioSummary,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to add a portfolio property.
 */
export function useAddPortfolioProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      address: string;
      city: string | null;
      state: string | null;
      zip: string | null;
      purchasePrice: number | null;
      purchaseDate: number | null;
      strategy: string | null;
      propertyData: PropertyData | null;
    }) => {
      return addPortfolioProperty(
        params.address,
        params.city,
        params.state,
        params.zip,
        params.purchasePrice,
        params.purchaseDate,
        params.strategy,
        params.propertyData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioSummary });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
    },
  });
}

/**
 * Hook to delete a portfolio property.
 */
export function useDeletePortfolioProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePortfolioProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioSummary });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
    },
  });
}

/**
 * Hook to get database statistics.
 */
export function useDatabaseStats() {
  return useQuery({
    queryKey: dbQueryKeys.databaseStats,
    queryFn: getDatabaseStats,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to clear all data.
 */
export function useClearAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearAllData,
    onSuccess: () => {
      // Invalidate all database queries
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioSummary });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
    },
  });
}

/**
 * Parse property data JSON from database.
 */
export function parsePropertyData(json: string | null): PropertyData | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Parse analytics data JSON from database.
 */
export function parseAnalyticsData(json: string | null): AnalyticsData | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// =============================================
// SYNC HOOKS
// =============================================

import {
  syncManager,
  getCachedSavedProperties,
  getCachedSearchHistory,
  getCachedDocuments,
  getCachedLOIHistory,
  getSyncStatus,
  SyncResult,
  SyncOptions,
} from '../services/syncManager';
import type {
  CachedSavedProperty,
  CachedSearchHistory,
  CachedDocument,
  CachedLOIHistory,
  SyncMetadata,
} from '../database';

// Additional query keys for sync
export const syncQueryKeys = {
  cachedSavedProperties: ['cached-saved-properties'] as const,
  cachedSearchHistory: ['cached-search-history'] as const,
  cachedDocuments: ['cached-documents'] as const,
  cachedLOIHistory: ['cached-loi-history'] as const,
  syncStatus: ['sync-status'] as const,
};

/**
 * Hook to get cached saved properties from local database.
 */
export function useCachedSavedProperties(options?: {
  status?: string;
  priorityOnly?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: [...syncQueryKeys.cachedSavedProperties, options],
    queryFn: () => getCachedSavedProperties(options),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to get cached search history from local database.
 */
export function useCachedSearchHistory(limit?: number) {
  return useQuery({
    queryKey: [...syncQueryKeys.cachedSearchHistory, limit],
    queryFn: () => getCachedSearchHistory(limit),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get cached documents from local database.
 */
export function useCachedDocuments(propertyId?: string) {
  return useQuery({
    queryKey: [...syncQueryKeys.cachedDocuments, propertyId],
    queryFn: () => getCachedDocuments(propertyId),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get cached LOI history from local database.
 */
export function useCachedLOIHistory(propertyId?: string) {
  return useQuery({
    queryKey: [...syncQueryKeys.cachedLOIHistory, propertyId],
    queryFn: () => getCachedLOIHistory(propertyId),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get sync status for all tables.
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: syncQueryKeys.syncStatus,
    queryFn: getSyncStatus,
    staleTime: 1000 * 10, // 10 seconds
  });
}

/**
 * Hook to perform a full sync.
 */
export function useSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: SyncOptions) => syncManager.syncAll(options),
    onSuccess: () => {
      // Invalidate all cached data queries
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedSavedProperties });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedSearchHistory });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedDocuments });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedLOIHistory });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.syncStatus });
    },
  });
}

/**
 * Hook to sync saved properties only.
 */
export function useSyncSavedProperties() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (onProgress?: (current: number, total: number) => void) =>
      syncManager.syncSavedProperties(onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedSavedProperties });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.syncStatus });
    },
  });
}

/**
 * Hook to process offline queue.
 */
export function useProcessOfflineQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncManager.processOfflineQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
      queryClient.invalidateQueries({ queryKey: dbQueryKeys.portfolioProperties });
    },
  });
}

/**
 * Hook to clear all cached data.
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncManager.clearCache(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedSavedProperties });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedSearchHistory });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedDocuments });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.cachedLOIHistory });
      queryClient.invalidateQueries({ queryKey: syncQueryKeys.syncStatus });
    },
  });
}

