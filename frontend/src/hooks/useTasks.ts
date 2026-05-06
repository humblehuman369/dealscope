'use client'

/**
 * Hooks for property tasks. Mutations invalidate the saved-properties list so
 * the kanban card task badges reflect the new state without a full refetch.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  PropertyTask,
  PropertyTaskCreate,
  PropertyTaskUpdate,
} from '@/types/task'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'

export const TASKS_KEYS = {
  all: ['tasks'] as const,
  forProperty: (propertyId: string) => [...TASKS_KEYS.all, propertyId] as const,
}

export function useTasks(propertyId: string | null) {
  return useQuery({
    queryKey: TASKS_KEYS.forProperty(propertyId ?? ''),
    queryFn: () =>
      api.get<PropertyTask[]>(`/api/v1/properties/saved/${propertyId}/tasks`),
    enabled: !!propertyId,
    staleTime: 15_000,
  })
}

export function useCreateTask(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PropertyTaskCreate) =>
      api.post<PropertyTask>(`/api/v1/properties/saved/${propertyId}/tasks`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}

export function useUpdateTask(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, body }: { taskId: string; body: PropertyTaskUpdate }) =>
      api.patch<PropertyTask>(
        `/api/v1/properties/saved/${propertyId}/tasks/${taskId}`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}

export function useDeleteTask(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete<void>(`/api/v1/properties/saved/${propertyId}/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}
