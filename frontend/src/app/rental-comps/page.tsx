'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Legacy Rental Comps Route: /rental-comps
 * Redirects to /price-intel?view=rent&address=...
 */
function RedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const address = searchParams.get('address') || ''
    const params = new URLSearchParams()
    params.set('view', 'rent')
    if (address) params.set('address', address)
    router.replace(`/price-intel?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
    </div>
  )
}

export default function RentalCompsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
      </div>
    }>
      <RedirectContent />
    </Suspense>
  )
}
