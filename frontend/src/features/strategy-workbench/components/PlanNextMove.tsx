'use client'

import {
  WORKBENCH_BODY,
  WORKBENCH_CARD,
  WORKBENCH_EYEBROW,
  WORKBENCH_TITLE,
} from '../lib/workbenchLayout'

export interface PlanNextMoveProps {
  /** Remaining analyses this month. Null when usage is unknown (signed-out continuity). */
  remainingAnalyses: number | null
  onStartTrial: () => void
  onAnalyzeAnother: () => void
}

/**
 * Immediate post-plan next move. Sells the 7-day trial (offer packet +
 * unlimited analyses) — never cash buyers / lenders, which require first payment.
 */
export function PlanNextMove({
  remainingAnalyses,
  onStartTrial,
  onAnalyzeAnother,
}: PlanNextMoveProps) {
  const remainingLabel =
    remainingAnalyses == null
      ? null
      : remainingAnalyses === 1
        ? '1 analysis left this month'
        : remainingAnalyses === 0
          ? 'No analyses left this month'
          : `${remainingAnalyses} analyses left this month`

  const analyzeIsTrial = remainingAnalyses === 0

  return (
    <section
      className={WORKBENCH_CARD}
      style={{
        background: 'var(--color-sky-dim)',
        border: '1px solid var(--accent-sky)',
      }}
    >
      <p className={WORKBENCH_EYEBROW} style={{ color: 'var(--accent-sky)' }}>
        Plan saved — emailed to you
      </p>
      <h3 className={`${WORKBENCH_TITLE} mt-1`} style={{ color: 'var(--text-heading)' }}>
        Your next move on this deal
      </h3>
      {remainingLabel && (
        <p
          className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{
            background: 'var(--surface-card)',
            color: 'var(--text-heading)',
            border: '1px solid var(--border-default)',
          }}
        >
          {remainingLabel}
        </p>
      )}

      <ol className="mt-4 flex flex-col gap-3 m-0 p-0 list-none">
        <li className="flex gap-3 items-start">
          <StepNum n="1" />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-heading)' }}>
              Confirm the 3 numbers
            </p>
            <p className={`${WORKBENCH_BODY} mt-0.5`} style={{ color: 'var(--text-body)' }}>
              Offer, rent, and cash to close are in the worksheet below. Drag a slider — cash
              flow updates instantly.
            </p>
          </div>
        </li>
        <li className="flex gap-3 items-start">
          <StepNum n="2" />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-heading)' }}>
              Download the offer packet
            </p>
            <p className={`${WORKBENCH_BODY} mt-0.5`} style={{ color: 'var(--text-body)' }}>
              PDF and Excel with this structure. Unlock both with a 7-day Pro trial.
            </p>
          </div>
        </li>
        <li className="flex gap-3 items-start">
          <StepNum n="3" />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-heading)' }}>
              Analyze one more property
            </p>
            <p className={`${WORKBENCH_BODY} mt-0.5`} style={{ color: 'var(--text-body)' }}>
              {analyzeIsTrial
                ? 'You have used this month’s free analyses. Pro unlocks unlimited.'
                : remainingAnalyses === 1
                  ? 'One analysis left this month — then Pro for unlimited.'
                  : 'Then Pro for unlimited analyses.'}
            </p>
          </div>
        </li>
      </ol>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onStartTrial}
          className="inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Start 7-day Pro trial
        </button>
        <button
          type="button"
          onClick={analyzeIsTrial ? onStartTrial : onAnalyzeAnother}
          className="text-sm font-semibold underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer"
          style={{ color: 'var(--accent-sky)' }}
        >
          {analyzeIsTrial ? 'Upgrade for unlimited analyses' : 'Analyze another property'}
        </button>
      </div>
    </section>
  )
}

function StepNum({ n }: { n: string }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--accent-sky)',
        color: 'var(--accent-sky)',
      }}
      aria-hidden
    >
      {n}
    </span>
  )
}
