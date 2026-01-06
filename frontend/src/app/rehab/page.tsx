'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

const RehabEstimator = dynamic(() => import('@/components/RehabEstimator'), { 
  loading: () => (
    <div className="animate-pulse bg-gray-100 rounded-2xl h-96" />
  )
})

// Property data interface for Quick Estimate mode
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
  
  // Property data from URL params for Quick Estimate
  const [propertyData, setPropertyData] = useState<PropertyData | undefined>(undefined)
  const [loading, setLoading] = useState(!!address)
  
  // Extract property data from URL params or fetch if address provided
  useEffect(() => {
    // Try to get property data from URL params first
    const sqft = searchParams.get('sqft')
    const yearBuilt = searchParams.get('year_built')
    const arv = searchParams.get('arv')
    const zipCode = searchParams.get('zip_code')
    const bedrooms = searchParams.get('bedrooms')
    const bathrooms = searchParams.get('bathrooms')
    const hasPool = searchParams.get('has_pool')
    const stories = searchParams.get('stories')
    
    if (sqft || yearBuilt || arv) {
      // Use URL params if provided
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
      setLoading(false)
    } else if (address) {
      // Fetch property data if address is provided but no params
      const fetchPropertyData = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const response = await fetch(
            `${apiUrl}/api/v1/property/search?address=${encodeURIComponent(address)}`
          )
          
          if (response.ok) {
            const data = await response.json()
            setPropertyData({
              square_footage: data.details?.square_footage,
              year_built: data.details?.year_built,
              arv: data.valuations?.current_value_avm,
              current_value_avm: data.valuations?.current_value_avm,
              zip_code: data.address?.zip_code,
              bedrooms: data.details?.bedrooms,
              bathrooms: data.details?.bathrooms,
              has_pool: data.details?.features?.includes('Pool'),
              stories: data.details?.stories,
              lot_size: data.details?.lot_size,
              hoa_monthly: data.financial?.hoa_monthly,
            })
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
    <div className="min-h-screen bg-[#f5f7fa] dark:bg-navy-900 p-2 transition-colors">
      <div className="max-w-[800px] mx-auto">
        {/* Main Container */}
        <div className="bg-white dark:bg-navy-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-lg border border-[#0465f2]">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-500 to-sky-600 px-4 py-3 rounded-t-xl flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white mb-0.5">Rehab Estimator</h1>
              <p className="text-xs text-white/90">
                {address ? address : 'AI-powered renovation budget analysis'}
              </p>
            </div>
            <a 
              href={address ? `/property?address=${encodeURIComponent(address)}` : '/'}
              className="bg-white text-brand-500 border-none px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-all"
            >
              ← Back
            </a>
          </div>

          {/* Content */}
          <div className="p-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 dark:text-gray-500 animate-spin" />
              </div>
            ) : (
              <RehabEstimator 
                initialBudget={initialBudget} 
                propertyAddress={address}
                propertyData={propertyData}
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
    <Suspense fallback={
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    }>
      <RehabPageContent />
    </Suspense>
  )
}
