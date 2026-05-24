import type { MapListing } from '@/lib/api'

/** True when listing.id is a numeric Zillow zpid from map search. */
export function isZillowZpid(id: string): boolean {
  return /^\d+$/.test(id.trim())
}

/** Build Discovery URL query params from a map listing (includes zpid when available). */
export function buildDiscoverySearchParams(listing: MapListing): URLSearchParams {
  const params = new URLSearchParams({ address: listing.address })
  if (listing.city) params.set('city', listing.city)
  if (listing.state) params.set('state', listing.state)
  if (listing.zip_code) params.set('zip_code', listing.zip_code)
  if (isZillowZpid(listing.id)) {
    params.set('zpid', listing.id.trim())
  }
  return params
}

export function discoveryPathFromListing(listing: MapListing): string {
  return `/discovery?${buildDiscoverySearchParams(listing).toString()}`
}
