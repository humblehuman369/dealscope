'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  AlertFrequency,
  SavedMapSearch,
  SavedMapSearchCreate,
  SavedMapSearchList,
} from '@/lib/api'

const QUERY_KEY = ['saved-map-searches'] as const

/**
 * Saved map searches and their new-inventory alert schedule.
 *
 * Pro-gated on the backend, so `enabled` should reflect the caller's plan —
 * fetching for a free user would return 403 on every mount. The gate UI is
 * rendered by the caller instead.
 */
export function useSavedMapSearches(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true

  const query = useQuery<SavedMapSearchList>({
    queryKey: QUERY_KEY,
    queryFn: () => api.savedMapSearches.list(),
    enabled,
    staleTime: 60_000,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })

  const create = useMutation({
    mutationFn: (payload: SavedMapSearchCreate) => api.savedMapSearches.create(payload),
    onSuccess: (search) => {
      invalidate()
      toast.success(`Saved "${search.name}"`)
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save this search'),
  })

  const setAlertFrequency = useMutation({
    mutationFn: ({ id, frequency }: { id: string; frequency: AlertFrequency }) =>
      api.savedMapSearches.update(id, { alert_frequency: frequency }),
    onSuccess: (search) => {
      invalidate()
      toast.success(
        search.alert_frequency === 'off'
          ? `Alerts off for "${search.name}"`
          : `You'll get ${search.alert_frequency} emails for "${search.name}"`,
      )
    },
    // The backend refuses a schedule on expensive search modes and returns the
    // reason as the error detail, so surfacing it verbatim explains the refusal.
    onError: (error: Error) => toast.error(error.message || 'Could not change alerts'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.savedMapSearches.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success('Saved search deleted')
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete this search'),
  })

  const searches: SavedMapSearch[] = query.data?.searches ?? []
  const maxAllowed = query.data?.max_allowed ?? 0

  return {
    searches,
    maxAllowed,
    isAtLimit: maxAllowed > 0 && searches.length >= maxAllowed,
    isLoading: query.isLoading,
    error: query.error,
    create,
    setAlertFrequency,
    remove,
  }
}
