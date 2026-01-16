'use client'

/**
 * IQ Analyzing Page
 * Route: /analyzing?address=...
 * 
 * Loading screen shown while IQ analyzes all 6 strategies
 * Automatically transitions to verdict page after animation
 */

import { useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { IQAnalyzingScreen, IQProperty } from '@/components/iq-verdict'

function AnalyzingContent() {
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

  // Handle analysis complete - navigate to verdict page
  const handleAnalysisComplete = useCallback(() => {
    // Build query params to pass property data to verdict page
    const queryParams = new URLSearchParams({
      address: encodeURIComponent(property.address),
      price: property.price.toString(),
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: (property.sqft || 0).toString(),
    })

    // Navigate to verdict page
    router.replace(`/verdict?${queryParams.toString()}`)
  }, [property, router])

  return (
    <IQAnalyzingScreen
      property={property}
      onAnalysisComplete={handleAnalysisComplete}
      minimumDisplayTime={2800}
    />
  )
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AnalyzingContent />
    </Suspense>
  )
}
