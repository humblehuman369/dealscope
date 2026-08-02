/**
 * Shared transform helpers for sale and rent comps (haversine, similarity).
 */

import type { SubjectProperty } from './types'
import type { SaleComp } from './types'

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

/**
 * 8-point compass direction from subject to comp using the initial great-circle
 * bearing (straight line, not driving route). Fannie Mae appraisal reporting
 * expects each comparable's distance and direction, e.g. "1.75 mi NW".
 */
export function compassDirection(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const toRad = Math.PI / 180
  const dLon = (lon2 - lon1) * toRad
  const y = Math.sin(dLon) * Math.cos(lat2 * toRad)
  const x =
    Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
    Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLon)
  const bearingDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  return COMPASS_POINTS[Math.round(bearingDeg / 45) % 8]
}

/**
 * Similarity score 0–100 for a sale comp vs subject.
 * Used for rent comps with the same formula (beds, baths, sqft, yearBuilt, distance).
 */
export function calculateSimilarity(
  subject: SubjectProperty,
  comp: { beds: number; baths: number; sqft: number; yearBuilt: number; distanceMiles: number },
): number {
  const subjectSqft = subject.sqft || 1
  const location = Math.max(0, 100 - comp.distanceMiles * 25)
  const size = Math.max(0, 100 - (Math.abs(subject.sqft - comp.sqft) / subjectSqft) * 100)
  const bedBath =
    subject.beds === comp.beds && subject.baths === comp.baths
      ? 100
      : subject.beds === comp.beds || subject.baths === comp.baths
        ? 85
        : 70
  const age = Math.max(0, 100 - Math.abs(subject.yearBuilt - comp.yearBuilt) * 1.5)
  return Math.round(location * 0.35 + size * 0.25 + bedBath * 0.25 + age * 0.15)
}
