import { describe, expect, it } from 'vitest'
import { lineItemsToSelections } from '@/lib/rehabBudgetSeed'
import type { LineItem } from '@/lib/rehabIntelligence'

describe('lineItemsToSelections', () => {
  it('maps cost to costOverride for seed API', () => {
    const items: LineItem[] = [
      { itemId: 'cabinets', quantity: 1, tier: 'mid', cost: 4200 },
      { itemId: 'roof', quantity: 1, tier: 'high', cost: 15000 },
    ]
    expect(lineItemsToSelections(items)).toEqual([
      { itemId: 'cabinets', quantity: 1, tier: 'mid', costOverride: 4200 },
      { itemId: 'roof', quantity: 1, tier: 'high', costOverride: 15000 },
    ])
  })

  it('returns empty array for empty input', () => {
    expect(lineItemsToSelections([])).toEqual([])
  })
})
