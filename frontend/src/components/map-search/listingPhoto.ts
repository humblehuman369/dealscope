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

  // The same hook instance can be re-used for a different listing
  // (PropertyPreviewCard receives a new `listing` prop when the user clicks
  // a different map marker; PropertyCard's listing object identity changes
  // when the merge step refreshes its photo_url). Without this reset, a
  // previous listing's failure state would leak into the new render and we'd
  // skip straight to the Street View fallback for an image we never tried.
  //
  // We track the primary candidate (rather than listing.id) because that
  // also catches the case where the same id gets a refreshed URL after a
  // backend merge. Setting state during render is the React-recommended way
  // to reset state on prop change without an effect round-trip.
  // See https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const primary = candidates[0] ?? null
  const [prevPrimary, setPrevPrimary] = useState<string | null>(primary)
  const [index, setIndex] = useState(0)

  const primaryChanged = prevPrimary !== primary
  if (primaryChanged) {
    setPrevPrimary(primary)
    setIndex(0)
  }

  const handleError = useCallback(() => {
    setIndex((prev) => prev + 1)
  }, [])

  // Use the post-reset index when the primary just changed so this render
  // shows the new listing's primary candidate (React will then discard and
  // re-render in a single commit, but computing src honestly here keeps
  // logic straightforward).
  const effectiveIndex = primaryChanged ? 0 : index
  const src = effectiveIndex < candidates.length ? candidates[effectiveIndex] : null
  return { src, handleError }
}
