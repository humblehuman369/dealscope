'use client'

import React, { Suspense, useState } from 'react'
import { useAppSearchParams } from '@/hooks/useAppNavigation'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Banknote,
  Check,
  Clock,
  Database,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Lock,
  Users,
  X,
} from 'lucide-react'
import { DirectoriesPromoSection } from '@/components/landing/DirectoriesPromoSection'
import { useBuyerDirectoryTeaserTotal } from '@/hooks/useBuyerDirectoryTeaserTotal'
import { formatLenderDirectoryTotal } from '@/lib/directory-promo'
import { useAuthModal } from '@/hooks/useAuthModal'
import { useSession } from '@/hooks/useSession'
import { MarketingUserMenu, MarketingUserMenuMobileLinks } from '@/components/layout/MarketingUserMenu'
import { VideoModal } from '@/components/ui/VideoModal'
import { ExploreDealGapIQSection } from '@/components/seo/ExploreDealGapIQSection'
import './hero-blend.css'

interface Props {
  onPointAndScan?: () => void
}

const HEADLINE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-dm-sans), var(--font-inter), system-ui, sans-serif',
  fontWeight: 800,
  lineHeight: 1.04,
  letterSpacing: '-0.045em',
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

export function DealGapIQHomepageV4({ onPointAndScan: _onPointAndScan }: Props) {
  const router = useRouter()
  const [showDemoVideo, setShowDemoVideo] = useState(false)

  const runDiscovery = () => router.push('/search')
  const startFree = () => router.push('/register')
  const startPro = () => router.push('/register?plan=pro&billing=annual')

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-body)] antialiased">
      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      <MarketingNav onStart={runDiscovery} />

      <main>
        <HeroSection onStart={runDiscovery} onDemo={() => setShowDemoVideo(true)} />
        <QuickStatsBar />
        <TestimonialsSection />
        <DirectoriesPromoSection />
        <FeaturesSection />
        <HowItWorksSection onStart={runDiscovery} />
        <PricingSection onFree={startFree} onPro={startPro} />
        <ComparisonSection />
        <FinalCTASection onStart={runDiscovery} />
        <ExploreDealGapIQSection />
      </main>

      <SiteFooter />

      <VideoModal
        open={showDemoVideo}
        onClose={() => setShowDemoVideo(false)}
        src="/videos/what-is-dealgapiq-v3.mp4"
        title="What is DealGapIQ?"
      />
    </div>
  )
}

