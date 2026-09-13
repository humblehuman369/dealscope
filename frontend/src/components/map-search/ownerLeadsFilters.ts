import type { MapListing } from '@/lib/api'
import type { MapSearchFilters } from '@/hooks/useMapSearch'

export type OwnerTenureBucketId = '10_20' | '20_30' | '30_plus'
export type OwnerOccupancy = 'owner_occupied' | 'absentee'
export type OwnerAvailability = 'off_market' | 'for_sale'
export type OwnerAvailabilityFilter = OwnerAvailability | 'any'

export const OWNER_TENURE_BUCKETS: {
  id: OwnerTenureBucketId
  label: string
  min: number
  max?: number
}[] = [
  { id: '10_20', label: '10–20 yrs', min: 10, max: 20 },
  { id: '20_30', label: '20–30 yrs', min: 20, max: 30 },
  { id: '30_plus', label: '30+ yrs', min: 30 },
]

export const CLEARED_OWNER_LEADS: Pick<
  MapSearchFilters,
  | 'owner_tenure_buckets'
  | 'owner_tenure_min_years'
  | 'owner_tenure_max_years'
  | 'owner_occupancy'
  | 'owner_records_availability'
> = {
  owner_tenure_buckets: [],
  owner_tenure_min_years: undefined,
  owner_tenure_max_years: undefined,
  owner_occupancy: undefined,
  owner_records_availability: undefined,
}

export function isOwnerRecordsActive(
  filters: Pick<
    MapSearchFilters,
    'owner_tenure_buckets' | 'owner_tenure_min_years' | 'owner_occupancy' | 'owner_records_availability'
  >,
): boolean {
  return (
    (filters.owner_tenure_buckets?.length ?? 0) > 0 ||
    filters.owner_occupancy != null ||
    filters.owner_records_availability != null
  )
}

export function toggleTenureBucket(
  current: OwnerTenureBucketId[] | undefined,
  id: OwnerTenureBucketId,
): OwnerTenureBucketId[] {
  const set = new Set(current ?? [])
  if (set.has(id)) set.delete(id)
  else set.add(id)
  return OWNER_TENURE_BUCKETS.map((b) => b.id).filter((bucket) => set.has(bucket))
}

export function tenureEnvelope(buckets: OwnerTenureBucketId[] | undefined): {
  owner_tenure_min_years: number | undefined
  owner_tenure_max_years: number | undefined
} {
  if (!buckets?.length) {
    return { owner_tenure_min_years: undefined, owner_tenure_max_years: undefined }
  }
  const selected = OWNER_TENURE_BUCKETS.filter((b) => buckets.includes(b.id))
  const min = Math.min(...selected.map((b) => b.min))
  const openEnded = selected.some((b) => b.max == null)
  return {
    owner_tenure_min_years: min,
    owner_tenure_max_years: openEnded ? undefined : Math.max(...selected.map((b) => b.max ?? b.min)),
  }
}

export function yearsInTenureBuckets(
  years: number | null | undefined,
  buckets: OwnerTenureBucketId[] | undefined,
): boolean {
  if (!buckets?.length) return true
  if (years == null || !Number.isFinite(years)) return false
  return buckets.some((id) => {
    if (id === '10_20') return years >= 10 && years <= 20
    if (id === '20_30') return years >= 20 && years <= 30
    return years >= 30
  })
}

export function filterListingsByTenureBuckets(
  listings: MapListing[],
  buckets: OwnerTenureBucketId[] | undefined,
): MapListing[] {
  if (!buckets?.length) return listings
  return listings.filter((listing) => yearsInTenureBuckets(listing.owner_years, buckets))
}

export function nextOwnerOccupancy(
  current: OwnerOccupancy | undefined,
  clicked: OwnerOccupancy,
): OwnerOccupancy | undefined {
  return current === clicked ? undefined : clicked
}

export function nextOwnerAvailability(
  current: OwnerAvailabilityFilter | undefined,
  toggled: OwnerAvailability,
): OwnerAvailabilityFilter | undefined {
  const offOn = current === 'any' || current === 'off_market'
  const saleOn = current === 'any' || current === 'for_sale'
  const nextOff = toggled === 'off_market' ? !offOn : offOn
  const nextSale = toggled === 'for_sale' ? !saleOn : saleOn
  if (nextOff && nextSale) return 'any'
  if (nextOff) return 'off_market'
  if (nextSale) return 'for_sale'
  return undefined
}

export function ownerAvailabilityIsSelected(
  current: OwnerAvailabilityFilter | undefined,
  which: OwnerAvailability,
): boolean {
  return current === 'any' || current === which
}

/** Restore tenure pills from a saved min/max window. min=0 is the old Any sentinel. */
export function tenureBucketsFromMinMax(
  min: number | null | undefined,
  max: number | null | undefined,
): OwnerTenureBucketId[] {
  if (min == null || min === 0) return []
  if (min === 10 && max === 20) return ['10_20']
  if (min === 20 && max === 30) return ['20_30']
  if (min === 30 && max == null) return ['30_plus']
  if (min === 10 && max === 30) return ['10_20', '20_30']
  if (min === 20 && max == null) return ['20_30', '30_plus']
  if (min === 10 && max == null) return ['10_20', '20_30', '30_plus']
  return []
}

export function withDerivedTenure(
  buckets: OwnerTenureBucketId[],
): Pick<MapSearchFilters, 'owner_tenure_buckets' | 'owner_tenure_min_years' | 'owner_tenure_max_years'> {
  return { owner_tenure_buckets: buckets, ...tenureEnvelope(buckets) }
}

export function ownerLeadsPatch(
  filters: MapSearchFilters,
  next: {
    owner_tenure_buckets?: OwnerTenureBucketId[]
    owner_occupancy?: OwnerOccupancy | undefined
    owner_records_availability?: OwnerAvailabilityFilter | undefined
  },
): Partial<MapSearchFilters> {
  const buckets = next.owner_tenure_buckets ?? filters.owner_tenure_buckets ?? []
  const occupancy = 'owner_occupancy' in next ? next.owner_occupancy : filters.owner_occupancy
  const availability =
    'owner_records_availability' in next
      ? next.owner_records_availability
      : filters.owner_records_availability
  const active = buckets.length > 0 || occupancy != null || availability != null
  return {
    ...withDerivedTenure(buckets),
    owner_occupancy: occupancy,
    owner_records_availability: availability,
    ...(active ? { motivated_seller_search: false, listing_statuses: [] } : {}),
  }
}

export function normalizeOwnerLeadsFilters<T extends MapSearchFilters>(filters: T): T {
  if ((filters.owner_tenure_buckets?.length ?? 0) > 0) {
    return { ...filters, ...tenureEnvelope(filters.owner_tenure_buckets) }
  }
  const buckets = tenureBucketsFromMinMax(
    filters.owner_tenure_min_years,
    filters.owner_tenure_max_years,
  )
  if (!buckets.length) {
    if (filters.owner_tenure_min_years === 0) {
      return { ...filters, ...withDerivedTenure([]) }
    }
    return filters
  }
  return { ...filters, ...withDerivedTenure(buckets) }
}
