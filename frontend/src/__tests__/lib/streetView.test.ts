import { describe, expect, it } from 'vitest'

import { buildSatelliteUrl } from '@/lib/streetView'

describe('buildSatelliteUrl', () => {
  it('builds a satellite static-map URL for a finite lat/lng', () => {
    expect(
      buildSatelliteUrl({
        apiKey: 'KEY123',
        latitude: 26.45,
        longitude: -80.15,
        size: '256x192',
      }),
    ).toBe(
      'https://maps.googleapis.com/maps/api/staticmap?center=26.45,-80.15&zoom=19&size=256x192&maptype=satellite&key=KEY123',
    )
  })

  it('returns null without a key or finite coordinates', () => {
    expect(
      buildSatelliteUrl({ apiKey: '', latitude: 26.45, longitude: -80.15 }),
    ).toBeNull()
    expect(
      buildSatelliteUrl({ apiKey: 'KEY123', latitude: Number.NaN, longitude: -80.15 }),
    ).toBeNull()
  })
})
