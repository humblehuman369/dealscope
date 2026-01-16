import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const API_BASE_URL = ''

export interface SavedProperty {
  id: string
  address_street: string
  address_city?: string
  address_state?: string
  address_zip?: string
  full_address?: string
  property_data_snapshot: {
    listPrice?: number
    monthlyRent?: number
    propertyTaxes?: number
    insurance?: number
    bedrooms?: number
    bathrooms?: number
    sqft?: number
    arv?: number
    averageDailyRate?: number
    occupancyRate?: number
    photos?: string[]
  }
  last_analytics_result?: any
  worksheet_assumptions?: any
  created_at: string
  saved_at?: string
  updated_at?: string
}

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
    if (!authLoading && !isAuthenticated) {
      router.push('/')
      return
    }

    const fetchProperty = async () => {
      if (!propertyId || authLoading || hasFetchedRef.current) return
      
      hasFetchedRef.current = true
      setIsLoading(true)
      
      try {
        const token = localStorage.getItem('access_token')
        const response = await fetch(`${API_BASE_URL}/api/v1/properties/saved/${propertyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Property not found')
          } else {
            setError('Failed to load property')
          }
          return
        }

        const data = await response.json()
        setProperty(data)
        onLoadedRef.current?.(data)
      } catch (err) {
        console.error('Error fetching property:', err)
        setError('Failed to load property')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      fetchProperty()
    }
  }, [propertyId, isAuthenticated, authLoading, router])
  
  // Reset fetch flag when propertyId changes
  useEffect(() => {
    hasFetchedRef.current = false
  }, [propertyId])

  return {
    property,
    isLoading: authLoading || isLoading,
    error,
  }
}
