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

  const keysToTry: string[] = []
  if (address) keysToTry.push(buildDealMakerSessionKey(address))

  const activeAddress = sessionStorage.getItem('dealMaker_activeAddress')
  if (activeAddress) keysToTry.push(buildDealMakerSessionKey(activeAddress))

  for (const key of keysToTry) {
    const parsed = tryParseJson(sessionStorage.getItem(key))
    if (parsed) return parsed
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
