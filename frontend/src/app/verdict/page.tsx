'use client'

/**
 * IQ Verdict Page
 * Route: /verdict?address=...
 * 
 * Shows the IQ Verdict with ranked strategy recommendations after analysis
 */

import { useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  IQVerdictScreen, 
  IQProperty, 
  IQStrategy,
  generateMockAnalysis,
  STRATEGY_ROUTE_MAP,
} from '@/components/iq-verdict'

function VerdictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const address = searchParams.get('address') || ''
  const price = searchParams.get('price')
  const beds = searchParams.get('beds')
  const baths = searchParams.get('baths')
  const sqft = searchParams.get('sqft')

  // Build property object from query params
  const property = useMemo((): IQProperty => ({
    address: decodeURIComponent(address) || 'Unknown Address',
    price: price ? parseInt(price, 10) : 350000,
    beds: beds ? parseInt(beds, 10) : 3,
    baths: baths ? parseFloat(baths) : 2,
    sqft: sqft ? parseInt(sqft, 10) : 1500,
  }), [address, price, beds, baths, sqft])

  // Generate analysis (in production, this would come from API)
  const analysis = useMemo(() => generateMockAnalysis(property), [property])

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back()
  }, [router])

  const handleViewStrategy = useCallback((strategy: IQStrategy) => {
    const encodedAddress = encodeURIComponent(property.address)
    const strategyId = STRATEGY_ROUTE_MAP[strategy.id]
    
    // Navigate to the property page with the selected strategy worksheet
    router.push(`/property?address=${encodedAddress}&strategy=${strategyId}`)
  }, [property, router])

  const handleCompareAll = useCallback(() => {
    const encodedAddress = encodeURIComponent(property.address)
    router.push(`/compare?address=${encodedAddress}`)
  }, [property, router])

  return (
    <IQVerdictScreen
      property={property}
      analysis={analysis}
      onBack={handleBack}
      onViewStrategy={handleViewStrategy}
      onCompareAll={handleCompareAll}
    />
  )
}

export default function VerdictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading verdict...</p>
        </div>
      </div>
    }>
      <VerdictContent />
    </Suspense>
  )
}
