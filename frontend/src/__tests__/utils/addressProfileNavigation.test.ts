import { describe, expect, it } from 'vitest'
import { buildPropertyProfileHref } from '@/utils/addressIdentity'
import { parseAddressString } from '@/utils/formatters'

describe('parseAddressString', () => {
  it('strips trailing USA and parses state + zip', () => {
    const parsed = parseAddressString(
      '5916 Azalea Cir, West Palm Beach, FL 33401, USA',
    )
    expect(parsed).toEqual({
      street: '5916 Azalea Cir',
      city: 'West Palm Beach',
      state: 'FL',
      zip: '33401',
    })
  })
})

describe('buildPropertyProfileHref', () => {
  it('includes structured city/state/zip for property details navigation', () => {
    const href = buildPropertyProfileHref({
      address: '5916 Azalea Cir',
      city: 'West Palm Beach',
      state: 'FL',
      zip: '33401',
      zpid: '12345',
    })

    expect(href).toBe(
      '/property/12345?address=5916+Azalea+Cir&city=West+Palm+Beach&state=FL&zip_code=33401',
    )
  })

  it('does not treat US as a state', () => {
    const href = buildPropertyProfileHref({
      address: '5916 Azalea Cir, West Palm Beach, USA',
      city: 'West Palm Beach',
      state: 'US',
    })

    expect(href).toBe('/property?address=5916+Azalea+Cir&city=West+Palm+Beach')
    expect(href).not.toContain('state=US')
  })
})
