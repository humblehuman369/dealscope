'use client'

/**
 * Property Page Redirector
 * 
 * This page redirects to the new property-details page at /property/[zpid].
 * It maintains backward compatibility with old links that use /property?address=...
 * 
 * Flow:
 * 1. Receive address from query params
 * 2. Fetch property data to get zpid
 * 3. Redirect to /property/[zpid]?address=...
 */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app'

function PropertyRedirector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address') || ''
  const strategyParam = searchParams.get('strategy') || ''
  
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAndRedirect() {
      if (!addressParam) {
        setError('No address provided')
        return
      }

      try {
        // Fetch property data to get zpid
        const response = await fetch(`${API_BASE_URL}/api/v1/properties/search`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addressParam })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch property data')
        }

        const data = await response.json()
        const zpid = data.zpid || data.property_id || 'unknown'

        // Build redirect URL
        let redirectUrl = `/property/${zpid}?address=${encodeURIComponent(addressParam)}`
        if (strategyParam) {
          redirectUrl += `&strategy=${strategyParam}`
        }

        // Redirect to new property-details page
        router.replace(redirectUrl)
      } catch (err) {
        console.error('Failed to redirect to property details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load property')
      }
    }

    fetchAndRedirect()
  }, [addressParam, strategyParam, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Unable to load property
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            {error}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading property details...</p>
      </div>
    </div>
  )
}

export default function PropertyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <PropertyRedirector />
    </Suspense>
  )
}
