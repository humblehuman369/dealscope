'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Dynamic route handler for /property/[address] format.
 * Redirects to /property?address=... for consistent handling.
 * 
 * This supports both URL formats:
 * - /property?address=123%20Main%20St (query string - primary)
 * - /property/123%20Main%20St (path - redirects to query string format)
 */
export default function PropertyAddressRedirect() {
  const params = useParams()
  const router = useRouter()
  const address = params.address as string

  useEffect(() => {
    if (address) {
      // Decode and re-encode to normalize the address
      const decodedAddress = decodeURIComponent(address)
      const encodedAddress = encodeURIComponent(decodedAddress)
      
      // Redirect to the query string format
      router.replace(`/property?address=${encodedAddress}`)
    }
  }, [address, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400">Loading property...</p>
      </div>
    </div>
  )
}

