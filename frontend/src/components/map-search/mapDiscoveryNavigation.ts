import type { MapListing } from '@/lib/api'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import { markMapViewportForRestore } from './mapSearchSnapshot'

type MapDiscoveryRouter = { push: (href: string) => void }

export type MapSelectionDestination = 'discovery' | 'deal-maker'

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

/**
 * Where a selected property should go after the user picks it on the map.
 * When the map was opened from Deal Maker IQ (`?from=deal-maker`), selecting a
 * property loads it straight into Deal Maker (in a new window) instead of the
 * Discovery/Verdict flow. Read from the live URL so it works from any
 * selection surface without prop threading.
 */
export function getMapSelectionDestination(): MapSelectionDestination {
  if (typeof window === 'undefined') return 'discovery'
  return new URLSearchParams(window.location.search).get('from') === 'deal-maker'
    ? 'deal-maker'
    : 'discovery'
}

/** Reactive variant of {@link getMapSelectionDestination} for rendering CTA labels. */
export function useMapSelectionDestination(): MapSelectionDestination {
  return useAppSearchParams().get('from') === 'deal-maker' ? 'deal-maker' : 'discovery'
}

/** CTA label for the current map-selection destination. */
export function mapSelectionCtaLabel(destination: MapSelectionDestination): string {
  return destination === 'deal-maker' ? 'Build Deal' : 'Analyze'
}

/**
 * Open the selected property in a new browser window/tab, leaving the map view
 * open in the original window. Falls back to same-window navigation (with map
 * viewport restore) when the popup is blocked or there's no window — which also
 * covers mobile/Capacitor webviews where `window.open` can return `null`.
 */
function openInNewWindow(router: MapDiscoveryRouter, path: string): void {
  const opened =
    typeof window !== 'undefined' ? window.open(path, '_blank', 'noopener,noreferrer') : null
  if (!opened) {
    markMapViewportForRestore()
    router.push(path)
  }
}

/** Navigate to the selected property's destination (Discovery or Deal Maker) in a new window. */
export function navigateToDiscoveryFromMap(router: MapDiscoveryRouter, listing: MapListing): void {
  const query = buildDiscoverySearchParams(listing).toString()
  const base = getMapSelectionDestination() === 'deal-maker' ? '/deal-maker' : '/discovery'
  openInNewWindow(router, `${base}?${query}`)
}

export function navigateToDiscoveryFromMapPath(router: MapDiscoveryRouter, path: string): void {
  const target =
    getMapSelectionDestination() === 'deal-maker' ? path.replace(/^[^?]*/, '/deal-maker') : path
  openInNewWindow(router, target)
}
