'use client'

/**
 * Hooks for the per-property action plan.
 *
 * Create returns the template immediately. While status is queued/researching,
 * GET /action-plan/:id is polled every five seconds (OpenAI poll interval).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { CONTACTS_KEYS } from '@/hooks/useContacts'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import { TASKS_KEYS } from '@/hooks/useTasks'
import { isPlanResearching, type ActionPlan, type ActionPlanApplyResult } from '@/types/actionPlan'

export const ACTION_PLAN_POLL_MS = 5_000

export const ACTION_PLAN_KEYS = {
  all: ['action-plan'] as const,
  forProperty: (propertyId: string) => [...ACTION_PLAN_KEYS.all, 'property', propertyId] as const,
  byId: (planId: string) => [...ACTION_PLAN_KEYS.all, 'id', planId] as const,
}

export function useCreateActionPlan(propertyId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => {
      if (!propertyId) {
        return Promise.reject(new Error('Property is not saved'))
      }
      return api.post<ActionPlan>(`/api/v1/properties/saved/${propertyId}/action-plan`, {})
    },
    onSuccess: (plan) => {
      if (propertyId) {
        qc.setQueryData(ACTION_PLAN_KEYS.forProperty(propertyId), plan)
      }
      qc.setQueryData(ACTION_PLAN_KEYS.byId(plan.id), plan)
    },
  })
}

export function useActionPlanPoll(planId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: planId ? ACTION_PLAN_KEYS.byId(planId) : [...ACTION_PLAN_KEYS.all, 'idle'],
    queryFn: () => {
      if (!planId) {
        return Promise.reject(new Error('plan id required'))
      }
      return api.get<ActionPlan>(`/api/v1/action-plan/${planId}`)
    },
    enabled: Boolean(planId) && enabled,
    refetchInterval: (query) => (isPlanResearching(query.state.data) ? ACTION_PLAN_POLL_MS : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (query) => isPlanResearching(query.state.data),
  })
}

export function useApplyActionPlan(propertyId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) =>
      api.post<ActionPlanApplyResult>(`/api/v1/action-plan/${planId}/apply`, {}),
    onSuccess: () => {
      if (!propertyId) return
      qc.invalidateQueries({ queryKey: TASKS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: CONTACTS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.lists() })
    },
  })
}
