'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { DealMakerScreen, type DealMakerPropertyData } from '@/components/deal-maker/DealMakerScreen'

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
  const stateZip = addressParts[2] || 'FL 00000'
  const [state, zipCode] = stateZip.split(/\s+/)

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
    state: state || 'FL',
    zipCode: zipCode || '00000',
    beds: beds || 4,
    baths: baths || 2,
    sqft: sqft || 1850,
    price: listPrice || 350000,
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
