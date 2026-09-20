import { describe, expect, it } from 'vitest'
import {
  buildScanPath,
  isMobileUserAgent,
  parseScanSource,
  scanQrUrl,
} from '@/lib/scanQr'
import { generateScanQrSvg } from '@/lib/scanQrSvg'

describe('scan QR helpers', () => {
  it('builds in-app /scan paths from a known src', () => {
    expect(buildScanPath('header')).toBe('/scan?src=header')
    expect(buildScanPath('app')).toBe('/scan?src=app')
  })

  it('falls back when src is missing or unknown', () => {
    expect(parseScanSource(null, 'header')).toBe('header')
    expect(parseScanSource('not-a-source', 'app')).toBe('app')
    expect(parseScanSource('qr_home', 'header')).toBe('qr_home')
  })

  it('encodes the homepage QR with the tracking-plan UTMs', () => {
    expect(scanQrUrl('qr_home')).toBe(
      'https://dealgapiq.com/scan?src=qr_home&utm_source=web&utm_medium=qr&utm_campaign=scan',
    )
    expect(scanQrUrl('qr_dialog')).toContain('src=qr_dialog')
    expect(scanQrUrl('qr_getapp')).toContain('src=qr_getapp')
  })

  it('treats phone UAs as camera targets', () => {
    expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36')).toBe(true)
    expect(isMobileUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false)
  })
})

describe('generateScanQrSvg', () => {
  it('returns an inline SVG at error-correction H', async () => {
    const svg = await generateScanQrSvg(scanQrUrl('qr_home'))
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('viewBox')
    expect(svg).not.toContain('<?xml')
  })
})
