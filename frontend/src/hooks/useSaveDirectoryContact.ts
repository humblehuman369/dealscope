'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'
import { useSubscription } from '@/hooks/useSubscription'
import { SAVED_CONTACTS_KEYS } from '@/hooks/useSavedContacts'
import { useQueryClient } from '@tanstack/react-query'
import type {
  DirectoryContactSnapshot,
  DirectoryEntityType,
  SavedDirectoryContactCheck,
} from '@/types/savedDirectoryContact'

export interface UseSaveDirectoryContactOptions {
  entityType: DirectoryEntityType
  entityId: number
  snapshot: DirectoryContactSnapshot
}

export interface UseSaveDirectoryContactResult {
  isSaved: boolean
  savedContactId: string | null
  isSaving: boolean
  toggle: () => Promise<void>
  save: () => Promise<void>
  unsave: () => Promise<void>
}

export function useSaveDirectoryContact({
  entityType,
  entityId,
  snapshot,
}: UseSaveDirectoryContactOptions): UseSaveDirectoryContactResult {
  const { isPaidPro } = useSubscription()
  const queryClient = useQueryClient()
  const [isSaved, setIsSaved] = useState(false)
  const [savedContactId, setSavedContactId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const stateVersionRef = useRef(0)

  const checkSaved = useCallback(async () => {
    if (!entityId || !isPaidPro) {
      setIsSaved(false)
      setSavedContactId(null)
      return
    }
    const capturedVersion = stateVersionRef.current
    try {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: String(entityId),
      })
      const result = await api.get<SavedDirectoryContactCheck>(
        `/api/v1/saved-contacts/check?${params.toString()}`,
      )
      if (stateVersionRef.current === capturedVersion) {
        setIsSaved(result.is_saved)
        setSavedContactId(result.saved_contact_id)
      }
    } catch {
      if (stateVersionRef.current === capturedVersion) {
        setIsSaved(false)
        setSavedContactId(null)
      }
    }
  }, [entityType, entityId, isPaidPro])

  useEffect(() => {
    checkSaved()
  }, [checkSaved])

  const save = useCallback(async () => {
    if (!entityId || isSaving || !isPaidPro) return
    setIsSaving(true)
    try {
      const result = await api.post<{ id: string }>('/api/v1/saved-contacts', {
        entity_type: entityType,
        entity_id: entityId,
        snapshot,
      })
      setIsSaved(true)
      setSavedContactId(result?.id ?? null)
      stateVersionRef.current++
      queryClient.invalidateQueries({ queryKey: SAVED_CONTACTS_KEYS.all })
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setIsSaved(true)
        stateVersionRef.current++
        await checkSaved()
      } else {
        throw err
      }
    } finally {
      setIsSaving(false)
    }
  }, [entityType, entityId, snapshot, isSaving, isPaidPro, queryClient, checkSaved])

  const unsave = useCallback(async () => {
    if (!savedContactId || isSaving) return
    setIsSaving(true)
    try {
      await api.delete(`/api/v1/saved-contacts/${savedContactId}`)
      setIsSaved(false)
      setSavedContactId(null)
      stateVersionRef.current++
      queryClient.invalidateQueries({ queryKey: SAVED_CONTACTS_KEYS.all })
    } finally {
      setIsSaving(false)
    }
  }, [savedContactId, isSaving, queryClient])

  const toggle = useCallback(async () => {
    if (isSaved && savedContactId) await unsave()
    else await save()
  }, [isSaved, savedContactId, save, unsave])

  return { isSaved, savedContactId, isSaving, toggle, save, unsave }
}
