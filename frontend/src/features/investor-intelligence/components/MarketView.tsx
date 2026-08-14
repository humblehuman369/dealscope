import Link from 'next/link'
import type { FeaturedMarket } from '@/lib/investor-intelligence'
import { analyzePropertyHref } from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'
import { NewsletterForm } from './NewsletterForm'
import { StatusBadge } from './StatusBadge'

export function MarketView({ market }: { market: FeaturedMarket }) {
  return (
    <article>
      <section className="ii-hero ii-section--flush">
        <div className="ii-wrap ii-hero__inner">
          <p className="ii-eyebrow">Featured Market</p>
          <h1>
            {market.name}, {market.state}
          </h1>
          <p className="ii-hero__copy">{market.summary}</p>
          <div className="ii-hero__cta">
            <StatusBadge status={market.status} label="DealGapIQ Market Score — Analysis in Progress" large />
          </div>
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <h2>What this market page will include</h2>
            <p>
              Full market analysis will compare acquisition price, rent, taxes, insurance, vacancy,
              financing, estimated yield, and Deal Gap — not a generic “hottest markets” ranking.
            </p>
          </div>
          <p>
            <Link className="ii-arrowlink" href="/investor-intelligence/markets">
              All market intelligence
            </Link>
          </p>
        </div>
      </section>

      <section className="ii-section ii-section--tint" id="newsletter">
        <div className="ii-wrap ii-newsgrid">
          <div>
            <p className="ii-eyebrow">{market.name}</p>
            <h2>Get notified when this market analysis publishes</h2>
          </div>
          <NewsletterForm placement={`market-${market.slug}`} />
        </div>
      </section>

      <section className="ii-section">
        <div className="ii-wrap">
          <AnalyzePropertyLink
            className="ii-btn ii-btn--primary"
            href={analyzePropertyHref(`market-${market.slug}`)}
            placement={`market-${market.slug}`}
          >
            Analyze a Property in {market.name}
          </AnalyzePropertyLink>
        </div>
      </section>
    </article>
  )
}
