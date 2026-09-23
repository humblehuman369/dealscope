import { isCapacitor } from '@/lib/env'

export const SCAN_SOURCES = [
  'home_mobile',
  'header',
  'qr_home',
  'qr_dialog',
  'qr_getapp',
  'app',
] as const

export type ScanSource = (typeof SCAN_SOURCES)[number]

export const SCAN_QR_SOURCES = ['qr_home', 'qr_dialog', 'qr_getapp'] as const
export type ScanQrSource = (typeof SCAN_QR_SOURCES)[number]

export const SCAN_QR_SIZE_PX = 148
export const SCAN_QR_MARK_SIZE_PX = 24
export const SCAN_QR_ALT = 'QR code that opens the DealGapIQ scanner on your phone.'

const SCAN_ORIGIN = 'https://dealgapiq.com'

export function isScanSource(value: string | null | undefined): value is ScanSource {
  return Boolean(value && (SCAN_SOURCES as readonly string[]).includes(value))
}

export function parseScanSource(
  raw: string | null | undefined,
  fallback: ScanSource,
): ScanSource {
  return isScanSource(raw) ? raw : fallback
}

export function buildScanPath(src: ScanSource): string {
  return `/scan?src=${src}`
}

/** Homepage QR payload. The site root is not an iOS universal link, so a phone camera opens the browser. */
export const HOME_QR_URL = SCAN_ORIGIN

export function scanQrUrl(src: ScanQrSource): string {
  const params = new URLSearchParams({
    src,
    utm_source: 'web',
    utm_medium: 'qr',
    utm_campaign: 'scan',
  })
  return `${SCAN_ORIGIN}/scan?${params.toString()}`
}

export function isMobileUserAgent(ua: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
}

/** Phone/tablet (or Capacitor) should open the camera; desktop should not. */
export function isMobileScanDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (isCapacitor()) return true
  return (
    isMobileUserAgent(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1 && window.innerWidth < 1400)
  )
}

export function currentScanUtms(): {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
} {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const pick = (key: string) => params.get(key) || undefined
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_term: pick('utm_term'),
    utm_content: pick('utm_content'),
  }
}
