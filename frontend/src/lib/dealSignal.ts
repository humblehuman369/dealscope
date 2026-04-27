import type { MapListing } from '@/lib/api'

/** Map marker / list classification — rule-based, not viewport-relative. */
export type DealCategory =
  | 'distressed' // Red — auction, foreclosure, pre-foreclosure
  | 'stale_60' // Orange — 60+ days on market
  | 'stale_30' // Yellow — 30+ days on market
  | 'owner_listed' // Green — FSBO / owner-listed when DOM under 30 (or DOM unknown)
  | 'active' // Dark green — MLS active with DOM known and under 30 days
  | 'unknown' // Grey — e.g. active but DOM missing

export interface DealSignalResult {
  category: DealCategory
  /** Higher = sort first when sort_by is deal_signal (Red=5 … Active=1, Unknown=0). */
  rank: number
  label: string
  color: string
}

export type SortOption = 'deal_signal' | 'price_asc' | 'price_desc' | 'dom_desc' | 'newest'

/**
 * Canonical status categories used for filtering and display.
 * Raw API values (Zillow: "FOR_SALE", RentCast: "Active", etc.)
 * are mapped to these via normalizeListingStatus().
 */
export type CanonicalStatus =
  | 'active'
  | 'owner_listed'
  | 'foreclosure'
  | 'pre-foreclosure'
  | 'auction'
  | 'sold'
  | 'off-market'
  | 'other'

const STATUS_MAP: Record<string, CanonicalStatus> = {
  // Zillow homeStatus values
  'for_sale': 'active',
  'for_rent': 'active',
  'pre_foreclosure': 'pre-foreclosure',
  'pre-foreclosure': 'pre-foreclosure',
  'preforeclosure': 'pre-foreclosure',
  'recently_sold': 'sold',
  'sold': 'sold',
  'off_market': 'off-market',
  'closed': 'sold',

  // RentCast status values
  'active': 'active',
  'inactive': 'off-market',

  // Distressed / special statuses
  'foreclosure': 'foreclosure',
  'foreclosed': 'foreclosure',
  'auction': 'auction',
  'bank owned': 'foreclosure',
  'bank_owned': 'foreclosure',
  'bankowned': 'foreclosure',
  'reo': 'foreclosure',
  'short sale': 'pre-foreclosure',
  'short_sale': 'pre-foreclosure',
  'shortsale': 'pre-foreclosure',

  // Owner-listed (FSBO). Backend emits "Owner Listed" when
  // listingSubType.isFSBO is true; the others are defensive coverage for
  // any provider that uses raw string values.
  'owner listed': 'owner_listed',
  'owner_listed': 'owner_listed',
  'for sale by owner': 'owner_listed',
  'for_sale_by_owner': 'owner_listed',
  'fsbo': 'owner_listed',
  'by owner': 'owner_listed',
  'by_owner': 'owner_listed',

  // Misc
  'price reduced': 'active',
  'price_reduced': 'active',
}

export function normalizeListingStatus(raw: string | null): CanonicalStatus {
  if (!raw) return 'other'
  const key = raw.toLowerCase().trim()
  return STATUS_MAP[key] ?? 'other'
}

export function displayListingStatus(raw: string | null): string {
  switch (normalizeListingStatus(raw)) {
    case 'active': return 'Active'
    case 'owner_listed': return 'Owner Listed'
    case 'foreclosure': return 'Foreclosure'
    case 'pre-foreclosure': return 'Pre-Foreclosure'
    case 'auction': return 'Auction'
    case 'sold': return 'Sold'
    case 'off-market': return 'Off-Market'
    case 'other': return raw?.trim() || 'Unknown'
  }
}

const DISTRESSED_CATEGORIES: Set<CanonicalStatus> = new Set([
  'foreclosure',
  'pre-foreclosure',
  'auction',
])

const CATEGORY_RANK: Record<DealCategory, number> = {
  distressed: 5,
  stale_60: 4,
  stale_30: 3,
  owner_listed: 2,
  active: 1,
  unknown: 0,
}

