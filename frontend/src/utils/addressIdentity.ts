export function canonicalizeAddressForIdentity(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*USA$/i, '')
}

export function isLikelyFullAddress(address: string): boolean {
  const value = canonicalizeAddressForIdentity(address)
  // "123 Main St, Boca Raton, FL 33486"
  return /^\d+[\w\s.#-]*,\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?$/i.test(value)
}

export function classifySearchInput(text: string): 'address' | 'zip' | 'unknown' {
  const trimmed = text.trim()
  if (/^\d{5}(-\d{4})?$/.test(trimmed)) return 'zip'
  if (isLikelyFullAddress(trimmed)) return 'address'
  return 'unknown'
}

const ADDRESS_PLACE_TYPES = new Set([
  'street_address', 'premise', 'subpremise', 'route',
  'street_number', 'intersection',
])
const CITY_PLACE_TYPES = new Set([
  'locality', 'sublocality', 'sublocality_level_1',
  'neighborhood', 'colloquial_area',
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

function tryParseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function readDealMakerOverrides(address?: string): Record<string, unknown> | null {
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
): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null

  const canonicalAddress = canonicalizeAddressForIdentity(address)
  if (!canonicalAddress) return null

  const sessionKey = buildDealMakerSessionKey(canonicalAddress)
  const existing = tryParseJson(sessionStorage.getItem(sessionKey)) ?? {}
  const merged = { ...existing, ...patch, canonicalAddress, address: canonicalAddress, timestamp: Date.now() }

  sessionStorage.setItem(sessionKey, JSON.stringify(merged))
  sessionStorage.setItem('dealMaker_activeAddress', canonicalAddress)
  window.dispatchEvent(new Event('dealMakerOverridesUpdated'))
  return merged
}
