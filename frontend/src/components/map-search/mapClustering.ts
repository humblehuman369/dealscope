/**
 * Signal-preserving marker clustering.
 *
 * At metro zoom a few hundred price pills overlap into an unreadable mat, and
 * the one thing an investor is scanning for — a red distressed pin — is the
 * first casualty. Clustering fixes the density, but a plain count bubble
 * throws away exactly that signal.
 *
 * So each cluster inherits the strongest `DealCategory` inside it, ranked by
 * `CATEGORY_RANK`. One foreclosure among forty active listings still paints
 * the bubble red, and the colour language of `dealSignal.ts` keeps working at
 * every zoom instead of only when pins happen to be sparse.
 */

import type { MapListing } from '@/lib/api'
import { CATEGORY_RANK, type DealCategory, type DealSignalResult } from '@/lib/dealSignal'

/**
 * Below this many pins in view, everything renders individually: the price is
 * the point, and there is no density problem to solve.
 */
export const CLUSTER_PIN_THRESHOLD = 80

/**
 * Cells across the shorter viewport axis. Twelve puts a cell at roughly 60–90
 * screen pixels — wide enough to absorb the overlap, tight enough that a
 * cluster still means "these are the same block".
 */
const GRID_CELLS = 12

export interface ListingCluster {
  key: string
  lat: number
  lng: number
  count: number
  /** Strongest category among the members, for the bubble colour. */
  category: DealCategory
  /** Members, so a click can zoom to fit or open the single listing. */
  listings: MapListing[]
}

export interface ClusterResult {
  /** Rendered as ordinary price pills. */
  singles: MapListing[]
  /** Rendered as count bubbles. Empty when clustering is off. */
  clusters: ListingCluster[]
}

interface ClusterBounds {
  north: number
  south: number
  east: number
  west: number
}

function isFinitePair(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Group `listings` into viewport-relative grid cells.
 *
 * Returns everything as `singles` when the pin count is under
 * {@link CLUSTER_PIN_THRESHOLD}, and cells holding a single listing stay
 * singles too — a lone pin is more useful showing its price than its count.
 */
export function clusterListings(
  listings: MapListing[],
  dealSignals: Map<string, DealSignalResult>,
  bounds: ClusterBounds | null,
): ClusterResult {
  if (listings.length < CLUSTER_PIN_THRESHOLD || !bounds) {
    return { singles: listings, clusters: [] }
  }

  const latSpan = bounds.north - bounds.south
  const lngSpan = bounds.east - bounds.west
  if (!(latSpan > 0) || !(lngSpan > 0)) {
    return { singles: listings, clusters: [] }
  }

  // A single step for both axes keeps cells square in degrees, which is close
  // enough to square on screen at the latitudes this app serves.
  const step = Math.min(latSpan, lngSpan) / GRID_CELLS
  const cells = new Map<string, MapListing[]>()

  for (const listing of listings) {
    if (!isFinitePair(listing.latitude, listing.longitude)) continue
    const row = Math.floor((listing.latitude - bounds.south) / step)
    const col = Math.floor((listing.longitude - bounds.west) / step)
    const key = `${row}:${col}`
    const bucket = cells.get(key)
    if (bucket) bucket.push(listing)
    else cells.set(key, [listing])
  }

  const singles: MapListing[] = []
  const clusters: ListingCluster[] = []

  for (const [key, members] of cells) {
    if (members.length === 1) {
      singles.push(members[0])
      continue
    }
    let latSum = 0
    let lngSum = 0
    let category: DealCategory = 'unknown'
    for (const member of members) {
      latSum += member.latitude
      lngSum += member.longitude
      const memberCategory = dealSignals.get(member.id)?.category ?? 'unknown'
      if (CATEGORY_RANK[memberCategory] > CATEGORY_RANK[category]) {
        category = memberCategory
      }
    }
    clusters.push({
      key,
      lat: latSum / members.length,
      lng: lngSum / members.length,
      count: members.length,
      category,
      listings: members,
    })
  }

  return { singles, clusters }
}
