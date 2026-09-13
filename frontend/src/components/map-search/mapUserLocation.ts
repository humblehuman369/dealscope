/**
 * Map Search landing location.
 *
 * Priority: cached account ZIP → ZIP geocode → GPS → first-party IP
 * (`/api/geo`) → ipapi.co. The waterfall always settles so the map never
 * stays on "Finding your location…" when a ZIP geocode or GPS prompt fails.
 */

export type MapLatLng = { lat: number; lng: number }
export type MapLocationSource = 'account_zip' | 'gps' | 'ip'

export type MapLocationResult = {
  center: MapLatLng | null
  source: MapLocationSource | null
}

export const ZIP_CACHE_PREFIX = 'dealscope:zip-cache:'

/** Coarse city-level fix. High accuracy is slower and unnecessary for framing. */
export const MAP_GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
}

export function isFiniteLatLng(value: { lat?: unknown; lng?: unknown } | null | undefined): value is MapLatLng {
  return (
    !!value &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
  )
}

export function readZipCache(zip: string): MapLatLng | null {
  try {
    const raw = localStorage.getItem(ZIP_CACHE_PREFIX + zip)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { lat?: unknown; lng?: unknown }
    if (isFiniteLatLng(parsed)) return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    /* private browsing / quota */
  }
  return null
}

export function writeZipCache(zip: string, entry: MapLatLng): void {
  try {
    localStorage.setItem(ZIP_CACHE_PREFIX + zip, JSON.stringify(entry))
  } catch {
    /* private browsing / quota */
  }
}

export function getBrowserPosition(options: PositionOptions = MAP_GPS_OPTIONS): Promise<MapLatLng | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      options,
    )
  })
}

export function parseLatLng(lat: unknown, lng: unknown): MapLatLng | null {
  const parsedLat = typeof lat === 'number' ? lat : typeof lat === 'string' ? Number(lat) : NaN
  const parsedLng = typeof lng === 'number' ? lng : typeof lng === 'string' ? Number(lng) : NaN
  return Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
    ? { lat: parsedLat, lng: parsedLng }
    : null
}

/**
 * IP fallback for when GPS is denied or unavailable.
 *
 * `/api/geo` is first-party (Vercel geo headers) and works in Capacitor
 * against the production origin. ipapi.co is a last resort for local
 * dev where those headers are absent.
 */
export async function fetchIpFallbackLocation(
  fetchFn: typeof fetch = fetch,
): Promise<MapLatLng | null> {
  try {
    const res = await fetchFn('/api/geo')
    if (res.ok) {
      const data = (await res.json()) as { lat?: unknown; lng?: unknown }
      const parsed = parseLatLng(data.lat, data.lng)
      if (parsed) return parsed
    }
  } catch {
    /* local / missing headers */
  }

  try {
    const res = await fetchFn('https://ipapi.co/json/')
    if (!res.ok) return null
    const data = (await res.json()) as { latitude?: unknown; longitude?: unknown }
    return parseLatLng(data.latitude, data.longitude)
  } catch {
    return null
  }
}

export type ResolveMapUserLocationDeps = {
  accountZip: string | null
  apiKey: string | null
  geocodeZip: (zip: string, apiKey: string) => Promise<MapLatLng | null>
  getPosition?: (options: PositionOptions) => Promise<MapLatLng | null>
  fetchIp?: () => Promise<MapLatLng | null>
  readCachedZip?: (zip: string) => MapLatLng | null
  persistZip?: (zip: string, entry: MapLatLng) => void
  isCancelled?: () => boolean
}

