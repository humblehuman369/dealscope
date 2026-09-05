/**
 * The four fixed ways to close a Deal Gap, in the order the engine returns them.
 *
 * Pure helpers shared by the strip, the wizard, and tests. The vocabulary maps
 * 1:1 onto the backend selector's fixed slots (`selector.py` + `engine.py`):
 * income → rent-verification, price → price-negotiation,
 * financing → seller-second-zero-balloon, blended → blended-plan.
 */

import type { DealStructure, StructureFamily } from '@/components/iq-verdict/PathOptionCard'

export type FourWayFamily = Extract<StructureFamily, 'price' | 'income' | 'financing' | 'blended'>

export interface FourWayDefinition {
  family: FourWayFamily
  /** Short name shown on the compact list. */
  name: string
  /** One-line plain-English meaning (wizard / aria). */
  meaning: string
  /** Verb before the headline number: "Price — buy at $686K". */
  verb: string
}

export const FOUR_WAYS: readonly FourWayDefinition[] = [
  { family: 'price', name: 'Price', meaning: 'Buy at the Target Buy', verb: 'buy at' },
  { family: 'income', name: 'Income', meaning: 'Verify or lift the rent', verb: 'rent to' },
  { family: 'financing', name: 'Financing', meaning: 'Seller helps carry the loan', verb: 'seller carries' },
  { family: 'blended', name: 'Blend', meaning: 'A little of each', verb: 'saves' },
] as const

export function isFourWayFamily(family: string): family is FourWayFamily {
  return FOUR_WAYS.some((w) => w.family === family)
}

export function findPathForFamily(
  paths: readonly DealStructure[],
  family: FourWayFamily,
): DealStructure | null {
  return paths.find((p) => p.family === family) ?? null
}

const HEADLINE_LEVER: Record<FourWayFamily, RegExp | null> = {
  price: /price/i,
  income: /rent/i,
  financing: /seller/i,
  blended: null,
}

export function formatMonthlySavings(monthlySavings: number): string | null {
  if (!Number.isFinite(monthlySavings) || monthlySavings <= 0) return null
  return `Saves $${Math.round(monthlySavings).toLocaleString('en-US')}/mo`
}

/**
 * One honest headline number per tile, read straight from the engine's levers.
 * Falls back to the monthly savings when the family has no single lever to quote.
 * Never invents a figure.
 */
export function headlineForPath(structure: DealStructure): string | null {
  if (!isFourWayFamily(structure.family)) return formatMonthlySavings(structure.monthlySavings)
  const matcher = HEADLINE_LEVER[structure.family]
  if (matcher) {
    const lever = structure.levers.find((l) => matcher.test(l.label) && l.afterLabel)
    if (lever) {
      // Seller 2nd carries "(0%, 5yr balloon)" — trim to the dollar figure.
      const cleaned = lever.afterLabel.replace(/\s*\(.*\)\s*$/, '').replace(/\s*@.*$/, '').trim()
      if (cleaned) return `→ ${cleaned}`
    }
  }
  return formatMonthlySavings(structure.monthlySavings)
}

export function formatGapAmount(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`
  return `$${Math.round(amount).toLocaleString('en-US')}`
}
