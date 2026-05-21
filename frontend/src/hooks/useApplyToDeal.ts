'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import type { PropertySnapshot } from '@/hooks/useSaveProperty'
import { parseAddressString } from '@/utils/formatters'
import { canonicalizeAddressForIdentity, writeDealMakerOverrides } from '@/utils/addressIdentity'
import type { DealMakerUpdate } from '@/stores/dealMakerStore'
import type { PropertyResponse } from '@dealscope/shared'

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
  /** Called after a successful save + PATCH with the saved property id. */
  onSuccess?: (savedPropertyId: string) => void
}

function finitePositive(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) return undefined
  return Math.round(value)
}

function buildPatchBody(payload: ApplyToDealPayload): DealMakerUpdate {
  const body: DealMakerUpdate = {}
  const mv = finitePositive(payload.marketValueOverride)
  const rent = finitePositive(payload.monthlyRentOverride)
  const arv = finitePositive(payload.arv)
  if (mv != null) body.market_value_override = mv
  if (rent != null) {
    body.monthly_rent_override = rent
    body.monthly_rent = rent
  }
  if (arv != null) body.arv = arv
  return body
}

function buildSessionPatch(payload: ApplyToDealPayload): Record<string, unknown> {
  const patch: Record<string, unknown> = { origin: 'dealmaker_edit' as const }
  const mv = finitePositive(payload.marketValueOverride)
  const rent = finitePositive(payload.monthlyRentOverride)
  const arv = finitePositive(payload.arv)
  if (mv != null) {
    patch.listPrice = mv
    patch.price = mv
  }
  if (rent != null) patch.monthlyRent = rent
  if (arv != null) patch.arv = arv
  return patch
}

function buildSnapshotFromProperty(
  propertySnapshot: PropertySnapshot | null | undefined,
  payload: ApplyToDealPayload,
  cached?: PropertyResponse | null,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {}
  if (propertySnapshot) {
    if (propertySnapshot.street !== undefined) snapshot.street = propertySnapshot.street
    if (propertySnapshot.city !== undefined) snapshot.city = propertySnapshot.city
    if (propertySnapshot.state !== undefined) snapshot.state = propertySnapshot.state
    if (propertySnapshot.zipCode !== undefined) snapshot.zipCode = propertySnapshot.zipCode
    if (propertySnapshot.bedrooms !== undefined) snapshot.bedrooms = propertySnapshot.bedrooms
    if (propertySnapshot.bathrooms !== undefined) snapshot.bathrooms = propertySnapshot.bathrooms
    if (propertySnapshot.sqft !== undefined) snapshot.sqft = propertySnapshot.sqft
    if (propertySnapshot.zpid !== undefined) snapshot.zpid = propertySnapshot.zpid
  }
  if (cached) {
    const listing = cached.listing
    const details = cached.details
    const valuations = cached.valuations
    if (listing?.list_price != null) snapshot.listPrice = listing.list_price
    if (valuations?.value_iq_estimate != null) snapshot.value_iq_estimate = valuations.value_iq_estimate
    if (details?.bedrooms != null) snapshot.bedrooms = details.bedrooms
    if (details?.bathrooms != null) snapshot.bathrooms = details.bathrooms
    if (details?.square_footage != null) snapshot.sqft = details.square_footage
    if (cached.rentals?.monthly_rent_ltr != null) snapshot.monthlyRent = cached.rentals.monthly_rent_ltr
    if (cached.market?.property_taxes_annual != null) {
      snapshot.propertyTaxes = cached.market.property_taxes_annual
    }
    if (cached.market?.insurance_annual != null) snapshot.insurance = cached.market.insurance_annual
  }
  const mv = finitePositive(payload.marketValueOverride)
  const rent = finitePositive(payload.monthlyRentOverride)
  const arv = finitePositive(payload.arv)
  if (mv != null) {
    snapshot.listPrice = mv
    snapshot.list_price = mv
  }
  if (rent != null) {
    snapshot.monthlyRent = rent
    snapshot.rent_estimate = rent
  }
  if (arv != null) snapshot.arv = arv
  if (propertySnapshot?.listPrice != null && snapshot.listPrice == null) {
    snapshot.listPrice = propertySnapshot.listPrice
  }
  return snapshot
}

export function useApplyToDeal({
  displayAddress,
  propertySnapshot,
  onSuccess,
}: UseApplyToDealOptions) {
  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()
  const queryClient = useQueryClient()
  const [isApplying, setIsApplying] = useState(false)
  const pendingRef = useRef<{ payload: ApplyToDealPayload; kind: ApplyToDealKind } | null>(null)

  const persistToDeal = useCallback(
    async (payload: ApplyToDealPayload, kind: ApplyToDealKind): Promise<string | null> => {
      if (!displayAddress?.trim()) {
        toast.error('Address is required to save')
        return null
      }

      const patchBody = buildPatchBody(payload)
      if (Object.keys(patchBody).length === 0) {
        toast.error('No valid value to apply')
        return null
      }

      setIsApplying(true)
      try {
        const canonical = canonicalizeAddressForIdentity(displayAddress)
        const cachedProperty = queryClient.getQueryData<PropertyResponse>([
          'property-search',
          canonical,
        ])

        const params = new URLSearchParams({ address: displayAddress })
        if (propertySnapshot?.zpid) params.set('zpid', propertySnapshot.zpid)

        const check = await api.get<{ is_saved: boolean; saved_property_id: string | null }>(
          `/api/v1/properties/saved/check?${params.toString()}`,
        )

        let propertyId = check.saved_property_id

        if (!propertyId) {
          const parsed = parseAddressString(displayAddress)
          const snapshot = buildSnapshotFromProperty(propertySnapshot, payload, cachedProperty)

          try {
            const created = await api.post<{ id: string }>('/api/v1/properties/saved', {
              address_street: parsed.street || displayAddress.split(',')[0]?.trim() || displayAddress,
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
          toast.error('Could not save property')
          return null
        }

        await api.patch(`/api/v1/properties/saved/${propertyId}/deal-maker`, patchBody)

        writeDealMakerOverrides(displayAddress, buildSessionPatch(payload), {
          origin: 'dealmaker_edit',
        })

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['deal-maker', 'snapshot', propertyId] }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.detail(propertyId) }),
          queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all }),
        ])

        onSuccess?.(propertyId)

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
        return null
      } finally {
        setIsApplying(false)
      }
    },
    [displayAddress, propertySnapshot, queryClient, onSuccess],
  )

  const applyToDeal = useCallback(
    async (payload: ApplyToDealPayload, kind: ApplyToDealKind): Promise<string | null> => {
      if (!isAuthenticated) {
        pendingRef.current = { payload, kind }
        openAuthModal('login')
        return null
      }
      return persistToDeal(payload, kind)
    },
    [isAuthenticated, openAuthModal, persistToDeal],
  )

  useEffect(() => {
    if (!isAuthenticated || !pendingRef.current) return
    const pending = pendingRef.current
    pendingRef.current = null
    void persistToDeal(pending.payload, pending.kind)
  }, [isAuthenticated, persistToDeal])

  return { applyToDeal, isApplying }
}
