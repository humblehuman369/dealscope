'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useSubscription } from '@/hooks/useSubscription'
import type {
  DirectoryEntityType,
  SavedDirectoryContactList,
} from '@/types/savedDirectoryContact'

export const SAVED_CONTACTS_KEYS = {
  all: ['saved-contacts'] as const,
  lists: () => [...SAVED_CONTACTS_KEYS.all, 'list'] as const,
  list: (entityType?: DirectoryEntityType) =>
    [...SAVED_CONTACTS_KEYS.lists(), entityType ?? 'all'] as const,
}

export function useSavedContacts(entityType?: DirectoryEntityType) {
  const { isPaidPro } = useSubscription()

  return useQuery({
    queryKey: SAVED_CONTACTS_KEYS.list(entityType),
    queryFn: () => {
      const params = entityType ? `?entity_type=${entityType}` : ''
      return api.get<SavedDirectoryContactList>(`/api/v1/saved-contacts${params}`)
    },
    enabled: isPaidPro,
    staleTime: 30_000,
  })
}

export function useInvalidateSavedContacts() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: SAVED_CONTACTS_KEYS.all })
  }
}
