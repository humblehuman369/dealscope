import { describe, expect, it } from 'vitest'
import {
  anyLeverClosesGap,
  countVerdictSignals,
  listingSignalsFromListing,
  resolveCall,
  verdictRules,
} from '@/lib/verdictRules'

describe('resolveCall', () => {
  it('returns worth_pursuing when gap is at or below 0', () => {
    expect(resolveCall(0, 0)).toBe('worth_pursuing')
    expect(resolveCall(-4, 0)).toBe('worth_pursuing')
  })

  it('returns worth_pursuing when gap is under 35% and there is at least one signal', () => {
    expect(resolveCall(27.5, 1)).toBe('worth_pursuing')
    expect(resolveCall(34.9, 3)).toBe('worth_pursuing')
  })

  it('returns only_with_terms when gap is under 35% and there are no signals', () => {
    expect(resolveCall(10, 0)).toBe('only_with_terms')
  })

  it('returns only_with_terms when gap is 35% or more and signals are 2+', () => {
    expect(resolveCall(35, 2)).toBe('only_with_terms')
    expect(resolveCall(50, 3)).toBe('only_with_terms')
  })

  it('returns walk_away when gap is 35% or more and signals are under 2', () => {
    expect(resolveCall(35, 0)).toBe('walk_away')
    expect(resolveCall(40, 1)).toBe('walk_away')
  })

  it('reads the walk-away threshold from verdictRules', () => {
    expect(resolveCall(verdictRules.gapWalkAwayPct - 0.1, 0)).toBe('only_with_terms')
    expect(resolveCall(verdictRules.gapWalkAwayPct, 0)).toBe('walk_away')
  })
})

describe('countVerdictSignals', () => {
  it('counts the five Section 7 signals', () => {
    const breakdown = countVerdictSignals({
      daysOnMarket: 224,
      priceCuts: 10,
      ownerOccupied: false,
      distressed: false,
      expiredOrWithdrawn: false,
    })
    expect(breakdown.count).toBe(3)
    expect(breakdown.fired).toEqual([
      '224 days on market',
      '10 price cuts',
      'not owner-occupied',
    ])
  })

  it('ignores values below the named thresholds', () => {
    const breakdown = countVerdictSignals({
      daysOnMarket: verdictRules.daysOnMarketSignal - 1,
      priceCuts: verdictRules.priceCutsSignal - 1,
      ownerOccupied: true,
      distressed: false,
      expiredOrWithdrawn: false,
    })
    expect(breakdown.count).toBe(0)
  })
})

describe('listingSignalsFromListing', () => {
  it('maps listing fields without inventing occupancy', () => {
    const signals = listingSignalsFromListing({
      days_on_market: 224,
      price_reduction_count: 10,
      is_foreclosure: true,
      listing_status: 'EXPIRED',
    })
    expect(signals.daysOnMarket).toBe(224)
    expect(signals.priceCuts).toBe(10)
    expect(signals.ownerOccupied).toBeNull()
    expect(signals.distressed).toBe(true)
    expect(signals.expiredOrWithdrawn).toBe(true)
  })

  it('treats absentee owner as not owner-occupied', () => {
    expect(listingSignalsFromListing({ is_absentee_owner: true }).ownerOccupied).toBe(false)
  })
})

describe('anyLeverClosesGap', () => {
  it('is true when any path closes the gap alone', () => {
    expect(anyLeverClosesGap([{ breakeven: { closesGapAlone: false } }])).toBe(false)
    expect(
      anyLeverClosesGap([
        { breakeven: { closesGapAlone: false } },
        { breakeven: { closesGapAlone: true } },
      ]),
    ).toBe(true)
  })
})
