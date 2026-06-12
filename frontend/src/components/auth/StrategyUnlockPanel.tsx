'use client'

import Link from 'next/link'
import { Check, Users } from 'lucide-react'

interface StrategyUnlockPanelProps {
  signInUrl: string
  /** Number of deal-structure Options available for this property (0–4). */
  optionCount: number
  buyerTotalLabel: string
  lenderTotalLabel: string
}

export function StrategyUnlockPanel({
  signInUrl,
  optionCount,
  buyerTotalLabel,
  lenderTotalLabel,
}: StrategyUnlockPanelProps) {
  const hasOptions = optionCount > 0

  const bullets = [
    'Your max offer price — the number where this property pays for itself from day one',
    hasOptions
      ? `${optionCount} deal structure${optionCount === 1 ? '' : 's'} that close the gap, each with a ready-to-use seller pitch script`
      : 'Deal structures that close the gap, with ready-to-use seller pitch scripts',
    'A live worksheet — change rent, rate, or down payment and watch cash flow update instantly',
    'Values verified across Zillow, RentCast, Redfin & Realtor.com — negotiate with proof',
  ]

  return (
    <div
      className="w-full max-w-[480px] mx-4 rounded-2xl px-5 py-5 sm:px-6 sm:py-6"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card-hover)',
      }}
    >
      <h2
        className="text-lg sm:text-xl font-bold text-center leading-snug mb-2"
        style={{ color: 'var(--text-heading)' }}
      >
        Don&rsquo;t walk away from this deal yet.
      </h2>

      <p
        className="text-sm text-center leading-relaxed mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        {hasOptions ? (
          <>
            DealGapIQ found{' '}
            <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
              {optionCount} way{optionCount === 1 ? '' : 's'} to restructure this deal
            </span>{' '}
            so the numbers work — and gives you the exact offer to make.
          </>
        ) : (
          <>
            DealGapIQ shows you how to restructure this deal so the numbers work — and gives you
            the exact offer to make.
          </>
        )}
      </p>

      <ul className="flex flex-col gap-2.5 mb-4">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5">
            <Check
              size={16}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--accent-sky)' }}
              aria-hidden
            />
            <span className="text-[13px] leading-snug" style={{ color: 'var(--text-body)' }}>
              {bullet}
            </span>
          </li>
        ))}
      </ul>

      {/* Exit network — the scarce asset; promoted, not a footnote */}
      <div
        className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
        style={{
          background: 'var(--color-sky-dim)',
          border: '1px solid var(--accent-sky)',
        }}
      >
        <Users
          size={16}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--accent-sky)' }}
          aria-hidden
        />
        <p className="text-[12px] leading-snug m-0" style={{ color: 'var(--text-body)' }}>
          <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
            Then close it:
          </span>{' '}
          get access to{' '}
          <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
            {buyerTotalLabel} verified cash buyers
          </span>{' '}
          and{' '}
          <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
            {lenderTotalLabel} hard money lenders
          </span>{' '}
          for this property (Pro).
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Link
          href={signInUrl}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
          style={{
            background: 'var(--accent-sky)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(8,145,178,0.4)',
          }}
        >
          Show me how to close this deal →
        </Link>

        <Link
          href={signInUrl}
          className="text-xs font-medium transition-colors hover:underline underline-offset-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Already a member? Sign in
        </Link>

        <p className="text-[11px] mt-1" style={{ color: 'var(--text-label)' }}>
          Free forever · No credit card · Takes 30 seconds
        </p>
      </div>
    </div>
  )
}
