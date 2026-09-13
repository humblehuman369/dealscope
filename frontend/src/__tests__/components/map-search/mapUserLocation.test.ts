import { describe, expect, it, vi } from 'vitest'
import {
  detectHeroLocation,
  fetchIpFallbackLocation,
  resolveMapUserLocation,
  type MapLatLng,
} from '@/components/map-search/mapUserLocation'

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response
}

describe('fetchIpFallbackLocation', () => {
  it('prefers first-party /api/geo coordinates', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ lat: 26.7, lng: -80.1 }))
    await expect(fetchIpFallbackLocation(fetchFn)).resolves.toEqual({ lat: 26.7, lng: -80.1 })
    expect(fetchFn).toHaveBeenCalledWith('/api/geo')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('falls back to ipapi.co when /api/geo has no coordinates', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ lat: null, lng: null }))
      .mockResolvedValueOnce(jsonResponse({ latitude: 40.7, longitude: -74.0 }))
    await expect(fetchIpFallbackLocation(fetchFn)).resolves.toEqual({ lat: 40.7, lng: -74.0 })
    expect(fetchFn).toHaveBeenNthCalledWith(2, 'https://ipapi.co/json/')
  })

  it('returns null when both IP sources fail', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('offline'))
    await expect(fetchIpFallbackLocation(fetchFn)).resolves.toBeNull()
  })
})

describe('resolveMapUserLocation', () => {
  const ZIP = '33460'
  const zipCenter: MapLatLng = { lat: 26.62, lng: -80.06 }
  const gpsCenter: MapLatLng = { lat: 26.71, lng: -80.05 }
  const ipCenter: MapLatLng = { lat: 26.4, lng: -80.2 }

  it('returns a cached account ZIP without geocoding or GPS', async () => {
    const geocodeZip = vi.fn()
    const getPosition = vi.fn()
    const fetchIp = vi.fn()

    await expect(
      resolveMapUserLocation({
        accountZip: ZIP,
        apiKey: 'key',
        geocodeZip,
        getPosition,
        fetchIp,
        readCachedZip: () => zipCenter,
      }),
    ).resolves.toEqual({ center: zipCenter, source: 'account_zip' })

    expect(geocodeZip).not.toHaveBeenCalled()
    expect(getPosition).not.toHaveBeenCalled()
    expect(fetchIp).not.toHaveBeenCalled()
  })

  it('geocodes an uncached ZIP and persists it', async () => {
    const persistZip = vi.fn()
    const result = await resolveMapUserLocation({
      accountZip: ZIP,
      apiKey: 'key',
      geocodeZip: async () => zipCenter,
      persistZip,
      readCachedZip: () => null,
      getPosition: vi.fn(),
      fetchIp: vi.fn(),
    })

    expect(result).toEqual({ center: zipCenter, source: 'account_zip' })
    expect(persistZip).toHaveBeenCalledWith(ZIP, zipCenter)
  })

  it('falls through to GPS when ZIP geocode fails instead of hanging', async () => {
    const result = await resolveMapUserLocation({
      accountZip: ZIP,
      apiKey: 'key',
      geocodeZip: async () => null,
      readCachedZip: () => null,
      getPosition: async () => gpsCenter,
      fetchIp: vi.fn(),
    })

    expect(result).toEqual({ center: gpsCenter, source: 'gps' })
  })

  it('uses IP fallback when GPS is denied', async () => {
    const result = await resolveMapUserLocation({
      accountZip: null,
      apiKey: 'key',
      geocodeZip: vi.fn(),
      getPosition: async () => null,
      fetchIp: async () => ipCenter,
    })

    expect(result).toEqual({ center: ipCenter, source: 'ip' })
  })

  it('settles with a null center when every source fails', async () => {
    const result = await resolveMapUserLocation({
      accountZip: ZIP,
      apiKey: 'key',
      geocodeZip: async () => null,
      readCachedZip: () => null,
      getPosition: async () => null,
      fetchIp: async () => null,
    })

    expect(result).toEqual({ center: null, source: null })
  })
})

describe('detectHeroLocation', () => {
  it('prefers GPS coordinates over /api/geo', async () => {
    const fetchFn = vi.fn()
    await expect(
      detectHeroLocation(fetchFn, async () => ({ lat: 26.53, lng: -80.08 })),
    ).resolves.toEqual({ label: 'Your location', lat: 26.53, lng: -80.08 })
  })

  it('uses /api/geo city and coordinates when GPS is denied', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({
      city: 'Hialeah',
      region: 'FL',
      lat: 25.86,
      lng: -80.28,
    }))
    await expect(detectHeroLocation(fetchFn, async () => null)).resolves.toEqual({
      label: 'Hialeah, FL',
      lat: 25.86,
      lng: -80.28,
    })
    expect(fetchFn).toHaveBeenCalledWith('/api/geo')
  })
})
