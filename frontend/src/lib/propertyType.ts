/**
 * Canonical property-type buckets for map-search filters.
 *
 * Providers disagree on labels (RentCast "Multi-Family", Zillow "MULTI_FAMILY")
 * and a naive substring like `"single" in type` would mis-read MULTI_FAMILY.
 * Keep in sync with `canonicalize_property_type` in
 * `backend/app/services/map_search_service.py`.
 */

export type CanonicalPropertyType = 'single_family' | 'condo' | 'townhouse' | 'multi_family'

export function canonicalizePropertyType(
  raw: string | null | undefined,
): CanonicalPropertyType | null {
  if (!raw) return null
  const s = raw.toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!s) return null
  const compact = s.replace(/ /g, '')

  if (
    compact === 'multifamily' ||
    s.includes('multi family') ||
    s === 'multi' ||
    s === 'mf' ||
    s === 'mfh' ||
    s.includes('duplex') ||
    s.includes('triplex') ||
    s.includes('fourplex') ||
    s.includes('quadplex') ||
    s.includes('quadruplex')
  ) {
    return 'multi_family'
  }
  if (s.includes('condo')) return 'condo'
  if (s.includes('town')) return 'townhouse'
  if (s.includes('single') || s === 'sfr' || s === 'house' || s === 'houses') {
    return 'single_family'
  }
  return null
}

export function listingMatchesPropertyType(
  listingType: string | null | undefined,
  wanted: string | null | undefined,
): boolean {
  if (!wanted) return true
  const canonicalWanted = canonicalizePropertyType(wanted)
  if (!canonicalWanted) return true
  return canonicalizePropertyType(listingType) === canonicalWanted
}

export function filterByPropertyType<T extends { property_type?: string | null }>(
  listings: T[],
  propertyType: string | null | undefined,
): T[] {
  if (!propertyType || !canonicalizePropertyType(propertyType)) return listings
  return listings.filter((l) => listingMatchesPropertyType(l.property_type, propertyType))
}