function MarketingNav({ onStart }: { onStart: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated } = useSession()
  const closeMobile = () => setMobileOpen(false)

  const navLinks = [
    { href: '#how-it-works', label: 'How it Works' },
    { href: '/directory', label: 'Cash Buyers' },
    { href: '/lenders', label: 'Hard Money' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--surface-base)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center text-3xl font-black tracking-[-0.05em] text-[var(--text-heading)]"
            style={DISPLAY_STYLE}
          >
            DealGap<span className="text-[var(--accent-sky)]">IQ</span>
          </Link>

          <div className="hidden items-center gap-10 text-sm md:flex">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-heading)]"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-heading)]"
                >
                  {link.label}
                </a>
              ),
            )}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <MarketingUserMenu />
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2.5 text-sm font-bold text-[var(--text-body)] transition-colors hover:text-[var(--text-heading)]"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 text-sm font-bold text-[var(--text-body)] transition-colors hover:text-[var(--text-heading)]"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {isAuthenticated ? (
            <div className="md:hidden">
              <MarketingUserMenu />
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-default)] text-[var(--text-heading)] ${isAuthenticated ? 'hidden' : 'md:hidden'}`}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <span className="text-lg font-black">=</span>}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-[var(--border-default)] pb-5 pt-4 md:hidden">
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

function HeroSection({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const [subcopyExpanded, setSubcopyExpanded] = useState(false)

  const investorPill = (
    <div className="inline-flex items-center gap-2 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)]/80 px-3 py-1 text-xs font-bold text-[var(--accent-sky)] backdrop-blur-md md:px-4 md:py-1.5 md:text-sm">
      <span className="h-2 w-2 rounded-full bg-[var(--accent-sky)] animate-pulse" />
      <span>Built by an Investor for Investors</span>
    </div>
  )

  return (
    <section className="hero-v4-blend" aria-labelledby="hero-heading">
      <div className="hero-v4-blend__canvas">
        <div className="hero-v4-blend__media">
          <Image
            src="/images/phone-house-hero.png"
            alt="DealGapIQ analyzing a residential property on a phone, with a suburban home in the background"
            fill
            priority
            sizes="100vw"
            className="hero-v4-blend__photo"
          />
          <div className="hero-v4-blend__sky-glow" aria-hidden="true" />
        </div>
        <div className="hero-v4-blend__scrim" aria-hidden="true" />
        <div className="hero-v4-blend__edge-fade" aria-hidden="true" />

        <div className="hero-v4-blend__content">
          <div className="hero-v4-blend__copy space-y-5 md:space-y-6 lg:space-y-8">
            <div className="hidden md:block">{investorPill}</div>

            <div className="hero-v4-blend__animate-in">
              <h1
                id="hero-heading"
                className="hero-v4-blend__headline text-[var(--text-heading)]"
                style={HEADLINE_STYLE}
              >
                Stop scrolling
                <br />
                listings.
                <br />
                <span className="text-[var(--accent-sky)]">
                  Start spotting real
                  <br />
                  deals.
                </span>
                <br />
                Know what to offer.
              </h1>

              <div className="mt-3 md:hidden">{investorPill}</div>

              <p className="hero-v4-blend__sub max-w-xl text-[var(--text-body)]">
                The Discovery tells you the gap.
                <br />
                We tell you how to close it.
                <span
                  className={`hero-v4-blend__sub-detail text-[var(--text-secondary)] ${
                    subcopyExpanded ? 'hero-v4-blend__sub-detail--open' : ''
                  }`}
                >
                  <br className="hidden md:block" />
                  <span className="md:inline">
                    {' '}
                    Most tools stop at the numbers. We give you four complete offer paths,
                    including creative finance structures most investors never consider.
                  </span>
                </span>
                <button
                  type="button"
                  className="hero-v4-blend__sub-read-more md:hidden"
                  aria-expanded={subcopyExpanded}
                  onClick={() => setSubcopyExpanded((open) => !open)}
                >
                  {subcopyExpanded ? 'Show less' : 'Read more'}
                </button>
              </p>
            </div>

            <div className="hero-v4-blend__cta hero-v4-blend__animate-in hero-v4-blend__animate-in--delay">
              <PrimaryButton onClick={onStart} size="md" className="hero-v4-blend__cta-primary">
                Run Free Discovery
                <Search className="h-4 w-4" />
              </PrimaryButton>
              <SecondaryButton onClick={onDemo} className="hero-v4-blend__cta-secondary">
                <Play className="h-4 w-4 fill-current" />
                Watch 60-second demo
              </SecondaryButton>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inside Pro:{' '}
              <span style={{ color: '#0EA5E9' }}>2,812+</span> verified cash buyers ·{' '}
              <span style={{ color: '#0EA5E9' }}>484+</span> hard money lenders
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function QuickStatsBar() {
  const { buyerTotalLabel } = useBuyerDirectoryTeaserTotal()
  const lenderTotalLabel = formatLenderDirectoryTotal()

  const stats = [
    { icon: Database, label: 'Data Sources', value: '6 live' },
    { icon: Clock, label: 'Avg Analysis Time', value: '15 seconds' },
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

function TestimonialsSection() {
  const testimonials = [
    {
      initials: 'MR',
      name: 'Marcus Rivera',
      role: 'BRRRR Investor - Tampa, FL - 14 deals',
      rating: 4.5,
      quote:
        'The negotiation scripts are insane. I used the seller-carry template and got a 0% 2nd on a property the listing agent said was firm. Closed 18 days later.',
    },
    {
      initials: 'PP',
      name: 'Priya Patel',
      role: 'Creative Finance Investor - Austin, TX - 7 deals',
      rating: 5,
      quote:
        'I was about to walk away from a $465k listing. DealGapIQ showed me a blended structure with rent verification + seller carry. My offer was accepted same day.',
    },
    {
      initials: 'DT',
      name: 'Derek Thompson',
      role: 'Wholesaler + Investor - Phoenix, AZ - 29 deals',
      rating: 5,
      quote:
        "Finally a tool that doesn't just tell me the numbers - it tells me what to say on the phone. I've used the scripts on 4 deals now. My win rate went from 11% to 41%.",
    },
    {
      initials: 'AK',
      name: 'Aisha Khan',
      role: 'New Investor - Orlando, FL - 3 deals',
      rating: 5,
      quote:
        'As a new investor I was terrified of creative finance. The 4-path system made it dead simple. Ran my first discovery on a Zillow lead and had a full strategy in under 2 minutes.',
    },
  ]

  return (
    <section id="trust" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-12 text-center">
        <SectionEyebrow>Real Results From Real Investors</SectionEyebrow>
        <h2
          className="mx-auto mt-4 max-w-4xl text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
          style={DISPLAY_STYLE}
        >
          &quot;DealGapIQ paid for itself on the first deal.&quot;
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-[var(--text-secondary)] md:text-xl">
          Join investors who stopped guessing and started closing.
        </p>
      </div>

      {/* TODO(brad): swap with real testimonials data */}
      <div data-fake-marker="testimonials" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.name}
            className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)]"
          >
            <StarRating rating={testimonial.rating} />
            <p className="mt-4 text-[15px] leading-snug text-[var(--text-body)]">
              &quot;{testimonial.quote}&quot;
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] text-xs font-black text-[var(--accent-sky)]">
                {testimonial.initials}
              </div>
              <div>
                <div className="font-bold text-[var(--text-heading)]">{testimonial.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{testimonial.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FeaturesSection() {
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
      id="features"
      className="border-y border-[var(--border-default)] bg-[var(--surface-section)] py-16"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-2xl">
          <SectionEyebrow>The DealGapIQ Difference</SectionEyebrow>
          <h2
            className="mt-3 text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl"
            style={DISPLAY_STYLE}
          >
            Every property can be a deal - at the right price{' '}
            <span className="italic text-[var(--accent-sky)]">or</span>{' '}
            terms.
          </h2>
          <p className="mt-4 text-lg text-[var(--text-secondary)] md:text-xl">
            We uncover the hidden value others miss and give you the exact offer structures to win
            with almost no competition. Most tools stop at the numbers. We give you four complete
            offer paths, including creative finance structures most investors never consider.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
          <div className="border-b border-[var(--border-default)] px-6 py-7 md:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="w-fit rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-1 text-xs font-black uppercase tracking-widest text-[var(--accent-sky)]">
                Example
              </span>
              <span className="font-mono text-sm uppercase text-[var(--text-muted)]">
                1014-16 N J St - Lake Worth, FL
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-baseline">
              <div>
                <span className="text-4xl font-black tabular-nums text-[var(--text-heading)] md:text-5xl">
                  $457,100
                </span>
                <span className="ml-1 text-[var(--text-muted)]">list</span>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-2xl border border-[var(--status-negative)] bg-[var(--color-red-dim)] px-4 py-1.5 text-sm font-black text-[var(--status-negative)]">
                <ShieldCheck className="h-4 w-4" />
                <span>-6.4% Deal Gap</span>
              </div>
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">
              Target buy price:{' '}
              <span className="font-bold text-[var(--text-heading)]">$428,000</span> at 20% down
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="mb-4 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
              4 Paths to Close the Gap
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
          Three clicks. One clear path forward.
        </h2>
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
            Start free. Upgrade when you are ready.
          </h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            No credit card for the free tier. Cancel Pro anytime.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-6 md:grid-cols-2">
          <PricingCard
            title="Free"
            subtitle="For serious explorers"
            price="$0"
            features={[
              '3 discoveries per month',
              'Full 4-path analysis',
              'Negotiation scripts',
              'PDF export',
            ]}
            cta="Start free - no card needed"
            onClick={onFree}
          />

          <PricingCard
            featured
            title="Pro"
            subtitle="For active deal makers"
            price="$39"
            priceSuffix="/mo"
            subprice="or $29/mo billed annually"
            features={[
              'Unlimited discoveries',
              `Cash Buyer Directory (${buyerTotalLabel} verified contacts)`,
              `Hard Money Lender Directory (${lenderTotalLabel} lenders)`,
              'Priority data sources + live MLS sync',
              'Team collaboration & shared workspaces',
              'Advanced creative finance templates',
              'Priority support + deal review calls',
            ]}
            cta="Start 7-day Pro trial - no card required"
            onClick={onPro}
            lockedFeatureIndices={[1, 2]}
          />
        </div>
        <p className="mx-auto mt-6 max-w-lg text-xs text-[var(--text-muted)]">
          Cash Buyer and Hard Money directories unlock with{' '}
          <strong className="font-semibold text-[var(--text-secondary)]">paid Pro</strong> only — not
          included in the 7-day trial.
        </p>
      </div>
    </section>
  )
}

function ComparisonSection() {
  const rows = [
    ['Multi-Source Valuation', 'X', 'Partial', 'Full (6 sources)'],
    ['Deal Gap Detection', 'X', 'X', 'Yes - with target buy price'],
    ['Pre-Built Offer Structures', 'X', 'X', '4 paths including creative'],
    ['Negotiation Scripts', 'X', 'X', 'Yes - tailored to path & seller'],
    ['Creative Finance Modeling', 'X', 'X', 'Sub2 - Seller carry - 0% 2nds'],
    ['Verified Cash Buyer Directory', 'X', 'X', 'Cash Wholesale Buyers'],
    ['Hard Money Lender Directory', 'X', 'X', 'Approved in 24 hrs'],
    ['No Signup To Try', 'Yes', 'X', 'Yes - instant'],
  ]

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-[clamp(1.75rem,5vw,3rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          Where most tools stop, DealGapIQ keeps going.
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
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
                <th className="bg-[var(--color-teal-dim)] px-6 py-5 text-center font-bold text-[var(--accent-sky)]">
                  DealGapIQ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {rows.map(([capability, listing, calc, iq]) => (
                <tr key={capability}>
                  <td className="px-8 py-5 font-semibold text-[var(--text-body)]">{capability}</td>
                  <CompareCell value={listing} />
                  <CompareCell value={calc} />
                  <td className="bg-[var(--color-teal-dim)] px-6 py-5 text-center font-bold text-[var(--accent-sky)]">
                    {iq}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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

        <h2 className="text-[clamp(2rem,5.5vw,3.25rem)] text-[var(--text-heading)] md:text-5xl" style={DISPLAY_STYLE}>
          Trust comes from seeing the logic that generates profit.
        </h2>
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
          <div className="mt-8 text-xs text-[var(--text-muted)]">
            &copy; 2026 DealGapIQ, Inc. Built by investors, for investors.
          </div>
        </div>

        <FooterColumn
          className="md:col-span-2"
          title="Product"
          links={[
            { href: '#how-it-works', label: 'How it Works' },
            { href: '/discovery', label: 'Discovery' },
            { href: '/strategy', label: 'Strategy' },
            { href: '/deal-maker', label: 'DealMaker' },
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-[var(--status-positive)]" aria-label={`${rating} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4 fill-current"
          style={{ opacity: index + 1 <= Math.floor(rating) ? 1 : 0.55 }}
        />
      ))}
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
  lockedFeatureIndices,
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
  /** Feature row indices that show a paid-only lock icon (e.g. directories). */
  lockedFeatureIndices?: number[]
  onClick: () => void
}) {
  const lockedSet = new Set(lockedFeatureIndices ?? [])
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
        {features.map((feature, index) => (
          <li key={feature} className="flex items-start gap-3">
            {lockedSet.has(index) ? (
              <Lock
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-sky)]"
                aria-hidden
              />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-positive)]" />
            )}
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

function CompareCell({ value }: { value: string }) {
  const isNo = value === 'X'
  const isPartial = value === 'Partial'

  return (
    <td
      className={`px-6 py-5 text-center ${
        isNo
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
