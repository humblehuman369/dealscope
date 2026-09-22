'use client'

import React, { Suspense, useState } from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Banknote,
  Check,
  Clock,
  Database,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { DirectoriesPromoSection } from '@/components/landing/DirectoriesPromoSection'
import { GetTheAppButton } from '@/components/GetTheAppButton'
import { useBuyerDirectoryTeaserTotal } from '@/hooks/useBuyerDirectoryTeaserTotal'
import { formatLenderDirectoryTotal } from '@/lib/directory-promo'
import {
  DIRECTORY_ACCESS_NOTE,
  HOMEPAGE_FREE_FEATURES,
  homepageProFeatures,
} from '@/lib/planFeatures'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSession } from '@/hooks/useSession'
import { MarketingUserMenu, MarketingUserMenuMobileLinks } from '@/components/layout/MarketingUserMenu'
import { ExploreDealGapIQSection } from '@/components/seo/ExploreDealGapIQSection'
import { MobileStickyCta } from '@/components/landing/MobileStickyCta'
import { SocialProof } from '@/components/landing/SocialProof'
import { GUARANTEE_LINE } from '@/lib/seo/problem-pages'
import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PER_MONTH,
  SOURCE_COUNT,
  SPEED_CLAIM,
} from '@/lib/claims'
import { LEGAL_ENTITY_NAME } from '@/lib/brand'
import { STRATEGIES, WORKED_EXAMPLE } from '@/config/site'
import './hero-v5.css'
import { HomeHeroStatic } from '@/components/landing/HomeHeroStatic'
import { KeyTakeaways } from '@/components/landing/KeyTakeaways'
import { FaqSection } from '@/components/landing/FaqSection'

interface Props {
  scanQr?: React.ReactNode
}

const DISPLAY_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), var(--font-inter), system-ui, sans-serif',
  fontWeight: 800,
  letterSpacing: '-0.04em',
}

const primaryButtonClass =
  'inline-flex items-center justify-center gap-3 rounded-3xl px-8 py-4 text-base md:text-lg font-bold transition-all hover:brightness-110 active:scale-[0.985]'

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-3 rounded-3xl px-8 py-4 text-base md:text-lg font-bold transition-all active:scale-[0.985]'

function AuthParamHandler() {
  const { openAuthModal } = useAuthModal()
  const searchParams = useAppSearchParams()

  React.useEffect(() => {
    const authParam = searchParams.get('auth')
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login')
    } else if (authParam === 'register') {
      openAuthModal('register')
    }
  }, [searchParams, openAuthModal])

  return null
}

export function DealGapIQHomepageV4({ scanQr }: Props) {
  const router = useRouter()

  const runDiscovery = () => router.push('/search')
  const startFree = () => router.push('/register')
  const startPro = () => router.push('/register?plan=pro&billing=annual')

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)] antialiased">
      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      <MarketingNav onStart={runDiscovery} />

      {/*
        Section order is the answer-first GEO/AEO sequence: every H2 is a
        question and is immediately followed by a <p> that answers it.
        Exactly eleven H2s (ten sections + FAQ) — keep CTA/explore headings
        as non-H2 elements.
      */}
      <main>
        <HomeHeroStatic scanQr={scanQr} />
        <KeyTakeaways />
        <QuickStatsBar />
        <WhatIsSection />
        <DealGapSection />
        <HowItWorksSection onStart={runDiscovery} />
        <ClosePathsSection />
        <StrategiesSection />
        <ComparisonSection />
        <PricingSection onFree={startFree} onPro={startPro} />
        <HomeDataSourcesSection />
        <DirectoriesPromoSection />
        <FounderTrustSection />
        <FaqSection />
        <SocialProof compact />
        <FinalCTASection onStart={runDiscovery} />
        <ExploreDealGapIQSection />
      </main>

      <SiteFooter />

      <MobileStickyCta
        label="Run Free Discovery"
        href="/discovery?source=home_sticky"
        watchId="home-hero"
        source="home_sticky"
        sublabel={GUARANTEE_LINE}
      />
    </div>
  )
}

