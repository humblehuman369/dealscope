/**
 * The four ways to breakeven, in the order the engine returns them.
 *
 * Pure helpers shared by the Breakeven Analysis section, the wizard, and tests.
 * The vocabulary maps 1:1 onto the backend selector's fixed slots
 * (`selector.py` + `engine.py`):
 *   price         → price-negotiation          "Price"
 *   income        → rent-verification          "Income"
 *   financing     → seller-second-zero-balloon "Terms"
 *   capital_stack → larger-down                "Equity"
 * The engine-appended `blended` plan is the wizard's output only; it is never a
 * row in the section.
 */

import type { BreakevenFact, DealStructure, StructureFamily } from '@/components/iq-verdict/PathOptionCard'

/** Families shown as rows in the Breakeven Analysis section. */
export type BreakevenFamily = Extract<StructureFamily, 'price' | 'income' | 'financing' | 'capital_stack'>
/** Families the wizard may recommend: the four rows plus the blend. */
export type FourWayFamily = BreakevenFamily | 'blended'

export interface FourWayDefinition {
  family: BreakevenFamily
  /** Short name shown on the row. */
  name: string
  /** One-line plain-English meaning (wizard / aria). */
  meaning: string
}

export const FOUR_WAYS: readonly FourWayDefinition[] = [
  { family: 'price', name: 'Price', meaning: 'Buy at the Target Buy' },
  { family: 'income', name: 'Income', meaning: 'Verify or lift the rent' },
  { family: 'financing', name: 'Terms', meaning: 'Seller carries part of the price' },
  { family: 'capital_stack', name: 'Equity', meaning: 'Put more cash down' },
] as const

export const WIZARD_FAMILIES: readonly FourWayFamily[] = [
  ...FOUR_WAYS.map((w) => w.family),
  'blended',
]

export const WAY_NAMES: Record<FourWayFamily, string> = {
  price: 'Price',
  income: 'Income',
  financing: 'Terms',
  capital_stack: 'Equity',
  blended: 'Blended plan',
}

export function isBreakevenFamily(family: string): family is BreakevenFamily {
  return FOUR_WAYS.some((w) => w.family === family)
}

export function isFourWayFamily(family: string): family is FourWayFamily {
  return WIZARD_FAMILIES.includes(family as FourWayFamily)
}

export function findPathForFamily(
  paths: readonly DealStructure[],
  family: FourWayFamily,
): DealStructure | null {
  return paths.find((p) => p.family === family) ?? null
}

export function formatMonthlySavings(monthlySavings: number): string | null {
  if (!Number.isFinite(monthlySavings) || monthlySavings <= 0) return null
  return `Saves $${Math.round(monthlySavings).toLocaleString('en-US')}/mo`
}

export function formatGapAmount(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

export function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

function pct(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return `${value.toFixed(1)}%`
}

/**
 * Left side of a row: what has to change, read straight from the engine's
 * structured fact. "Cut price 33.0% ($152,000)". Never invents a figure — when
 * the engine sent no fact the caller shows the row as unavailable.
 */
export function describeBreakevenChange(family: BreakevenFamily, fact: BreakevenFact): string {
  const p = pct(fact.changePct)
  const amt = formatMoney(fact.changeAmount)
  switch (family) {
    case 'price': {
      const parts = [p, amt ? `(${amt})` : null].filter(Boolean).join(' ')
      return parts ? `Cut price ${parts}` : 'Cut the price'
    }
    case 'income': {
      const parts = [p, amt ? `(${amt}/mo)` : null].filter(Boolean).join(' ')
      return parts ? `Raise rent ${parts}` : 'Raise the rent'
    }
    case 'financing': {
      const carry = formatMoney(fact.resultAmount)
      return carry ? `Seller carries ${carry} at 0%` : 'Seller carries a second'
    }
    case 'capital_stack': {
      const to = fact.termsNote ? ` to ${fact.termsNote}` : ''
      return amt ? `Raise down payment${to} (+${amt})` : `Raise down payment${to}`
    }
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

/** Right side of a row: the resulting figure and what it is. */
export function describeBreakevenResult(fact: BreakevenFact): { amount: string; label: string } | null {
  const amount = formatMoney(fact.resultAmount)
  if (!amount) return null
  return { amount, label: fact.resultLabel }
}
