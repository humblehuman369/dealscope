/**
 * Strategy → post-purchase stage mapping for the Active Projects pipeline.
 *
 * Each strategy traces a different path after a deal closes:
 *   - Flip ends at sale.
 *   - BRRRR ends at long-term hold (after stabilization & refinance).
 *   - Long-term rental ends at long-term hold (after lease-up).
 *   - Short-term rental ends at long-term hold (after setup & going live).
 *
 * Wholesale isn't here — it lives in the pre-purchase Lead Pipeline because
 * the entire wholesale lifecycle happens before the user "owns" the deal.
 *
 * The shared "Acquisition" entry stage reflects the moment a property hits
 * Owned status — every strategy starts there.
 */

import type { FlipStage } from '@/types/savedProperty'

export type LifecycleStrategy = 'flip' | 'brrrr' | 'ltr' | 'str'

/** Ordered stage progression for each strategy. First = entry (the moment a
 *  deal hits Owned), last = terminal. The legacy ``Acquisition`` stage was
 *  collapsed in Phase 10A — entering Owned now drops the deal directly into
 *  the strategy's first real working column. */
export const STAGES_BY_STRATEGY: Record<LifecycleStrategy, FlipStage[]> = {
  flip:  ['Rehab', 'Listed', 'Sold'],
  brrrr: ['Rehab', 'Stabilized', 'Refinanced', 'Held'],
  ltr:   ['MakeReady', 'Leased', 'Held'],
  str:   ['Setup', 'Live', 'Held'],
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
  flip:  'Fix & Flip',
  brrrr: 'BRRRR',
  ltr:   'Long-Term Rental',
  str:   'Short-Term Rental',
}

/** Resolve a property's strategy. Falls back to flip when unknown. */
export function resolveStrategy(best_strategy: string | null | undefined): LifecycleStrategy {
  const s = (best_strategy ?? '').toLowerCase()
  if (s === 'brrrr' || s === 'ltr' || s === 'str' || s === 'flip') return s
  // subject_to and wholesale don't map to a post-purchase pipeline today —
  // treat them as flip-equivalents so the user can still see the property.
  return 'flip'
}

/** True when a stage is the terminal (last) stage for its strategy. */
export function isTerminalStage(strategy: LifecycleStrategy, stage: FlipStage): boolean {
  const stages = STAGES_BY_STRATEGY[strategy]
  return stages[stages.length - 1] === stage
}
