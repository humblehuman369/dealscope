'use client'

import { Users } from 'lucide-react'

import {
  WORKBENCH_BODY,
  WORKBENCH_CARD,
  WORKBENCH_TITLE,
} from '../lib/workbenchLayout'

export interface PlanProUnlockStripProps {
  buyerTotalLabel: string
  lenderTotalLabel: string
  onUpgrade: () => void
}

/**
 * Soft Pro ask after the worksheet aha — buyers, lenders, offer packet.
 * Never a wall in front of the plan they already built.
 */
export function PlanProUnlockStrip({
  buyerTotalLabel,
  lenderTotalLabel,
  onUpgrade,
}: PlanProUnlockStripProps) {
  return (
    <section
      className={WORKBENCH_CARD}
      style={{
        background: 'var(--color-sky-dim)',
        border: '1px solid var(--accent-sky)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Users
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--accent-sky)' }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className={WORKBENCH_TITLE} style={{ color: 'var(--text-heading)' }}>
              Ready to take this offer out?
            </p>
            <p className={`${WORKBENCH_BODY} mt-1`} style={{ color: 'var(--text-body)' }}>
              Unlock{' '}
              <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                {buyerTotalLabel} verified cash buyers
              </span>{' '}
              and{' '}
              <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                {lenderTotalLabel} hard money lenders
              </span>{' '}
              for this property, plus the PDF and Excel offer packet.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="inline-flex shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Unlock buyers &amp; lenders
        </button>
      </div>
    </section>
  )
}
