'use client'

import { useState, useCallback, useEffect } from 'react'
import { api, ApiError } from '@/lib/api-client'
import { useSession } from '@/hooks/useSession'
import { useAuthModal } from '@/hooks/useAuthModal'
import { toast } from '@/components/feedback'
import type { SavedProperty, PropertyDataSnapshot } from '@/types/savedProperty'

// ------------------------------------------------------------------
// Input types — normalized interface for all callers
// ------------------------------------------------------------------

export interface SavePropertyInput {
  /** Street address, e.g. "1451 Sw 10th St" */
  addressStreet: string
  /** City, e.g. "Boca Raton" */
  addressCity: string
  /** State abbreviation, e.g. "FL" */
  addressState: string
  /** Zip code, e.g. "33486" */
  addressZip: string
  /** Full formatted address string */
  fullAddress: string
  /** Zillow property ID */
  zpid?: string | number | null
  /** Snapshot of property data at time of save */
  snapshot?: PropertyDataSnapshot
}

export interface UseSavePropertyReturn {
  isSaved: boolean
  isSaving: boolean
  savedPropertyId: string | null
  saveMessage: string | null
  save: () => Promise<void>
  unsave: () => Promise<void>
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export function useSaveProperty(
  input: SavePropertyInput | null,
): UseSavePropertyReturn {
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const { isAuthenticated } = useSession()
  const { openAuthModal } = useAuthModal()

  // ----------------------------------------------------------------
  // Check saved status on mount
  // ----------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated || !input?.fullAddress) return

    let cancelled = false

    const checkSavedStatus = async () => {
      try {
        const properties = await api.get<SavedProperty[]>(
          '/api/v1/properties/saved?limit=100',
        )

        if (cancelled) return

        const list = Array.isArray(properties)
          ? properties
          : (properties as unknown as { properties?: SavedProperty[]; items?: SavedProperty[] })?.properties ??
            (properties as unknown as { items?: SavedProperty[] })?.items ??
            []

        const match = findMatch(list, input)
        if (match) {
          setIsSaved(true)
          setSavedPropertyId(match.id)
        } else {
          setIsSaved(false)
          setSavedPropertyId(null)
        }
      } catch {
        // Silently fail — not critical for UX
      }
    }

    checkSavedStatus()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, input?.fullAddress, input?.zpid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------------------------------------------
  // Save
  // ----------------------------------------------------------------

  const save = useCallback(async () => {
    // --- Guard: auth ---
    if (!isAuthenticated) {
      console.warn('[useSaveProperty] save() blocked — user not authenticated')
      toast.error('Please log in to save properties')
      openAuthModal('login')
      return
    }

    // --- Guard: already saving ---
    if (isSaving) {
      console.warn('[useSaveProperty] save() blocked — already saving')
      return
    }

    // --- Guard: already saved ---
    if (isSaved) {
      console.warn('[useSaveProperty] save() blocked — property already saved')
      toast.info('Property is already saved')
      return
    }

    // --- Guard: missing input data ---
    if (!input) {
      console.warn('[useSaveProperty] save() blocked — input is null (property data not loaded)')
      toast.error('Unable to save — property data not loaded yet')
      return
    }

    // --- CSRF preflight check ---
    const csrfCookie = typeof document !== 'undefined'
      ? document.cookie.split('; ').find((c) => c.startsWith('csrf_token='))
      : null
    if (!csrfCookie) {
      console.warn('[useSaveProperty] No csrf_token cookie found — save may fail with 403')
    }

    setIsSaving(true)
    setSaveMessage(null)

    console.log('[useSaveProperty] Saving property:', input.fullAddress)

    try {
      const result = await api.post<SavedProperty>('/api/v1/properties/saved', {
        address_street: input.addressStreet,
        address_city: input.addressCity,
        address_state: input.addressState,
        address_zip: input.addressZip,
        full_address: input.fullAddress,
        zpid: input.zpid || null,
        external_property_id: input.zpid || null,
        status: 'watching',
        property_data_snapshot: input.snapshot ?? {},
      })

      console.log('[useSaveProperty] Save successful, id:', result.id)
      setIsSaved(true)
      setSavedPropertyId(result.id || null)
      setSaveMessage('Saved!')
      toast.success('Property saved to your portfolio')
    } catch (err) {
      if (err instanceof ApiError) {
        console.error('[useSaveProperty] ApiError:', err.status, err.message)

        if (err.status === 401) {
          openAuthModal('login')
          toast.error('Please log in to save properties')
          return
        }

        if (err.status === 403) {
          console.error('[useSaveProperty] CSRF 403 — csrf_token cookie may be missing or mismatched')
          toast.error('Security token expired. Please refresh the page and try again.')
          setSaveMessage('Security error')
          return
        }

        // Duplicate — 409 or 400 with "already" text
        if (
          err.status === 409 ||
          (err.status === 400 &&
            (err.message.includes('already in your saved list') ||
              err.message.includes('already saved')))
        ) {
          setIsSaved(true)
          setSaveMessage('Already saved!')
          toast.info('Property is already in your portfolio')
          return
        }

        toast.error(err.message || 'Failed to save property. Please try again.')
        setSaveMessage('Failed to save')
      } else {
        console.error('[useSaveProperty] Network/unknown error:', err)
        toast.error('Network error. Please check your connection and try again.')
        setSaveMessage('Error saving property')
      }
    } finally {
      setIsSaving(false)
      // Clear message after a delay
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [input, isAuthenticated, openAuthModal, isSaving, isSaved])

  // ----------------------------------------------------------------
  // Unsave
  // ----------------------------------------------------------------

  const unsave = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('[useSaveProperty] unsave() blocked — user not authenticated')
      toast.error('Please log in to manage saved properties')
      openAuthModal('login')
      return
    }
    if (!savedPropertyId) {
      console.warn('[useSaveProperty] unsave() blocked — no savedPropertyId')
      return
    }
    if (isSaving) {
      console.warn('[useSaveProperty] unsave() blocked — already saving')
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      await api.delete(`/api/v1/properties/saved/${savedPropertyId}`)
      setIsSaved(false)
      setSavedPropertyId(null)
      setSaveMessage(null)
      toast.success('Property removed from your portfolio')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          openAuthModal('login')
          toast.error('Please log in to manage saved properties')
          return
        }
        if (err.status === 404) {
          // Already deleted
          setIsSaved(false)
          setSavedPropertyId(null)
          toast.info('Property was already removed')
          return
        }
        toast.error(err.message || 'Failed to remove property. Please try again.')
      } else {
        toast.error('Network error. Please check your connection and try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }, [savedPropertyId, isAuthenticated, openAuthModal, isSaving])

  return { isSaved, isSaving, savedPropertyId, saveMessage, save, unsave }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function findMatch(
  properties: SavedProperty[],
  input: SavePropertyInput,
): SavedProperty | undefined {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')

  // Priority 1: zpid match
  if (input.zpid) {
    const zpidMatch = properties.find(
      (p) => p.zpid && String(p.zpid) === String(input.zpid),
    )
    if (zpidMatch) return zpidMatch
  }

  const targetStreet = normalize(input.addressStreet)
  const targetCity = normalize(input.addressCity)
  const targetState = input.addressState.toUpperCase().trim()

  // Priority 2: street + city + state
  const exactMatch = properties.find((p) => {
    const pStreet = normalize(p.address_street || '')
    const pCity = normalize(p.address_city || '')
    const pState = (p.address_state || '').toUpperCase().trim()

    return (
      pStreet === targetStreet &&
      (!targetCity || !pCity || pCity === targetCity) &&
      (!targetState || !pState || pState === targetState)
    )
  })
  if (exactMatch) return exactMatch

  // Priority 3: street + city only
  return properties.find((p) => {
    const pStreet = normalize(p.address_street || '')
    const pCity = normalize(p.address_city || '')
    return (
      pStreet === targetStreet &&
      (!targetCity || !pCity || pCity === targetCity)
    )
  })
}
