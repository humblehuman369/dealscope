'use client'

/**
 * Hooks for the per-property offer tracker. Mirrors useTasks: queries are
 * keyed per property and mutations invalidate that property's offer list.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { PropertyOffer, PropertyOfferCreate, PropertyOfferUpdate } from '@/types/offer'

export const OFFERS_KEYS = {
  all: ['offers'] as const,
  forProperty: (propertyId: string) => [...OFFERS_KEYS.all, propertyId] as const,
}

export function useOffers(propertyId: string | null) {
  return useQuery({
    queryKey: OFFERS_KEYS.forProperty(propertyId ?? ''),
    queryFn: () => api.get<PropertyOffer[]>(`/api/v1/properties/saved/${propertyId}/offers`),
    enabled: !!propertyId,
    staleTime: 15_000,
  })
}

export function useCreateOffer(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PropertyOfferCreate) =>
      api.post<PropertyOffer>(`/api/v1/properties/saved/${propertyId}/offers`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OFFERS_KEYS.forProperty(propertyId) })
    },
  })
}

export function useUpdateOffer(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ offerId, body }: { offerId: string; body: PropertyOfferUpdate }) =>
      api.patch<PropertyOffer>(`/api/v1/properties/saved/${propertyId}/offers/${offerId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OFFERS_KEYS.forProperty(propertyId) })
    },
  })
}

export function useDeleteOffer(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (offerId: string) =>
      api.delete<void>(`/api/v1/properties/saved/${propertyId}/offers/${offerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OFFERS_KEYS.forProperty(propertyId) })
    },
  })
}
