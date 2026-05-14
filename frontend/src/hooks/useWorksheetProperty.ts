import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { SavedProperty } from '@/types/savedProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { apiRequest } from '@/lib/api-client'

// Re-export for backward compatibility
export type { SavedProperty } from '@/types/savedProperty'

interface UseWorksheetPropertyOptions {
  onLoaded?: (property: SavedProperty) => void
}

// Helper to check if propertyId is a temporary (unsaved) ID
// Matches: temp_<address> or temp_zpid_<zpid>
function isTempPropertyId(id: string): boolean {
  return id.startsWith('temp_')
}

// Helper to extract address from temp ID for display
function extractAddressFromTempId(id: string): string {
  if (id.startsWith('temp_zpid_')) {
    return `Property ${id.replace('temp_zpid_', '')}`
  }
  return decodeURIComponent(id.replace('temp_', ''))
}

export function useWorksheetProperty(propertyId: string, options: UseWorksheetPropertyOptions = {}) {
  const { onLoaded } = options
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useSession()
  const worksheetStore = useWorksheetStore()

  const [property, setProperty] = useState<SavedProperty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Avoid retriggering the fetch effect when callers pass a fresh
  // `onLoaded` reference each render.
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  // Snapshot worksheet store fields read inside the effect into refs so
  // they can be consulted without becoming dependencies (which would
  // otherwise refetch every store mutation).
  const worksheetSnapshotRef = useRef(worksheetStore)
  worksheetSnapshotRef.current = worksheetStore

  useEffect(() => {
    // Don't do anything while auth is still loading.
    if (authLoading) return

    // Only redirect if auth is done loading AND user is not authenticated.
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    if (!propertyId) return

    let cancelled = false

    // Fully reset state at the top of every (propertyId, auth) change so
    // navigating between properties never leaves stale data on screen.
    setProperty(null)
    setError(null)
    setIsLoading(true)

    // Temporary (unsaved) properties: hydrate from the worksheet store
    // rather than calling the API.
    if (isTempPropertyId(propertyId)) {
      const ws = worksheetSnapshotRef.current

      if (ws.propertyId === propertyId && ws.propertyData) {
        const syntheticProperty = ws.propertyData as SavedProperty
        if (!cancelled) {
          setProperty(syntheticProperty)
          setIsLoading(false)
          onLoadedRef.current?.(syntheticProperty)
        }
        return () => {
          cancelled = true
        }
      }

      if (ws.assumptions?.purchasePrice > 0) {
        const syntheticProperty = {
          id: propertyId,
          user_id: '',
          address_street: extractAddressFromTempId(propertyId),
          address_city: '',
          address_state: '',
          address_zip: '',
          property_data_snapshot: {
            listPrice: ws.assumptions.purchasePrice,
            monthlyRent: ws.assumptions.monthlyRent,
            propertyTaxes: ws.assumptions.propertyTaxes,
            insurance: ws.assumptions.insurance,
          },
          worksheet_assumptions: ws.assumptions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as SavedProperty
        if (!cancelled) {
          setProperty(syntheticProperty)
          setIsLoading(false)
          onLoadedRef.current?.(syntheticProperty)
        }
        return () => {
          cancelled = true
        }
      }

      if (!cancelled) {
        setError('Property data not found. Please go back to Deal Maker.')
        setIsLoading(false)
      }
      return () => {
        cancelled = true
      }
    }

    // Saved property: fetch from API.
    apiRequest<SavedProperty>(`/api/v1/properties/saved/${propertyId}`)
      .then((data) => {
        if (cancelled) return
        setProperty(data)
        onLoadedRef.current?.(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to load property'

        if (message.includes('401') || message.includes('Unauthorized')) {
          setError('Session expired. Please log in again.')
          router.push('/')
          return
        }

        setError(message || 'Failed to load property. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [propertyId, isAuthenticated, authLoading, router])

  return {
    property,
    isLoading: authLoading || isLoading,
    error,
  }
}
