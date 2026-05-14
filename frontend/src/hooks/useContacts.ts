'use client'

/**
 * Hooks for property contacts. Mutations also invalidate the property
 * timeline since contact_added events surface there.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { TIMELINE_KEYS } from '@/hooks/useTimeline'
import type { PropertyContact, PropertyContactCreate, PropertyContactUpdate } from '@/types/contact'

export const CONTACTS_KEYS = {
  all: ['contacts'] as const,
  forProperty: (propertyId: string) => [...CONTACTS_KEYS.all, propertyId] as const,
}

export function useContacts(propertyId: string | null) {
  return useQuery({
    queryKey: CONTACTS_KEYS.forProperty(propertyId ?? ''),
    queryFn: () => api.get<PropertyContact[]>(`/api/v1/properties/saved/${propertyId}/contacts`),
    enabled: !!propertyId,
    staleTime: 30_000,
  })
}

export function useCreateContact(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PropertyContactCreate) =>
      api.post<PropertyContact>(`/api/v1/properties/saved/${propertyId}/contacts`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
    },
  })
}

export function useUpdateContact(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, body }: { contactId: string; body: PropertyContactUpdate }) =>
      api.patch<PropertyContact>(
        `/api/v1/properties/saved/${propertyId}/contacts/${contactId}`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEYS.forProperty(propertyId) })
    },
  })
}

export function useDeleteContact(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contactId: string) =>
      api.delete<void>(`/api/v1/properties/saved/${propertyId}/contacts/${contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONTACTS_KEYS.forProperty(propertyId) })
      qc.invalidateQueries({ queryKey: TIMELINE_KEYS.forProperty(propertyId) })
    },
  })
}
