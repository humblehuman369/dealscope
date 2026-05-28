'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { formatLenderDirectoryTotal } from '@/lib/directory-promo'
import { trackEvent } from '@/lib/eventTracking'

const DISPLAY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), var(--font-inter), system-ui, sans-serif',
  fontWeight: 800,
  letterSpacing: '-0.04em',
}

const STAT_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-space-mono, "Space Mono", ui-monospace, monospace)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
}

const SKY = '#0EA5E9'

/** Product labels match pre-reduction stat scale; counts render 10% smaller. */
const CARD_LABEL_SIZE = 'clamp(2.5rem, 6vw, 3.25rem)'
const CARD_STAT_SIZE = 'clamp(2.25rem, 5.4vw, 2.925rem)'

const HOMEPAGE_BUYER_STAT = '2,900+'

function DirectoryCard({
  productLabel,
  stat,
  tagline,
  bullets,
  ctaLabel,
  href,
  trackEventName,
}: {
  productLabel: string
  stat: string
  tagline: string
  bullets: string[]
  ctaLabel: string
  href: string
  trackEventName: string
}) {
  return (
    <div
      className="flex flex-col rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)]"
      style={{ borderTopWidth: 3, borderTopColor: SKY }}
    >
      <div
        className="leading-none uppercase tracking-[0.06em]"
        style={{ ...DISPLAY_STYLE, color: SKY, fontSize: CARD_LABEL_SIZE }}
      >
        {productLabel}
      </div>

      <div
        className="mt-2 leading-none text-[var(--text-heading)]"
        style={{ ...STAT_STYLE, fontSize: CARD_STAT_SIZE }}
      >
        {stat}
      </div>

      <p
        className="mt-3 text-[clamp(1.1rem,2.8vw,1.35rem)] leading-snug text-[var(--text-heading)]"
        style={DISPLAY_STYLE}
      >
        {tagline}
      </p>

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
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-[var(--accent-sky)] px-6 py-3.5 text-sm font-bold text-[var(--surface-base)] transition-all hover:opacity-90 active:scale-[0.985]"
      >
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

export function DirectoriesPromoSection() {
  const lenderTotalLabel = formatLenderDirectoryTotal()

  return (
    <section id="directories" className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="directories-heading">
      <div className="mb-10 text-center">
        <h2
          id="directories-heading"
          className="mx-auto max-w-4xl text-[clamp(2rem,6vw,3.5rem)] leading-[1.05] text-[var(--text-heading)] md:text-6xl"
          style={DISPLAY_STYLE}
        >
          Get Funding
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--text-secondary)]">
          When your analysis pencils, reach verified investors and lenders in minutes — not weeks of
          cold outreach.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-muted)]">
          Search by market · filter by strategy · save contacts to your dashboard
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DirectoryCard
          productLabel="Cash Buyers"
          stat={HOMEPAGE_BUYER_STAT}
          tagline="Verified fix-and-flip, BRRRR, and buy-and-hold investors nationwide"
          bullets={[
            'Search by city, county, or zip',
            'Deal history where available',
            'Skip the guesswork on who actually closes',
          ]}
          ctaLabel="Browse cash buyers"
          href="/directory"
          trackEventName="homepage_directory_buyers_click"
        />
        <DirectoryCard
          productLabel="Hard Money"
          stat={lenderTotalLabel}
          tagline="Lenders for fix & flip, BRRRR, bridge, DSCR, and more"
          bullets={[
            'Filter by state and loan product',
            'Phone, email, and web contacts',
            'Fund the deal while your offer is still warm',
          ]}
          ctaLabel="Browse lenders"
          href="/lenders"
          trackEventName="homepage_directory_lenders_click"
        />
      </div>

      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Both directories are included with{' '}
          <Link
            href="/pricing"
            className="font-semibold text-[var(--accent-sky)] underline-offset-2 hover:underline"
          >
            DealGapIQ Pro
          </Link>
          {' '}— unlock when you are ready to move from analysis to a signed contract.
        </p>
      </div>
    </section>
  )
}
