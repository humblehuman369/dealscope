'use client'

import { ANON_FUNNEL_COPY } from '@/lib/anonFunnelCopy'

export function DiscoveryQuotaGate({
  kind,
  onCreateAccount,
  onSignIn,
  onUpgrade,
}: {
  kind: 'anonymous' | 'free'
  onCreateAccount: () => void
  onSignIn: () => void
  onUpgrade: () => void
}) {
  const isAnon = kind === 'anonymous'
  return (
    <article
      className="rounded-2xl border px-5 py-6 sm:px-6"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border-default)',
      }}
    >
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>
        {isAnon ? ANON_FUNNEL_COPY.gateTitle : "You've used this month's free analyses"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
        {isAnon
          ? ANON_FUNNEL_COPY.gateBody
          : 'Upgrade to Pro for unlimited property analyses, the Deal Maker, comps, and exports.'}
      </p>
      {isAnon ? (
        <>
          <button
            type="button"
            onClick={onCreateAccount}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-bold"
            style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
          >
            {ANON_FUNNEL_COPY.gatePrimary}
          </button>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-3 block text-sm font-semibold underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            {ANON_FUNNEL_COPY.signIn}
          </button>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-label)' }}>
            {ANON_FUNNEL_COPY.gateFootnote}
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-bold"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Upgrade to Pro
        </button>
      )}
    </article>
  )
}
