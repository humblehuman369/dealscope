import { describe, expect, it } from 'vitest'
import {
  SMALL_GAP_THRESHOLD,
  anyLeverClosesGap,
  countVerdictSignals,
  listingSignalsFromListing,
  resolveCall,
  verdictRules,
} from '@/lib/verdictRules'

describe('resolveCall', () => {
  const midGap = (verdictRules.smallGapPct + verdictRules.gapWalkAwayPct) / 2

  it('returns worth_pursuing when list price is at or below Income Value', () => {
    expect(
      resolveCall(midGap, 0, { listPrice: 379_981, incomeValue: 381_465 }),
    ).toBe('worth_pursuing')
    expect(
      resolveCall(midGap, 0, { listPrice: 381_465, incomeValue: 381_465 }),
    ).toBe('worth_pursuing')
  })

  it('returns worth_pursuing when gap is at or below the small-gap threshold', () => {
    expect(resolveCall(verdictRules.smallGapPct, 0)).toBe('worth_pursuing')
    expect(resolveCall(0, 0)).toBe('worth_pursuing')
    expect(resolveCall(-4, 0)).toBe('worth_pursuing')
  })

  it('returns worth_pursuing when gap is between the small-gap and walk-away thresholds and signals are 1+', () => {
    expect(resolveCall(midGap, 1)).toBe('worth_pursuing')
    expect(resolveCall(verdictRules.gapWalkAwayPct - 0.1, 3)).toBe('worth_pursuing')
  })

  it('returns only_with_terms when gap is between the small-gap and walk-away thresholds and signals are 0', () => {
    expect(resolveCall(verdictRules.smallGapPct + 0.1, 0)).toBe('only_with_terms')
    expect(resolveCall(verdictRules.gapWalkAwayPct - 0.1, 0)).toBe('only_with_terms')
  })

  it('returns only_with_terms when gap is at or above the walk-away threshold and signals are 2+', () => {
    expect(resolveCall(verdictRules.gapWalkAwayPct, 2)).toBe('only_with_terms')
    expect(resolveCall(verdictRules.gapWalkAwayPct + 15, 3)).toBe('only_with_terms')
  })

  it('returns walk_away when gap is at or above the walk-away threshold and signals are under 2', () => {
    expect(resolveCall(verdictRules.gapWalkAwayPct, 0)).toBe('walk_away')
    expect(resolveCall(verdictRules.gapWalkAwayPct + 5, 1)).toBe('walk_away')
  })

  it('reads both gap thresholds from verdictRules', () => {
    expect(verdictRules.smallGapPct).toBe(SMALL_GAP_THRESHOLD)
    expect(resolveCall(verdictRules.smallGapPct, 0)).toBe('worth_pursuing')
    expect(resolveCall(verdictRules.gapWalkAwayPct - 0.1, 0)).toBe('only_with_terms')
    expect(resolveCall(verdictRules.gapWalkAwayPct, 0)).toBe('walk_away')
  })

  it('calls 110 Crosswinds Drive worth_pursuing from the Section 7 check', () => {
    expect(
      resolveCall(4.6, 0, { listPrice: 379_981, incomeValue: 381_465 }),
    ).toBe('worth_pursuing')
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
