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
  UpcomingTask,
} from '@/types/task'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'

export const TASKS_KEYS = {
  all: ['tasks'] as const,
  forProperty: (propertyId: string) => [...TASKS_KEYS.all, propertyId] as const,
}

export function useTasks(propertyId: string | null) {
  return useQuery({
    queryKey: TASKS_KEYS.forProperty(propertyId ?? ''),
    queryFn: () => api.get<PropertyTask[]>(`/api/v1/properties/saved/${propertyId}/tasks`),
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
      api.patch<PropertyTask>(`/api/v1/properties/saved/${propertyId}/tasks/${taskId}`, body),
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

/**
 * Tasks due across all of the user's properties — drives the dashboard
 * "Due this week" widget. Refreshes whenever a task changes anywhere.
 */
export function useUpcomingTasks(opts?: { days?: number; limit?: number }) {
  const days = opts?.days ?? 7
  const limit = opts?.limit ?? 25
  return useQuery({
    queryKey: [...TASKS_KEYS.all, 'upcoming', { days, limit }] as const,
    queryFn: () => {
      const sp = new URLSearchParams({ days: String(days), limit: String(limit) })
      return api.get<UpcomingTask[]>(`/api/v1/properties/saved/tasks/upcoming?${sp.toString()}`)
    },
    staleTime: 30_000,
  })
}

/**
 * Bulk reorder tasks by sending IDs in their new desired order. The backend
 * updates ``sort_order`` to match the array index. Returns the property's
 * full task list in the new order so we can rehydrate cache without a
 * separate GET.
 */
export function useReorderTasks(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) =>
      api.post<PropertyTask[]>(`/api/v1/properties/saved/${propertyId}/tasks/reorder`, {
        task_ids: taskIds,
      }),
    // Optimistic: write the reordered list to cache immediately so the user
    // sees the new position even before the server round-trip.
    onMutate: async (taskIds) => {
      await qc.cancelQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      const previous = qc.getQueryData<PropertyTask[]>(TASKS_KEYS.forProperty(propertyId))
      if (previous) {
        const byId = new Map(previous.map((t) => [t.id, t]))
        const reordered = [
          ...taskIds.map((id) => byId.get(id)).filter((t): t is PropertyTask => !!t),
          // Tasks not in the reorder list (e.g. completed ones) stay where they are.
          ...previous.filter((t) => !taskIds.includes(t.id)),
        ]
        qc.setQueryData(TASKS_KEYS.forProperty(propertyId), reordered)
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(TASKS_KEYS.forProperty(propertyId), ctx.previous)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
    },
  })
}

/**
 * Seed stage-templated tasks for a property. Returns the newly-created
 * tasks (existing duplicates are skipped server-side).
 */
export function useSeedTasks(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post<PropertyTask[]>(`/api/v1/properties/saved/${propertyId}/tasks/seed`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}
