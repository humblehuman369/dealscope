/**
 * Strategy → post-purchase stage mapping for the Active Projects pipeline.
 *
 * Every strategy starts at Rehab — the universal "you just took ownership
 * and are getting the property ready" phase — and then diverges:
 *   - Flip ends at sale.
 *   - BRRRR ends at long-term hold (after stabilization & refinance).
 *   - LTR / House Hack end at long-term hold (after make-ready & lease-up).
 *   - STR ends at long-term hold (after setup & going live).
 *   - Wholesale closes quickly via a minimal-rehab → sold path.
 *
 * The legacy ``Acquisition`` stage was collapsed in Phase 10A — entering
 * Owned now drops the deal directly into Rehab.
 */

import type { FlipStage } from '@/types/savedProperty'

export type LifecycleStrategy =
  | 'flip'
  | 'brrrr'
  | 'ltr'
  | 'str'
  | 'house_hack'
  | 'wholesale'

/** Ordered stage progression for each strategy. First = entry (the moment a
 *  deal hits Owned), last = terminal. */
export const STAGES_BY_STRATEGY: Record<LifecycleStrategy, FlipStage[]> = {
  flip:       ['Rehab', 'Listed', 'Sold'],
  brrrr:      ['Rehab', 'Stabilized', 'Refinanced', 'Held'],
  ltr:        ['Rehab', 'MakeReady', 'Leased', 'Held'],
  str:        ['Rehab', 'Setup', 'Live', 'Held'],
  house_hack: ['Rehab', 'MakeReady', 'Leased', 'Held'],
  wholesale:  ['Rehab', 'Sold'],
}

/** Display labels — what shows in the column header. ``Acquisition`` is
 *  retained as a defensive label for any stale rows that survive migration;
 *  it's not used by ``STAGES_BY_STRATEGY`` anymore. */
export const STAGE_LABELS: Record<FlipStage, string> = {
  Acquisition: 'Acquired',
  Rehab: 'Rehab',
  Listed: 'Listed',
  Sold: 'Sold',
  Stabilized: 'Stabilized',
  Refinanced: 'Refinanced',
  MakeReady: 'Make Ready',
  Leased: 'Leased',
  Setup: 'Setup',
  Live: 'Live',
  Held: 'Held',
}

/** Strategy display labels for section headers. */
export const STRATEGY_HEADER: Record<LifecycleStrategy, string> = {
  flip:       'Fix & Flip',
  brrrr:      'BRRRR',
  ltr:        'Long-Term Rental',
  str:        'Short-Term Rental',
  house_hack: 'House Hack',
  wholesale:  'Wholesale',
}

/** Resolve a property's strategy. Falls back to flip when unknown. */
export function resolveStrategy(best_strategy: string | null | undefined): LifecycleStrategy {
  const s = (best_strategy ?? '').toLowerCase()
  if (
    s === 'flip' ||
    s === 'brrrr' ||
    s === 'ltr' ||
    s === 'str' ||
    s === 'house_hack' ||
    s === 'wholesale'
  ) {
    return s
  }
  // subject_to and any other niche strategies don't have a defined post-
  // purchase pipeline yet — treat them as flip so the user can still see
  // and manage the property.
  return 'flip'
}

/** True when a stage is the terminal (last) stage for its strategy. */
export function isTerminalStage(strategy: LifecycleStrategy, stage: FlipStage): boolean {
  const stages = STAGES_BY_STRATEGY[strategy]
  return stages[stages.length - 1] === stage
}
