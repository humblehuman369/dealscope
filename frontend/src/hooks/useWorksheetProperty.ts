import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { SavedProperty } from '@/types/savedProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'
import { getAccessToken } from '@/lib/api'
import { API_BASE_URL } from '@/lib/env'

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
  
  // Use ref to avoid re-fetching when onLoaded changes (prevents infinite loop)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded
  
  // Track if we've already fetched to prevent duplicate fetches
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      console.log('[useWorksheetProperty] Auth still loading, waiting...')
      return
    }
    
    // Only redirect if auth is done loading AND user is not authenticated
    if (!isAuthenticated) {
      console.log('[useWorksheetProperty] Not authenticated, redirecting to home')
      router.push('/')
      return
    }
    
    // Handle temporary (unsaved) properties - use worksheetStore data instead of API
    const isTemp = isTempPropertyId(propertyId)
    if (isTemp) {
      
      if (worksheetStore.propertyId === propertyId && worksheetStore.propertyData) {
        // WorksheetStore already has this property's data
        const syntheticProperty = worksheetStore.propertyData as SavedProperty
        setProperty(syntheticProperty)
        setIsLoading(false)
        setError(null)
        onLoadedRef.current?.(syntheticProperty)
        return
      } else {
        // worksheetStore doesn't have this property data - should have been initialized by Deal Maker
        // Check if we at least have assumptions we can use
        if (worksheetStore.assumptions?.purchasePrice > 0) {
          // Build a minimal synthetic property from worksheetStore
          const syntheticProperty: SavedProperty = {
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
          }
          setProperty(syntheticProperty)
          setIsLoading(false)
          setError(null)
          onLoadedRef.current?.(syntheticProperty)
          return
        }
        // No data available, show error
        setError('Property data not found. Please go back to Deal Maker.')
        setIsLoading(false)
        return
      }
    }

    const fetchProperty = async () => {
      if (!propertyId || hasFetchedRef.current) {
        console.log('[useWorksheetProperty] Skipping fetch:', { propertyId, hasFetched: hasFetchedRef.current })
        return
      }
      
      hasFetchedRef.current = true
      setIsLoading(true)
      setError(null)
      
      console.log('[useWorksheetProperty] Fetching property:', propertyId)
      
      try {
        const token = getAccessToken()
        
        if (!token) {
          console.error('[useWorksheetProperty] No access token found')
          setError('Authentication required')
          router.push('/')
          return
        }
        
        const fetchUrl = `${API_BASE_URL}/api/v1/properties/saved/${propertyId}`
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            console.error('[useWorksheetProperty] Unauthorized - token may be expired')
            setError('Session expired. Please log in again.')
            router.push('/')
            return
          }
          if (response.status === 404) {
            setError('Property not found')
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.error('[useWorksheetProperty] API error:', response.status, errorData)
            setError(errorData.detail || 'Failed to load property')
          }
          return
        }

        const data = await response.json()
        console.log('[useWorksheetProperty] Property loaded:', data.id, data.address_street)
        
        setProperty(data)
        onLoadedRef.current?.(data)
      } catch (err) {
        console.error('[useWorksheetProperty] Error fetching property:', err)
        setError('Failed to load property. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProperty()
    // Note: worksheetStore values intentionally excluded from deps to prevent infinite loops
    // The effect runs once per propertyId change, and worksheetStore data is read at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isAuthenticated, authLoading, router])
  
  // Reset fetch flag when propertyId changes
  useEffect(() => {
    hasFetchedRef.current = false
    setProperty(null)
    setError(null)
    setIsLoading(true)
  }, [propertyId])

  return {
    property,
    isLoading: authLoading || isLoading,
    error,
  }
}