/** Marker / badge fill colors (solid hex for map pins). */
const CATEGORY_MARKER_HEX: Record<DealCategory, string> = {
  distressed: '#EF4444',
  stale_60: '#F97316',
  stale_30: '#EAB308',
  owner_listed: '#22C55E',
  active: '#16A34A',
  unknown: '#9CA3AF',
}

function distressLabel(canonical: CanonicalStatus): string {
  switch (canonical) {
    case 'foreclosure':
      return 'Foreclosure'
    case 'pre-foreclosure':
      return 'Pre-Foreclosure'
    case 'auction':
      return 'Auction'
    default:
      return 'Distressed'
  }
}

function staleLabel(days: number, canonical: CanonicalStatus): string {
  const fsbo = canonical === 'owner_listed'
  if (days >= 60) {
    return fsbo ? '60+ DOM (FSBO)' : '60+ DOM'
  }
  return fsbo ? '30+ DOM (FSBO)' : '30+ DOM'
}

/**
 * Classify one listing for map color and list sorting.
 * Precedence: distress > DOM buckets > owner-listed > active.
 * Active + missing DOM → `unknown` (grey) so we never guess time on market.
 */
export function classifyListing(listing: MapListing): DealSignalResult {
  const canonical = normalizeListingStatus(listing.listing_status)

  if (DISTRESSED_CATEGORIES.has(canonical)) {
    return {
      category: 'distressed',
      rank: CATEGORY_RANK.distressed,
      label: distressLabel(canonical),
      color: CATEGORY_MARKER_HEX.distressed,
    }
  }

  const dom = listing.days_on_market

  if (dom != null) {
    if (dom >= 60) {
      return {
        category: 'stale_60',
        rank: CATEGORY_RANK.stale_60,
        label: staleLabel(dom, canonical),
        color: CATEGORY_MARKER_HEX.stale_60,
      }
    }
    if (dom >= 30) {
      return {
        category: 'stale_30',
        rank: CATEGORY_RANK.stale_30,
        label: staleLabel(dom, canonical),
        color: CATEGORY_MARKER_HEX.stale_30,
      }
    }
  }

  if (canonical === 'owner_listed') {
    return {
      category: 'owner_listed',
      rank: CATEGORY_RANK.owner_listed,
      label: 'Owner Listed',
      color: CATEGORY_MARKER_HEX.owner_listed,
    }
  }

  if (canonical === 'active') {
    // Intentional: we do not guess time-on-market. If the feed omits DOM, bucket
    // as unknown (grey) instead of defaulting to "fresh" Active (dark green).
    if (dom === null) {
      return {
        category: 'unknown',
        rank: CATEGORY_RANK.unknown,
        label: 'DOM unknown',
        color: CATEGORY_MARKER_HEX.unknown,
      }
    }
    return {
      category: 'active',
      rank: CATEGORY_RANK.active,
      label: 'Active',
      color: CATEGORY_MARKER_HEX.active,
    }
  }

  return {
    category: 'unknown',
    rank: CATEGORY_RANK.unknown,
    label: displayListingStatus(listing.listing_status),
    color: CATEGORY_MARKER_HEX.unknown,
  }
}

/**
 * When upstream merges RentCast + Zillow (and tagged distressed queries),
 * the same logical listing can appear twice with the same `id`. Pick one row
 * per id so markers, cards, and sort keys stay consistent — prefer the row
 * whose normalized status carries stronger investor signal (distress > FSBO > active).
 */
function listingMergePriority(canonical: CanonicalStatus): number {
  switch (canonical) {
    case 'foreclosure':
    case 'pre-foreclosure':
    case 'auction':
      return 100
    case 'owner_listed':
      return 80
    case 'active':
      return 40
    case 'other':
      return 25
    case 'sold':
    case 'off-market':
      return 10
    default:
      return 20
  }
}

