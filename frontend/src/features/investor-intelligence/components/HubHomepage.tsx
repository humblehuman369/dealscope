import Link from 'next/link'
import {
  analyzePropertyHref,
  ARTICLES,
  CAMPAIGN,
  CATEGORIES,
  CATEGORY_RESEARCH,
  DEAL_GAP_LEVERS,
  FEATURED_MARKETS,
  getFeaturedArticle,
  MARKET_PULSE,
  NEWSLETTER_TOPICS,
  PROPRIETARY_INDEXES,
} from '@/lib/investor-intelligence'
import { AnalyzePropertyLink } from './AnalyzePropertyLink'
import { categoryClass, categoryLabel } from './categoryStyle'
import { NewsletterForm } from './NewsletterForm'
import { StatusBadge } from './StatusBadge'
import { TrendingFeed } from './TrendingFeed'

export function HubHomepage() {
  const featured = getFeaturedArticle()

  return (
    <>
      <section className="ii-hero ii-section--flush">
        <div className="ii-wrap ii-hero__inner">
          <p className="ii-eyebrow">DealGapIQ Investor Intelligence</p>
          <h1>
            Understand the Market.
            <br />
            Then <em>Understand the Property.</em>
          </h1>
          <p className="ii-hero__copy">
            Real estate data is everywhere. DealGapIQ Investor Intelligence separates signal from
            noise and translates market trends into the numbers residential investors actually need
            to make acquisition decisions.
          </p>
          <div className="ii-hero__cta">
            <AnalyzePropertyLink
              className="ii-btn ii-btn--primary"
              href={analyzePropertyHref('hero')}
              placement="hero"
            >
              Analyze a Property
            </AnalyzePropertyLink>
            <Link className="ii-btn ii-btn--outline" href="#newsletter">
              Get Investor Intelligence
            </Link>
            <Link className="ii-arrowlink" href="#latest">
              Latest Intelligence
            </Link>
          </div>
        </div>
      </section>

      <section className="ii-section ii-section--tint" aria-labelledby="pulse-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Market Pulse</p>
            <h2 id="pulse-h">The Numbers Moving Residential Real Estate</h2>
            <p>Track the key market forces influencing residential investment decisions.</p>
          </div>
          <div className="ii-pulse">
            {MARKET_PULSE.map((card) => (
              <article key={card.id} className="ii-pulsecard">
                <h3>{card.title}</h3>
                <StatusBadge status={card.status} />
                <p>{card.summary}</p>
                <Link className="ii-arrowlink" href={card.href}>
                  {card.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
          <p className="ii-notefoot">
            Market data is being updated. DealGapIQ Investor Intelligence will publish verified
            figures with source and reporting date.
          </p>
        </div>
      </section>

      <section className="ii-section" aria-labelledby="featured-h">
        <div className="ii-wrap">
          <div className="ii-featured">
            <div className="ii-featured__media">
              <div className="ii-featured__plate">
                <StatusBadge status="coming-soon" label="Featured artwork in production" />
              </div>
            </div>
            <div>
              <p className="ii-eyebrow">Featured Intelligence</p>
              <Link className="ii-campaigntag" href={`/investor-intelligence/${CAMPAIGN.slug}`}>
                {CAMPAIGN.title}
              </Link>
              <h2 id="featured-h">{featured.headline}</h2>
              {featured.sections[0]?.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              {featured.sections[1]?.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
              {featured.sections[1]?.pullQuote && (
                <p className="ii-kicker">{featured.sections[1].pullQuote}</p>
              )}
              <div className="ii-featured__foot">
                <Link
                  className="ii-btn ii-btn--primary"
                  href={`/investor-intelligence/${featured.slug}`}
                >
                  Read Analysis
                </Link>
                <Link className="ii-arrowlink" href={`/investor-intelligence/${CAMPAIGN.slug}`}>
                  The Great Investor Reset series
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ii-section" aria-labelledby="trending-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Trending Now</p>
            <h2 id="trending-h">What Residential Investors Are Watching</h2>
            <p>The ten opening analyses of The Great Investor Reset — 2026.</p>
          </div>
          <div className="ii-cards">
            {ARTICLES.filter((a) => a.isTrending)
              .sort((a, b) => (a.chapter ?? 99) - (b.chapter ?? 99))
              .map((article) => (
                <article key={article.slug} className="ii-card">
                  <span className={`ii-cat ${categoryClass(article.category, article.displayCategory)}`}>
                    {categoryLabel(article.category, article.displayCategory)}
                  </span>
                  <h3>{article.headline}</h3>
                  <p>{article.summary}</p>
                  {article.sections[0]?.pullQuote && (
                    <p className="ii-q">“{article.sections[0].pullQuote}”</p>
                  )}
                  <div className="ii-card__foot">
                    <Link className="ii-soonlink" href={`/investor-intelligence/${article.slug}`}>
                      {article.status === 'published' ? 'Read Analysis' : 'Coming Soon'}
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      <section className="ii-section ii-section--tint" aria-labelledby="dg-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Deal Gap of the Week</p>
            <h2 id="dg-h">What Would Make This Property a Deal?</h2>
            <p>
              Every week, DealGapIQ Investor Intelligence will analyze a real residential investment
              property and compare the seller’s asking price with the economics supported by the
              property.
            </p>
          </div>
          <article className="ii-dgcard">
            <div className="ii-dgcard__head">
              <span className="ii-dgcard__addr">This Week’s Property</span>
              <StatusBadge status="coming-soon" label="First Property Analysis Coming Soon" large />
            </div>
            <div className="ii-emptytrack" role="presentation" />
            <div className="ii-dgladder" style={{ borderTop: 'none' }}>
              <div>
                <h3>Asking Price</h3>
                <span className="ii-slot">Coming Soon</span>
                <p className="ii-sub">What the seller wants.</p>
              </div>
              <div>
                <h3>Income Value</h3>
                <span className="ii-slot">Coming Soon</span>
                <p className="ii-sub">What the property’s income supports.</p>
              </div>
              <div>
                <h3>Target Buy</h3>
                <span className="ii-slot">Coming Soon</span>
                <p className="ii-sub">The acquisition price supported by the investor’s objectives.</p>
              </div>
              <div>
                <h3>Deal Gap</h3>
                <span className="ii-slot">Coming Soon</span>
                <p className="ii-sub">
                  The difference between the seller’s number and the number that makes the
                  investment work.
                </p>
              </div>
            </div>
            <div className="ii-dgcard__body">
              <p>
                The goal is not simply to determine whether a property is “good” or “bad.” The goal
                is to identify:
              </p>
              <h3>At what price does it become a deal?</h3>
              <p style={{ marginTop: 14 }}>Each analysis will examine whether the gap can potentially be closed through:</p>
              <ul className="ii-leverlist">
                {DEAL_GAP_LEVERS.map((lever) => (
                  <li key={lever}>{lever}</li>
                ))}
              </ul>
              <div className="ii-dgcard__cta">
                <AnalyzePropertyLink
                  className="ii-btn ii-btn--primary"
                  href={analyzePropertyHref('deal-gap-of-the-week')}
                  placement="deal-gap-of-the-week"
                >
                  Analyze Your Own Property
                </AnalyzePropertyLink>
                <Link className="ii-btn ii-btn--outline" href="#newsletter">
                  Get the first analysis
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="ii-section" aria-labelledby="cats-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Coverage</p>
            <h2 id="cats-h">What DealGapIQ Investor Intelligence Tracks</h2>
            <p>
              Eight areas of residential investment coverage. Every one of them ends at the same
              question: what does this mean for the deal?
            </p>
          </div>
          <div className="ii-catgrid">
            {CATEGORIES.map((cat) => (
              <article key={cat.id} className="ii-catblock">
                <span className={`ii-cat ${categoryClass(cat.id)}`}>{cat.label}</span>
                <h3>{cat.headline}</h3>
                <p>{cat.summary}</p>
                <ul className="ii-tracklist">
                  {cat.topics.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <div className="ii-research">
                  <strong>Latest Research</strong>
                  <ul>
                    {(CATEGORY_RESEARCH[cat.id] ?? []).map((item) => (
                      <li key={item.title}>
                        {item.slug ? (
                          <Link href={`/investor-intelligence/${item.slug}`}>{item.title}</Link>
                        ) : (
                          <span>{item.title}</span>
                        )}
                        <em>Coming Soon</em>
                      </li>
                    ))}
                  </ul>
                </div>
                <p style={{ marginTop: 16 }}>
                  <Link className="ii-arrowlink" href={`/investor-intelligence/${cat.slug}`}>
                    View {cat.navLabel}
                  </Link>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ii-section ii-section--tint" aria-labelledby="mkt-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">DealGapIQ Market Intelligence</p>
            <h2 id="mkt-h">Markets Where Investment Economics Actually Work.</h2>
            <p>
              Our objective is to move beyond generic lists of America’s “hottest” housing markets
              and identify something more useful.
            </p>
          </div>
          <div className="ii-markets">
            <div className="ii-mapshell">
              <StatusBadge status="in-development" label="Market rankings are being developed" large />
              <p>
                The interactive market map will compare residential markets on price, rent, taxes,
                insurance, vacancy, financing, yield, and deal availability.
              </p>
            </div>
            <div>
              {FEATURED_MARKETS.map((market) => (
                <article key={market.slug} className="ii-mktcard">
                  <span className="ii-lbl">Featured Market</span>
                  <h3>
                    {market.name}, {market.state}
                  </h3>
                  <StatusBadge status={market.status} label="Market Score — Analysis in Progress" />
                  <p>{market.summary}</p>
                  <p>
                    <Link className="ii-arrowlink" href={`/investor-intelligence/markets/${market.slug}`}>
                      Full Market Analysis Coming Soon
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ii-section" aria-labelledby="prop-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Proprietary Intelligence</p>
            <h2 id="prop-h">DealGapIQ Research — In Development</h2>
            <p>
              DealGapIQ Investor Intelligence is developing proprietary measures designed
              specifically for residential real estate investors.
            </p>
          </div>
          <div className="ii-indexgrid">
            {PROPRIETARY_INDEXES.map((idx) => (
              <article key={idx.id} className="ii-indexcard">
                <h3>{idx.name}</h3>
                <p>{idx.summary}</p>
                <StatusBadge status={idx.status} />
              </article>
            ))}
          </div>
          <p className="ii-notefoot">
            Each measure will publish with its full methodology. No index goes live until it is
            robust and explainable.
          </p>
        </div>
      </section>

      <TrendingFeed />

      <section className="ii-section ii-section--tint" aria-labelledby="appr-h">
        <div className="ii-wrap">
          <div className="ii-sectionhead">
            <p className="ii-eyebrow">Methodology</p>
            <h2 id="appr-h">Data First. Property Math Second. Hype Never.</h2>
            <p>
              Real estate investors are surrounded by predictions, headlines, conflicting
              statistics, and market narratives. DealGapIQ Investor Intelligence takes a different
              approach.
            </p>
          </div>
          <div className="ii-approach">
            <div>
              <h3>Start With the Data</h3>
              <p>We seek out authoritative and transparent sources.</p>
            </div>
            <div>
              <h3>Understand the Methodology</h3>
              <p>
                Different datasets can reach different conclusions because they measure different
                things. We explain those differences.
              </p>
            </div>
            <div>
              <h3>Determine the Investor Impact</h3>
              <p>Statistics matter only when they affect an investment decision.</p>
            </div>
            <div>
              <h3>Bring It Back to the Property</h3>
              <p>Whenever possible, we translate market changes into property-level economics.</p>
            </div>
          </div>
          <p className="ii-pullquote">
            Market intelligence tells you where to look. Property intelligence tells you whether to
            buy.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link className="ii-arrowlink" href="/investor-intelligence/methodology">
              Read the methodology
            </Link>
          </p>
        </div>
      </section>

      <section className="ii-section" id="newsletter" aria-labelledby="news-h">
        <div className="ii-wrap ii-newsgrid">
          <div>
            <p className="ii-eyebrow">DealGapIQ Investor Intelligence</p>
            <h2 id="news-h">Get Investor Intelligence</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
              The residential investment market changes quickly. DealGapIQ Investor Intelligence
              separates the developments that matter from the noise. Get periodic analysis covering:
            </p>
            <ul className="ii-newslist">
              {NEWSLETTER_TOPICS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <NewsletterForm placement="hub" />
        </div>
      </section>

      <section className="ii-section" aria-labelledby="close-h">
        <div className="ii-wrap">
          <h2 id="close-h" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Understand the Market.
            <br />
            Then Analyze the Property.
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '60ch', marginTop: 14 }}>
            Every residential investment ultimately comes down to the numbers.
          </p>
          <div className="ii-close4">
            <div>
              <h3>Asking Price</h3>
              <p>What the seller wants.</p>
            </div>
            <div>
              <h3>Income Value</h3>
              <p>What the property’s income supports.</p>
            </div>
            <div>
              <h3>Target Buy</h3>
              <p>The acquisition price supported by the investor’s objectives.</p>
            </div>
            <div>
              <h3>Deal Gap</h3>
              <p>The difference between the seller’s number and the number that makes the investment work.</p>
            </div>
          </div>
          <p className="ii-pullquote" style={{ marginTop: 0 }}>
            The Gap Is the Deal.
          </p>
          <p style={{ marginTop: 28 }}>
            <AnalyzePropertyLink
              className="ii-btn ii-btn--primary"
              href={analyzePropertyHref('footer-cta')}
              placement="footer-cta"
            >
              Analyze a Property
            </AnalyzePropertyLink>
          </p>
        </div>
      </section>
    </>
  )
}
