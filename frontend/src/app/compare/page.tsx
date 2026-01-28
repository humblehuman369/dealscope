'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SalesCompsScreen, type SalesCompsPropertyData } from '@/components/sales-comps'
import { Loader2 } from 'lucide-react'

/**
 * Sales Comps / Similar Sales Page
 * Route: /compare?address=...
 * 
 * Shows comparable sold properties for ARV estimation.
 * Uses the new SalesCompsScreen with CompactHeader.
 */

function SalesCompsContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address') || ''
  
  // Parse address components from the full address
  const addressParts = addressParam.split(',').map(s => s.trim())
  const streetAddress = addressParts[0] || '1451 Sw 10th St'
  const city = addressParts[1] || 'Boca Raton'
  const stateZip = addressParts[2] || 'FL 33486'
  const [state, zipCode] = stateZip.split(' ')

  // Build property data from URL params
  const property: SalesCompsPropertyData = {
    address: streetAddress,
    city: city,
    state: state || 'FL',
    zipCode: zipCode || '33486',
    beds: 4,
    baths: 2,
    sqft: 1722,
    yearBuilt: 1969,
    price: 821000,
    rent: 5555,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  }

  return (
    <SalesCompsScreen 
      property={property}
      arvEstimate={809810}
      arvRangeLow={737548}
      arvRangeHigh={868695}
      arvConfidence={97}
    />
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
      </div>
    }>
      <SalesCompsContent />
    </Suspense>
  )
}
