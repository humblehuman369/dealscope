import type { RehabSelection } from '@/lib/analytics'
import type { LineItem } from '@/lib/rehabIntelligence'

/** Map RehabIntelligence line items to API seed selections. */
export function lineItemsToSelections(items: LineItem[]): RehabSelection[] {
  return items.map((item) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    tier: item.tier,
    costOverride: item.cost,
  }))
}
