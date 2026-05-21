'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, apiRequest } from '@/lib/api-client'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import type { PropertySnapshot } from '@/hooks/useSaveProperty'
import { parseAddressString } from '@/utils/formatters'
import { writeDealMakerOverrides } from '@/utils/addressIdentity'
import type { DealMakerUpdate } from '@/stores/dealMakerStore'

export interface ApplyToDealPayload {
  marketValueOverride?: number
  monthlyRentOverride?: number
  arv?: number
}

export type ApplyToDealKind = 'market_value' | 'arv' | 'market_rent' | 'improved_rent'

const SUCCESS_MESSAGES: Record<ApplyToDealKind, string> = {
  market_value: 'Market value saved to your analysis',
  arv: 'After-repair value saved to your worksheet',
  market_rent: 'Monthly rent saved to your analysis',
  improved_rent: 'Monthly rent saved to your analysis',
}

export interface UseApplyToDealOptions {
  displayAddress: string
  propertySnapshot?: PropertySnapshot | null
}

function buildPatchBody(payload: ApplyToDealPayload): DealMakerUpdate {
  const body: DealMakerUpdate = {}
  if (payload.marketValueOverride != null && payload.marketValueOverride > 0) {
    body.market_value_override = payload.marketValueOverride
  }
  if (payload.monthlyRentOverride != null && payload.monthlyRentOverride > 0) {
    body.monthly_rent_override = payload.monthlyRentOverride
    body.monthly_rent = payload.monthlyRentOverride
  }
  if (payload.arv != null && payload.arv > 0) {
    body.arv = payload.arv
  }
  return body
}

function buildSessionPatch(
  payload: ApplyToDealPayload,
): Record<string, unknown> {
  const patch: Record<string, unknown> = { origin: 'dealmaker_edit' as const }
  if (payload.marketValueOverride != null && payload.marketValueOverride > 0) {
    patch.listPrice = payload.marketValueOverride
    patch.price = payload.marketValueOverride
  }
  if (payload.monthlyRentOverride != null && payload.monthlyRentOverride > 0) {
    patch.monthlyRent = payload.monthlyRentOverride
  }
  if (payload.arv != null && payload.arv > 0) {
    patch.arv = payload.arv
  }
  return patch
}

export function useApplyToDeal({ displayAddress, propertySnapshot }: UseApplyToDealOptions) {
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const queryClient = useQueryClient()
  const [isApplying, setIsApplying] = useState(false)
  const pendingRef = useRef<{ payload: ApplyToDealPayload; kind: ApplyToDealKind } | null>(null)

  const persistToDeal = useCallback(
    async (payload: ApplyToDealPayload, kind: ApplyToDealKind) => {
      if (!displayAddress) {
        throw new Error('Address is required to save')
      }

      const patchBody = buildPatchBody(payload)
      if (Object.keys(patchBody).length === 0) {
        throw new Error('No value to apply')
      }

      setIsApplying(true)
      try {
        const params = new URLSearchParams({ address: displayAddress })
        if (propertySnapshot?.zpid) params.set('zpid', propertySnapshot.zpid)

        const check = await api.get<{ is_saved: boolean; saved_property_id: string | null }>(
          `/api/v1/properties/saved/check?${params.toString()}`,
        )

        let propertyId = check.saved_property_id

        if (!propertyId) {
          const parsed = parseAddressString(displayAddress)
          const snapshot: Record<string, unknown> = {}
          if (propertySnapshot) {
            if (propertySnapshot.street !== undefined) snapshot.street = propertySnapshot.street
            if (propertySnapshot.city !== undefined) snapshot.city = propertySnapshot.city
            if (propertySnapshot.state !== undefined) snapshot.state = propertySnapshot.state
            if (propertySnapshot.zipCode !== undefined) snapshot.zipCode = propertySnapshot.zipCode
            if (propertySnapshot.bedrooms !== undefined) snapshot.bedrooms = propertySnapshot.bedrooms
            if (propertySnapshot.bathrooms !== undefined) snapshot.bathrooms = propertySnapshot.bathrooms
            if (propertySnapshot.sqft !== undefined) snapshot.sqft = propertySnapshot.sqft
            if (propertySnapshot.listPrice !== undefined) snapshot.listPrice = propertySnapshot.listPrice
            if (propertySnapshot.zpid !== undefined) snapshot.zpid = propertySnapshot.zpid
          }

          try {
            const created = await api.post<{ id: string }>('/api/v1/properties/saved', {
              address_street: parsed.street,
              address_city: parsed.city || undefined,
              address_state: parsed.state || undefined,
              address_zip: parsed.zip || undefined,
              full_address: displayAddress,
              zpid: propertySnapshot?.zpid ?? undefined,
              property_data_snapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
              status: 'prospecting',
            })
            propertyId = created?.id ?? null
          } catch (err: unknown) {
            const status = (err as { status?: number })?.status
            if (status === 409) {
              const recheck = await api.get<{ saved_property_id: string | null }>(
                `/api/v1/properties/saved/check?${params.toString()}`,
              )
              propertyId = recheck.saved_property_id
            } else {
              throw err
            }
          }
        }

        if (!propertyId) {
          throw new Error('Could not save property')
        }

        await apiRequest(`/api/v1/properties/saved/${propertyId}/deal-maker`, {
          method: 'PATCH',
          body: patchBody,
        })

        writeDealMakerOverrides(displayAddress, buildSessionPatch(payload), {
          origin: 'dealmaker_edit',
        })

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['deal-maker', 'snapshot', propertyId] }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.detail(propertyId) }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all }),
        ])

        toast.success(SUCCESS_MESSAGES[kind], {
          action: {
            label: 'View in Strategy',
            onClick: () => {
              const strategyParams = new URLSearchParams({ address: displayAddress })
              window.location.href = `/strategy?${strategyParams.toString()}`
            },
          },
        })

        return propertyId
      } finally {
        setIsApplying(false)
      }
    },
    [displayAddress, propertySnapshot, queryClient],
  )

  const applyToDeal = useCallback(
    async (payload: ApplyToDealPayload, kind: ApplyToDealKind) => {
      if (!isAuthenticated) {
        pendingRef.current = { payload, kind }
        openAuthModal('login')
        return
      }

      try {
        await persistToDeal(payload, kind)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to apply value'
        toast.error(message, {
          action: {
            label: 'Retry',
            onClick: () => {
              void persistToDeal(payload, kind)
            },
          },
        })
        throw error
      }
    },
    [isAuthenticated, openAuthModal, persistToDeal],
  )

  useEffect(() => {
    if (!isAuthenticated || !pendingRef.current) return
    const pending = pendingRef.current
    pendingRef.current = null
    void persistToDeal(pending.payload, pending.kind).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to apply value'
      toast.error(message, {
        action: {
          label: 'Retry',
          onClick: () => {
            void persistToDeal(pending.payload, pending.kind)
          },
        },
      })
    })
  }, [isAuthenticated, persistToDeal])

  return { applyToDeal, isApplying }
}
