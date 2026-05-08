'use client'

/**
 * Street View Static API helper.
 *
 * Off-market properties usually have no real Zillow photos, so the verdict
 * gallery falls back to Google Street View. The default Static API call
 * (location=lat,lng) lets Google pick a panorama and a heading — which is
 * frequently aligned with the road and ends up showing the *side* or *back*
 * of the house.
 *
 * This helper uses the Maps JS `StreetViewService` to:
 *   1. Find the closest outdoor panorama to the parcel.
 *   2. Compute the bearing from that panorama to the parcel's lat/lng.
 *   3. Build a Static API URL with explicit `pano=…&heading=…&fov=…` so the
 *      camera always faces the building, the same way Zillow frames their
 *      Street View placeholder for off-market homes.
 *
 * The Maps JS script is loaded on demand (and de-duped against the existing
 * AddressAutocomplete loader via the shared `data-google-places` attribute).
 */

const PLACES_SCRIPT_ATTR = 'data-google-places'
const DEFAULT_FOV = 80
const DEFAULT_PITCH = 0
const PRIMARY_RADIUS_M = 60
const FALLBACK_RADIUS_M = 150

let mapsLoaderPromise: Promise<typeof google> | null = null

function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Maps JS cannot load outside the browser'))
  }
  if (window.google?.maps?.StreetViewService) {
    return Promise.resolve(window.google)
  }
  if (mapsLoaderPromise) return mapsLoaderPromise

  mapsLoaderPromise = new Promise((resolve, reject) => {
    const waitForReady = () => {
      const start = Date.now()
      const tick = () => {
        if (window.google?.maps?.StreetViewService) {
          resolve(window.google)
          return
        }
        // Cap the wait at 8s so a stuck loader fails closed instead of
        // pinning the gallery in a quasi-loaded state forever.
        if (Date.now() - start > 8000) {
          mapsLoaderPromise = null
          reject(new Error('Timed out waiting for Maps JS to initialize'))
          return
        }
        setTimeout(tick, 100)
      }
      tick()
    }

    // Reuse an existing loader if one is already on the page (typically
    // injected by AddressAutocomplete). Don't double-inject — Google logs
    // a noisy "included multiple times" warning and may stop responding.
    const existing = document.querySelector(
      `script[${PLACES_SCRIPT_ATTR}]`,
    ) as HTMLScriptElement | null
    if (existing) {
      waitForReady()
      return
    }

    const script = document.createElement('script')
    // `libraries=places` matches the loader used by AddressAutocomplete so
    // future Places usage doesn't trigger the "loaded with different
    // libraries" Google Maps warning.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.setAttribute(PLACES_SCRIPT_ATTR, 'true')
    script.onload = waitForReady
    script.onerror = (err) => {
      mapsLoaderPromise = null
      reject(err instanceof Error ? err : new Error('Maps JS failed to load'))
    }
    document.head.appendChild(script)
  })
  return mapsLoaderPromise
}

const toRad = (deg: number): number => (deg * Math.PI) / 180
const toDeg = (rad: number): number => (rad * 180) / Math.PI

/**
 * Initial bearing from `from` → `to` on a sphere, in compass degrees [0, 360).
 * 0° = north, 90° = east. Used to point the Street View camera *toward* the
 * parcel from whichever panorama Google returns.
 */
function bearingBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const φ1 = toRad(fromLat)
  const φ2 = toRad(toLat)
  const Δλ = toRad(toLng - fromLng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

export interface StreetViewParams {
  pano: string
  heading: number
  fov: number
  pitch: number
}

/**
 * Find the nearest outdoor Street View panorama to a parcel and compute the
 * heading that frames the building. Returns null when no usable pano exists.
 *
 * Tries a tight radius first (60m — typical residential lot frontage) and
 * widens to 150m before giving up, which keeps the camera close enough that
 * the parcel still fills the frame at fov=80.
 */
export async function resolveBestStreetView(
  apiKey: string,
  parcelLat: number,
  parcelLng: number,
): Promise<StreetViewParams | null> {
  if (!apiKey) return null
  if (!Number.isFinite(parcelLat) || !Number.isFinite(parcelLng)) return null

  let mapsApi: typeof google
  try {
    mapsApi = await loadGoogleMaps(apiKey)
  } catch {
    return null
  }

  const service = new mapsApi.maps.StreetViewService()
  for (const radius of [PRIMARY_RADIUS_M, FALLBACK_RADIUS_M]) {
    try {
      const result = await service.getPanorama({
        location: { lat: parcelLat, lng: parcelLng },
        radius,
        source: mapsApi.maps.StreetViewSource.OUTDOOR,
        preference: mapsApi.maps.StreetViewPreference.NEAREST,
      })
      const panoId = result?.data?.location?.pano
      const panoLatLng = result?.data?.location?.latLng
      if (!panoId || !panoLatLng) continue
      const heading = bearingBetween(
        panoLatLng.lat(),
        panoLatLng.lng(),
        parcelLat,
        parcelLng,
      )
      return { pano: panoId, heading, fov: DEFAULT_FOV, pitch: DEFAULT_PITCH }
    } catch {
      // ZERO_RESULTS at this radius — try the wider one.
    }
  }
  return null
}

/**
 * Build a Street View Static API URL.
 *
 * - When `params` (pano + computed heading) are provided, the camera is
 *   guaranteed to face the parcel.
 * - Without params, falls back to address-first then lat/lng. Using the
 *   address as `location` lets Google's geocoder pick a pano oriented at the
 *   building, which usually frames the front of the house better than raw
 *   lat/lng (where Google's default heading aligns with the road instead).
 */
export function buildStreetViewUrl({
  apiKey,
  size = '600x400',
  address,
  latitude,
  longitude,
  params,
}: {
  apiKey: string
  size?: string
  address?: string
  latitude?: number
  longitude?: number
  params?: StreetViewParams | null
}): string | null {
  if (!apiKey) return null
  // `return_error_code=true` makes Google return HTTP 404 when no panorama
  // exists at the location instead of the gray "Sorry, we have no imagery
  // here" placeholder image (which loads as 200 OK and would silently break
  // the <img onError> fallback to the satellite tile).
  // `source=outdoor` skips interior PhotoSpheres for residential homes.
  const base = [
    `https://maps.googleapis.com/maps/api/streetview?size=${size}`,
    'source=outdoor',
    'return_error_code=true',
  ]
  if (params) {
    base.push(`pano=${encodeURIComponent(params.pano)}`)
    base.push(`heading=${params.heading.toFixed(2)}`)
    base.push(`pitch=${params.pitch}`)
    base.push(`fov=${params.fov}`)
    base.push(`key=${apiKey}`)
    return base.join('&')
  }
  // Quick path before the JS service resolves: address > lat/lng. Address
  // gets us a building-oriented pano on first paint; lat/lng is the last
  // resort when no address is available.
  base.push(`fov=${DEFAULT_FOV}`)
  if (address) {
    base.push(`location=${encodeURIComponent(address)}`)
  } else if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    base.push(`location=${latitude},${longitude}`)
  } else {
    return null
  }
  base.push(`key=${apiKey}`)
  return base.join('&')
}
