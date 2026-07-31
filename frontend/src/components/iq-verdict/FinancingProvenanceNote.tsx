'use client'

/**
 * FinancingProvenanceNote — tells the user whose assumptions produced the
 * headline Deal Gap (R5: the user's saved defaults drive the headline).
 *
 * The backend verdict endpoint resolves the full assumption chain
 * (admin defaults → user overrides), so when a signed-in user has saved
 * custom defaults the number already reflects them — this note makes that
 * visible instead of leaving the inputs a mystery.
 */

import Link from 'next/link'
import { useDefaults } from '@/hooks/useDefaults'
import { useSession } from '@/hooks/useSession'

const pct = (v: number) => {
  const n = v * 100
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

export function FinancingProvenanceNote() {
  const { isAuthenticated } = useSession()
  // No ZIP on purpose: the verdict endpoint resolves admin + user layers
  // (financing values are never ZIP-adjusted), so this mirrors its inputs.
  const { defaults, hasUserCustomizations, loading } = useDefaults()

  if (loading || !defaults?.financing) return null

  const { down_payment_pct, interest_rate, loan_term_years } = defaults.financing
  const summary = `${pct(down_payment_pct)} down · ${pct(interest_rate)} rate · ${loan_term_years}-yr loan`
  const personalized = isAuthenticated && hasUserCustomizations

  return (
    <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-label)' }}>
      {personalized ? 'Based on your financing profile' : 'Based on standard assumptions'} —{' '}
      <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {summary}
      </span>
      {isAuthenticated && (
        <>
          {' · '}
          <Link
            href="/profile?tab=investor"
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-sky)' }}
          >
            {personalized ? 'Edit' : 'Customize'}
          </Link>
        </>
      )}
    </p>
  )
}
