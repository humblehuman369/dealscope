import { describe, expect, it } from 'vitest'

import { buildHeroPhotoCandidates, buildSatelliteUrl } from '@/lib/streetView'

describe('buildHeroPhotoCandidates', () => {
  it('puts Street View from the address before satellite so the header works without lat/lng', () => {
    const urls = buildHeroPhotoCandidates({
      apiKey: 'KEY123',
      address: '1499 Bandol Street, Riviera Beach, FL 33404',
    })
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('streetview')
    expect(urls[0]).toContain('location=1499%20Bandol%20Street')
  })

  it('keeps a listing photo first and satellite last when coordinates exist', () => {
    const urls = buildHeroPhotoCandidates({
      apiKey: 'KEY123',
      listingPhoto: 'https://img.example/1.jpg',
      address: '1499 Bandol Street',
      latitude: 26.78,
      longitude: -80.06,
    })
    expect(urls[0]).toBe('https://img.example/1.jpg')
    expect(urls[1]).toContain('streetview')
    expect(urls[2]).toContain('staticmap')
  })
})

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
