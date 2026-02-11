'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PriceCheckerIQScreen } from '@/components/price-checker'
import { Loader2 } from 'lucide-react'

/**
 * PriceCheckerIQ Page
 * Route: /price-intel?address=...&view=sale|rent
 * 
 * Unified comparable analysis page combining Sale Comps and Rent Comps
 * with sub-tabs, dual valuation, and appraisal toolkit.
 */

function PriceIntelContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address') || ''
  const viewParam = (searchParams.get('view') as 'sale' | 'rent') || 'sale'
  const zpidParam = searchParams.get('zpid') || searchParams.get('propertyId') || ''

  // Parse address components from the full address
  const addressParts = addressParam.split(',').map(s => s.trim())
  const streetAddress = addressParts[0] || ''
  const city = addressParts[1] || ''
  const stateZip = addressParts[2] || ''
  const stateZipParts = stateZip.split(' ')
  const state = stateZipParts[0] || ''
  const zipCode = stateZipParts[1] || ''

  return (
    <PriceCheckerIQScreen
      property={{
        address: streetAddress,
        city,
        state,
        zipCode,
        zpid: zpidParam,
      }}
      initialView={viewParam}
    />
  )
}

export default function PriceIntelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin" />
      </div>
    }>
      <PriceIntelContent />
    </Suspense>
  )
}
