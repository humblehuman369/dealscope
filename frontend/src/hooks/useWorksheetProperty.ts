import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { SavedProperty } from '@/types/savedProperty'

// Re-export for backward compatibility
export type { SavedProperty } from '@/types/savedProperty'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface UseWorksheetPropertyOptions {
  onLoaded?: (property: SavedProperty) => void
}

export function useWorksheetProperty(propertyId: string, options: UseWorksheetPropertyOptions = {}) {
  const { onLoaded } = options
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

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
        
        const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        console.log('[useWorksheetProperty] Response status:', response.status)

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
