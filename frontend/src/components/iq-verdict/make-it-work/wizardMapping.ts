/**
 * Pure mapping from wizard answers → verdict-engine inputs + a recommendation.
 *
 * No I/O. The engine (`POST /api/v1/analysis/verdict`) does every calculation;
 * this file only decides which knobs to turn and which of the four returned
 * slots to lead with. Unit-tested in `__tests__/make-it-work/wizardMapping.test.ts`.
 */

import type { DealStructure } from '@/components/iq-verdict/PathOptionCard'
import { isFourWayFamily, type FourWayFamily } from '@/components/iq-verdict/make-it-work/fourWays'

export type CashBucket = 'under_25k' | '25_75k' | '75_150k' | '150k_plus' | 'low_money_down'
export type Priority = 'cash_flow' | 'lowest_price' | 'least_cash' | 'fastest_close'
export type TermsOpenness = 'simple' | 'seller_financing' | 'anything'

export interface WizardAnswers {
  cash: CashBucket | null
  priority: Priority | null
  terms: TermsOpenness | null
  /** Only asked for 2–4 unit properties or the low-money-down bucket. */
  ownerOccupy: boolean | null
}

export const EMPTY_ANSWERS: WizardAnswers = {
  cash: null,
  priority: null,
  terms: null,
  ownerOccupy: null,
}

export interface ChoiceOption<T extends string> {
  id: T
  label: string
  hint?: string
}

export const CASH_OPTIONS: readonly ChoiceOption<CashBucket>[] = [
  { id: 'under_25k', label: 'Under $25K' },
  { id: '25_75k', label: '$25K – $75K' },
  { id: '75_150k', label: '$75K – $150K' },
  { id: '150k_plus', label: '$150K+' },
  { id: 'low_money_down', label: 'Show me low-money-down', hint: 'Creative terms first' },
]

export const PRIORITY_OPTIONS: readonly ChoiceOption<Priority>[] = [
  { id: 'cash_flow', label: 'Monthly cash flow', hint: 'Income after every bill' },
  { id: 'lowest_price', label: 'Lowest price', hint: 'Buy the equity' },
  { id: 'least_cash', label: 'Least cash out of pocket', hint: 'Keep my reserves' },
  { id: 'fastest_close', label: 'Fastest close', hint: 'Simple, clean offer' },
]

export const TERMS_OPTIONS: readonly ChoiceOption<TermsOpenness>[] = [
  { id: 'simple', label: 'Keep it simple', hint: 'Bank loan, no seller terms' },
  { id: 'seller_financing', label: 'Open to seller financing', hint: 'If it pencils' },
  { id: 'anything', label: 'Whatever gets it done', hint: 'Creative is fine' },
]

export const OCCUPANCY_OPTIONS: readonly ChoiceOption<'yes' | 'no'>[] = [
  { id: 'yes', label: 'Yes, I would live in it', hint: 'Unlocks FHA-style low down' },
  { id: 'no', label: 'No, investment only' },
]

/** Midpoint of each cash bucket in dollars; `null` means "let the engine pick a low-down floor". */
export const CASH_BUCKET_MIDPOINT: Record<CashBucket, number | null> = {
  under_25k: 15_000,
  '25_75k': 50_000,
  '75_150k': 112_500,
  '150k_plus': 200_000,
  low_money_down: null,
}

export const MIN_DOWN_PAYMENT_PCT = 0.035
export const MAX_DOWN_PAYMENT_PCT = 0.35
export const LOW_MONEY_DOWN_PCT = 0.05
const DEFAULT_CLOSING_COSTS_PCT = 0.03

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

/**
 * Cash bucket → down-payment fraction. Cash covers the down payment plus
 * closing costs, so the closing-cost share is subtracted before clamping.
 */
export function deriveDownPaymentPct(
  cash: CashBucket | null,
  listPrice: number,
  closingCostsPct: number = DEFAULT_CLOSING_COSTS_PCT,
): number | null {
  if (!cash) return null
  if (cash === 'low_money_down') return LOW_MONEY_DOWN_PCT
  const midpoint = CASH_BUCKET_MIDPOINT[cash]
  if (midpoint == null || !Number.isFinite(listPrice) || listPrice <= 0) return null
  const raw = midpoint / listPrice - closingCostsPct
  return Math.round(clamp(raw, MIN_DOWN_PAYMENT_PCT, MAX_DOWN_PAYMENT_PCT) * 1000) / 1000
}

