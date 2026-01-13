'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { WorksheetLayout } from '@/components/worksheet/WorksheetLayout'
import { useWorksheetStore } from '@/stores/worksheetStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

interface SavedProperty {
  id: string
  address: string
  city: string
  state: string
  zip_code: string
  property_data_snapshot: {
    listPrice: number
    monthlyRent: number
    propertyTaxes: number
    insurance: number
    bedrooms: number
    bathrooms: number
    sqft: number
    arv?: number
    yearBuilt?: number
    lotSize?: number
    propertyType?: string
    photos?: string[]
  }
  last_analytics_result?: any
  worksheet_assumptions?: any
  created_at: string
}

export default function PropertyWorksheetPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const propertyId = params.id as string
  
  const [property, setProperty] = useState<SavedProperty | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { initializeFromProperty } = useWorksheetStore()

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
        const response = await fetch(`${API_BASE_URL}/api/v1/saved-properties/${propertyId}`, {
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
        
        // Initialize worksheet store with property data
        initializeFromProperty(data)
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
  }, [propertyId, isAuthenticated, authLoading, router, initializeFromProperty])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--ws-accent)] mx-auto mb-4" />
          <p className="text-[var(--ws-text-secondary)]">Loading property worksheet...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--ws-bg)]">
        <div className="text-center">
          <p className="text-[var(--ws-negative)] mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[var(--ws-accent)] text-white rounded-lg hover:bg-[var(--ws-accent-hover)]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!property) {
    return null
  }

  return (
    <WorksheetLayout
      property={property}
      propertyId={propertyId}
    />
  )
}

