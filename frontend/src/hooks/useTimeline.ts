'use client'

/**
 * Hooks for per-property timeline. Note add/delete invalidates both the
 * timeline query and the saved-properties list (kanban badges may change in
 * the future when we surface activity counts).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import type { TimelineEvent } from '@/types/timeline'

export const TIMELINE_KEYS = {
  all: ['timeline'] as const,
  forProperty: (propertyId: string) => [...TIMELINE_KEYS.all, propertyId] as const,
}

export function useTimeline(propertyId: string | null) {
  return useQuery({
    queryKey: TIMELINE_KEYS.forProperty(propertyId ?? ''),
    queryFn: () => api.get<TimelineEvent[]>(`/api/v1/properties/saved/${propertyId}/timeline`),
    enabled: !!propertyId,
    staleTime: 10_000,
  })
}

export function useAddNote(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) =>
      api.post<TimelineEvent>(`/api/v1/properties/saved/${propertyId}/timeline/notes`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}

export function useDeleteNote(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (adjustmentId: string) =>
      api.delete<void>(`/api/v1/properties/saved/${propertyId}/timeline/notes/${adjustmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
    },
  })
}
