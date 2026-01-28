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
  const [state, zipCode] = stateZip.split(' ')
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'deal-maker/page.tsx:32',message:'H1: stateZip split result',data:{stateZip,splitResult:stateZip.split(' '),state,zipCode,finalZip:zipCode||'00000'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'deal-maker/page.tsx:45',message:'H2/H3: rentEstimate from URL',data:{rentEstimate,rentEstimateType:typeof rentEstimate,urlParam:new URLSearchParams(window.location.search).get('rentEstimate')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Build property data from URL params
  const property: DealMakerPropertyData = {
    address: streetAddress,
    city: city,
    state: state || 'FL',
    zipCode: zipCode || '00000',
    beds: 4,
    baths: 2,
    sqft: 1850,
    price: listPrice || 350000,
    rent: rentEstimate,
    propertyTax: propertyTax,
    insurance: insurance,
  }

  return (
    <DealMakerScreen
      property={property}
      listPrice={listPrice}
    />
  )
}
