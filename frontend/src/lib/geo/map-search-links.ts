/**
 * Deep links from the /markets landing pages into /map-search.
 *
 * /map-search reads `label`, `lat`, `lng` and `zoom` (see
 * components/map-search/MapSearchView.tsx). A state link carries coordinates so
 * the map opens framed on the state; a city link carries only a label because
 * the geo dataset has no city coordinates, so the map geocodes it after mount.
 */

import type { UsState } from '@/lib/us-states'
import { STATE_CENTERS } from '@/lib/geo/state-centers'

const UTM_SOURCE = 'markets'

export function stateMapSearchHref(state: UsState): string {
  const center = STATE_CENTERS[state.code]
  const params = new URLSearchParams({ label: state.name })
  if (center) {
    params.set('lat', String(center.lat))
    params.set('lng', String(center.lng))
    params.set('zoom', String(center.zoom))
  }
  params.set('utm_source', UTM_SOURCE)
  params.set('utm_medium', 'state')
  params.set('utm_campaign', state.slug)
  return `/map-search?${params.toString()}`
}

export function cityMapSearchHref(city: string, state: UsState): string {
  const params = new URLSearchParams({
    label: `${city}, ${state.code}`,
    utm_source: UTM_SOURCE,
    utm_medium: 'city',
    utm_campaign: state.slug,
  })
  return `/map-search?${params.toString()}`
}

export function nearMeMapSearchHref(lat: number, lng: number): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    zoom: '10',
    utm_source: UTM_SOURCE,
    utm_medium: 'near-me',
  })
  return `/map-search?${params.toString()}`
}
