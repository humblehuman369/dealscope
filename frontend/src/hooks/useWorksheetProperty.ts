import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const API_BASE_URL = ''

export interface SavedProperty {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
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
  }
  last_analytics_result?: any
  worksheet_assumptions?: any
  created_at: string
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/')
      return
    }

    const fetchProperty = async () => {
      if (!propertyId || authLoading) return

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
        onLoaded?.(data)
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
  }, [propertyId, isAuthenticated, authLoading, router, onLoaded])

  return {
    property,
    isLoading: authLoading || isLoading,
    error,
  }
}
