'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { RentalCompsScreen, type RentalCompsPropertyData } from '@/components/rental-comps'
import { Loader2 } from 'lucide-react'

/**
 * Rental Comps / Similar Rents Page
 * Route: /rental-comps?address=...
 * 
 * Shows comparable rental properties for rent estimation.
 * Uses the RentalCompsScreen with CompactHeader.
 */

function RentalCompsContent() {
  const searchParams = useSearchParams()
  const addressParam = searchParams.get('address') || ''
  
  // Parse address components from the full address
  const addressParts = addressParam.split(',').map(s => s.trim())
  const streetAddress = addressParts[0] || '1451 Sw 10th St'
  const city = addressParts[1] || 'Boca Raton'
  const stateZip = addressParts[2] || 'FL 33486'
  const [state, zipCode] = stateZip.split(/\s+/)

  // Build property data from URL params
  const property: RentalCompsPropertyData = {
    address: streetAddress,
    city: city,
    state: state || 'FL',
    zipCode: zipCode || '33486',
    beds: 4,
    baths: 2,
    sqft: 1722,
    yearBuilt: 1969,
    price: 821000,
    rent: 3200,
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  }

  return (
    <RentalCompsScreen 
      property={property}
      initialRentEstimate={3200}
      rentRangeLow={2850}
      rentRangeHigh={3550}
      rentConfidence={94}
      estCapRate={4.7}
    />
  )
}

export default function RentalCompsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0891B2] animate-spin" />
      </div>
    }>
      <RentalCompsContent />
    </Suspense>
  )
}
