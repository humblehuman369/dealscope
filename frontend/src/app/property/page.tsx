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
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { usePropertyData } from '@/hooks/usePropertyData'
import {
  buildPropertyProfileHref,
} from '@/utils/addressIdentity'

function PropertyRedirector() {
  const router = useRouter()
  const searchParams = useAppSearchParams()
  const addressParam = searchParams.get('address') || ''
  const strategyParam = searchParams.get('strategy') || ''
  const cityParam = searchParams.get('city')?.trim() || undefined
  const stateParam = searchParams.get('state')?.trim() || undefined
  const zipCodeParam = searchParams.get('zip_code')?.trim() || undefined
  const zpidParam = searchParams.get('zpid')?.trim() || undefined

  const [error, setError] = useState<string | null>(null)

  const { fetchProperty } = usePropertyData()

  useEffect(() => {
    async function fetchAndRedirect() {
      if (!addressParam) {
        setError('No address provided')
        return
      }

      try {
        // Use shared hook to ensure cache + validation
        const fetchOpts = {
          ...(cityParam ? { city: cityParam } : {}),
          ...(stateParam ? { state: stateParam } : {}),
          ...(zipCodeParam ? { zip_code: zipCodeParam } : {}),
          ...(zpidParam ? { zpid: zpidParam } : {}),
        }
        const data = await fetchProperty(addressParam, fetchOpts)
        const zpid = (data as any).zpid || (data as any).property_id || 'unknown'
        const addr = (data as any).address

        // Build redirect URL with structured fields so Details links stay valid
        let redirectUrl = buildPropertyProfileHref({
          address: addr?.street || addressParam,
          city: addr?.city || cityParam,
          state: addr?.state || stateParam,
          zip_code: addr?.zip_code || zipCodeParam,
          zpid,
        })
        if (strategyParam) {
          redirectUrl += `${redirectUrl.includes('?') ? '&' : '?'}strategy=${encodeURIComponent(strategyParam)}`
        }

        // Redirect to new property-details page
        router.replace(redirectUrl)
      } catch (err) {
        console.error('Failed to redirect to property details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load property')
      }
    }

    fetchAndRedirect()
  }, [addressParam, strategyParam, cityParam, stateParam, zipCodeParam, zpidParam, router, fetchProperty])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Unable to load property
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <PropertyRedirector />
    </Suspense>
  )
}
