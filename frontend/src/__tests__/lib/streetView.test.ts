import { describe, expect, it } from 'vitest'
import { buildSatelliteUrl, buildStreetViewUrl } from '@/lib/streetView'

describe('buildStreetViewUrl', () => {
  it('uses pano + heading when smart params are present', () => {
    const url = buildStreetViewUrl({
      apiKey: 'KEY',
      size: '600x400',
      address: '1 Main',
      params: { pano: 'abc', heading: 123.456, fov: 80, pitch: 0 },
    })
    expect(url).toContain('pano=abc')
    expect(url).toContain('heading=123.46')
    expect(url).toContain('return_error_code=true')
    expect(url).not.toContain('location=')
  })

  it('falls back to address before lat/lng', () => {
    const url = buildStreetViewUrl({
      apiKey: 'KEY',
      address: '43770 Ruth Ln, Delray Beach, FL',
      latitude: 26.45,
      longitude: -80.15,
    })
    expect(url).toContain('location=43770%20Ruth%20Ln')
    expect(url).toContain('return_error_code=true')
  })
})

describe('buildSatelliteUrl', () => {
  it('frames the parcel from above', () => {
    const url = buildSatelliteUrl({
      apiKey: 'KEY',
      latitude: 26.45,
      longitude: -80.15,
      size: '256x192',
    })
    expect(url).toBe(
      'https://maps.googleapis.com/maps/api/staticmap?center=26.45,-80.15&zoom=19&size=256x192&maptype=satellite&key=KEY',
    )
  })

  it('returns null without a key or finite coordinates', () => {
    expect(buildSatelliteUrl({ apiKey: '', latitude: 26, longitude: -80 })).toBeNull()
    expect(buildSatelliteUrl({ apiKey: 'KEY', latitude: Number.NaN, longitude: -80 })).toBeNull()
  })
})
