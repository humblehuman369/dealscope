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

const LEAD_ORDER: readonly BreakevenFamily[] = ['price', 'financing', 'income', 'capital_stack']

export function pickLeadPath(paths: readonly DealStructure[]): DealStructure | null {
  for (const family of LEAD_ORDER) {
    const match = paths.find((p) => p.family === family)
    if (match) return match
  }
  return null
}

export function pickBackupPath(
  paths: readonly DealStructure[],
  lead: DealStructure | null,
): DealStructure | null {
  for (const family of LEAD_ORDER) {
    if (lead && family === lead.family) continue
    const match = paths.find((p) => p.family === family && p.breakeven)
    if (match) return match
  }
  return null
}

/** True only when a single lever is unlikely to close it — not for a $2K conversation. */
export function needsBlend(
  summary: { gapPct: number } | null | undefined,
  paths: readonly DealStructure[],
): boolean {
  if (!summary || summary.gapPct <= 10) return false
  const terms = paths.find((p) => p.family === 'financing')
  if (terms?.breakeven && !terms.breakeven.closesGapAlone) return true
  return summary.gapPct > 20
}

export function situationTitle(gapAmount: number | null | undefined): string {
  const gap = formatMoney(gapAmount)
  return gap ? `You’re ${gap} from cash flow` : 'How to get to cash flow'
}

export function situationSub(gapPct: number | null | undefined, monthlyShortfall: number | null | undefined): string {
  if (gapPct != null && Number.isFinite(gapPct) && gapPct <= 5) {
    return 'That’s a conversation, not a restructure.'
  }
  const shortfall = formatMoney(monthlyShortfall)
  if (shortfall) return `At asking you’re short about ${shortfall} a month.`
  return 'Today’s rent does not quite cover what this property costs to own.'
}

/**
 * The collapsed-row ask, in investor English. Price leads with the dollars they
 * give up, then where they land — not a percentage measurement.
 */
export function describePlay(family: BreakevenFamily, fact: BreakevenFact): string {
  const result = formatMoney(fact.resultAmount)
  const change = formatMoney(fact.changeAmount)
  switch (family) {
    case 'price':
      if (change && result) return `Ask ${change} less — buy at ${result}`
      return result ? `Buy at ${result}` : 'Ask the seller to come down to Target Buy'
    case 'income':
      return result ? `Prove the rent is ${result}/mo` : 'Prove the rent is higher than estimated'
    case 'financing':
      return result
        ? `Keep their price — they hold ${result} at 0%`
        : 'Keep their price and ask them to carry a second'
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

/** Two sentences max. Mechanism and trade-off only — never restates the row numbers. */
export function explainPlay(family: BreakevenFamily, closesGapAlone: boolean): string {
  switch (family) {
    case 'price':
      return 'A lower price is the cleanest close: the loan, the payment, and the cash you bring all drop together. The only thing you give up is asking the seller to move.'
    case 'income':
      return 'Leave the price alone and fix the income. A small lift is usually a stale listing rent two property managers can confirm; a large one is rehab or a strategy change — a different deal.'
    case 'financing':
      return closesGapAlone
        ? 'They keep their number on paper. You just do not pay all of it at closing — the cost is a balloon you refinance or sell through.'
        : 'They keep their number on paper, but a max carry only closes part of this gap. Pair it with a smaller price cut; do not ask for both as one big concession.'
    case 'capital_stack':
      return 'Nobody has to say yes. The cost is real: that extra cash earns less here than on a deal that already works, and you cannot get it back without selling or refinancing.'
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

/** One sentence they can actually say or do. */
export function openingLine(family: BreakevenFamily, fact: BreakevenFact | null): string {
  const result = fact ? formatMoney(fact.resultAmount) : null
  switch (family) {
    case 'price':
      return result ? `Lead with one number: ${result}. Then stop talking.` : 'Lead with one number. Then stop talking.'
    case 'income':
      return 'Ask for the current lease and rent roll before you send a number.'
    case 'financing':
      return 'Open with their full price, then the note. Never ask for a cut and terms in the same breath.'
    case 'capital_stack':
      return 'This one is yours — there is nothing to pitch the seller.'
    default: {
      const exhaustive: never = family
      return exhaustive
    }
  }
}

export function unavailableLine(
  family: BreakevenFamily,
  reason: 'not_needed' | 'insufficient' | 'no_data',
  fallback: string | null,
): string {
  if (fallback && reason !== 'not_needed') return fallback
  switch (reason) {
    case 'not_needed':
      if (family === 'income') return 'Rent already supports the price. Don’t chase a bump.'
      if (family === 'capital_stack') return 'Don’t put more cash in. You don’t need it to break even.'
      if (family === 'financing') return 'You don’t need seller terms to break even.'
      return 'This lever already works — skip it.'
    case 'insufficient':
      return fallback ?? 'This one cannot close the gap on its own.'
    case 'no_data':
      return fallback ?? 'Not enough data to test this lever.'
    default: {
      const exhaustive: never = reason
      return exhaustive
    }
  }
}

export function defaultAdvice(
  summary: { gapPct: number; gapAmount: number } | null | undefined,
  lead: DealStructure | null,
  backup: DealStructure | null,
): string {
  if (!lead || !isBreakevenFamily(lead.family) || !lead.breakeven) {
    return 'Four ways get you to cash flow. Build a plan around the one that fits how you buy.'
  }
  const play = describePlay(lead.family, lead.breakeven)
  const gapPct = summary?.gapPct ?? 0
  const backupPlay =
    backup && isBreakevenFamily(backup.family) && backup.breakeven
      ? describePlay(backup.family, backup.breakeven)
      : null

  if (gapPct <= 10 && backupPlay && backup?.family === 'financing') {
    return `Start with the price. ${play}. If they hold firm, ${backupPlay.charAt(0).toLowerCase()}${backupPlay.slice(1)}. You don’t need both.`
  }
  if (gapPct <= 10) {
    return `${play}. That is the whole conversation.`
  }
  if (needsBlend(summary, [lead, backup].filter((p): p is DealStructure => p != null)) && backupPlay) {
    return `Sellers concede a little on several things more readily than a lot on one. Pair a smaller price move with ${backupPlay.charAt(0).toLowerCase()}${backupPlay.slice(1)}.`
  }
  return `${play}. That is the cleanest path to cash flow.`
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
