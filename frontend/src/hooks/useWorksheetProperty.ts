import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { SavedProperty } from '@/types/savedProperty'
import { useWorksheetStore } from '@/stores/worksheetStore'

// Re-export for backward compatibility
export type { SavedProperty } from '@/types/savedProperty'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface UseWorksheetPropertyOptions {
  onLoaded?: (property: SavedProperty) => void
}

// Helper to check if propertyId is a temporary (unsaved) ID
function isTempPropertyId(id: string): boolean {
  return id.startsWith('temp_')
}

export function useWorksheetProperty(propertyId: string, options: UseWorksheetPropertyOptions = {}) {
  const { onLoaded } = options
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const worksheetStore = useWorksheetStore()

  const [property, setProperty] = useState<SavedProperty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWorksheetProperty.ts:15',message:'Hook initialized',data:{propertyId,isAuthenticated,authLoading,isTemp:isTempPropertyId(propertyId),worksheetStoreId:worksheetStore.propertyId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
  // #endregion
  
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
    if (isTempPropertyId(propertyId)) {
      console.log('[useWorksheetProperty] Temp property detected, using worksheetStore data')
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWorksheetProperty.ts:tempHandler',message:'Using worksheetStore for temp property',data:{propertyId,worksheetStoreId:worksheetStore.propertyId,hasPropertyData:!!worksheetStore.propertyData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
      // #endregion
      
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
            address_street: decodeURIComponent(propertyId.replace('temp_', '')),
            address_city: '',
            address_state: '',
            zip_code: '',
            property_type: 'single_family',
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
        const token = localStorage.getItem('access_token')
        
        if (!token) {
          console.error('[useWorksheetProperty] No access token found')
          setError('Authentication required')
          router.push('/')
          return
        }
        
        const fetchUrl = `${API_BASE_URL}/api/v1/properties/saved/${propertyId}`
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWorksheetProperty.ts:67',message:'Fetching property from API',data:{fetchUrl,propertyId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        console.log('[useWorksheetProperty] Response status:', response.status)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWorksheetProperty.ts:73',message:'API response received',data:{status:response.status,ok:response.ok,propertyId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion

        if (!response.ok) {
          if (response.status === 401) {
            console.error('[useWorksheetProperty] Unauthorized - token may be expired')
            setError('Session expired. Please log in again.')
            router.push('/')
            return
          }
          if (response.status === 404) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useWorksheetProperty.ts:82',message:'Property NOT FOUND - 404 error',data:{propertyId,status:404,errorMessage:'Property not found'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
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
  }, [propertyId, isAuthenticated, authLoading, router, worksheetStore.propertyId, worksheetStore.propertyData, worksheetStore.assumptions])
  
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
