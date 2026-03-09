export function canonicalizeAddressForIdentity(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*USA$/i, '')
}

export function buildDealMakerSessionKey(address: string): string {
  return `dealMaker_${encodeURIComponent(canonicalizeAddressForIdentity(address))}`
}

function tryParseJson(raw: string | null): Record<string, any> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function readDealMakerOverrides(address?: string): Record<string, any> | null {
  if (typeof window === 'undefined') return null

  const keysToTry: string[] = []
  if (address) keysToTry.push(buildDealMakerSessionKey(address))

  const activeAddress = sessionStorage.getItem('dealMaker_activeAddress')
  if (activeAddress) keysToTry.push(buildDealMakerSessionKey(activeAddress))

  // Backward-compat fallback while old keys are phased out.
  keysToTry.push('dealMakerOverrides')

  for (const key of keysToTry) {
    const parsed = tryParseJson(sessionStorage.getItem(key))
    if (parsed) return parsed
  }
  return null
}

export function writeDealMakerOverrides(
  address: string,
  patch: Record<string, unknown>,
): Record<string, any> | null {
  if (typeof window === 'undefined') return null

  const canonicalAddress = canonicalizeAddressForIdentity(address)
  if (!canonicalAddress) return null

  const sessionKey = buildDealMakerSessionKey(canonicalAddress)
  const existing = tryParseJson(sessionStorage.getItem(sessionKey)) ?? {}
  const merged = { ...existing, ...patch, canonicalAddress, address: canonicalAddress, timestamp: Date.now() }

  sessionStorage.setItem(sessionKey, JSON.stringify(merged))
  sessionStorage.setItem('dealMaker_activeAddress', canonicalAddress)
  // Backward-compat mirror for legacy readers.
  sessionStorage.setItem('dealMakerOverrides', JSON.stringify(merged))
  window.dispatchEvent(new Event('dealMakerOverridesUpdated'))
  return merged
}
