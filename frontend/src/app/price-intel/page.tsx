'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PriceCheckerIQScreen } from '@/components/price-checker'
import { AuthGate } from '@/components/auth/AuthGate'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'

/**
 * PriceCheckerIQ Page
 * Route: /price-intel?address=...&view=sale|rent
 * 
 * Unified comparable analysis page combining Sale Comps and Rent Comps
 * with sub-tabs, dual valuation, and appraisal toolkit.
 */

function PriceIntelContent() {
  const searchParams = useSearchParams()
  const rawAddress = searchParams.get('address') || ''
  const addressParam = decodeURIComponent(rawAddress)
  const viewParam = (searchParams.get('view') as 'sale' | 'rent') || 'sale'
  const zpidParam = searchParams.get('zpid') || ''
  const latParam = parseFloat(searchParams.get('lat') || '') || undefined
  const lngParam = parseFloat(searchParams.get('lng') || '') || undefined

  // Parse address components from the full address
  const addressParts = addressParam.split(',').map(s => s.trim())
  const streetAddress = addressParts[0] || ''
  const city = addressParts[1] || ''
  const stateZip = addressParts[2] || ''
  const stateZipParts = stateZip.split(' ')
  const state = stateZipParts[0] || ''
  const zipCode = stateZipParts[1] || ''

  return (
    <AuthGate feature="view comparable properties" mode="section">
      <PriceCheckerIQScreen
        property={{
          address: streetAddress,
          city,
          state,
          zipCode,
          zpid: zpidParam,
          latitude: latParam,
          longitude: lngParam,
        }}
        initialView={viewParam}
      />
    </AuthGate>
  )
}

export default function PriceIntelPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <PriceIntelContent />
    </Suspense>
  )
}
