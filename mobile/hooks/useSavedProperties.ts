/**
 * useSavedProperties — React Query hooks for DealVaultIQ (saved properties).
 *
 * Mirrors the frontend's useSavedProperties + useSaveProperty hooks.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { api, ApiError } from '@/services/api';
import { useSession } from './useSession';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyStatus =
  | 'watching'
  | 'analyzing'
  | 'contacted'
  | 'under_contract'
  | 'owned'
  | 'passed'
  | 'archived';

export interface SavedPropertySummary {
  id: string;
  user_id: string;
  display_address: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  zpid?: string;
  status: PropertyStatus;
  notes?: string;
  best_strategy?: string;
  best_cash_flow?: number;
  best_coc_return?: number;
  verdict_score?: number;
  deal_gap_pct?: number;
  target_buy_price?: number;
  list_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  created_at: string;
  updated_at: string;
}

export interface SavedPropertyStats {
  total: number;
  by_status: Record<string, number>;
}

interface SavedPropertyListResponse {
  items: SavedPropertySummary[];
  total?: number;
}

interface CheckSavedResponse {
  is_saved: boolean;
  saved_property_id?: string;
}

interface SavePropertyPayload {
  display_address: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  zpid?: string;
  status?: PropertyStatus;
  list_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const SAVED_PROPS_KEYS = {
  all: ['saved-properties'] as const,
  lists: () => [...SAVED_PROPS_KEYS.all, 'list'] as const,
  list: (params: object) => [...SAVED_PROPS_KEYS.lists(), params] as const,
  stats: () => [...SAVED_PROPS_KEYS.all, 'stats'] as const,
  check: (address: string) => [...SAVED_PROPS_KEYS.all, 'check', address] as const,
};

// ---------------------------------------------------------------------------
// List + Stats
// ---------------------------------------------------------------------------

export function useSavedProperties(params: {
  page: number;
  pageSize: number;
  status?: PropertyStatus | 'all';
  search?: string;
  sort?: string;
}) {
  const { isAuthenticated } = useSession();
  const offset = params.page * params.pageSize;

  return useQuery({
    queryKey: SAVED_PROPS_KEYS.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('limit', String(params.pageSize));
      sp.set('offset', String(offset));
      if (params.status && params.status !== 'all') sp.set('status', params.status);
      if (params.search?.trim()) sp.set('search', params.search.trim());
      if (params.sort) sp.set('sort', params.sort);

      const data = await api.get<SavedPropertyListResponse>(
        `/api/v1/properties/saved?${sp}`,
      );
      return data.items ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useSavedPropertyStats() {
  const { isAuthenticated } = useSession();
  return useQuery<SavedPropertyStats>({
    queryKey: SAVED_PROPS_KEYS.stats(),
    queryFn: () => api.get<SavedPropertyStats>('/api/v1/properties/saved/stats'),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Delete (with optimistic removal)
// ---------------------------------------------------------------------------

export function useDeleteSavedProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/properties/saved/${id}`),
    onMutate: async (deletedId) => {
      await qc.cancelQueries({ queryKey: SAVED_PROPS_KEYS.lists() });
      const previousLists = qc.getQueriesData<SavedPropertySummary[]>({
        queryKey: SAVED_PROPS_KEYS.lists(),
      });
      qc.setQueriesData<SavedPropertySummary[]>(
        { queryKey: SAVED_PROPS_KEYS.lists() },
        (old) => old?.filter((p) => p.id !== deletedId),
      );
      return { previousLists };
    },
    onError: (_err, _id, context) => {
      context?.previousLists?.forEach(([key, data]) => {
        qc.setQueryData(key, data);
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SAVED_PROPS_KEYS.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Save / Unsave toggle
// ---------------------------------------------------------------------------

export function useSaveProperty(displayAddress: string) {
  const { isAuthenticated } = useSession();
  const qc = useQueryClient();

  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Check saved status
  const { data: checkData } = useQuery<CheckSavedResponse>({
    queryKey: SAVED_PROPS_KEYS.check(displayAddress),
    queryFn: () =>
      api.get<CheckSavedResponse>(
        `/api/v1/properties/saved/check?address=${encodeURIComponent(displayAddress)}`,
      ),
    enabled: isAuthenticated && !!displayAddress,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (checkData) {
      setIsSaved(checkData.is_saved);
      setSavedId(checkData.saved_property_id ?? null);
    }
  }, [checkData]);

  const saveMutation = useMutation({
    mutationFn: (payload: SavePropertyPayload) =>
      api.post<{ id: string }>('/api/v1/properties/saved', payload),
    onSuccess: (result) => {
      setIsSaved(true);
      setSavedId(result.id);
      qc.invalidateQueries({ queryKey: SAVED_PROPS_KEYS.all });
    },
  });

  const unsaveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/properties/saved/${id}`),
    onSuccess: () => {
      setIsSaved(false);
      setSavedId(null);
      qc.invalidateQueries({ queryKey: SAVED_PROPS_KEYS.all });
    },
  });

  const save = useCallback(
    (snapshot?: Partial<SavePropertyPayload>) => {
      const parts = displayAddress.split(',').map((s) => s.trim());
      return saveMutation.mutateAsync({
        display_address: displayAddress,
        address_street: parts[0],
        address_city: parts[1],
        address_state: parts[2]?.split(' ')[0],
        address_zip: parts[2]?.split(' ')[1],
        status: 'watching',
        ...snapshot,
      });
    },
    [displayAddress, saveMutation],
  );

  const unsave = useCallback(() => {
    if (savedId) return unsaveMutation.mutateAsync(savedId);
    return Promise.resolve();
  }, [savedId, unsaveMutation]);

  const toggle = useCallback(
    (snapshot?: Partial<SavePropertyPayload>) => {
      return isSaved ? unsave() : save(snapshot);
    },
    [isSaved, save, unsave],
  );

  return {
    isSaved,
    savedId,
    isSaving: saveMutation.isPending || unsaveMutation.isPending,
    save,
    unsave,
    toggle,
  };
}
