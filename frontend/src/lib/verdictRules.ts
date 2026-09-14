/**
 * Call rules for the Discovery Verdict card (workflow v1).
 * Thresholds live here so they can change without touching the component.
 */

export const VERDICT_CALLS = ['worth_pursuing', 'only_with_terms', 'walk_away'] as const
export type VerdictCall = (typeof VERDICT_CALLS)[number]

/** Gap at or below this is Worth pursuing, signals or not. */
export const SMALL_GAP_THRESHOLD = 10

export const verdictRules = {
  smallGapPct: SMALL_GAP_THRESHOLD,
  /** Gap at or above this (and fewer than 2 signals) is Walk away. */
  gapWalkAwayPct: 35,
  daysOnMarketSignal: 90,
  priceCutsSignal: 3,
} as const

export const VERDICT_CALL_LABELS: Record<VerdictCall, string> = {
  worth_pursuing: 'Worth pursuing',
  only_with_terms: 'Only with terms',
  walk_away: 'Walk away',
}

export interface ListingSignalInput {
  daysOnMarket: number | null
  priceCuts: number
  ownerOccupied: boolean | null
  distressed: boolean
  expiredOrWithdrawn: boolean
}

export interface VerdictSignalBreakdown {
  count: number
  fired: string[]
}

export function listingSignalsFromListing(
  listing:
    | {
        days_on_market?: number | null
        price_reduction_count?: number | null
        is_owner_occupied?: boolean | null
        is_absentee_owner?: boolean | null
        is_foreclosure?: boolean | null
        is_pre_foreclosure?: boolean | null
        is_bank_owned?: boolean | null
        is_auction?: boolean | null
        listing_status?: string | null
      }
    | null
    | undefined,
): ListingSignalInput {
  const status = (listing?.listing_status ?? '').toUpperCase().replace(/[\s-]+/g, '_')
  const ownerOccupied =
    listing?.is_owner_occupied != null
      ? listing.is_owner_occupied
      : listing?.is_absentee_owner == null
        ? null
        : !listing.is_absentee_owner
  return {
    daysOnMarket:
      listing?.days_on_market != null && Number.isFinite(listing.days_on_market)
        ? listing.days_on_market
        : null,
    priceCuts: listing?.price_reduction_count ?? 0,
    ownerOccupied,
    distressed: Boolean(
      listing?.is_foreclosure ||
        listing?.is_pre_foreclosure ||
        listing?.is_bank_owned ||
        listing?.is_auction,
    ),
    expiredOrWithdrawn: status.includes('EXPIRED') || status.includes('WITHDRAWN'),
  }
}

/** Count the Section 7 signals. Names are for the call Why? line only. */
export function countVerdictSignals(input: ListingSignalInput): VerdictSignalBreakdown {
  const fired: string[] = []
  if (input.daysOnMarket != null && input.daysOnMarket >= verdictRules.daysOnMarketSignal) {
    fired.push(`${input.daysOnMarket} days on market`)
  }
  if (input.priceCuts >= verdictRules.priceCutsSignal) {
    fired.push(`${input.priceCuts} price cuts`)
  }
  if (input.ownerOccupied === false) {
    fired.push('not owner-occupied')
  }
  if (input.distressed) {
    fired.push('distress flag')
  }
  if (input.expiredOrWithdrawn) {
    fired.push('expired or withdrawn listing')
  }
  return { count: fired.length, fired }
}

/**
 * `gap` is list vs Target Buy as a positive percent when list is above Target Buy.
 * 0 or negative means list is at or below Target Buy.
 * `closes` is logged with verdict_viewed; it is not part of the decision table.
 */
export function resolveCall(
  gap: number,
  signals: number,
  prices?: { listPrice?: number | null; incomeValue?: number | null },
): VerdictCall {
  const listPrice = prices?.listPrice
  const incomeValue = prices?.incomeValue
  if (
    listPrice != null &&
    incomeValue != null &&
    Number.isFinite(listPrice) &&
    Number.isFinite(incomeValue) &&
    listPrice <= incomeValue
  ) {
    return 'worth_pursuing'
  }
  if (gap <= verdictRules.smallGapPct) return 'worth_pursuing'
  if (gap < verdictRules.gapWalkAwayPct) {
    return signals >= 1 ? 'worth_pursuing' : 'only_with_terms'
  }
  return signals >= 2 ? 'only_with_terms' : 'walk_away'
}

export function anyLeverClosesGap(
  paths: ReadonlyArray<{ breakeven?: { closesGapAlone?: boolean } | null }> | null | undefined,
): boolean {
  return Boolean(paths?.some((p) => p.breakeven?.closesGapAlone === true))
}