function MarketingNav({ onStart }: { onStart: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated } = useSession()
  const closeMobile = () => setMobileOpen(false)

  const navLinks = [
    { href: '/scan?src=header', label: 'Scan' },
    { href: '#how-it-works', label: 'How it Works' },
    { href: '/directory', label: 'Cash Buyers' },
    { href: '/lenders', label: 'Hard Money' },
    { href: '/investor-intelligence', label: 'Investor Intelligence' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <nav className="hero-v5-nav sticky top-0 z-50 bg-[var(--surface-base)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 min-[1100px]:h-20 items-center justify-between gap-3 min-[1100px]:gap-6">
          <Link
            href="/"
            className="flex shrink-0 items-center text-2xl min-[1100px]:text-3xl font-black tracking-[-0.05em] text-[var(--text-heading)]"
            style={DISPLAY_STYLE}
          >
            DealGap<span className="text-[var(--accent-sky)]">IQ</span>
          </Link>

          <div className="hidden min-[860px]:flex min-w-0 flex-1 items-center justify-center gap-3 text-[13px] min-[1100px]:gap-6 min-[1100px]:text-sm">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-heading)]"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-heading)]"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="hidden min-[860px]:flex shrink-0 items-center gap-2 min-[1100px]:gap-4">
            {isAuthenticated ? (
              <MarketingUserMenu />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-bold text-[var(--text-body)] transition-colors hover:text-[var(--text-heading)] min-[1100px]:px-5 min-[1100px]:py-2.5"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 text-sm font-bold text-[var(--text-body)] transition-colors hover:text-[var(--text-heading)] min-[1100px]:px-5 min-[1100px]:py-2.5"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="min-[860px]:hidden">
              <MarketingUserMenu />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-default)] text-[var(--text-heading)] ${isAuthenticated ? 'hidden' : 'min-[860px]:hidden'}`}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <span className="text-lg font-black">=</span>}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--border-default)] pb-5 pt-4 min-[860px]:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) =>
                link.href.startsWith('/') ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="rounded-xl px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="rounded-xl px-3 py-2 font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-heading)]"
                  >
                    {link.label}
                  </a>
                ),
              )}
              {isAuthenticated ? (
                <MarketingUserMenuMobileLinks onNavigate={closeMobile} />
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="rounded-xl px-3 py-2 text-left font-semibold text-[var(--text-body)] hover:bg-[var(--surface-elevated)]"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMobile}
                    className="rounded-xl px-3 py-2 text-left font-semibold text-[var(--text-body)] hover:bg-[var(--surface-elevated)]"
                  >
                    Register
                  </Link>
                </>
              )}
              <PrimaryButton
                onClick={() => {
                  closeMobile()
                  onStart()
                }}
              >
                Start Free Discovery
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function QuickStatsBar() {
  const { buyerTotalLabel } = useBuyerDirectoryTeaserTotal()
  const lenderTotalLabel = formatLenderDirectoryTotal()

  const stats = [
    { icon: Database, label: 'Data Sources', value: `${SOURCE_COUNT} live` },
    { icon: Clock, label: 'Avg Analysis Time', value: SPEED_CLAIM },
    { icon: Users, label: 'Cash Buyers', value: buyerTotalLabel },
    { icon: Banknote, label: 'Hard Money', value: lenderTotalLabel },
  ]

  return (
    <div className="border-y border-[var(--border-default)] bg-[var(--surface-section)] py-5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-center gap-3 text-[var(--text-heading)]"
            >
              <stat.icon className="h-5 w-5 text-[var(--accent-sky)]" />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {stat.label}
                </div>
                <div className="font-mono text-lg font-bold tracking-tight md:text-xl">
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WhatIsSection() {
  return (
    <section id="what-is-dealgapiq" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          What is DealGapIQ?
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          DealGapIQ is a web and mobile tool that turns any property address into an investor
          analysis, a target buy price, and a set of ready-to-send offers. It is made by{' '}
          {LEGAL_ENTITY_NAME} in Boca Raton, Florida, launched in beta in January 2026 and publicly in
          August 2026, and ships updates weekly.
        </p>
      </div>
    </section>
  )
}

function StrategiesSection() {
  return (
    <section
      id="strategies"
      className="border-y border-[var(--border-default)] bg-[var(--surface-section)] py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
            Which investment strategies does DealGapIQ cover?
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
            Six: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and
            wholesale. Every discovery scores the property against all six.
          </p>
        </div>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGIES.map((strategy) => (
            <li key={strategy.href}>
              <Link
                href={strategy.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] px-5 py-4 text-sm font-bold capitalize text-[var(--text-heading)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
              >
                {strategy.label}
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--accent-sky)]" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function HomeDataSourcesSection() {
  return (
    <section id="data-sources" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          Where do DealGapIQ&apos;s valuations and data come from?
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          DealGapIQ pulls valuation, listing, property detail, and comparable sales data from{' '}
          {SOURCE_COUNT} sources, including Zillow, Redfin, Realtor.com, and RentCast, and shows
          them side by side. More sources are planned. Investors can compare the valuation from each
          source and make their own market decision instead of trusting one number.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          A tight spread between sources means the market is easy to read. A wide spread tells you to
          check the comps yourself before you make an offer. Every number and every source is
          visible in the app. There are no hidden formulas.
        </p>
      </div>
    </section>
  )
}

function FounderTrustSection() {
  const builtBy = [
    { name: 'Foreclosure.com', note: "still powers BiggerPockets' foreclosure search" },
    { name: 'HomePath.com', note: 'for Fannie Mae' },
    { name: 'HomeSteps.com', note: 'for Freddie Mac' },
  ]

  return (
    <section id="trust" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-12 text-center">
        <SectionEyebrow>Who Built This</SectionEyebrow>
        <h2
          className="mx-auto mt-4 max-w-4xl text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
          style={DISPLAY_STYLE}
        >
          Who built DealGapIQ?
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          DealGapIQ was built by{' '}
          <Link href="/about" className="font-semibold text-[var(--text-heading)] underline-offset-2 hover:underline">
            Brad Geisen
          </Link>
          , who founded Foreclosure.com and whose company built HomePath.com for Fannie Mae and
          HomeSteps.com for Freddie Mac. His GSE partnerships date to a 1991 HUD pilot program.
        </p>
      </div>

      <div className="mx-auto max-w-5xl rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] md:p-10">
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
          <div>
            <p className="text-lg leading-relaxed text-[var(--text-body)] md:text-xl">
              &quot;I built the pricing tools the banks used on foreclosures. I founded
              Foreclosure.com, and my team built HomePath for Fannie Mae and HomeSteps for Freddie
              Mac. Foreclosure.com still powers BiggerPockets&apos; foreclosure search today.
              DealGapIQ is the tool I always wanted as an investor.&quot;
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Image
                src="/images/brad-geisen.png"
                alt="Brad Geisen"
                width={128}
                height={128}
                className="h-16 w-16 rounded-2xl border border-[var(--border-default)] object-cover object-top"
              />
              <div>
                <Link href="/about" className="font-bold text-[var(--text-heading)] hover:text-[var(--accent-sky)]">
                  Brad Geisen
                </Link>
                <div className="text-xs text-[var(--text-muted)]">Founder &amp; CEO, DealGapIQ</div>
                <div className="mt-0.5 text-xs font-semibold text-[var(--accent-sky)]">
                  Author of The Deal Gap
                </div>
              </div>
            </div>
            <div className="mt-8">
              <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                Built by the founder
              </div>
              <ul className="mt-3 flex flex-wrap gap-3">
                {builtBy.map((item) => (
                  <li
                    key={item.name}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1.5 text-xs font-bold text-[var(--accent-sky)]"
                  >
                    {item.name}{' '}
                    <span className="font-medium text-[var(--text-secondary)]">({item.note})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-auto flex w-[168px] shrink-0 flex-col items-center text-center md:mx-0">
            <span className="relative inline-flex">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-7 -z-10"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--accent-sky-light) 28%, transparent) 0%, transparent 70%)',
                }}
              />
              <Image
                src="/images/the-deal-gap-cover.png"
                alt="Cover of The Deal Gap by Brad Geisen"
                width={320}
                height={444}
                className="w-[148px] rounded-md border border-[var(--border-default)] md:w-[168px]"
                style={{ height: 'auto' }}
              />
            </span>
            <span className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--accent-sky)]">
              The playbook
            </span>
            <span className="mt-1 text-sm font-bold text-[var(--text-heading)]">The Deal Gap</span>
            <span className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              The method the software runs.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function DealGapSection() {
  return (
    <section
      id="deal-gap"
      className="border-y border-[var(--border-default)] bg-[var(--surface-section)] py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <SectionEyebrow>The DealGapIQ Difference</SectionEyebrow>
          <h2
            className="mt-3 text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
            style={DISPLAY_STYLE}
          >
            What is a deal gap in real estate?
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] md:text-xl">
            A deal gap is the difference between what a seller is asking and the most an investor can
            pay and still hit their return target. If a house lists at {WORKED_EXAMPLE.listPrice} and
            the numbers say an investor should pay {WORKED_EXAMPLE.targetBuy} at 20 percent down, the
            deal gap is 6.4 percent, or {WORKED_EXAMPLE.dealGapDollars}.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
          <div className="px-6 py-7 md:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="w-fit rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1 text-xs font-black uppercase tracking-widest text-[var(--accent-sky)]">
                Example
              </span>
              <span className="font-mono text-sm uppercase text-[var(--text-muted)]">
                {WORKED_EXAMPLE.address}
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-baseline">
              <div>
                <span className="text-4xl font-black tabular-nums text-[var(--text-heading)] md:text-5xl">
                  {WORKED_EXAMPLE.listPrice}
                </span>
                <span className="ml-1 text-[var(--text-muted)]">list</span>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-2xl border border-[var(--status-negative)] bg-[var(--color-red-dim)] px-4 py-1.5 text-sm font-black text-[var(--status-negative)]">
                <ShieldCheck className="h-4 w-4" />
                <span>{WORKED_EXAMPLE.dealGap} Deal Gap</span>
              </div>
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              Target buy price:{' '}
              <span className="font-bold text-[var(--text-heading)]">{WORKED_EXAMPLE.targetBuy}</span>{' '}
              at {WORKED_EXAMPLE.downPaymentPct} down
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ClosePathsSection() {
  const paths = [
    {
      num: '1',
      title: 'Income Uplift',
      body: 'Verify or raise rent to',
      value: '$3,556',
      note: 'Comp-based - No negotiation needed',
    },
    {
      num: '2',
      title: 'Realistic Ask',
      body: 'Negotiate to',
      value: '$428K',
      note: 'Best for motivated or long-DOM sellers',
    },
    {
      num: '3',
      title: 'Capital-Heavy',
      body: 'Put 31% down',
      value: '($156K)',
      note: 'When you have cash and want the asset fast',
    },
    {
      num: '4',
      title: 'Blended Creative Plan',
      body: 'Small price cut + seller carries $2,719 2nd at 0% + 0.6% rent lift',
      value: '',
      note: 'The structure no single lever could close',
      highlight: true,
    },
  ]

  return (
    <section
      id="close-the-gap"
      className="border-y border-[var(--border-default)] bg-[var(--surface-section)] py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-3xl">
          <h2
            className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
            style={DISPLAY_STYLE}
          >
            How do you close the gap between list price and target buy price?
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] md:text-xl">
            DealGapIQ gives four paths, and the fourth blends the other three.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
          <div className="p-6 md:p-8">
            <div className="mb-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
              4 Paths to Close the Gap on {WORKED_EXAMPLE.address}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {paths.map((path) => (
                <PathCard key={path.num} {...path} />
              ))}
            </div>
            <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
              Each path includes an editable strategy worksheet + ready-to-send negotiation script.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection({ onStart }: { onStart: () => void }) {
  const steps = [
    {
      num: '1',
      title: 'Search any address',
      body: 'Works on active listings, expired, or even off-market comps. No login required for first discovery.',
    },
    {
      num: '2',
      title: 'See the Deal Gap instantly',
      body: 'Multi-source valuation + our proprietary gap calculation. Know exactly how far off the listing is from a real deal.',
    },
    {
      num: '3',
      title: 'Get 4 Ways to Make the Deal Work',
      body: 'Four pre-built offers. One click opens the full negotiation script, worksheet, and talking points tailored to the seller type.',
    },
  ]

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-12 text-center">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          How does DealGapIQ analyze a deal in {SPEED_CLAIM}?
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          It runs three steps: search an address, see the deal gap, and get four offer paths. The
          whole analysis runs in under a minute.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.num} className="px-4 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-[var(--border-default)] bg-[var(--surface-elevated)] text-3xl font-black text-[var(--accent-sky)]">
              {step.num}
            </div>
            <div className="mb-2 text-xl font-bold text-[var(--text-heading)]">{step.title}</div>
            <div className="text-[15px] text-[var(--text-secondary)]">{step.body}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <SecondaryButton onClick={onStart}>
          Try it on your next lead - it is free
          <ArrowRight className="h-5 w-5 text-[var(--accent-sky)]" />
        </SecondaryButton>
      </div>
    </section>
  )
}

function PricingSection({ onFree, onPro }: { onFree: () => void; onPro: () => void }) {
  const { buyerTotalLabel } = useBuyerDirectoryTeaserTotal()
  const lenderTotalLabel = formatLenderDirectoryTotal()

  return (
    <section
      id="pricing"
      className="border-y border-[var(--border-default)] bg-[var(--surface-card)] py-14"
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="mx-auto max-w-md">
          <SectionEyebrow>Transparent Pricing</SectionEyebrow>
          <h2
            className="mt-2 text-3xl text-[var(--text-heading)] md:text-4xl"
            style={DISPLAY_STYLE}
          >
            How much does DealGapIQ cost?
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            The free plan is $0 with no credit card. Pro is {PRO_MONTHLY_PRICE} a month, or $
            {PRO_YEARLY_PER_MONTH} a month billed annually, with a 7-day trial that also needs no
            card.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
          <PricingCard
            title="Free"
            subtitle="For serious explorers"
            price="$0"
            features={HOMEPAGE_FREE_FEATURES}
            cta="Start free - no card needed"
            onClick={onFree}
          />

          <PricingCard
            featured
            title="Pro"
            subtitle="For active deal makers"
            price={PRO_MONTHLY_PRICE}
            priceSuffix="/mo"
            subprice={`or $${PRO_YEARLY_PER_MONTH}/mo billed annually`}
            features={homepageProFeatures(buyerTotalLabel, lenderTotalLabel)}
            cta="Start 7-day Pro trial - no card required"
            onClick={onPro}
          />
        </div>
        <p className="mx-auto mt-6 max-w-lg text-xs text-[var(--text-muted)]">
          <strong className="font-semibold text-[var(--text-secondary)]">
            {DIRECTORY_ACCESS_NOTE}
          </strong>
        </p>
      </div>
    </section>
  )
}

const PRICE_ROW_LABEL = 'Starting price'

function ComparisonSection() {
  const rows = [
    [
      PRICE_ROW_LABEL,
      'Free',
      'Free to ~$14/mo',
      'Subscription plus per-record fees',
      `${PRO_MONTHLY_PRICE}/mo, free tier`,
    ],
    ['Multi-Source Valuation', 'X', 'Partial', 'Partial', `Full (${SOURCE_COUNT} sources)`],
    ['Deal Gap Detection', 'X', 'X', 'X', 'Yes - with target buy price'],
    ['Pre-Built Offer Structures', 'X', 'X', 'X', '4 paths including creative'],
    ['Negotiation Scripts', 'X', 'X', 'X', 'Yes - tailored to path & seller'],
    ['Creative Finance Modeling', 'X', 'X', 'X', 'Sub2 - Seller carry - 0% 2nds'],
    ['Works Without a Mailing List', '—', '—', 'X', 'Yes - any property qualifies'],
    ['No Per-Record Fees', '—', '—', 'X', 'Yes - flat monthly price'],
    ['Tells You What to Offer', 'X', 'Partial', 'X', 'Target Buy + 4 offer paths'],
    ['Verified Cash Buyer Directory', 'X', 'X', 'Partial', 'Cash Wholesale Buyers'],
    ['Hard Money Lender Directory', 'X', 'X', 'X', 'Approved in 24 hrs'],
    ['No Signup To Try', 'Yes', 'X', 'X', 'Yes - instant'],
  ]

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          How does DealGapIQ compare with DealCheck, PropStream and DealMachine?
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl">
          DealGapIQ is the only one of the four that reports a deal gap and target buy price, and
          the only one that ships offer structures and negotiation scripts.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-section)]">
                <th className="w-1/3 px-8 py-5 text-left font-bold text-[var(--text-heading)]">
                  Capability
                </th>
                <th className="px-6 py-5 text-center font-bold text-[var(--text-muted)]">
                  Listing Sites
                </th>
                <th className="px-6 py-5 text-center font-bold text-[var(--text-muted)]">
                  Investor Calculators
                </th>
                <th className="px-6 py-5 text-center font-bold text-[var(--text-muted)]">
                  List &amp; Mail Platforms
                </th>
                <th className="bg-[var(--color-teal-dim)] px-6 py-5 text-center font-bold text-[var(--accent-sky)]">
                  DealGapIQ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {rows.map(([capability, listing, calc, listMail, iq]) => {
                const neutral = capability === PRICE_ROW_LABEL
                return (
                  <tr key={capability}>
                    <td className="px-8 py-5 font-semibold text-[var(--text-body)]">{capability}</td>
                    <CompareCell value={listing} neutral={neutral} />
                    <CompareCell value={calc} neutral={neutral} />
                    <CompareCell value={listMail} neutral={neutral} />
                    <td className="bg-[var(--color-teal-dim)] px-6 py-5 text-center font-bold text-[var(--accent-sky)]">
                      {iq}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
        Third-party prices from public review sites, September 2026; check each vendor.
      </p>
    </section>
  )
}

function FinalCTASection({ onStart }: { onStart: () => void }) {
  return (
    <section className="border-t border-[var(--border-default)] bg-[var(--surface-card)] py-16 text-center">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--border-default)] bg-[var(--surface-elevated)]">
          <ShieldCheck className="h-10 w-10 text-[var(--accent-sky)]" />
        </div>

        {/* Not an H2: the page keeps exactly eleven question headings for engines. */}
        <p className="text-[clamp(2rem,5.5vw,3.25rem)] leading-tight text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          Trust comes from seeing the logic that generates profit.
        </p>
        <p className="mx-auto mt-4 max-w-md text-lg text-[var(--text-secondary)] md:text-xl">
          Every number, every source, every script is reviewable. No black boxes.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <PrimaryButton onClick={onStart}>Run your first discovery - free</PrimaryButton>
          <Link
            href="/methodology"
            className={secondaryButtonClass}
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--text-heading)',
              background: 'transparent',
            }}
          >
            Read the full methodology
          </Link>
        </div>
        <p className="mt-6">
          <a
            href="#directories"
            className="text-sm font-semibold text-[var(--accent-sky)] transition-colors hover:brightness-110"
          >
            Explore buyer &amp; lender directories →
          </a>
        </p>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--surface-card)] py-16 text-sm">
      <div className="mx-auto grid max-w-7xl gap-y-12 px-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link
            href="/"
            className="mb-6 inline-flex text-2xl font-black tracking-[-0.05em] text-[var(--text-heading)]"
            style={DISPLAY_STYLE}
          >
            DealGap<span className="text-[var(--accent-sky)]">IQ</span>
          </Link>
          <div className="max-w-xs text-[var(--text-secondary)]">
            The only tool that turns maybe listings into signed contracts with clear offer
            structures and scripts.
          </div>
          <GetTheAppButton
            source="footer"
            label="Get the App"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--accent-sky)]"
          />
        </div>

        <FooterColumn
          className="md:col-span-2"
          title="Product"
          links={[
            { href: '#how-it-works', label: 'How it Works' },
            { href: '/discovery', label: 'Discovery' },
            { href: '/deal-maker', label: 'Deal Maker' },
            { href: '/directory', label: 'Cash Buyer Directory' },
            { href: '/lenders', label: 'Hard Money Lenders' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/what-is-dealgapiq', label: 'What is DealGapIQ?' },
          ]}
        />
        <FooterColumn
          className="md:col-span-4"
          title="Learn"
          links={[
            { href: '/methodology', label: 'Methodology' },
            { href: '/national-averages', label: 'National Benchmarks' },
            { href: '/glossary', label: 'Glossary' },
            { href: '/blog', label: 'Blog' },
            { href: '/markets', label: 'Investment Properties by State' },
            { href: '/investor-intelligence', label: 'Investor Intelligence' },
            { href: '/learn', label: 'All pages' },
            { href: '/strategies/long-term-rental', label: 'Long-Term Rental' },
            { href: '/strategies/brrrr', label: 'BRRRR' },
            { href: '/strategies/fix-flip', label: 'Fix & Flip' },
            { href: '/strategies/short-term-rental', label: 'Short-Term Rental' },
            { href: '/strategies/house-hack', label: 'House Hack' },
            { href: '/strategies/wholesale', label: 'Wholesale' },
          ]}
          twoCols
        />
        <FooterColumn
          className="md:col-span-2"
          title="Company"
          links={[
            { href: '/about', label: 'About & Mission' },
            { href: '/press', label: 'Press kit' },
            { href: '/legal', label: 'Legal entity' },
            { href: '/help', label: 'Help Center' },
            { href: '/privacy', label: 'Privacy' },
            { href: '/terms', label: 'Terms' },
          ]}
        />
      </div>
    </footer>
  )
}

function PrimaryButton({
  children,
  onClick,
  size = 'lg',
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClass =
    size === 'xs'
      ? 'px-4 py-1.5 text-xs gap-1.5'
      : size === 'sm'
        ? 'px-6 py-3 text-sm'
        : size === 'md'
          ? 'px-7 py-3.5 text-sm'
          : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${primaryButtonClass} ${sizeClass} ${className}`.trim()}
      style={{
        background: 'var(--accent-sky)',
        color: 'var(--text-inverse)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${secondaryButtonClass} ${className}`.trim()}
      style={{
        border: '1px solid var(--accent-sky)',
        color: 'var(--accent-sky)',
        background: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex rounded-full border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-sky)]">
      {children}
    </div>
  )
}

