'use client'

import { useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { DealMakerPropertyData } from '@/components/deal-maker/DealMakerScreen'
import { FALLBACK_PROPERTY } from '@/lib/constants/property-defaults'

// DealMakerScreen is ~1,500+ lines with 6 strategy calculators.
// Dynamic import keeps it out of the initial page bundle.
const DealMakerScreen = dynamic(
  () => import('@/components/deal-maker/DealMakerScreen').then(m => ({ default: m.DealMakerScreen })),
  {
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-400" />
      </div>
    ),
  },
)

/**
 * Deal Maker Page
 * 
 * Dynamic route: /deal-maker/[address]
 * Optional query params:
 *   - listPrice: Initial list price
 *   - propertyTax: Annual property tax
 *   - insurance: Annual insurance
 *   - rentEstimate: Monthly rent estimate
 * 
 * Example: /deal-maker/123-Main-St-Austin-TX?listPrice=350000&rentEstimate=2500
 */

export default function DealMakerRoutePage() {
  const params = useParams()
  const searchParams = useSearchParams()

  // Decode the address from the URL
  const encodedAddress = params.address as string
  const propertyAddress = decodeURIComponent(encodedAddress.replace(/-/g, ' '))

  // Parse address components
  const addressParts = propertyAddress.split(',').map(s => s.trim())
  const streetAddress = addressParts[0] || propertyAddress
  const city = addressParts[1] || 'Unknown'
  const stateZip = addressParts[2] || ''
  const [state = '', zipCode = ''] = stateZip.split(/\s+/)

  // Parse optional query params - helper to avoid NaN values
  const parseNumericParam = (name: string): number | undefined => {
    const value = searchParams.get(name)
    if (!value) return undefined
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }

  const listPrice = parseNumericParam('listPrice')
  const propertyTax = parseNumericParam('propertyTax')
  const insurance = parseNumericParam('insurance')
  const rentEstimate = parseNumericParam('rentEstimate')
  const beds = parseNumericParam('beds')
  const baths = parseNumericParam('baths')
  const sqft = parseNumericParam('sqft')
  const zpid = searchParams.get('zpid') || undefined

  // Build property data from URL params
  const property: DealMakerPropertyData = {
    address: streetAddress,
    city: city,
    state: state || FALLBACK_PROPERTY.state,
    zipCode: zipCode || FALLBACK_PROPERTY.zipCode,
    beds: beds || FALLBACK_PROPERTY.beds,
    baths: baths || FALLBACK_PROPERTY.baths,
    sqft: sqft || FALLBACK_PROPERTY.sqft,
    price: listPrice || FALLBACK_PROPERTY.price,
    rent: rentEstimate,
    propertyTax: propertyTax,
    insurance: insurance,
    zpid: zpid,
  }
  
  return (
    <DealMakerScreen
      property={property}
      listPrice={listPrice}
    />
  )
}
