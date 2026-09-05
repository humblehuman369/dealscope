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

/** Rounded for scanning, not for signing: "$67K", "$1.2M". */
export function formatMoneyCompact(amount: number | null | undefined): string | null {
  if (amount == null || !Number.isFinite(amount)) return null
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `$${Math.round(amount / 1_000)}K`
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

function pct(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null
  return `${value.toFixed(1)}%`
}

/**
 * Left side of a row: the ask, phrased as the thing you actually do. Reads as
 * an instruction ("Get the seller to $320,778") rather than a measurement
 * ("Cut price 0.5% ($1,689)") — the percentage is the arithmetic behind the
 * ask, not the ask itself, so it moves into the expanded panel.
 *
 * Never invents a figure: when the engine sent no fact the caller shows the
 * row's unavailable reason instead.
 */
export function describePlay(family: BreakevenFamily, fact: BreakevenFact): string {
  const result = formatMoney(fact.resultAmount)
  switch (family) {
    case 'price':
      return result ? `Get the seller to ${result}` : 'Get the seller down to Target Buy'
    case 'income':
      return result ? `Prove the rent is ${result}/mo` : 'Prove the rent is higher than estimated'
    case 'financing':
      return result ? `Full price — seller carries ${result} at 0%` : 'Ask the seller to carry a second'
    case 'capital_stack':
      return result
        ? `Put ${result} down${fact.termsNote ? ` (${fact.termsNote})` : ''}`
        : 'Put more of your own cash down'
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

/** The arithmetic behind the ask, for the expanded panel. "0.5% off asking, $1,689." */
export function describeChangeDetail(family: BreakevenFamily, fact: BreakevenFact): string | null {
  const p = pct(fact.changePct)
  const amt = formatMoney(fact.changeAmount)
  if (!p && !amt) return null
  switch (family) {
    case 'price':
      return [p ? `${p} off asking` : null, amt].filter(Boolean).join(' · ')
    case 'income':
      return [p ? `${p} above today's estimate` : null, amt ? `${amt}/mo more` : null]
        .filter(Boolean)
        .join(' · ')
    case 'financing':
      return amt ? `${amt} of the price deferred` : null
    case 'capital_stack':
      return amt ? `${amt} more cash than the standard plan` : null
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

/**
 * Right side of a row: what the lever costs *you* at close, and how that
 * compares to buying at asking on standard terms.
 *
 * This is the only figure that meaningfully differs across the four rows —
 * every lever solves to roughly the same breakeven cash flow, so showing the
 * resulting cash flow would make all four rows look identical.
 */
export function describeCashToClose(
  cashRequired: number,
  baselineCashRequired: number | null | undefined,
): { amount: string; delta: string | null } | null {
  const amount = formatMoneyCompact(cashRequired)
  if (!amount || !Number.isFinite(cashRequired) || cashRequired <= 0) return null
  if (baselineCashRequired == null || !Number.isFinite(baselineCashRequired) || baselineCashRequired <= 0) {
    return { amount, delta: null }
  }
  const diff = cashRequired - baselineCashRequired
  // Under ~$500 of movement is noise from rounding the inputs, not a real trade-off.
  if (Math.abs(diff) < 500) return { amount, delta: 'same as asking' }
  const magnitude = formatMoneyCompact(Math.abs(diff))
  return { amount, delta: `${magnitude} ${diff < 0 ? 'less' : 'more'} than asking` }
}

/** Right side of a row: the resulting figure and what it is. */
export function describeBreakevenResult(fact: BreakevenFact): { amount: string; label: string } | null {
  const amount = formatMoney(fact.resultAmount)
  if (!amount) return null
  return { amount, label: fact.resultLabel }
}
