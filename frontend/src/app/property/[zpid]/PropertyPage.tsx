'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  PropertyData,
  PropertyDetailsSkeleton,
  PropertyDetailsClient
} from '@/components/property-details'
import { normalizePropertyData } from '@/utils/normalizePropertyData'

export default function PropertyPage() {
  const params = useParams<{ zpid: string }>()
  const searchParams = useSearchParams()
  const zpid = params.zpid
  const address = searchParams.get('address') ?? undefined
  const strategy = searchParams.get('strategy') ?? undefined

  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) {
      setError('No address provided')
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchProperty() {
      try {
        const data = await api.post<Record<string, unknown>>('/api/v1/properties/search', { address })
        if (cancelled) return
        const responseZpid = (data as any)?.zpid ? String((data as any).zpid) : ''
        if (responseZpid && responseZpid !== zpid) {
          setError('Property identity mismatch. Please re-run search from the full address result.')
          setProperty(null)
          return
        }
        const normalized = normalizePropertyData(data, zpid)
        setProperty(normalized)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load property')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProperty()
    return () => { cancelled = true }
  }, [zpid, address])

  if (loading) return <PropertyDetailsSkeleton />

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[var(--surface-base)] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-heading)] mb-2">Property Not Found</h2>
          <p className="text-[var(--text-secondary)]">{error ?? 'Unable to load property details'}</p>
        </div>
      </div>
    )
  }

  return <PropertyDetailsClient property={property} initialStrategy={strategy} />
}

