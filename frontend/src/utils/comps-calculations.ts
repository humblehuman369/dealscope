/**
 * Pure calculation helpers for ARV and rent estimates from selected comps.
 * Used by UI; not part of the API layer.
 */

import type { SaleComp, RentComp, SubjectProperty, ARVEstimate, RentEstimate } from '@/lib/api/types'

function getSaleUserMessage(status: number, _error: string): string {
  switch (status) {
    case 401:
      return 'API authentication failed. Please check your configuration.'
    case 404:
      return 'No comparable sales found for this property.'
    case 429:
      return 'Too many requests. Please try again in a moment.'
    case 502:
    case 503:
    case 504:
      return 'Comparable sales temporarily unavailable. Your deal analysis is complete — comps will appear when the data source is back online.'
    default:
      return 'Unable to load comparable sales. Please try again.'
  }
}

function getRentUserMessage(status: number, _error: string): string {
  switch (status) {
    case 401:
      return 'API authentication failed. Please check your configuration.'
    case 404:
      return 'No comparable rentals found for this property.'
    case 429:
      return 'Too many requests. Please try again in a moment.'
    case 502:
    case 503:
    case 504:
      return 'Comparable rentals temporarily unavailable. Your deal analysis is complete — comps will appear when the data source is back online.'
    default:
      return 'Unable to load comparable rentals. Please try again.'
  }
}

export { getSaleUserMessage, getRentUserMessage }

/**
 * ARV estimate from selected sale comps with size/bed/bath adjustments.
 */
export function calculateARVEstimate(
  selectedComps: SaleComp[],
  subject: SubjectProperty
): ARVEstimate | null {
  if (selectedComps.length === 0) return null

  const avgPricePerSqft =
    selectedComps.reduce((sum, c) => sum + c.pricePerSqft, 0) / selectedComps.length

  const adjustedPrices = selectedComps.map((comp) => {
    const sizeAdj = (subject.sqft - comp.sqft) * avgPricePerSqft * 0.08
    const bedAdj = (subject.beds - comp.beds) * 10_000
    const bathAdj = (subject.baths - comp.baths) * 5_000
    return comp.salePrice + sizeAdj + bedAdj + bathAdj
  })

  const arv = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length
  const low = Math.min(...adjustedPrices)
  const high = Math.max(...adjustedPrices)
  const arvPerSqft = subject.sqft > 0 ? arv / subject.sqft : 0
  const confidence = Math.min(
    100,
    Math.round(
      40 +
        selectedComps.length * 15 +
        (selectedComps.reduce((s, c) => s + c.similarityScore, 0) / selectedComps.length) * 0.45
    )
  )

  return {
    arv: Math.round(arv),
    arvPerSqft: Math.round(arvPerSqft * 100) / 100,
    low: Math.round(low),
    high: Math.round(high),
    compCount: selectedComps.length,
    confidence,
  }
}

/**
 * Rent estimate from selected rent comps; optional cap rate when propertyValue provided.
 */
export function calculateRentEstimate(
  selectedComps: RentComp[],
  subject: SubjectProperty,
  propertyValue: number
): RentEstimate | null {
  if (selectedComps.length === 0) return null

  const avgRentPerSqft =
    selectedComps.reduce((sum, c) => sum + c.rentPerSqft, 0) / selectedComps.length

  const adjustedRents = selectedComps.map((comp) => {
    const sizeAdj = (subject.sqft - comp.sqft) * avgRentPerSqft * 0.08
    const bedAdj = (subject.beds - comp.beds) * 150
    const bathAdj = (subject.baths - comp.baths) * 75
    return comp.monthlyRent + sizeAdj + bedAdj + bathAdj
  })

  const monthlyRent = adjustedRents.reduce((a, b) => a + b, 0) / adjustedRents.length
  const low = Math.min(...adjustedRents)
  const high = Math.max(...adjustedRents)
  const annualGross = monthlyRent * 12
  const rentPerSqft = subject.sqft > 0 ? monthlyRent / subject.sqft : 0
  const capRate =
    propertyValue > 0 ? ((annualGross * 0.6) / propertyValue) * 100 : 0
  const confidence = Math.min(
    100,
    Math.round(
      40 +
        selectedComps.length * 15 +
        (selectedComps.reduce((s, c) => s + c.similarityScore, 0) / selectedComps.length) * 0.45
    )
  )

  return {
    monthlyRent: Math.round(monthlyRent * 100) / 100,
    rentPerSqft: Math.round(rentPerSqft * 100) / 100,
    annualGross: Math.round(annualGross * 100) / 100,
    low: Math.round(low * 100) / 100,
    high: Math.round(high * 100) / 100,
    capRate: Math.round(capRate * 100) / 100,
    compCount: selectedComps.length,
    confidence,
  }
}
