/**
 * Shared transform helpers for sale and rent comps (haversine, similarity).
 */

import type { SubjectProperty } from './types'
import type { SaleComp } from './types'

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Similarity score 0–100 for a sale comp vs subject.
 * Used for rent comps with the same formula (beds, baths, sqft, yearBuilt, distance).
 */
export function calculateSimilarity(
  subject: SubjectProperty,
  comp: { beds: number; baths: number; sqft: number; yearBuilt: number; distanceMiles: number }
): number {
  const subjectSqft = subject.sqft || 1
  const location = Math.max(0, 100 - comp.distanceMiles * 25)
  const size = Math.max(
    0,
    100 - (Math.abs(subject.sqft - comp.sqft) / subjectSqft) * 100
  )
  const bedBath =
    subject.beds === comp.beds && subject.baths === comp.baths
      ? 100
      : subject.beds === comp.beds || subject.baths === comp.baths
        ? 85
        : 70
  const age = Math.max(0, 100 - Math.abs(subject.yearBuilt - comp.yearBuilt) * 1.5)
  return Math.round(location * 0.35 + size * 0.25 + bedBath * 0.25 + age * 0.15)
}
