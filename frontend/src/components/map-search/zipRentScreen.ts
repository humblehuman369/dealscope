/**
 * Presentation of the ZIP rent-vs-price screen.
 *
 * One place, because the honesty of this feature lives entirely in its
 * labelling. The number is a ZIP median — what homes of this size in this ZIP
 * rent for — and it must never be read as a valuation of the specific
 * property. Every surface that shows it (pin, list row, preview card) formats
 * it through here so none of them can quietly drop the qualifier.
 */

import type { MapListing } from '@/lib/api'

export interface ZipRentScreen {
  /** e.g. "0.74%" — monthly rent as a share of price. */
  ratioLabel: string | null
  /** e.g. "$2,150/mo" */
  rentLabel: string
  /** e.g. "3-bed median" or "ZIP median" */
  basisLabel: string
  /** Full disclosure sentence for tooltips and the preview card. */
  disclosure: string
}

export function getZipRentScreen(listing: MapListing): ZipRentScreen | null {
  const rent = listing.zip_median_rent
  if (rent == null || !(rent > 0)) return null

  const ratio = listing.zip_rent_to_price
  const bedroomMatched = listing.zip_median_rent_basis === 'bedroom' && listing.bedrooms != null

  const basisLabel = bedroomMatched ? `${listing.bedrooms}-bed median` : 'ZIP median'
  const rentLabel = `$${Math.round(rent).toLocaleString()}/mo`
  const ratioLabel = ratio != null && ratio > 0 ? `${(ratio * 100).toFixed(2)}%` : null

  const scope = bedroomMatched
    ? `${listing.bedrooms}-bedroom homes in ${listing.zip_code ?? 'this ZIP'}`
    : `homes in ${listing.zip_code ?? 'this ZIP'}`

  return {
    ratioLabel,
    rentLabel,
    basisLabel,
    disclosure:
      `${rentLabel} is the median asking rent for ${scope} — a market screen, ` +
      `not an estimate for this property. Analyze it for the real rent and Deal Gap.`,
  }
}

/**
 * Colour for the rent-to-price ratio.
 *
 * Anchored on the rent-to-price rules of thumb investors already carry: 1% is
 * the classic cash-flow bar, 0.7% is the edge of workable in most markets.
 * Deliberately three coarse bands — a screen this rough should not imply
 * precision it does not have.
 */
export function zipRentRatioColor(ratio: number | null | undefined): string {
  if (ratio == null) return 'var(--text-secondary)'
  if (ratio >= 0.01) return 'var(--status-positive)'
  if (ratio >= 0.007) return 'var(--status-warning)'
  return 'var(--text-secondary)'
}
