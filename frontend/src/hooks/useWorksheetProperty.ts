'use client'

/**
 * useWorksheetProperty — load a property for the worksheet route.
 *
 * Two paths:
 *   1. **Saved property** — delegates to `useSavedProperty(id)` (React Query).
 *      The cache key is shared with the deal detail page and any other
 *      consumer of the same endpoint, so navigating between worksheet ↔ deal
 *      detail does not refetch and updates propagate instantly.
 *   2. **Temporary (unsaved) property** — `propertyId` starts with `temp_`.
 *      We synthesize a SavedProperty-shaped object from the worksheet store
 *      (set by Deal Maker before the user saves), since the API has nothing
 *      to fetch.
 *
 * Replaces the previous manual useState+useEffect+hasFetchedRef
 * implementation, which had a race that could leave stale property data on
 * screen when `propertyId` changed without remount.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { SavedProperty } from '@/types/savedProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { useSavedProperty } from '@/hooks/useSavedProperties'

// Re-export for backward compatibility.
export type { SavedProperty } from '@/types/savedProperty'

interface UseWorksheetPropertyOptions {
  onLoaded?: (property: SavedProperty) => void
}

/** Temporary (unsaved) property ids look like `temp_<address>` or `temp_zpid_<zpid>`. */
function isTempPropertyId(id: string): boolean {
  return id.startsWith('temp_')
}

/** Best-effort display address extracted from a temp id. */
function extractAddressFromTempId(id: string): string {
  if (id.startsWith('temp_zpid_')) {
    return `Property ${id.replace('temp_zpid_', '')}`
  }
  return decodeURIComponent(id.replace('temp_', ''))
}

export function useWorksheetProperty(
  propertyId: string,
  options: UseWorksheetPropertyOptions = {},
) {
  const { onLoaded } = options
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useSession()
  const worksheetStore = useWorksheetStore()

  // Avoid retriggering the onLoaded callback when the caller passes a fresh
  // function reference each render.
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  const isTemp = propertyId ? isTempPropertyId(propertyId) : false

  // Authoritative auth gate. If the user isn't logged in, send them home;
  // worksheet pages require a session.
  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) router.push('/')
  }, [authLoading, isAuthenticated, router])

  // ── Temp (unsaved) path ──────────────────────────────────────
  // For temp properties, hydrate from the worksheet store. We synthesize a
  // minimal SavedProperty so the rest of the worksheet UI doesn't have to
  // care whether the property came from the API or from local state.
  const tempProperty = useMemo<SavedProperty | null>(() => {
    if (!isTemp) return null

    if (worksheetStore.propertyId === propertyId && worksheetStore.propertyData) {
      return worksheetStore.propertyData as SavedProperty
    }

    if ((worksheetStore.assumptions?.purchasePrice ?? 0) > 0) {
      return {
        id: propertyId,
        user_id: '',
        address_street: extractAddressFromTempId(propertyId),
        address_city: '',
        address_state: '',
        address_zip: '',
        property_data_snapshot: {
          listPrice: worksheetStore.assumptions.purchasePrice,
          monthlyRent: worksheetStore.assumptions.monthlyRent,
          propertyTaxes: worksheetStore.assumptions.propertyTaxes,
          insurance: worksheetStore.assumptions.insurance,
        },
        worksheet_assumptions: worksheetStore.assumptions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as SavedProperty
    }

    return null
  }, [
    isTemp,
    propertyId,
    worksheetStore.propertyId,
    worksheetStore.propertyData,
    worksheetStore.assumptions,
  ])

  // ── Saved-property path ──────────────────────────────────────
  // React Query owns dedup/caching. `enabled` ensures we don't fire while
  // auth is still loading, when the user is logged out, or for temp ids.
  const savedQuery = useSavedProperty(
    !isTemp && isAuthenticated && !authLoading && propertyId ? propertyId : null,
  )

  // Resolve the active property + loading/error from whichever path is live.
  const property: SavedProperty | null = isTemp ? tempProperty : (savedQuery.data ?? null)

  const error: string | null = isTemp
    ? tempProperty
      ? null
      : 'Property data not found. Please go back to Deal Maker.'
    : savedQuery.error
      ? savedQuery.error instanceof Error
        ? savedQuery.error.message
        : 'Failed to load property. Please try again.'
      : null

  const isLoading = authLoading
    ? true
    : isTemp
      ? false
      : savedQuery.isLoading || savedQuery.isFetching

  // Fire onLoaded once per identity change. Using property.id (not the
  // SavedProperty reference) prevents redundant calls from React Query
  // returning the same cached object.
  const lastLoadedIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!property) return
    if (lastLoadedIdRef.current === property.id) return
    lastLoadedIdRef.current = property.id
    onLoadedRef.current?.(property)
  }, [property])

  return {
    property,
    isLoading,
    error,
  }
}
