'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HUB_NAV } from '@/lib/investor-intelligence'

export function IntelligenceNav() {
  const pathname = usePathname()

  return (
    <header className="ii-bar">
      <div className="ii-wrap ii-bar__inner">
        <Link className="ii-brandmark" href="/investor-intelligence">
          DealGap<span>IQ</span>
          <small>Investor Intelligence</small>
        </Link>
        <nav className="ii-nav" aria-label="Investor Intelligence sections">
          {HUB_NAV.map((item) => {
            const isHub = item.match === 'hub'
            const current = isHub
              ? pathname === '/investor-intelligence'
              : pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Link
          className="ii-iconbtn"
          href="/investor-intelligence#latest"
          aria-label="Search Investor Intelligence"
        >
          ⌕
        </Link>
      </div>
    </header>
  )
}

export function IntelligenceFooter() {
  return (
    <footer className="ii-foot">
      <div className="ii-wrap ii-footgrid">
        <div>
          <span className="ii-brandmark">
            DealGap<span>IQ</span>
            <small>Investor Intelligence</small>
          </span>
          <p style={{ maxWidth: '34ch', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
            Residential real estate research, data, analysis, and property-level investment
            intelligence.
          </p>
          <p className="ii-tagline">Find the gap. Find the deal.</p>
        </div>
        <nav className="ii-footnav" aria-label="Footer">
          <Link href="/investor-intelligence">Latest Intelligence</Link>
          <Link href="/investor-intelligence/investor-trends">Investor Trends</Link>
          <Link href="/investor-intelligence/finding-deals">Finding Deals</Link>
          <Link href="/investor-intelligence/financing">Financing</Link>
          <Link href="/investor-intelligence/single-family-rentals">SFR</Link>
          <Link href="/investor-intelligence/multifamily">Multifamily</Link>
          <Link href="/investor-intelligence/build-to-rent">Build-to-Rent</Link>
          <Link href="/investor-intelligence/flipping">Flipping</Link>
          <Link href="/investor-intelligence/markets">Markets</Link>
          <Link href="/investor-intelligence/methodology">Methodology</Link>
          <Link href="/authors/brad-geisen">About the Author</Link>
          <Link href="/investor-intelligence/feed">RSS</Link>
        </nav>
      </div>
      <div className="ii-wrap">
        <p className="ii-legal">
          Educational and informational only. DealGapIQ Investor Intelligence is not financial,
          legal, or tax advice. Property analysis reflects user-supplied and third-party data and
          assumptions. Verify every number independently before making an investment decision.
        </p>
      </div>
    </footer>
  )
}
