/**
 * Versioned URL payload for Three Paths → Strategy handoff.
 */

export interface ScenarioPayloadV1 {
  v: 1
  structureId: string
  family: string
  /** e.g. Path 1 — Price negotiation */
  label: string
  /** Snake_case keys aligned with backend pre_loaded_record */
  levers: Record<string, unknown>
}

const MAX_ENCODED_CHARS = 2048

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : typeof Buffer !== 'undefined'
        ? Buffer.from(bytes).toString('base64')
        : ''
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(raw: string): Uint8Array | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (padded.length % 4)) % 4
    const base64 = padded + '='.repeat(padLen)
    const binary =
      typeof atob === 'function'
        ? atob(base64)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(base64, 'base64').toString('binary')
          : ''
    if (!binary) return null
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export function encodeScenario(p: ScenarioPayloadV1): string {
  const json = JSON.stringify(p)
  const bytes = new TextEncoder().encode(json)
  const enc = bytesToBase64Url(bytes)
  if (enc.length > MAX_ENCODED_CHARS) {
    console.warn('[ThreePaths] scenario query string is large; consider trimming levers')
  }
  return enc
}

export function decodeScenario(raw: string): ScenarioPayloadV1 | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const bytes = base64UrlToBytes(trimmed)
  if (!bytes) return null
  try {
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as ScenarioPayloadV1
    if (parsed?.v !== 1 || typeof parsed.structureId !== 'string') return null
    if (!parsed.levers || typeof parsed.levers !== 'object') return null
    return parsed
  } catch {
    return null
  }
}
