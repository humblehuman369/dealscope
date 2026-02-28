'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { parseAddressString } from '@/utils/formatters'

export interface PropertySnapshot {
  street?: string
  city?: string
  state?: string
  zipCode?: string
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  listPrice?: number
  zpid?: string
  listingStatus?: string
}

export interface UseSavePropertyOptions {
  /** Full display address (e.g. "1451 Sw 10th St, Boca Raton, FL 33486") */
  displayAddress: string
  /** Optional property snapshot for the save payload */
  propertySnapshot?: PropertySnapshot | null
}

export interface UseSavePropertyResult {
  isSaved: boolean
  savedPropertyId: string | null
  isSaving: boolean
  toggle: () => Promise<void>
  save: () => Promise<void>
  unsave: () => Promise<void>
}

export function useSaveProperty({
  displayAddress,
  propertySnapshot,
}: UseSavePropertyOptions): UseSavePropertyResult {
  const [isSaved, setIsSaved] = useState(false)
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const checkSaved = useCallback(async () => {
    if (!displayAddress) return
    try {
      const result = await api.get<{ is_saved: boolean; saved_property_id: string | null }>(
        `/api/v1/properties/saved/check?address=${encodeURIComponent(displayAddress)}`
      )
      setIsSaved(result.is_saved)
      setSavedPropertyId(result.saved_property_id)
    } catch {
      setIsSaved(false)
      setSavedPropertyId(null)
    }
  }, [displayAddress])

  useEffect(() => {
    checkSaved()
  }, [checkSaved])

  const save = useCallback(async () => {
    if (!displayAddress || isSaving) return
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
    setIsSaving(true)
    try {
      const result = await api.post<{ id: string }>('/api/v1/properties/saved', {
        address_street: parsed.street,
        address_city: parsed.city || undefined,
        address_state: parsed.state || undefined,
        address_zip: parsed.zip || undefined,
        full_address: displayAddress,
        zpid: propertySnapshot?.zpid ?? undefined,
        property_data_snapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
        status: 'watching',
      })
      setIsSaved(true)
      setSavedPropertyId(result?.id ?? null)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 409) setIsSaved(true)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [displayAddress, propertySnapshot, isSaving])

  const unsave = useCallback(async () => {
    if (!savedPropertyId || isSaving) return
    setIsSaving(true)
    try {
      await api.delete(`/api/v1/properties/saved/${savedPropertyId}`)
      setIsSaved(false)
      setSavedPropertyId(null)
    } finally {
      setIsSaving(false)
    }
  }, [savedPropertyId, isSaving])

  const toggle = useCallback(async () => {
    if (isSaved && savedPropertyId) await unsave()
    else await save()
  }, [isSaved, savedPropertyId, save, unsave])

  return { isSaved, savedPropertyId, isSaving, toggle, save, unsave }
}
