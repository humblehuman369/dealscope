import { afterEach, describe, expect, it } from 'vitest'

import {
  clearPlanSession,
  hydratePlanSession,
  readPlanSession,
  sessionHasAppliedPlan,
  writePlanSession,
} from '@/lib/planSessionStore'

const WILLOW = '1766 Wandering Willow Way, Wellington, FL 33414'
const OTHER = '4944 Mcconnell Street, Lake Worth, FL 33463'

afterEach(() => {
  clearPlanSession(WILLOW)
  clearPlanSession(OTHER)
})

describe('applied plan lost on tab switch', () => {
  it('keeps Option 2 and $115 after a Math tab remount', () => {
    writePlanSession(WILLOW, {
      appliedPathId: 'price-negotiation',
      appliedStructure: { id: 'price-negotiation', family: 'price' } as never,
      planCustomized: false,
      worksheetPatch: { buyPrice: 453_820, monthlyRent: 4345 },
      monthlyRentOverride: 4345,
    })

    const remount = hydratePlanSession(WILLOW)
    expect(sessionHasAppliedPlan(remount)).toBe(true)
    expect(remount.appliedPathId).toBe('price-negotiation')
    expect(remount.worksheetPatch?.buyPrice).toBe(453_820)
  })

  it('still has Option 2 after a same-tab reload', () => {
    writePlanSession(WILLOW, {
      appliedPathId: 'price-negotiation',
      appliedStructure: null,
      planCustomized: false,
      worksheetPatch: { buyPrice: 453_820 },
      monthlyRentOverride: null,
    })
    expect(readPlanSession(WILLOW)?.appliedPathId).toBe('price-negotiation')
  })

  it('does not inherit the applied plan on a second property', () => {
    writePlanSession(WILLOW, {
      appliedPathId: 'price-negotiation',
      appliedStructure: null,
      planCustomized: false,
      worksheetPatch: { buyPrice: 453_820 },
      monthlyRentOverride: null,
    })
    expect(sessionHasAppliedPlan(hydratePlanSession(OTHER))).toBe(false)
    expect(readPlanSession(OTHER)).toBeNull()
  })

  it('keeps Tune rent across the same round trip', () => {
    writePlanSession(WILLOW, {
      appliedPathId: 'price-negotiation',
      appliedStructure: null,
      planCustomized: true,
      worksheetPatch: { monthlyRent: 4500 },
      monthlyRentOverride: 4500,
    })
    const remount = hydratePlanSession(WILLOW)
    expect(remount.monthlyRentOverride).toBe(4500)
    expect(remount.worksheetPatch?.monthlyRent).toBe(4500)
    expect(remount.planCustomized).toBe(true)
  })
})
