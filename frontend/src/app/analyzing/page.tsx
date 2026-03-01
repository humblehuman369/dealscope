'use client'

/**
 * IQ Analyzing Page
 * Route: /analyzing?address=...
 *
 * Loading screen shown while IQ analyzes all 6 strategies.
 * Records one analysis for Starter usage limits, then navigates to the verdict page.
 */

import { useCallback, useMemo, useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { IQAnalyzingScreen, IQProperty } from '@/components/iq-verdict'
import { useSession } from '@/hooks/useSession'
import { useSubscription } from '@/hooks/useSubscription'
import { api } from '@/lib/api-client'

function AnalyzingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useSession()
  const { isPro } = useSubscription()

  const address = searchParams.get('address') || ''
  const price = searchParams.get('price')
  const beds = searchParams.get('beds')
  const baths = searchParams.get('baths')
  const sqft = searchParams.get('sqft')
  const condition = searchParams.get('condition')
  const location = searchParams.get('location')

  // Build property object from query params
  const property = useMemo((): IQProperty => ({
    address: address || 'Unknown Address',
    price: price ? parseInt(price, 10) : 350000,
    beds: beds ? parseInt(beds, 10) : 3,
    baths: baths ? parseFloat(baths) : 2,
    sqft: sqft ? parseInt(sqft, 10) : 1500,
  }), [address, price, beds, baths, sqft])

  const [animationDone, setAnimationDone] = useState(false)

  // Build the verdict URL (thread condition/location through)
  const verdictUrl = useMemo(() => {
    const queryParams = new URLSearchParams({
      address: encodeURIComponent(property.address),
      price: property.price.toString(),
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: (property.sqft || 0).toString(),
    })
    if (condition) queryParams.set('condition', condition)
    if (location) queryParams.set('location', location)
    return `/verdict?${queryParams.toString()}`
  }, [property, condition, location])

  // When animation complete: record one analysis for Starter users, refresh usage bar, then navigate
  useEffect(() => {
    if (!animationDone) return

    const go = async () => {
      if (isAuthenticated && !isPro) {
        try {
          await api.post('/api/v1/billing/usage/record-analysis')
          queryClient.invalidateQueries({ queryKey: ['billing', 'usage'] })
        } catch {
          // Don't block navigation if recording fails (e.g. network)
        }
      }
      router.replace(verdictUrl)
    }

    go()
  }, [animationDone, verdictUrl, router, isAuthenticated, isPro, queryClient])

  const handleAnalysisComplete = useCallback(() => {
    setAnimationDone(true)
  }, [])

  return (
    <IQAnalyzingScreen
      property={property}
      onAnalysisComplete={handleAnalysisComplete}
      minimumDisplayTime={6000}
    />
  )
}

export default function AnalyzingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AnalyzingContent />
    </Suspense>
  )
}
