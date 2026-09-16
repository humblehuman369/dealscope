'use client'

import { useEffect } from 'react'
import { PRO_YEARLY_PER_MONTH, PRO_YEARLY_PRICE } from '@/lib/claims'
import { formatResetDate } from '@/lib/analysisQuota'
import { trackEvent } from '@/lib/eventTracking'

const FONT_DM = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"
const FONT_MONO = "var(--font-space-mono), 'Space Mono', monospace"

const FEATURES = [
  {
    title: 'Unlimited analyses',
    body: 'No monthly cap. You never hit this wall again.',
    icon: InfinityIcon,
  },
  {
    title: 'Full investor workflow suite',
    body: 'Find, Discovery, Plan, Math, Work, and Track on every property, plus every tool in the Tools menu.',
    icon: WorkflowIcon,
  },
  {
    title: 'Excel proforma download',
    body: 'Hand the full deal to your lender, partner, or spreadsheet.',
    icon: SpreadsheetIcon,
  },
  {
    title: 'Buyer & lender directories',
    body: "2,800 verified cash buyers. 480 hard money lenders. Know who's buying and who's funding before you offer.",
    icon: DirectoryIcon,
  },
] as const

export function UpgradeWall({
  resetsAt,
  limit,
  used = limit,
  plan = 'starter',
  onStartTrial,
  onDismiss,
}: {
  resetsAt: string
  limit: number
  /** Analytics only — defaults to `limit`. */
  used?: number
  plan?: string
  onStartTrial: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    trackEvent('upgrade_wall_viewed', {
      plan,
      used,
      limit,
      source: 'quota_exceeded',
    })
  }, [plan, used, limit])

  const resetLabel = formatResetDate(resetsAt)

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      style={{ fontFamily: FONT_DM, background: 'var(--surface-base)' }}
    >
      <p
        className="mb-3 flex items-center gap-2 text-sm font-semibold sm:text-base"
        style={{ color: 'var(--status-income-value)' }}
      >
        <ClockIcon />
        You&apos;ve used all {limit} free analyses this month
      </p>

      <h1
        className="text-[30px] font-bold leading-tight sm:text-[44px]"
        style={{ color: 'var(--text-heading)' }}
      >
        See the Deal Gap on every property.
      </h1>

      <p
        className="mt-4 max-w-3xl text-[15px] leading-relaxed sm:text-[18px]"
        style={{ color: 'var(--text-body)' }}
      >
        You&apos;re three properties in and just getting started. Pro takes the cap off. Run the
        numbers on every property you find and work each one through the full investor workflow,
        from Find to Track, without stopping.
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <li
              key={feature.title}
              className="flex flex-row items-start gap-3 rounded-2xl p-4 md:flex-col"
              style={{
                background: 'var(--surface-section)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  color: 'var(--accent-brand-blue)',
                  background: 'color-mix(in srgb, var(--accent-brand-blue) 12%, transparent)',
                }}
                aria-hidden
              >
                <Icon />
              </span>
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {feature.title}
                </h2>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-body)' }}>
                  {feature.body}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <div
        className="mx-auto mt-8 max-w-lg rounded-2xl px-5 py-6 text-center sm:px-8"
        style={{
          background: 'var(--surface-section)',
          border: '1px solid var(--accent-brand-blue)',
        }}
      >
        <p
          className="text-xs font-semibold tracking-[0.14em]"
          style={{ color: 'var(--text-secondary)' }}
        >
          DEALGAPIQ PRO
        </p>
        <p className="mt-2 flex items-baseline justify-center gap-2">
          <span
            className="text-[40px] font-bold leading-none"
            style={{ fontFamily: FONT_MONO, color: 'var(--text-heading)' }}
          >
            ${PRO_YEARLY_PER_MONTH}
          </span>
          <span className="text-base" style={{ color: 'var(--text-secondary)' }}>
            per month
          </span>
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Billed yearly at {PRO_YEARLY_PRICE}. Less than one bad offer.
        </p>

        <button
          type="button"
          onClick={onStartTrial}
          className="mt-5 flex h-14 w-full min-h-11 items-center justify-center rounded-full text-[18px] font-bold text-white"
          style={{ background: 'var(--accent-brand-blue)' }}
        >
          Start my free 7-day trial
        </button>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Cancel anytime. Your card is not charged for 7 days.
        </p>
      </div>

      <p className="mt-6 text-center">
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 px-3 text-sm underline-offset-2 hover:underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          Your free plan resets on {resetLabel}. I&apos;ll wait.
        </button>
      </p>

      <p
        className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Built by the founder of Foreclosure.com, who built HomePath.com and HomeSteps.com.
        Institutional-grade data, priced for the everyday investor.
      </p>
    </section>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5.2l3.2 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function InfinityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 9.5c2.4 0 3.8 2.5 4.5 2.5s2.1-2.5 4.5-2.5 4.5 2 4.5 4.5-2.1 4.5-4.5 4.5-3.8-2.5-4.5-2.5-2.1 2.5-4.5 2.5S3 16.5 3 14s2.1-4.5 4.5-4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function WorkflowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="10" width="18" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="16" width="18" height="4" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function SpreadsheetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3h7l7 7v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M14 3v7h7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 14h8M8 18h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function DirectoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3.5 19c.4-3 2.6-4.8 5.5-4.8S14.1 16 14.5 19"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 14.4c2.2.3 3.8 1.7 4.2 3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