export async function resolveMapUserLocation(
  deps: ResolveMapUserLocationDeps,
): Promise<MapLocationResult> {
  const isCancelled = deps.isCancelled ?? (() => false)
  const getPosition = deps.getPosition ?? getBrowserPosition
  const fetchIp = deps.fetchIp ?? fetchIpFallbackLocation
  const readCachedZip = deps.readCachedZip ?? readZipCache
  const persistZip = deps.persistZip ?? writeZipCache

  if (deps.accountZip) {
    const cached = readCachedZip(deps.accountZip)
    if (cached) return { center: cached, source: 'account_zip' }

    if (deps.apiKey) {
      const geocoded = await deps.geocodeZip(deps.accountZip, deps.apiKey)
      if (isCancelled()) return { center: null, source: null }
      if (geocoded) {
        persistZip(deps.accountZip, geocoded)
        return { center: geocoded, source: 'account_zip' }
      }
    }
    // ZIP geocode failed or the Maps key is missing — fall through to GPS
    // instead of leaving the map spinner waiting forever.
  }

  const gps = await getPosition(MAP_GPS_OPTIONS)
  if (isCancelled()) return { center: null, source: null }
  if (gps) return { center: gps, source: 'gps' }

  const ip = await fetchIp()
  if (isCancelled()) return { center: null, source: null }
  if (ip) return { center: ip, source: 'ip' }

  return { center: null, source: null }
}

export type HeroLocation = {
  label: string
  lat: number | null
  lng: number | null
}

async function reverseGeocodeCityLabel(
  coords: MapLatLng,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const Geocoder =
    typeof window !== 'undefined'
      ? (window as Window & { google?: typeof google }).google?.maps?.Geocoder
      : undefined
  if (Geocoder) {
    try {
      const { results } = await new Geocoder().geocode({
        location: { lat: coords.lat, lng: coords.lng },
      })
      const result = results?.[0]
      const components = result?.address_components ?? []
      const city =
        components.find((c) => c.types.includes('locality'))?.long_name ||
        components.find((c) => c.types.includes('sublocality'))?.long_name
      const region = components.find((c) => c.types.includes('administrative_area_level_1'))
        ?.short_name
      if (city && region) return `${city}, ${region}`
      if (city) return city
    } catch {
      /* REST fallback below */
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetchFn(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}&key=${apiKey}`,
    )
    if (!res.ok) return null
    const data = (await res.json()) as {
      status?: string
      results?: Array<{ address_components?: Array<{ types: string[]; long_name: string; short_name: string }> }>
    }
    if (data.status !== 'OK' || !data.results?.length) return null
    const components = data.results[0].address_components ?? []
    const city =
      components.find((c) => c.types.includes('locality'))?.long_name ||
      components.find((c) => c.types.includes('sublocality'))?.long_name
    const region = components.find((c) => c.types.includes('administrative_area_level_1'))
      ?.short_name
    if (city && region) return `${city}, ${region}`
    if (city) return city
  } catch {
    return null
  }
  return null
}

/**
 * Homepage "See Now" location: GPS first (the actual user), then `/api/geo`.
 * Always prefer coordinates over a city name alone — the map cannot pan
 * from `q=` until Google Geocoder is ready, which is how searches used to
 * land on the wrong city.
 */
export async function detectHeroLocation(
  fetchFn: typeof fetch = fetch,
  getPosition: (options: PositionOptions) => Promise<MapLatLng | null> = getBrowserPosition,
): Promise<HeroLocation | null> {
  const gps = await getPosition({
    enableHighAccuracy: false,
    timeout: 8_000,
    maximumAge: 300_000,
  })
  if (gps) {
    const label = (await reverseGeocodeCityLabel(gps, fetchFn)) ?? 'Your location'
    return { label, lat: gps.lat, lng: gps.lng }
  }

  try {
    const res = await fetchFn('/api/geo')
    if (res.ok) {
      const data = (await res.json()) as {
        city?: unknown
        region?: unknown
        lat?: unknown
        lng?: unknown
      }
      const coords = parseLatLng(data.lat, data.lng)
      const city = typeof data.city === 'string' && data.city.trim() ? data.city : null
      const region = typeof data.region === 'string' && data.region.trim() ? data.region : null
      const label = city ? (region ? `${city}, ${region}` : city) : coords ? 'Your location' : null
      if (!label) return null
      return { label, lat: coords?.lat ?? null, lng: coords?.lng ?? null }
    }
  } catch {
    /* ignore */
  }
  return null
}
