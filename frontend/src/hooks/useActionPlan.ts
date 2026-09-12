'use client'

/**
 * Hooks for the per-property action plan (Phase 0: template only).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { CONTACTS_KEYS } from '@/hooks/useContacts'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import { TASKS_KEYS } from '@/hooks/useTasks'
import type { ActionPlan, ActionPlanApplyResult } from '@/types/actionPlan'

export const ACTION_PLAN_KEYS = {
  all: ['action-plan'] as const,
  forProperty: (propertyId: string) => [...ACTION_PLAN_KEYS.all, propertyId] as const,
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
    },
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
