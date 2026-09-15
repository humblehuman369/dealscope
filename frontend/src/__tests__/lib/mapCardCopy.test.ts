import { afterEach, describe, expect, it, vi } from 'vitest'

import { cityLabelFromQuery, logMapFirstPinMs, MAP_CARD_COPY } from '@/lib/mapCardCopy'

describe('MAP_CARD_COPY', () => {
  it('holds the PR C strings for Brad', () => {
    expect(MAP_CARD_COPY.seeTheVerdict).toBe('See the verdict')
    expect(MAP_CARD_COPY.findingMotivatedSellersIn('Miami')).toBe(
      'Finding motivated sellers in Miami...',
    )
  })
})

describe('cityLabelFromQuery', () => {
  it('uses the first comma-separated segment of q', () => {
    expect(cityLabelFromQuery('Miami, FL')).toBe('Miami')
    expect(cityLabelFromQuery('Austin')).toBe('Austin')
    expect(cityLabelFromQuery('  Wynwood, Miami, FL ')).toBe('Wynwood')
  })

  it('returns empty when q is missing', () => {
    expect(cityLabelFromQuery(null)).toBe('')
    expect(cityLabelFromQuery(undefined)).toBe('')
    expect(cityLabelFromQuery('')).toBe('')
  })
})

describe('logMapFirstPinMs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes map_first_pin_ms to the console only', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    logMapFirstPinMs(12345)
    expect(info).toHaveBeenCalledWith('map_first_pin_ms', 12345)
  })
})
