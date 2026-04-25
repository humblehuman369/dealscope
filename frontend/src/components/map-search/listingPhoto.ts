/**
 * Shared photo-source resolution for map-search cards.
 *
 * Strategy: try a tiered list of candidates (server `photo_url` first, then
 * Google Street View). When an `<img>` fails to load (expired Zillow CDN URL,
 * 403, hotlink-blocked, mixed-content, etc.), advance to the next candidate
 * instead of going straight to "No Photo".
 *
 * This is the only place that knows the candidate order, so PropertyCardList
 * and PropertyPreviewCard stay in sync.
 */

import { useCallback, useMemo, useState } from 'react'
import type { MapListing } from '@/lib/api'

interface PhotoSourceOptions {
  /** Pixel size for the Street View fallback (e.g. "400x300"). */
  streetViewSize?: string
}

interface ListingPhoto {
  /** Current photo URL to render, or null when all candidates are exhausted. */
  src: string | null
  /** Pass to `<img onError>`. Advances to the next candidate. */
  handleError: () => void
}

function buildCandidates(listing: MapListing, streetViewSize: string): string[] {
  const candidates: string[] = []
  const raw = listing.photo_url?.trim()
  if (raw) {
    // Upgrade plain http to https so browsers on https pages don't block as
    // mixed content; Zillow / RentCast CDNs all serve https.
    candidates.push(raw.startsWith('http://') ? raw.replace(/^http:\/\//, 'https://') : raw)
  }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (apiKey && Number.isFinite(listing.latitude) && Number.isFinite(listing.longitude)) {
    candidates.push(
      `https://maps.googleapis.com/maps/api/streetview?size=${streetViewSize}&location=${listing.latitude},${listing.longitude}&key=${apiKey}`,
    )
  }
  return candidates
}

/**
 * Returns the current photo source plus an error handler that promotes the
 * next fallback candidate. When all candidates fail, `src` becomes null and
 * the caller should render its "No Photo" placeholder.
 */
export function useListingPhoto(
  listing: MapListing,
  { streetViewSize = '400x300' }: PhotoSourceOptions = {},
): ListingPhoto {
  const candidates = useMemo(
    () => buildCandidates(listing, streetViewSize),
    [listing, streetViewSize],
  )
  const [index, setIndex] = useState(0)

  const handleError = useCallback(() => {
    setIndex((prev) => prev + 1)
  }, [])

  const src = index < candidates.length ? candidates[index] : null
  return { src, handleError }
}
