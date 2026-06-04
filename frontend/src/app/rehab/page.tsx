'use client'

import { useRouter } from 'next/navigation'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { api } from '@/lib/api-client'
import { API_BASE_URL } from '@/lib/env'
import { usePropertyData } from '@/hooks/usePropertyData'
import {
  mergeRehabPropertySnapshots,
  rehabPropertySnapshotFromSearchParams,
  rehabSnapshotFromPropertyResponse,
  type RehabPropertySnapshot,
} from '@/lib/rehabNavigation'
import type { RegionalCostContext } from '@/lib/estimatorTypes'

const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), {
  loading: () => (
    <div
      className="animate-pulse rounded-2xl h-96"
      style={{ backgroundColor: 'var(--surface-elevated)' }}
    />
  ),
})

function RehabPageContent() {
  const router = useRouter()
  const searchParams = useAppSearchParams()
  const address = searchParams.get('address') || ''
  const savedPropertyIdFromUrl = searchParams.get('saved_property_id') || undefined
  const initialBudget = parseInt(searchParams.get('budget') || '25000', 10)

  const [resolvedSavedPropertyId, setResolvedSavedPropertyId] = useState<string | undefined>(
    savedPropertyIdFromUrl,
  )
  const [propertyData, setPropertyData] = useState<RehabPropertySnapshot | undefined>(undefined)
  const [costContext, setCostContext] = useState<RegionalCostContext | null>(null)
  const [loading, setLoading] = useState(!!address)

  const { fetchProperty } = usePropertyData()

  const savedPropertyId = savedPropertyIdFromUrl ?? resolvedSavedPropertyId

  useEffect(() => {
    setResolvedSavedPropertyId(savedPropertyIdFromUrl)
  }, [savedPropertyIdFromUrl])

  useEffect(() => {
    if (!address || savedPropertyIdFromUrl) return

    let cancelled = false
    ;(async () => {
      try {
        const check = await api.get<{ is_saved: boolean; saved_property_id: string | null }>(
          `/api/v1/properties/saved/check?${new URLSearchParams({ address }).toString()}`,
        )
        if (cancelled || !check.saved_property_id) return
        setResolvedSavedPropertyId(check.saved_property_id)
        const params = new URLSearchParams(searchParams.toString())
        params.set('saved_property_id', check.saved_property_id)
        router.replace(`/rehab?${params.toString()}`, { scroll: false })
      } catch {
        // Non-critical: estimator works without saved property link
      }
    })()

    return () => {
      cancelled = true
    }
  }, [address, savedPropertyIdFromUrl, searchParams, router])

  useEffect(() => {
    let cancelled = false

    async function fetchCostContext(zipCode: string) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/rehab/cost-context?zip_code=${encodeURIComponent(zipCode)}`,
        )
        if (res.ok && !cancelled) {
          setCostContext(await res.json())
        }
      } catch {
        // Non-critical: estimator works without cost context
      }
    }

    async function loadPropertyData() {
      const urlSnapshot = rehabPropertySnapshotFromSearchParams(searchParams)

      if (!address && !urlSnapshot) {
        setPropertyData(undefined)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        let merged = urlSnapshot

        if (address) {
          const data = await fetchProperty(address)
          if (cancelled) return
          merged = mergeRehabPropertySnapshots(urlSnapshot, rehabSnapshotFromPropertyResponse(data))
        }

        setPropertyData(merged)
        const zip = merged?.zip_code
        if (zip) fetchCostContext(zip)
      } catch (err) {
        console.error('Failed to fetch property data:', err)
        if (!cancelled) {
          setPropertyData(urlSnapshot)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPropertyData()

    return () => {
      cancelled = true
    }
  }, [address, searchParams, fetchProperty])

  return (
    <div
      className="min-h-screen px-1 sm:px-4 transition-colors"
      style={{ backgroundColor: 'var(--surface-base)' }}
    >
      <div className="w-full max-w-6xl mx-auto">
        <div style={{ backgroundColor: 'var(--surface-card)' }}>
          {/* Header */}
          <div
            className="px-1 sm:px-4 py-3 flex justify-between items-center"
            style={{
              background:
                'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--accent-sky)' }}>
                Rehab Estimator
              </h1>
            </div>
            <a
              href={address ? `/property?address=${encodeURIComponent(address)}` : '/'}
              className="border-none px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                color: 'var(--accent-sky)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface-card)',
              }}
            >
              ← Back
            </a>
          </div>

          {/* Content */}
          <div className="px-[1px] sm:px-[5px] py-3">
            {loading ? (
              <IQLoadingLogo />
            ) : (
              <RehabEstimator
                initialBudget={initialBudget}
                propertyAddress={address}
                propertyData={propertyData}
                costContext={costContext}
                initialMode={propertyData ? 'quick' : 'detailed'}
                savedPropertyId={savedPropertyId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RehabPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <RehabPageContent />
    </Suspense>
  )
}
