'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'

interface StrategyUnlockPanelProps {
  signInUrl: string
  optionLabels: string[]
  streetAddress: string
  buyerTotalLabel: string
  lenderTotalLabel: string
}

function formatOptionList(labels: string[]): string {
  if (labels.length === 0) return ''
  const normalized = labels.map((l) => l.toLowerCase())
  if (normalized.length === 1) return normalized[0]
  if (normalized.length === 2) return `${normalized[0]} and ${normalized[1]}`
  return `${normalized.slice(0, -1).join(', ')}, and ${normalized[normalized.length - 1]}`
}

export function StrategyUnlockPanel({
  signInUrl,
  optionLabels,
  streetAddress,
  buyerTotalLabel,
  lenderTotalLabel,
}: StrategyUnlockPanelProps) {
  const optionCount = optionLabels.length
  const headline =
    optionCount > 0
      ? `Unlock ${optionCount} way${optionCount === 1 ? '' : 's'} to make this deal work`
      : 'Unlock the full deal breakdown'

  const addressLine = streetAddress.trim() || 'this property'
  const optionList = formatOptionList(optionLabels)

  const bullets = [
    'The full worksheet: buy price, loan, cap rate, cash-on-cash, monthly cash flow',
    optionCount > 0
      ? `${optionCount} ready-to-run deal option${optionCount === 1 ? '' : 's'} — ${optionList}`
      : null,
    'Cross-check value & rent against Zillow, RentCast, Redfin and Realtor.com',
    'All 6 investment strategies + save properties to your dashboard',
  ].filter((b): b is string => b != null)

  return (
    <div
      className="w-full max-w-[480px] mx-4 rounded-2xl px-5 py-5 sm:px-6 sm:py-6"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card-hover)',
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2 text-center"
        style={{ color: 'var(--accent-sky)' }}
      >
        Your free deal plan is ready
      </p>

      <h2
        className="text-lg sm:text-xl font-bold text-center leading-snug mb-2"
        style={{ color: 'var(--text-heading)' }}
      >
        {headline}
      </h2>

      <p
        className="text-sm text-center leading-relaxed mb-4"
        style={{ color: 'var(--text-secondary)' }}
      >
        See the exact buy price, monthly cash flow, and negotiation numbers for{' '}
        <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
          {addressLine}
        </span>{' '}
        — in about 30 seconds.
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

      <p
        className="text-[11px] leading-relaxed mb-4 px-1"
        style={{ color: 'var(--text-label)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Pro
        </span>{' '}
        members also unlock {buyerTotalLabel} verified cash buyers and {lenderTotalLabel} hard money
        lenders to exit this deal.
      </p>

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
          Unlock my free deal plan →
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
