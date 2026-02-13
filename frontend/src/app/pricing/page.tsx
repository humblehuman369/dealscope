'use client'

import Link from 'next/link'
import { useState } from 'react'

const CHECK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
)
const DASH = (
  <span className="block w-4 h-px bg-slate-700" />
)

interface Tier {
  name: string
  price: string
  period: string
  badge?: string
  description: string
  cta: string
  ctaStyle: 'primary' | 'outline'
  features: { label: string; included: boolean }[]
  highlight?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to evaluate deals and start investing.',
    cta: 'Get Started Free',
    ctaStyle: 'outline',
    features: [
      { label: 'Unlimited property analyses', included: true },
      { label: 'VerdictIQ scoring (0-95)', included: true },
      { label: '6 investment strategies', included: true },
      { label: 'Deal Maker (adjust terms)', included: true },
      { label: 'Mobile scanner', included: true },
      { label: 'Save up to 10 properties', included: true },
      { label: 'Basic PDF reports', included: true },
      { label: 'Search history', included: true },
      { label: 'Portfolio tracking (10 properties)', included: true },
      { label: 'Priority support', included: false },
      { label: 'Excel & CSV exports', included: false },
      { label: 'Unlimited saved properties', included: false },
      { label: 'Property comparison (side-by-side)', included: false },
      { label: 'Market-level analytics', included: false },
      { label: 'Deal alerts', included: false },
      { label: 'Team collaboration', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    badge: 'Most Popular',
    description: 'For serious investors who want deeper insights and unlimited access.',
    cta: 'Start Pro Trial',
    ctaStyle: 'primary',
    highlight: true,
    features: [
      { label: 'Unlimited property analyses', included: true },
      { label: 'VerdictIQ scoring (0-95)', included: true },
      { label: '6 investment strategies', included: true },
      { label: 'Deal Maker (adjust terms)', included: true },
      { label: 'Mobile scanner', included: true },
      { label: 'Unlimited saved properties', included: true },
      { label: 'Lender-ready PDF reports', included: true },
      { label: 'Search history', included: true },
      { label: 'Unlimited portfolio tracking', included: true },
      { label: 'Priority support', included: true },
      { label: 'Excel & CSV exports', included: true },
      { label: 'Property comparison (side-by-side)', included: true },
      { label: 'Market-level analytics', included: true },
      { label: 'Deal alerts (by market & budget)', included: true },
      { label: 'Team collaboration', included: false },
    ],
  },
  {
    name: 'Team',
    price: '$79',
    period: '/month',
    description: 'For investment teams, brokerages, and partnerships.',
    cta: 'Contact Sales',
    ctaStyle: 'outline',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Up to 5 team members', included: true },
      { label: 'Shared portfolio & properties', included: true },
      { label: 'Role-based permissions', included: true },
      { label: 'Team activity dashboard', included: true },
      { label: 'Branded PDF reports', included: true },
      { label: 'API access', included: true },
      { label: 'Dedicated support', included: true },
    ],
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-black text-slate-300" style={{ fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white no-underline" style={{ letterSpacing: '-0.02em' }}>
            Invest<span className="text-sky-400">IQ</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors no-underline"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center py-16 px-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-400 mb-3">Pricing</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3" style={{ letterSpacing: '-0.03em', lineHeight: 1.2 }}>
          Invest smarter, not harder.
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8">
          Start free. Upgrade when you need deeper insights, unlimited access, or team collaboration.
        </p>

        {/* Beta Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          Free beta — all Pro features unlocked for early users
        </div>

        {/* Annual Toggle */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: annual ? '#0ea5e9' : '#334155' }}
            aria-label="Toggle annual billing"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: annual ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-slate-500'}`}>
            Annual <span className="text-teal-400 font-bold">(-20%)</span>
          </span>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {TIERS.map((tier) => {
            const monthlyPrice = parseInt(tier.price.replace('$', ''))
            const displayPrice = annual && monthlyPrice > 0
              ? `$${Math.round(monthlyPrice * 0.8)}`
              : tier.price
            const displayPeriod = annual && monthlyPrice > 0 ? '/month, billed yearly' : tier.period

            return (
              <div
                key={tier.name}
                className="relative rounded-2xl p-6 lg:p-8 flex flex-col"
                style={{
                  background: tier.highlight ? 'rgba(14,165,233,0.06)' : 'rgba(15,23,42,0.6)',
                  border: `1px solid ${tier.highlight ? 'rgba(14,165,233,0.2)' : 'rgba(51,65,85,0.5)'}`,
                }}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500 text-white">
                    {tier.badge}
                  </span>
                )}

                <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-extrabold text-white">{displayPrice}</span>
                  <span className="text-sm text-slate-500">{displayPeriod}</span>
                </div>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">{tier.description}</p>

                {/* CTA */}
                <button
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all mb-6"
                  style={
                    tier.ctaStyle === 'primary'
                      ? { background: '#0ea5e9', color: '#fff' }
                      : { background: 'transparent', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.2)' }
                  }
                  onClick={() => {
                    if (tier.name === 'Team') {
                      window.location.href = 'mailto:sales@investiq.com?subject=InvestIQ%20Team%20Plan%20Inquiry'
                    }
                    // Stripe checkout will be wired here
                  }}
                >
                  {tier.cta}
                </button>

                {/* Features */}
                <div className="flex flex-col gap-3 flex-grow">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      {f.included ? CHECK : DASH}
                      <span className={`text-[13px] ${f.included ? 'text-slate-300' : 'text-slate-600'}`}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ Strip */}
      <section className="border-t py-16 px-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold text-white mb-2">Questions?</h2>
          <p className="text-sm text-slate-400 mb-4">
            Check our <Link href="/help" className="text-sky-400 hover:text-sky-300 underline">Help Center</Link> or{' '}
            <a href="mailto:support@investiq.com" className="text-sky-400 hover:text-sky-300 underline">email us</a>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-slate-500" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p>&copy; 2026 InvestIQ LLC. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-3">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-slate-300 transition-colors">Help</Link>
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
        </div>
      </footer>
    </div>
  )
}