export interface VerdictOverrides {
  down_payment_pct?: number
  dismissed_families?: string[]
  is_owner_occupied?: boolean
}

/** Snake_case keys so the result can be spread straight into the verdict body. */
export function answersToVerdictOverrides(answers: WizardAnswers, listPrice: number): VerdictOverrides {
  const overrides: VerdictOverrides = {}
  const dp = deriveDownPaymentPct(answers.cash, listPrice)
  if (dp != null) overrides.down_payment_pct = dp
  // Only seller-terms dismissals go to the engine (they re-rank the creative
  // families). The cash-based Equity exclusion is a client-side pick rule.
  if (answers.terms === 'simple') overrides.dismissed_families = ['financing', 'blended']
  if (answers.ownerOccupy != null) overrides.is_owner_occupied = answers.ownerOccupy
  return overrides
}

const PRIORITY_ORDER: Record<Priority, FourWayFamily[]> = {
  cash_flow: ['blended', 'income', 'financing', 'capital_stack', 'price'],
  lowest_price: ['price', 'blended', 'income', 'financing', 'capital_stack'],
  least_cash: ['financing', 'blended', 'price', 'income', 'capital_stack'],
  // More equity is the simplest close there is — nothing to negotiate.
  fastest_close: ['price', 'capital_stack', 'income', 'blended', 'financing'],
}

const DEFAULT_ORDER: FourWayFamily[] = ['blended', 'price', 'financing', 'income', 'capital_stack']

/** Families the user asked us not to lead with. */
export function excludedFamilies(answers: WizardAnswers): FourWayFamily[] {
  const excluded: FourWayFamily[] = []
  if (answers.terms === 'simple') excluded.push('financing', 'blended')
  // A bigger down payment is not a plan for someone who told us they have little cash.
  if (answers.cash === 'under_25k' || answers.cash === 'low_money_down') excluded.push('capital_stack')
  return excluded
}

export function preferredFamilyOrder(answers: WizardAnswers): FourWayFamily[] {
  const base = answers.priority ? [...PRIORITY_ORDER[answers.priority]] : [...DEFAULT_ORDER]
  if (answers.cash === 'low_money_down' && answers.terms !== 'simple') {
    // Low cash + open to terms: creative financing leads regardless of priority.
    const rest = base.filter((f) => f !== 'financing')
    return ['financing', ...rest]
  }
  const excluded = excludedFamilies(answers)
  return base.filter((f) => !excluded.includes(f))
}

/**
 * Pick the recommended structure from the engine's fixed slots. Returns `null`
 * only when the engine produced nothing the user is willing to consider.
 */
export function pickRecommended(
  paths: readonly DealStructure[],
  answers: WizardAnswers,
  focusFamily?: FourWayFamily | null,
): DealStructure | null {
  const excluded = excludedFamilies(answers)
  const eligible = paths.filter((p) => isFourWayFamily(p.family) && !excluded.includes(p.family))
  if (eligible.length === 0) return null
  if (focusFamily) {
    const focused = eligible.find((p) => p.family === focusFamily)
    if (focused) return focused
  }
  for (const family of preferredFamilyOrder(answers)) {
    const match = eligible.find((p) => p.family === family)
    if (match) return match
  }
  return eligible[0]
}

/** Q4 is only worth asking when it can change the answer. */
export function shouldAskOccupancy(answers: WizardAnswers, unitCount: number | null | undefined): boolean {
  if (answers.cash === 'low_money_down') return true
  return unitCount != null && unitCount >= 2 && unitCount <= 4
}

export type WizardStepId = 'cash' | 'priority' | 'terms' | 'occupancy'

export function stepSequence(answers: WizardAnswers, unitCount: number | null | undefined): WizardStepId[] {
  const steps: WizardStepId[] = ['cash', 'priority', 'terms']
  if (shouldAskOccupancy(answers, unitCount)) steps.push('occupancy')
  return steps
}

/** Live micro-preview shown under Q1 so the choice teaches instead of asking blind. */
export function describeCashChoice(cash: CashBucket, listPrice: number): string | null {
  const dp = deriveDownPaymentPct(cash, listPrice)
  if (dp == null) return null
  const cashToClose = Math.round(listPrice * (dp + DEFAULT_CLOSING_COSTS_PCT))
  return `≈ ${Math.round(dp * 100)}% down · ~$${cashToClose.toLocaleString('en-US')} to close at asking`
}
