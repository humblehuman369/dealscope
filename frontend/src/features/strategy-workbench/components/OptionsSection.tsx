'use client'

/**
 * "Apply an Option" strip — Three Paths deal-structure buttons + applied card.
 * Extracted verbatim from `app/strategy/page.tsx` (R4 Stage 1) — no behavior change.
 * Rendered only for authenticated users (gate stays in the parent).
 */

import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'
import { PathOptionCard } from '@/components/iq-verdict/PathOptionCard'
import { PathButton } from '@/components/strategy/PathButton'

export interface OptionsSectionProps {
  hasPaths: boolean
  optionsHiddenForStrategy: boolean
  strategyFilteredPaths: DealStructure[]
  appliedPathId: string | null
  optionsSubtitle: string
  appliedPathEntry: { structure: DealStructure; index: number } | null
  propertyState: string | null
  onSwitchToLongTerm: () => void
  onClearPath: () => void
  onApplyPath: (structure: DealStructure, idx: number) => void
  onShowPitch: (structure: DealStructure) => void
}

export function OptionsSection({
  hasPaths,
  optionsHiddenForStrategy,
  strategyFilteredPaths,
  appliedPathId,
  optionsSubtitle,
  appliedPathEntry,
  propertyState,
  onSwitchToLongTerm,
  onClearPath,
  onApplyPath,
  onShowPitch,
}: OptionsSectionProps) {
  return (
    <>
      {hasPaths && optionsHiddenForStrategy && (
        <section className="px-[1px] sm:px-5 pt-2 pb-2">
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Deal-making Options use long-term-rental economics.{' '}
              <button
                type="button"
                onClick={onSwitchToLongTerm}
                className="font-semibold underline"
                style={{ color: 'var(--accent-sky)' }}
              >
                Switch to Long-term
              </button>{' '}
              to explore Options for this property.
            </p>
          </div>
        </section>
      )}
      {hasPaths && !optionsHiddenForStrategy && strategyFilteredPaths.length > 0 && (
        <section className="px-[1px] sm:px-5 pt-2 pb-2">
          <div
            className="rounded-xl p-3 sm:p-4"
            style={{ background: 'var(--surface-path-strip, #f2f2f2)' }}
          >
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2 gap-3">
                <div className="flex flex-col">
                  <h3
                    className="text-sm font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {appliedPathId
                      ? 'Apply an Option to the Worksheet'
                      : 'Start here — pick an Option'}
                  </h3>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {optionsSubtitle}
                  </p>
                </div>
                {appliedPathId && (
                  <button
                    type="button"
                    onClick={onClearPath}
                    className="text-xs font-semibold underline shrink-0"
                    style={{ color: 'var(--accent-sky)' }}
                  >
                    Reset to baseline
                  </button>
                )}
              </div>
              <div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl"
                style={
                  !appliedPathId
                    ? {
                        padding: 8,
                        background: 'var(--surface-card)',
                        border: '1px solid var(--accent-sky)',
                        boxShadow: '0 0 0 3px rgba(4, 101, 242, 0.12)',
                      }
                    : { background: 'var(--surface-card)', padding: 4 }
                }
              >
              {strategyFilteredPaths.slice(0, 4).map((p, i) => (
                <PathButton
                  key={p.id}
                  structure={p}
                  index={i}
                  active={appliedPathId === p.id}
                  onClick={onApplyPath}
                />
              ))}
              </div>
              {appliedPathEntry && (
                <div id="strategy-option-card" className="mt-3 scroll-mt-2">
                  <PathOptionCard
                    structure={appliedPathEntry.structure}
                    index={appliedPathEntry.index}
                    propertyState={propertyState}
                    applied
                    onShowPitch={onShowPitch}
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
