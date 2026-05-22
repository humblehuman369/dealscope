'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import type { PropertySnapshot } from '@/hooks/useSaveProperty'
import type { RehabSelection } from '@/lib/analytics'
import { parseAddressString } from '@/utils/formatters'
import type { RehabBudgetSummary } from '@/types/rehabBudget'

export interface SaveRehabEstimateInput {
  selections: RehabSelection[]
  contingency_pct: number
  notes?: string | null
}

export interface UseSaveRehabEstimateOptions {
  displayAddress: string
  propertySnapshot?: PropertySnapshot | null
  /** When already linked to a saved property (e.g. from URL). */
  savedPropertyId?: string | null
  onSuccess?: (savedPropertyId: string, summary: RehabBudgetSummary) => void
}

async function resolveOrCreatePropertyId(
  displayAddress: string,
  propertySnapshot: PropertySnapshot | null | undefined,
  existingId: string | null | undefined,
): Promise<string | null> {
  if (existingId) return existingId

  const params = new URLSearchParams({ address: displayAddress })
  if (propertySnapshot?.zpid) params.set('zpid', propertySnapshot.zpid)

  const check = await api.get<{ is_saved: boolean; saved_property_id: string | null }>(
    `/api/v1/properties/saved/check?${params.toString()}`,
  )
  if (check.saved_property_id) return check.saved_property_id

  const parsed = parseAddressString(displayAddress)
  try {
    const created = await api.post<{ id: string }>('/api/v1/properties/saved', {
      address_street: parsed.street || displayAddress.split(',')[0]?.trim() || displayAddress,
      address_city: parsed.city || undefined,
      address_state: parsed.state || undefined,
      address_zip: parsed.zip || undefined,
      full_address: displayAddress,
      zpid: propertySnapshot?.zpid ?? undefined,
      status: 'prospecting',
    })
    return created?.id ?? null
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 409) {
      const recheck = await api.get<{ saved_property_id: string | null }>(
        `/api/v1/properties/saved/check?${params.toString()}`,
      )
      return recheck.saved_property_id
    }
    throw err
  }
}

export function useSaveRehabEstimate({
  displayAddress,
  propertySnapshot,
  savedPropertyId: savedPropertyIdProp,
  onSuccess,
}: UseSaveRehabEstimateOptions) {
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const pendingRef = useRef<SaveRehabEstimateInput | null>(null)

  const persistEstimate = useCallback(
    async (input: SaveRehabEstimateInput): Promise<string | null> => {
      if (!displayAddress?.trim()) {
        toast.error('Address is required to save')
        return null
      }
      if (input.selections.length === 0) {
        toast.error('Add scope items before saving')
        return null
      }

      setIsSaving(true)
      try {
        const propertyId = await resolveOrCreatePropertyId(
          displayAddress,
          propertySnapshot,
          savedPropertyIdProp,
        )
        if (!propertyId) {
          toast.error('Could not save property')
          return null
        }

        let summary: RehabBudgetSummary
        try {
          summary = await api.post<RehabBudgetSummary>(
            `/api/v1/properties/saved/${propertyId}/budget/seed`,
            {
              selections: input.selections,
              contingency_pct: input.contingency_pct,
              notes: input.notes,
            },
          )
        } catch (err: unknown) {
          const status = (err as { status?: number })?.status
          if (status === 409) {
            toast.error('Budget baseline is locked. Unlock or edit on the deal Budget tab.')
            return null
          }
          throw err
        }

        const baseline = Math.round(parseFloat(summary.baseline_total))
        if (Number.isFinite(baseline) && baseline > 0) {
          await api.patch(`/api/v1/properties/saved/${propertyId}/deal-maker`, {
            rehab_budget: baseline,
          })
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: SAVED_PROPERTIES_KEYS.rehabBudget(propertyId),
          }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.detail(propertyId) }),
          queryClient.invalidateQueries({ queryKey: ['deal-maker', 'snapshot', propertyId] }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all }),
        ])

        onSuccess?.(propertyId, summary)
        return propertyId
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save estimate'
        toast.error(message)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [displayAddress, propertySnapshot, savedPropertyIdProp, queryClient, onSuccess],
  )

  const saveRehabEstimate = useCallback(
    async (input: SaveRehabEstimateInput): Promise<string | null> => {
      if (!isAuthenticated) {
        pendingRef.current = input
        openAuthModal('login')
        return null
      }
      return persistEstimate(input)
    },
    [isAuthenticated, openAuthModal, persistEstimate],
  )

  useEffect(() => {
    if (!isAuthenticated || !pendingRef.current) return
    const pending = pendingRef.current
    pendingRef.current = null
    void persistEstimate(pending)
  }, [isAuthenticated, persistEstimate])

  return { saveRehabEstimate, isSaving }
}
