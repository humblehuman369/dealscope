import { describe, expect, it } from 'vitest'

import { resolveSelectedLiveRent } from '@/components/iq-verdict/IQEstimateSelector'
import {
  resolveSessionMonthlyRent,
  stripMonthlyRentFromOverrides,
} from '@/lib/sessionRent'
import type { IQEstimateSources } from '@/components/iq-verdict/IQEstimateSelector'

const willowSources: IQEstimateSources = {
  value: { iq: 625_999 },
  rent: { iq: 4_385, zillow: 4_345, rentcast: 4_400 },
}

describe('resolveSessionMonthlyRent', () => {
  it('uses the saved override when the user set one, even if live rent differs', () => {
    expect(
      resolveSessionMonthlyRent({
        savedOverride: 4_345,
        selectedLiveSource: 4_385,
      }),
    ).toBe(4_345)
  })

  it('uses the selected live source when there is no saved override', () => {
    expect(
      resolveSessionMonthlyRent({
        savedOverride: null,
        selectedLiveSource: 4_385,
      }),
    ).toBe(4_385)
  })

  it('does not fall through a saved record monthly_rent — that is not an override', () => {
    expect(
      resolveSessionMonthlyRent({
        savedOverride: 0,
        selectedLiveSource: 4_385,
      }),
    ).toBe(4_385)
  })
})

describe('one rent per property per session', () => {
  it('reads the same live IQ rent before and after a Math-tab visit (no write)', () => {
    const first = resolveSelectedLiveRent(willowSources)
    const afterMathTab = resolveSelectedLiveRent(willowSources)
    expect(first).toBe(4_385)
    expect(afterMathTab).toBe(first)
    expect(
      resolveSessionMonthlyRent({
        savedOverride: null,
        selectedLiveSource: afterMathTab,
      }),
    ).toBe(4_385)
  })

  it('keeps a saved override in front of live IQ after the same tab visit', () => {
    const live = resolveSelectedLiveRent(willowSources)
    expect(live).toBe(4_385)
    expect(
      resolveSessionMonthlyRent({
        savedOverride: 4_345,
        selectedLiveSource: live,
      }),
    ).toBe(4_345)
  })
})

describe('stripMonthlyRentFromOverrides', () => {
  it('drops path-applied rent so the solver sees the session rent', () => {
    const stripped = stripMonthlyRentFromOverrides({
      monthlyRent: 4_500,
      propertyTaxes: 8_000,
      vacancyRate: 5,
    })
    expect(stripped).toEqual({ propertyTaxes: 8_000, vacancyRate: 5 })
  })
})
