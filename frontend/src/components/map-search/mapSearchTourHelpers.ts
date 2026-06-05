import type { MapListing } from '@/lib/api'
import type { DealSignalResult } from '@/lib/dealSignal'

export type MapTourPersona = 'hunter' | 'holder' | 'default'

const HUNTER_STRATEGIES = new Set(['flip', 'wholesale', 'brrrr'])

export function resolveMapTourPersona(preferredStrategies: string[] | undefined): MapTourPersona {
  if (!preferredStrategies?.length) return 'default'
  if (preferredStrategies.some((s) => HUNTER_STRATEGIES.has(s))) return 'hunter'
  if (preferredStrategies.some((s) => s === 'ltr' || s === 'str' || s === 'house_hack')) {
    return 'holder'
  }
  return 'default'
}

export function getMapTourWelcomeCopy(persona: MapTourPersona): { title: string; body: string } {
  switch (persona) {
    case 'hunter':
      return {
        title: 'Every pin is pre-graded.',
        body: 'Red means motivated seller. Your job: find distressed deals across an entire ZIP — before they hit the MLS.',
      }
    case 'holder':
      return {
        title: 'Hunt your next rental market.',
        body: 'Stale listings and off-market owners — every parcel pre-graded so you spot opportunity at a glance.',
      }
    default:
      return {
        title: 'Every pin is pre-graded.',
        body: 'Hunt foreclosures, expired listings, and off-market parcels — then analyze any home in 15 seconds.',
      }
  }
}

/** Best listing to highlight at tour close — prefer distressed, then highest deal rank. */
export function pickTourHighlightListing(
  listings: MapListing[],
  dealSignals: Map<string, DealSignalResult>,
): MapListing | null {
  if (listings.length === 0) return null

  const scored = listings
    .map((listing) => ({
      listing,
      signal: dealSignals.get(listing.id),
    }))
    .filter((row) => row.signal)

  const distressed = scored.filter((row) => row.signal?.category === 'distressed')
  const pool = distressed.length > 0 ? distressed : scored

  if (pool.length === 0) return listings[0] ?? null

  pool.sort((a, b) => (b.signal?.rank ?? 0) - (a.signal?.rank ?? 0))
  return pool[0]?.listing ?? listings[0] ?? null
}

export function formatTourListingLabel(listing: MapListing): string {
  const street = listing.address?.split(',')[0]?.trim() || listing.address
  return street || 'this property'
}