function PathCard({
  num,
  title,
  body,
  value,
  note,
  highlight,
}: {
  num: string
  title: string
  body: string
  value: string
  note: string
  highlight?: boolean
}) {
  return (
    <div
      className="relative flex gap-5 rounded-2xl border p-5 transition-all hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card)]"
      style={{
        background: highlight ? 'var(--surface-elevated)' : 'var(--surface-card)',
        borderColor: highlight ? 'var(--accent-sky)' : 'var(--border-default)',
      }}
    >
      {highlight && (
        <div
          className="absolute -right-2.5 -top-2.5 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Most Popular
        </div>
      )}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-xl font-black"
        style={{
          background: highlight ? 'var(--accent-sky)' : 'var(--surface-elevated)',
          color: highlight ? 'var(--text-inverse)' : 'var(--accent-sky)',
          borderColor: highlight ? 'var(--accent-sky)' : 'var(--border-default)',
        }}
      >
        {num}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-bold text-[var(--text-heading)]">
          {title}
          {highlight && <Sparkles className="h-4 w-4 text-[var(--accent-sky)]" />}
        </div>
        <div className="mt-1 text-sm text-[var(--text-secondary)]">
          {body}{' '}
          {value && <span className="font-mono font-bold text-[var(--text-heading)]">{value}</span>}
        </div>
        <div
          className={`mt-3 flex items-center gap-1 text-xs ${
            highlight ? 'font-bold text-[var(--status-positive)]' : 'text-[var(--status-positive)]'
          }`}
        >
          {!highlight && <Check className="h-3.5 w-3.5" />}
          <span>{note}</span>
        </div>
      </div>
    </div>
  )
}

