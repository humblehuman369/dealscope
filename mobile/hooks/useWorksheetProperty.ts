/**
 * useWorksheetProperty — Load property data for worksheet screens.
 * Matches frontend/src/hooks/useWorksheetProperty.ts
 *
 * Handles:
 * - Fetching saved property by ID from the API
 * - Temporary (unsaved) properties via worksheetStore data
 * - Auth checks and redirect to login
 * - Deduplication and error recovery
 *
 * Mobile adaptation: uses useAuth() instead of useSession(),
 * Expo Router instead of Next.js router.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { useWorksheetStore } from '../stores/worksheetStore';
import type { SavedPropertyResponse } from '../types';

// Re-export for backward compatibility
export type { SavedPropertyResponse };

interface UseWorksheetPropertyOptions {
  onLoaded?: (property: SavedPropertyResponse) => void;
}

// Helper to check if propertyId is a temporary (unsaved) ID
function isTempPropertyId(id: string): boolean {
  return id.startsWith('temp_');
}

// Helper to extract address from temp ID for display
function extractAddressFromTempId(id: string): string {
  if (id.startsWith('temp_zpid_')) {
    return `Property ${id.replace('temp_zpid_', '')}`;
  }
  return decodeURIComponent(id.replace('temp_', ''));
}

export function useWorksheetProperty(
  propertyId: string,
  options: UseWorksheetPropertyOptions = {},
) {
  const { onLoaded } = options;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const worksheetStore = useWorksheetStore();

  const [property, setProperty] = useState<SavedPropertyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use ref to avoid re-fetching when onLoaded changes (prevents infinite loop)
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Track if we've already fetched to prevent duplicate fetches
  const hasFetchedRef = useRef(false);

  const fetchProperty = useCallback(async () => {
    if (!propertyId || hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<SavedPropertyResponse>(
        `/api/v1/properties/saved/${propertyId}`,
      );
      setProperty(data);
      onLoadedRef.current?.(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load property';

      if (message.includes('401') || message.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        router.replace('/auth/login');
        return;
      }

      setError(message || 'Failed to load property. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, router]);

  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) return;

    // Only redirect if auth is done loading AND user is not authenticated
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    // Handle temporary (unsaved) properties — use worksheetStore data
    const isTemp = isTempPropertyId(propertyId);
    if (isTemp) {
      if (worksheetStore.propertyId === propertyId && worksheetStore.propertyData) {
        const syntheticProperty = worksheetStore.propertyData as SavedPropertyResponse;
        setProperty(syntheticProperty);
        setIsLoading(false);
        setError(null);
        onLoadedRef.current?.(syntheticProperty);
        return;
      }

      // Check if we at least have assumptions we can use
      if (worksheetStore.assumptions?.purchasePrice > 0) {
        const syntheticProperty: SavedPropertyResponse = {
          id: propertyId,
          user_id: '',
          address_street: extractAddressFromTempId(propertyId),
          address_city: '',
          address_state: '',
          address_zip: '',
          property_data_snapshot: {
            listPrice: worksheetStore.assumptions.purchasePrice,
            monthlyRent: worksheetStore.assumptions.monthlyRent,
            propertyTaxes: worksheetStore.assumptions.propertyTaxes,
            insurance: worksheetStore.assumptions.insurance,
          },
          worksheet_assumptions: worksheetStore.assumptions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as SavedPropertyResponse;
        setProperty(syntheticProperty);
        setIsLoading(false);
        setError(null);
        onLoadedRef.current?.(syntheticProperty);
        return;
      }

      // No data available
      setError('Property data not found. Please go back to Deal Maker.');
      setIsLoading(false);
      return;
    }

    // Fetch saved property from API
    fetchProperty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isAuthenticated, authLoading, router]);

  // Reset fetch flag when propertyId changes
  useEffect(() => {
    hasFetchedRef.current = false;
    setProperty(null);
    setError(null);
    setIsLoading(true);
  }, [propertyId]);

  return {
    property,
    isLoading: authLoading || isLoading,
    error,
  };
}
