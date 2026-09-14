import { describe, expect, it } from 'vitest'

import { mapDealStructuresFromApi } from '@/lib/dealStructures/mapDealStructures'

describe('mapDealStructuresFromApi', () => {
  it('reads monthlyCashFlowTarget from the plan payload', () => {
    const mapped = mapDealStructuresFromApi({
      paths: [],
      has_paths: false,
      monthly_cash_flow_target: 25,
    })
    expect(mapped?.monthlyCashFlowTarget).toBe(25)
    expect(
      mapDealStructuresFromApi({
        paths: [],
        hasPaths: false,
        monthlyCashFlowTarget: 99,
      })?.monthlyCashFlowTarget,
    ).toBe(99)
  })
})