function PricingCard({
  title,
  subtitle,
  price,
  priceSuffix,
  subprice,
  features,
  cta,
  featured,
  onClick,
}: {
  title: string
  subtitle: string
  price: string
  priceSuffix?: string
  subprice?: string
  features: string[]
  cta: string
  featured?: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-8 text-left ${featured ? 'pt-12' : ''}`}
      style={{
        background: featured ? 'var(--surface-elevated)' : 'var(--surface-card)',
        borderColor: featured ? 'var(--accent-sky)' : 'var(--border-default)',
        borderWidth: featured ? 2 : 1,
      }}
    >
      {featured && (
        <div
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black uppercase tracking-wider"
          style={{ background: 'var(--accent-sky)', color: 'var(--text-inverse)' }}
        >
          Most Popular
        </div>
      )}
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="text-2xl font-bold text-[var(--text-heading)]">{title}</div>
          <div
            className={
              featured
                ? 'text-sm font-semibold text-[var(--accent-sky)]'
                : 'text-sm text-[var(--text-muted)]'
            }
          >
            {subtitle}
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-4xl font-black text-[var(--text-heading)]">{price}</span>
          {priceSuffix && <span className="text-xs text-[var(--text-muted)]">{priceSuffix}</span>}
          {subprice && (
            <>
              <br />
              <span className="text-xs font-bold text-[var(--accent-sky)]">{subprice}</span>
            </>
          )}
        </div>
      </div>
      <ul className="mt-6 space-y-3 text-sm text-[var(--text-body)]">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-positive)]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClick}
        className="mt-8 w-full rounded-3xl py-3.5 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.985]"
        style={{
          background: featured ? 'var(--accent-sky)' : 'transparent',
          color: featured ? 'var(--text-inverse)' : 'var(--text-heading)',
          border: featured ? 'none' : '1px solid var(--border-default)',
        }}
      >
        {cta}
      </button>
      {featured && (
        <div className="mt-3 text-center text-[10px] font-bold text-[var(--accent-sky)]">
          Cancel anytime. No card required for free tier.
        </div>
      )}
    </div>
  )
}

function CompareCell({ value, neutral = false }: { value: string; neutral?: boolean }) {
  const isNo = value === 'X'
  const isPartial = value === 'Partial'
  const isNotApplicable = value === '—'

  return (
    <td
      className={`px-6 py-5 text-center ${
        neutral
          ? 'text-[var(--text-body)]'
          : isNotApplicable
          ? 'text-[var(--text-muted)]'
          : isNo
            ? 'text-[var(--status-negative)]'
            : isPartial
              ? 'text-[var(--status-warning)]'
              : 'text-[var(--status-positive)]'
      }`}
    >
      {value}
    </td>
  )
}

function FooterColumn({
  title,
  links,
  className,
  twoCols,
}: {
  title: string
  links: Array<{ href: string; label: string }>
  className?: string
  twoCols?: boolean
}) {
  return (
    <div className={className}>
      <div className="mb-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </div>
      <div
        className={`gap-y-2.5 text-[var(--text-body)] ${twoCols ? 'grid grid-cols-2 gap-x-4' : 'space-y-2.5'}`}
      >
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            className="block transition-colors hover:text-[var(--text-heading)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
