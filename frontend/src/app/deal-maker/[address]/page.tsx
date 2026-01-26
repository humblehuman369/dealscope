'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { DealMakerPage } from '@/components/deal-maker'

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

  return (
    <DealMakerPage
      propertyAddress={propertyAddress}
      listPrice={listPrice}
      propertyTax={propertyTax}
      insurance={insurance}
      rentEstimate={rentEstimate}
    />
  )
}
