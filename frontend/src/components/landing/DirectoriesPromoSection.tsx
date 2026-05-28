'use client'

import Link from 'next/link'
import { ArrowRight, Banknote, Check, Lock, Users } from 'lucide-react'
import { useBuyerDirectoryTeaserTotal } from '@/hooks/useBuyerDirectoryTeaserTotal'
import { formatLenderDirectoryTotal } from '@/lib/directory-promo'
import { trackEvent } from '@/lib/eventTracking'

const DISPLAY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), var(--font-inter), system-ui, sans-serif',
  fontWeight: 800,
  letterSpacing: '-0.04em',
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-sky)]">
      {children}
    </div>
  )
}

function DirectoryCard({
  icon: Icon,
  badge,
  headline,
  bullets,
  ctaLabel,
  href,
  trackEventName,
}: {
  icon: typeof Users
  badge: string
  headline: React.ReactNode
  bullets: string[]
  ctaLabel: string
  href: string
  trackEventName: string
}) {
  return (
    <div className="flex flex-col rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)]"
          aria-hidden
        >
          <Icon className="h-6 w-6 text-[var(--accent-sky)]" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
          <Lock className="h-3 w-3" aria-hidden />
          {badge}
        </span>
      </div>

      <h3
        className="text-[clamp(1.35rem,3.5vw,1.75rem)] leading-tight text-[var(--text-heading)]"
        style={DISPLAY_STYLE}
      >
        {headline}
      </h3>

      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--text-body)]">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-positive)]" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        onClick={() => trackEvent(trackEventName)}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-[var(--accent-sky)] px-6 py-3.5 text-sm font-bold text-[var(--accent-sky)] transition-all hover:bg-[var(--color-teal-dim)] active:scale-[0.985]"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export function DirectoriesPromoSection() {
  const { buyerTotalLabel } = useBuyerDirectoryTeaserTotal()
  const lenderTotalLabel = formatLenderDirectoryTotal()

  return (
    <section id="directories" className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="directories-heading">
      <div className="mb-10 text-center">
        <SectionEyebrow>Close Deals Faster</SectionEyebrow>
        <h2
          id="directories-heading"
          className="mx-auto mt-4 max-w-3xl text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
          style={DISPLAY_STYLE}
        >
          From analysis to execution — in one platform
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-[var(--text-secondary)]">
          Run Discovery on any deal, then connect with verified cash buyers and hard money lenders
          when you are ready to move.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DirectoryCard
          icon={Users}
          badge="Paid Pro"
          headline={
            <>
              Direct access to{' '}
              <span className="text-[var(--accent-sky)]">{buyerTotalLabel}</span> verified cash
              buyers
            </>
          }
          bullets={[
            'Fix-and-flip, BRRRR, and active investors nationwide',
            'Search by city, county, or zip — skip cold outreach',
            'Save contacts to your dashboard',
          ]}
          ctaLabel="Browse cash buyers"
          href="/directory"
          trackEventName="homepage_directory_buyers_click"
        />
        <DirectoryCard
          icon={Banknote}
          badge="Paid Pro"
          headline={
            <>
              Find <span className="text-[var(--accent-sky)]">{lenderTotalLabel}</span> hard money
              lenders fast
            </>
          }
          bullets={[
            'Fix & flip, BRRRR, bridge, DSCR, and more',
            'Filter by state and loan product',
            'Phone, email, and web contacts',
          ]}
          ctaLabel="Browse lenders"
          href="/lenders"
          trackEventName="homepage_directory_lenders_click"
        />
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-[var(--text-muted)]">
        Cash Buyer and Hard Money directories are included with{' '}
        <strong className="font-semibold text-[var(--text-secondary)]">paid Pro</strong> only. Not
        included in the 7-day trial.
      </p>
    </section>
  )
}