export function mergeMapListingsByIdPreferStrongerStatus(listings: MapListing[]): MapListing[] {
  const byId = new Map<string, MapListing>()
  for (const l of listings) {
    const prev = byId.get(l.id)
    if (!prev) {
      byId.set(l.id, l)
      continue
    }
    const pa = listingMergePriority(normalizeListingStatus(prev.listing_status))
    const pb = listingMergePriority(normalizeListingStatus(l.listing_status))
    const winner = pb > pa ? l : prev
    const loser = pb > pa ? prev : l
    byId.set(l.id, fillMissingFromLoser(winner, loser))
  }
  return [...byId.values()]
}

// Status priority decides the winner, but we don't want to lose a photo or
// other useful surface fields just because the duplicate row with the
// stronger status happens to be sparser. Fill nulls from the loser.
const PRESERVE_FROM_LOSER: ReadonlyArray<keyof MapListing> = [
  'photo_url',
  'price',
  'bedrooms',
  'bathrooms',
  'sqft',
  'year_built',
  'days_on_market',
  'property_type',
]

function fillMissingFromLoser(winner: MapListing, loser: MapListing): MapListing {
  let merged: MapListing | null = null
  for (const key of PRESERVE_FROM_LOSER) {
    if (winner[key] == null && loser[key] != null) {
      if (!merged) merged = { ...winner }
      // Each preserved key shares the same nullable type on both sides, but
      // TS can't narrow that across the loop, so we widen via unknown.
      ;(merged as unknown as Record<string, unknown>)[key] = loser[key]
    }
  }
  return merged ?? winner
}

export function classifyListings(listings: MapListing[]): Map<string, DealSignalResult> {
  const results = new Map<string, DealSignalResult>()
  for (const listing of listings) {
    if (results.has(listing.id)) continue
    results.set(listing.id, classifyListing(listing))
  }
  return results
}

export function markerColorForCategory(category: DealCategory): string {
  return CATEGORY_MARKER_HEX[category]
}

export function sortListings(
  listings: MapListing[],
  signals: Map<string, DealSignalResult>,
  sortBy: SortOption,
): MapListing[] {
  const sorted = [...listings]
  switch (sortBy) {
    case 'deal_signal':
      sorted.sort((a, b) => {
        const ra = signals.get(a.id)?.rank ?? 0
        const rb = signals.get(b.id)?.rank ?? 0
        if (rb !== ra) return rb - ra
        const da = a.days_on_market ?? 0
        const db = b.days_on_market ?? 0
        return db - da
      })
      break
    case 'price_asc':
      sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
      break
    case 'price_desc':
      sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
      break
    case 'dom_desc':
      sorted.sort((a, b) => (b.days_on_market ?? 0) - (a.days_on_market ?? 0))
      break
    case 'newest':
      sorted.sort((a, b) => (a.days_on_market ?? Infinity) - (b.days_on_market ?? Infinity))
      break
  }
  return sorted
}

export function filterByListingStatus(
  listings: MapListing[],
  statuses: string[],
): MapListing[] {
  if (statuses.length === 0) return listings
  const allowed = new Set(statuses as CanonicalStatus[])
  return listings.filter((l) => allowed.has(normalizeListingStatus(l.listing_status)))
}

/**
 * Filter by minimum days on market. Uses numeric `days_on_market` when present.
 * When the feed omits DOM but the listing was bucketed into stale 30/60/distressed
 * markers, those rows still respect 30+ / 60+ filters so behavior matches map colors.
 * Thresholds 90+ and 120+ require numeric DOM — classification does not guarantee 90d+.
 */
export function filterByMinDom(
  listings: MapListing[],
  minDom: number | undefined,
  dealSignals?: Map<string, DealSignalResult>,
): MapListing[] {
  if (minDom == null || minDom <= 0) return listings

  return listings.filter((l) => {
    if (l.days_on_market != null && l.days_on_market >= minDom) return true
    if (l.days_on_market != null) return false

    const sig = dealSignals?.get(l.id)
    if (!sig) return false

    if (minDom <= 30) {
      return sig.category === 'stale_30' || sig.category === 'stale_60' || sig.category === 'distressed'
    }
    if (minDom <= 60) {
      return sig.category === 'stale_60' || sig.category === 'distressed'
    }
    return false
  })
}
