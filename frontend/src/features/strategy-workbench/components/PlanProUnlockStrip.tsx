'use client'

import { Users } from 'lucide-react'

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
    <section className="px-[1px] sm:px-5 pt-2 pb-3">
      <div
        className="rounded-xl px-4 py-3.5 sm:px-5"
        style={{
          background: 'var(--color-sky-dim)',
          border: '1px solid var(--accent-sky)',
        }}
      >
        <div className="flex items-start gap-3">
          <Users
            size={18}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--accent-sky)' }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--text-heading)',
              }}
            >
              Ready to take this offer out?
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--text-body)',
              }}
            >
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
            <button
              type="button"
              onClick={onUpgrade}
              className="mt-3 inline-flex items-center justify-center rounded-full px-5 py-2 text-[13px] font-bold transition-transform active:scale-[0.98]"
              style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
            >
              Unlock buyers &amp; lenders
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
