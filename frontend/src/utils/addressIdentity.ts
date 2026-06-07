import { parseAddressString } from '@/utils/formatters'

export function canonicalizeAddressForIdentity(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*USA$/i, '')
}

export function isLikelyFullAddress(address: string): boolean {
  const value = canonicalizeAddressForIdentity(address)
  // Strict: "123 Main St, Boca Raton, FL 33486"
  if (/^\d+[\w\s.#-]*,\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/i.test(value)) return true
  // Lenient: starts with a street number and has at least 3 "word groups"
  // e.g. "1451 SW 10th ST Boca Raton FL" or "123 Main St Miami FL 33101"
  const words = value.split(/[\s,]+/).filter(Boolean)
  return /^\d+/.test(value) && words.length >= 4
}

export function classifySearchInput(text: string): 'address' | 'zip' | 'unknown' {
  const trimmed = text.trim()
  if (/^\d{5}(-\d{4})?$/.test(trimmed)) return 'zip'
  if (isLikelyFullAddress(trimmed)) return 'address'
  return 'unknown'
}

const ADDRESS_PLACE_TYPES = new Set([
  'street_address',
  'premise',
  'subpremise',
  'route',
  'street_number',
  'intersection',
])
const CITY_PLACE_TYPES = new Set([
  'locality',
  'sublocality',
  'sublocality_level_1',
  'neighborhood',
  'colloquial_area',
])
const STATE_PLACE_TYPES = new Set(['administrative_area_level_1'])
const ZIP_PLACE_TYPES = new Set(['postal_code'])

export type PlaceCategory = 'address' | 'city' | 'state' | 'zip' | 'unknown'

export function classifyPlaceTypes(types: string[]): { category: PlaceCategory; zoom: number } {
  for (const t of types) {
    if (ADDRESS_PLACE_TYPES.has(t)) return { category: 'address', zoom: 17 }
  }
  for (const t of types) {
    if (ZIP_PLACE_TYPES.has(t)) return { category: 'zip', zoom: 13 }
  }
  for (const t of types) {
    if (CITY_PLACE_TYPES.has(t)) return { category: 'city', zoom: 12 }
  }
  for (const t of types) {
    if (STATE_PLACE_TYPES.has(t)) return { category: 'state', zoom: 7 }
  }
  return { category: 'unknown', zoom: 12 }
}

export function buildDealMakerSessionKey(address: string): string {
  return `dealMaker_${encodeURIComponent(canonicalizeAddressForIdentity(address))}`
}

export type DealMakerOverrideOrigin =
  | 'verdict_sync'
  | 'dealmaker_edit'
  | 'saved_property'
  | 'source_selection'
  | 'unknown'

export interface DealMakerOverrideRecord extends Record<string, unknown> {
  origin?: DealMakerOverrideOrigin
  canonicalAddress?: string
  address?: string
  timestamp?: number
}

function tryParseJson(raw: string | null): DealMakerOverrideRecord | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as DealMakerOverrideRecord) : null
  } catch {
    return null
  }
}

export function readDealMakerOverrides(address?: string): DealMakerOverrideRecord | null {
  if (typeof window === 'undefined') return null

  // Try the exact requested address first
  if (address) {
    const parsed = tryParseJson(sessionStorage.getItem(buildDealMakerSessionKey(address)))
    if (parsed) return parsed
  }

  // Only fall back to dealMaker_activeAddress when no specific address was
  // requested (e.g. header reading "whatever is active"). When a specific
  // address IS provided, returning a different property's data causes the
  // stale-data bug (e.g. SW vs NW of same street).
  if (!address) {
    const activeAddress = sessionStorage.getItem('dealMaker_activeAddress')
    if (activeAddress) {
      const parsed = tryParseJson(sessionStorage.getItem(buildDealMakerSessionKey(activeAddress)))
      if (parsed) return parsed
    }
  }

  return null
}

export function writeDealMakerOverrides(
  address: string,
  patch: Record<string, unknown>,
  options?: { origin?: DealMakerOverrideOrigin },
): DealMakerOverrideRecord | null {
  if (typeof window === 'undefined') return null

  const canonicalAddress = canonicalizeAddressForIdentity(address)
  if (!canonicalAddress) return null

  const sessionKey = buildDealMakerSessionKey(canonicalAddress)
  const existing = tryParseJson(sessionStorage.getItem(sessionKey)) ?? {}
  const origin = options?.origin ?? existing.origin ?? 'unknown'
  const merged: DealMakerOverrideRecord = {
    ...existing,
    ...patch,
    origin,
    canonicalAddress,
    address: canonicalAddress,
    timestamp: Date.now(),
  }

  sessionStorage.setItem(sessionKey, JSON.stringify(merged))
  sessionStorage.setItem('dealMaker_activeAddress', canonicalAddress)
  window.dispatchEvent(new Event('dealMakerOverridesUpdated'))
  return merged
}

export function isInitialOverrideEligible(
  overrides: DealMakerOverrideRecord | null | undefined,
): boolean {
  if (!overrides) return false
  return overrides.origin === 'dealmaker_edit' || overrides.origin === 'saved_property'
}

export type PropertyProfileLinkInput = {
  address: string
  city?: string
  state?: string
  zip?: string
  zip_code?: string
  zpid?: string | number | null
}

/** Build /property profile URL with structured city/state/zip for backend validation. */
export function buildPropertyProfileHref(input: PropertyProfileLinkInput): string {
  const parsed = parseAddressString(input.address)
  const street = (parsed.street || input.address).trim()
  const city = (input.city ?? parsed.city).trim()
  let state = (input.state ?? parsed.state).trim()
  if (/^(?:US|USA)$/i.test(state)) state = ''
  const zip = (input.zip ?? input.zip_code ?? parsed.zip).trim()

  const params = new URLSearchParams()
  params.set('address', street)
  if (city) params.set('city', city)
  if (/^[A-Za-z]{2}$/.test(state)) params.set('state', state.toUpperCase())
  if (/^\d{5}(?:-\d{4})?$/.test(zip)) params.set('zip_code', zip)

  const query = params.toString()
  const zpid = input.zpid != null ? String(input.zpid).trim() : ''
  if (zpid && zpid !== 'unknown') {
    return `/property/${encodeURIComponent(zpid)}?${query}`
  }
  return `/property?${query}`
}

export type FetchPropertyAddressOptions = {
  city?: string
  state?: string
  zip_code?: string
  zpid?: string
}

/** Read structured address fields from a URLSearchParams (or compatible) object. */
export function readFetchPropertyOptionsFromSearchParams(
  params: Pick<URLSearchParams, 'get'>,
): FetchPropertyAddressOptions {
  const city = params.get('city')?.trim() || undefined
  const state = params.get('state')?.trim() || undefined
  const zip_code = params.get('zip_code')?.trim() || undefined
  const zpid = params.get('zpid')?.trim() || undefined
  return {
    ...(city ? { city } : {}),
    ...(state && state.length === 2 ? { state } : {}),
    ...(zip_code ? { zip_code } : {}),
    ...(zpid ? { zpid } : {}),
  }
}
