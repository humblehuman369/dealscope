'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { API_BASE_URL } from '@/lib/env'
import type { RegionalCostContext } from '@/lib/estimatorTypes'

const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), { 
  loading: () => (
    <div className="animate-pulse rounded-2xl h-96" style={{ backgroundColor: 'var(--surface-elevated)' }} />
  )
})

interface PropertyData {
  square_footage?: number
  year_built?: number
  arv?: number
  current_value_avm?: number
  zip_code?: string
  bedrooms?: number
  bathrooms?: number
  has_pool?: boolean
  roof_type?: string
  stories?: number
  garage_spaces?: number
  lot_size?: number
  hoa_monthly?: number
}

function RehabPageContent() {
  const searchParams = useSearchParams()
  const address = searchParams.get('address') || ''
  const initialBudget = parseInt(searchParams.get('budget') || '25000', 10)
  
  const [propertyData, setPropertyData] = useState<PropertyData | undefined>(undefined)
  const [costContext, setCostContext] = useState<RegionalCostContext | null>(null)
  const [loading, setLoading] = useState(!!address)

  useEffect(() => {
    async function fetchCostContext(zipCode: string) {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/rehab/cost-context?zip_code=${encodeURIComponent(zipCode)}`
        )
        if (res.ok) {
          setCostContext(await res.json())
        }
      } catch {
        // Non-critical: estimator works without cost context
      }
    }

    const sqft = searchParams.get('sqft')
    const yearBuilt = searchParams.get('year_built')
    const arv = searchParams.get('arv')
    const zipCode = searchParams.get('zip_code')
    const bedrooms = searchParams.get('bedrooms')
    const bathrooms = searchParams.get('bathrooms')
    const hasPool = searchParams.get('has_pool')
    const stories = searchParams.get('stories')
    
    if (sqft || yearBuilt || arv) {
      setPropertyData({
        square_footage: sqft ? parseInt(sqft, 10) : undefined,
        year_built: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
        arv: arv ? parseFloat(arv) : undefined,
        zip_code: zipCode || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
        has_pool: hasPool === 'true',
        stories: stories ? parseInt(stories, 10) : undefined,
      })
      if (zipCode) fetchCostContext(zipCode)
      setLoading(false)
    } else if (address) {
      const fetchPropertyData = async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v1/property/search?address=${encodeURIComponent(address)}`
          )
          
          if (response.ok) {
            const data = await response.json()
            const zip = data.address?.zip_code
            setPropertyData({
              square_footage: data.details?.square_footage,
              year_built: data.details?.year_built,
              arv: data.valuations?.current_value_avm,
              current_value_avm: data.valuations?.current_value_avm,
              zip_code: zip,
              bedrooms: data.details?.bedrooms,
              bathrooms: data.details?.bathrooms,
              has_pool: data.details?.features?.includes('Pool'),
              stories: data.details?.stories,
              lot_size: data.details?.lot_size,
              hoa_monthly: data.financial?.hoa_monthly,
            })
            if (zip) fetchCostContext(zip)
          }
        } catch (err) {
          console.error('Failed to fetch property data:', err)
        } finally {
          setLoading(false)
        }
      }
      
      fetchPropertyData()
    } else {
      setLoading(false)
    }
  }, [address, searchParams])

  return (
    <div className="min-h-screen px-1 sm:px-4 transition-colors" style={{ backgroundColor: 'var(--surface-base)' }}>
      <div className="w-full">
        <div style={{ backgroundColor: 'var(--surface-card)' }}>
          {/* Header */}
          <div
            className="px-1 sm:px-4 py-3 flex justify-between items-center"
            style={{
              background: 'radial-gradient(ellipse at 30% 0%, var(--color-teal-dim) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, var(--color-teal-dim) 0%, transparent 50%), var(--surface-base)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--accent-sky)' }}>Rehab Estimator</h1>
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
