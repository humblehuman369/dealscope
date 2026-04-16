import type { MapListing } from '@/lib/api'

export type DealSignalGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface DealSignalResult {
  score: number
  grade: DealSignalGrade
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
  | 'pending'
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
  'pending': 'pending',
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

  // Motivation indicators
  'contingent': 'pending',
  'under contract': 'pending',
  'under_contract': 'pending',
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
    case 'pending': return 'Pending'
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

const HIGH_MOTIVATION_CATEGORIES: Set<CanonicalStatus> = new Set([
  'pending',
])

function isDistressed(status: string | null): boolean {
  return DISTRESSED_CATEGORIES.has(normalizeListingStatus(status))
}

function isHighMotivation(status: string | null): boolean {
  return HIGH_MOTIVATION_CATEGORIES.has(normalizeListingStatus(status))
}

function percentileRank(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 50
  let count = 0
  for (const v of sorted) {
    if (v < value) count++
    else break
  }
  return (count / sorted.length) * 100
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Score a set of listings relative to each other within a viewport.
 * Lower price/sqft vs peers + higher DOM + distressed status = higher score.
 */
export function scoreDealSignals(listings: MapListing[]): Map<string, DealSignalResult> {
  const results = new Map<string, DealSignalResult>()
  if (listings.length === 0) return results

  const ppsqftValues: number[] = []
  const domValues: number[] = []

  for (const l of listings) {
    if (l.price != null && l.sqft != null && l.sqft > 0) {
      ppsqftValues.push(l.price / l.sqft)
    }
    if (l.days_on_market != null) {
      domValues.push(l.days_on_market)
    }
  }

  const sortedPpsqft = [...ppsqftValues].sort((a, b) => a - b)
  const sortedDom = [...domValues].sort((a, b) => a - b)
  const medianPpsqft = computeMedian(ppsqftValues)

  for (const listing of listings) {
    let ppsqftScore = 50
    if (listing.price != null && listing.sqft != null && listing.sqft > 0 && medianPpsqft > 0) {
      const ppsqft = listing.price / listing.sqft
      const pctile = percentileRank(ppsqft, sortedPpsqft)
      ppsqftScore = 100 - pctile
    }

    let domScore = 30
    if (listing.days_on_market != null && domValues.length > 0) {
      const pctile = percentileRank(listing.days_on_market, sortedDom)
      domScore = pctile
    }

    let statusScore = 0
    if (isDistressed(listing.listing_status)) {
      statusScore = 100
    } else if (isHighMotivation(listing.listing_status)) {
      statusScore = 50
    }

    let ageScore = 30
    if (listing.year_built != null) {
      const age = new Date().getFullYear() - listing.year_built
      ageScore = Math.min(100, Math.max(0, age * 1.5))
    }

    const raw =
      ppsqftScore * 0.4 +
      domScore * 0.3 +
      statusScore * 0.2 +
      ageScore * 0.1

    const score = Math.round(Math.max(0, Math.min(100, raw)))
    const { grade, label, color } = gradeFromScore(score)

    results.set(listing.id, { score, grade, label, color })
  }

  return results
}

function gradeFromScore(score: number): { grade: DealSignalGrade; label: string; color: string } {
  if (score >= 80) return { grade: 'A', label: 'Strong', color: 'var(--status-positive)' }
  if (score >= 60) return { grade: 'B', label: 'Good', color: '#22C55E' }
  if (score >= 40) return { grade: 'C', label: 'Fair', color: 'var(--status-warning)' }
  if (score >= 20) return { grade: 'D', label: 'Weak', color: '#F97316' }
  return { grade: 'F', label: 'Low', color: 'var(--status-negative)' }
}

export function markerColorFromGrade(grade: DealSignalGrade): string {
  switch (grade) {
    case 'A': return '#16A34A'
    case 'B': return '#22C55E'
    case 'C': return '#EAB308'
    case 'D': return '#F97316'
    case 'F': return '#EF4444'
  }
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
        const sa = signals.get(a.id)?.score ?? 0
        const sb = signals.get(b.id)?.score ?? 0
        return sb - sa
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

export function filterByMinDom(
  listings: MapListing[],
  minDom: number | undefined,
): MapListing[] {
  if (minDom == null || minDom <= 0) return listings
  return listings.filter((l) => l.days_on_market != null && l.days_on_market >= minDom)
}
