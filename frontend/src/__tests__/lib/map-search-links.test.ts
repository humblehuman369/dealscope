/**
 * The /markets landing pages deep-link into /map-search. A state link must
 * carry coordinates so the map opens framed on the state instead of geocoding
 * after mount (which starts the map over Kansas); a city link carries only a
 * label because the geo dataset has no city coordinates.
 */

import { describe, expect, it } from 'vitest'
import { US_STATES, getStateByCode } from '@/lib/us-states'
import { STATE_CENTERS } from '@/lib/geo/state-centers'
import { getStateOutline, hasStateOutline } from '@/lib/geo/state-outlines'
import { cityMapSearchHref, nearMeMapSearchHref, stateMapSearchHref } from '@/lib/geo/map-search-links'

const florida = getStateByCode('FL')!

function params(href: string): URLSearchParams {
  const [path, query] = href.split('?')
  expect(path).toBe('/map-search')
  return new URLSearchParams(query)
}

describe('stateMapSearchHref', () => {
  it('frames the state with label, coordinates and zoom', () => {
    const p = params(stateMapSearchHref(florida))
    expect(p.get('label')).toBe('Florida')
    expect(Number(p.get('lat'))).toBeCloseTo(STATE_CENTERS.FL.lat)
    expect(Number(p.get('lng'))).toBeCloseTo(STATE_CENTERS.FL.lng)
    expect(p.get('zoom')).toBe(String(STATE_CENTERS.FL.zoom))
  })

  it('attributes the click to the state landing page', () => {
    const p = params(stateMapSearchHref(florida))
    expect(p.get('utm_source')).toBe('markets')
    expect(p.get('utm_medium')).toBe('state')
    expect(p.get('utm_campaign')).toBe('florida')
  })
})

describe('cityMapSearchHref', () => {
  it('passes a "City, ST" label and no coordinates', () => {
    const p = params(cityMapSearchHref('St. Petersburg', florida))
    expect(p.get('label')).toBe('St. Petersburg, FL')
    expect(p.has('lat')).toBe(false)
    expect(p.has('lng')).toBe(false)
    expect(p.get('utm_medium')).toBe('city')
  })
})

describe('nearMeMapSearchHref', () => {
  it('opens at neighbourhood zoom on the given point', () => {
    const p = params(nearMeMapSearchHref(27.95, -82.46))
    expect(p.get('lat')).toBe('27.95')
    expect(p.get('lng')).toBe('-82.46')
    expect(p.get('zoom')).toBe('10')
    expect(p.get('utm_medium')).toBe('near-me')
    expect(p.has('label')).toBe(false)
  })
})

describe('state geo datasets', () => {
  it('cover every state in US_STATES', () => {
    for (const s of US_STATES) {
      expect(STATE_CENTERS[s.code], `centre for ${s.code}`).toBeDefined()
      expect(hasStateOutline(s.code), `outline for ${s.code}`).toBe(true)
    }
  })

  it('keep centres inside plausible US bounds with a framing zoom', () => {
    for (const [code, c] of Object.entries(STATE_CENTERS)) {
      expect(c.lat, code).toBeGreaterThan(17)
      expect(c.lat, code).toBeLessThan(72)
      expect(c.lng, code).toBeGreaterThan(-180)
      expect(c.lng, code).toBeLessThan(-64)
      expect(c.zoom, code).toBeGreaterThanOrEqual(4)
      expect(c.zoom, code).toBeLessThanOrEqual(12)
    }
  })

  it('expose closed SVG paths with a four-number viewBox', () => {
    const fl = getStateOutline('fl')
    expect(fl.path.startsWith('M')).toBe(true)
    expect(fl.path.endsWith('Z')).toBe(true)
    expect(fl.viewBox.split(' ')).toHaveLength(4)
  })

  it('throw for a code without geometry', () => {
    expect(() => getStateOutline('PR')).toThrow(/PR/)
  })
})
