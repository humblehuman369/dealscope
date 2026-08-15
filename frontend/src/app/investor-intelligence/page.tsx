import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { coverage, launchTopics, marketPulse } from '@/lib/investorIntelligence'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'DealGapIQ Investor Intelligence | Residential Real Estate Investor Research & Analysis',
  description:
    'Understand the market. Then understand the property. Residential real estate investor trends, market intelligence, financing analysis, and Deal Gap property math from DealGapIQ.',
  alternates: { canonical: '/investor-intelligence/' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'DealGapIQ Investor Intelligence',
    description: 'Understand the market. Then understand the property.',
    url: '/investor-intelligence/',
    type: 'website',
    images: [
      {
        url: '/investor-intelligence/great-investor-reset-2026.webp',
        alt: 'The Great Investor Reset 2026 — DealGapIQ Investor Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealGapIQ Investor Intelligence',
    description: 'Understand the market. Then understand the property.',
    images: ['/investor-intelligence/great-investor-reset-2026.webp'],
  },
}

const toneClasses: Record<string, string> = {
  trends: 'text-[var(--strategy-ltr)]',
  policy: 'text-[var(--status-negative)]',
  deals: 'text-[var(--status-income-value)]',
  financing: 'text-[var(--accent-sky)]',
  prices: 'text-[var(--text-secondary)]',
  multifamily: 'text-[var(--strategy-str)]',
  btr: 'text-[var(--strategy-brrrr)]',
  flipping: 'text-[var(--strategy-flip)]',
  markets: 'text-[var(--strategy-wholesale)]',
}

const indexCards = [
  ['DealGapIQ Market Score', 'A multidimensional measure of residential investment conditions.'],
  ['Deal Availability Index', 'Designed to measure how frequently listed properties approach investor-supported acquisition values.'],
  ['Investor Affordability Index', 'Designed to measure the impact of prices, financing, and operating expenses on investor purchasing power.'],
  ['Rental Opportunity Index', 'Designed to identify markets where rental economics appear comparatively attractive.'],
  ['Deal Gap Index', 'Designed to measure the difference between asking prices and DealGapIQ-supported Target Buy values across a market.'],
]

export default function InvestorIntelligenceHub() {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': 'https://dealgapiq.com/investor-intelligence/#page',
        url: 'https://dealgapiq.com/investor-intelligence/',
        name: 'DealGapIQ Investor Intelligence',
        description: 'Residential real estate research, data, analysis, and property-level investment intelligence.',
        publisher: { '@id': 'https://dealgapiq.com/#org' },
      },
      {
        '@type': 'Organization',
        '@id': 'https://dealgapiq.com/#org',
        name: 'DealGapIQ',
        url: 'https://dealgapiq.com/',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'DealGapIQ', item: 'https://dealgapiq.com/' },
          { '@type': 'ListItem', position: 2, name: 'Investor Intelligence', item: 'https://dealgapiq.com/investor-intelligence/' },
        ],
      },
    ],
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(15,164,233,0.14),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">
            DealGapIQ Investor Intelligence
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-[var(--text-heading)] sm:text-5xl lg:text-7xl">
            Understand the Market.<br />Then <span className="text-[var(--accent-sky)]">Understand the Property.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--text-secondary)]">
            Real estate data is everywhere. DealGapIQ Investor Intelligence separates signal from noise and translates market trends into the numbers residential investors actually need to make acquisition decisions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search?source=investor-intelligence&placement=hero" className="rounded-full bg-[linear-gradient(135deg,var(--accent-brand-blue),var(--accent-sky-light))] px-6 py-3 font-semibold text-white hover:no-underline hover:opacity-95">
              Analyze a Property
            </Link>
            <a href="#latest" className="rounded-full border border-[var(--accent-sky)] px-6 py-3 font-semibold text-[var(--accent-sky)] hover:bg-[rgba(15,164,233,0.08)] hover:no-underline">
              Latest Intelligence
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-16 sm:px-6" aria-labelledby="market-pulse">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Market Pulse</p>
            <h2 id="market-pulse" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">The Numbers Moving Residential Real Estate</h2>
            <p className="mt-3 text-[var(--text-secondary)]">Verified data points are shown with their source and reporting period. Measures still being built remain clearly labeled.</p>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {marketPulse.map((metric) => (
              <article key={metric.label} className="flex min-h-56 flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-label)]">{metric.label}</h3>
                <div className={`mt-3 font-mono text-2xl font-bold ${metric.value === 'Updating' ? 'text-[var(--text-label)]' : 'text-[var(--text-heading)]'}`}>{metric.value}</div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{metric.detail}</p>
                {metric.sourceHref && (
                  <a href={metric.sourceHref} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-sm font-semibold text-[var(--accent-sky)]">
                    Source: {metric.sourceLabel} →
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="featured-intelligence">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <Link href="/investor-intelligence/great-investor-reset-2026/" className="group overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
            <Image
              src="/investor-intelligence/great-investor-reset-2026.webp"
              alt="The Great Investor Reset 2026 — Wall Street pulls back while small investors keep buying."
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </Link>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Featured Intelligence</p>
            <div className="mt-3 inline-flex rounded-full border border-[var(--border-subtle)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent-sky)]">The Great Investor Reset — 2026</div>
            <h2 id="featured-intelligence" className="mt-5 text-3xl font-bold leading-tight text-[var(--text-heading)] sm:text-4xl">Wall Street Is Pulling Back. Small Investors Are Still Buying.</h2>
            <p className="mt-5 leading-relaxed text-[var(--text-secondary)]">Institutional acquisition activity has retreated sharply from pandemic-era peaks while small investors account for a growing share of investor purchases. New federal restrictions are changing the rules for large buyers—but expensive financing and rising operating costs mean opportunity still has to pencil.</p>
            <p className="mt-5 text-xl font-bold text-[var(--text-heading)]">The market is not running out of properties. It is running out of properties that pencil.</p>
            <Link href="/investor-intelligence/great-investor-reset-2026/" className="mt-7 inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent-brand-blue),var(--accent-sky-light))] px-6 py-3 font-semibold text-white hover:no-underline hover:opacity-95">
              Read the Full Analysis →
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6" aria-labelledby="trending-now">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Trending Now</p>
          <h2 id="trending-now" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">What Residential Investors Are Watching</h2>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">The opening ten analyses of The Great Investor Reset — 2026. Topic #1 is live; the remaining reports will roll out through the campaign.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {launchTopics.map((topic) => (
              <article key={topic.title} className="flex min-h-64 flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-card-hover)] hover:shadow-[var(--shadow-card-hover)]">
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${toneClasses[topic.categoryTone]}`}>{topic.category}</span>
                <h3 className="mt-3 text-xl font-bold leading-snug text-[var(--text-heading)]">{topic.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{topic.description}</p>
                <div className="mt-auto pt-5">
                  {topic.live && topic.href ? (
                    <Link href={topic.href} className="text-sm font-semibold text-[var(--accent-sky)]">Read Analysis →</Link>
                  ) : (
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Coming Soon</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-16 sm:px-6" aria-labelledby="deal-gap-week">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Deal Gap of the Week</p>
          <h2 id="deal-gap-week" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">What Would Make This Property a Deal?</h2>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">Every week, DealGapIQ Investor Intelligence will analyze a real residential investment property and compare the seller's asking price with the economics supported by the property.</p>
          <div className="mt-9 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] p-6 sm:px-8">
              <h3 className="text-2xl font-bold text-[var(--text-heading)]">First Property Analysis</h3>
              <span className="rounded-full border border-dashed border-[var(--border-default)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-label)]">Coming Soon</span>
            </div>
            <div className="grid md:grid-cols-4">
              {[
                ['Asking Price', 'What the seller wants.'],
                ['Income Value', "What the property's income supports."],
                ['Target Buy', "The acquisition price supported by the investor's objectives."],
                ['Deal Gap', 'The difference between the seller’s number and the number that makes the investment work.'],
              ].map(([label, note], index) => (
                <div key={label} className={`p-6 md:border-r md:border-[var(--border-subtle)] ${index === 3 ? 'bg-[var(--surface-elevated)] md:border-r-0' : ''}`}>
                  <h4 className={`font-mono text-[11px] uppercase tracking-[0.14em] ${index === 3 ? 'font-bold text-[var(--accent-sky)]' : 'text-[var(--text-label)]'}`}>{label}</h4>
                  <div className="mt-3 font-mono text-xl font-bold text-[var(--text-label)]">Coming Soon</div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{note}</p>
                </div>
              ))}
            </div>
            <div className="p-6 sm:p-8">
              <h3 className="text-xl font-bold text-[var(--text-heading)]">At what price does it become a deal?</h3>
              <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">We will test purchase-price negotiation, income, financing structure, equity, seller concessions, renovation, expense reduction, and alternative deal structure.</p>
              <Link href="/search?source=investor-intelligence&placement=deal-gap-of-the-week" className="mt-6 inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent-brand-blue),var(--accent-sky-light))] px-6 py-3 font-semibold text-white hover:no-underline hover:opacity-95">Analyze Your Own Property</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6" aria-labelledby="coverage">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Coverage</p>
          <h2 id="coverage" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">What DealGapIQ Investor Intelligence Tracks</h2>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">Seven areas of residential investment coverage. Every one ends at the same question: what does this mean for the deal?</p>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {coverage.map((item) => (
              <article id={item.id} key={item.id} className="scroll-mt-32 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)]">
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${toneClasses[item.tone]}`}>{item.label}</span>
                <h3 className="mt-3 text-2xl font-bold text-[var(--text-heading)]">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{item.description}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {item.tracks.map((track) => (
                    <li key={track} className="rounded border border-[var(--border-subtle)] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-label)]">{track}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="market-intelligence" className="scroll-mt-32 border-t border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-16 sm:px-6" aria-labelledby="markets">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">DealGapIQ Market Intelligence</p>
          <h2 id="markets" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">Markets Where Investment Economics Actually Work.</h2>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">The goal is to move beyond generic lists of America's “hottest” housing markets and identify something more useful: markets where price, income, operating costs, financing, and deal availability create compelling investment economics.</p>
          <div className="mt-9 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-elevated)] p-10 text-center">
              <div>
                <span className="rounded-full border border-dashed border-[var(--border-default)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-label)]">Market Rankings In Development</span>
                <p className="mx-auto mt-5 max-w-md text-sm text-[var(--text-secondary)]">The future market map will compare residential markets on price, rent, taxes, insurance, vacancy, financing, yield, and deal availability.</p>
              </div>
            </div>
            <div className="space-y-4">
              {['Memphis, Tennessee', 'Kansas City, Missouri', 'Cleveland, Ohio'].map((market) => (
                <article key={market} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-label)]">Featured Market</span>
                  <h3 className="mt-2 text-xl font-bold text-[var(--text-heading)]">{market}</h3>
                  <div className="mt-3 inline-flex rounded-full border border-dashed border-[var(--border-default)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-label)]">Market Score — Analysis in Progress</div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6" aria-labelledby="proprietary">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Proprietary Intelligence</p>
          <h2 id="proprietary" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">DealGapIQ Research — In Development</h2>
          <p className="mt-3 max-w-3xl text-[var(--text-secondary)]">Proprietary measures will publish only with a transparent methodology and enough data to make the result robust and explainable.</p>
          <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {indexCards.map(([title, text]) => (
              <article key={title} className="border-t-2 border-[var(--strategy-str)] pt-5">
                <h3 className="font-bold text-[var(--text-heading)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{text}</p>
                <span className="mt-4 inline-flex rounded-full border border-dashed border-[var(--border-default)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-label)]">In Development</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="latest" className="scroll-mt-32 border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6" aria-labelledby="latest-heading">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Latest Investor Intelligence</p>
          <h2 id="latest-heading" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">Research. Data. Analysis. Property Math.</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {launchTopics.slice(0, 6).map((topic, index) => (
              <article key={topic.title} className="grid grid-cols-[88px_1fr] gap-5 border-b border-[var(--border-subtle)] py-5">
                <div className={`overflow-hidden rounded-lg border ${index === 0 ? 'border-[var(--border-default)]' : 'border-dashed border-[var(--border-default)] bg-[var(--surface-elevated)]'}`}>
                  {index === 0 && <Image src="/investor-intelligence/great-investor-reset-2026.webp" alt="" width={88} height={88} className="h-full w-full object-cover" />}
                </div>
                <div>
                  <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${toneClasses[topic.categoryTone]}`}>{topic.category}</span>
                  <h3 className="mt-2 text-lg font-bold leading-snug text-[var(--text-heading)]">{topic.title}</h3>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{topic.description}</p>
                  <div className="mt-3">
                    {topic.live && topic.href ? <Link href={topic.href} className="text-sm font-semibold text-[var(--accent-sky)]">Read Analysis →</Link> : <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Coming Soon</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] bg-[var(--surface-section)] px-4 py-16 sm:px-6" aria-labelledby="methodology">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">Methodology</p>
          <h2 id="methodology" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">Data First. Property Math Second. Hype Never.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Start With the Data', 'Use authoritative and transparent sources whenever possible.'],
              ['Understand the Methodology', 'Explain why different datasets can reach different conclusions.'],
              ['Determine the Investor Impact', 'Translate the statistic into an actual investment decision.'],
              ['Bring It Back to the Property', 'Test market changes against property-level economics.'],
            ].map(([title, text]) => (
              <div key={title} className="border-t-2 border-[var(--accent-sky)] pt-5">
                <h3 className="font-bold text-[var(--text-heading)]">{title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-2xl font-bold leading-tight text-[var(--text-heading)] sm:text-3xl">Market intelligence tells you where to look. Property intelligence tells you whether to buy.</p>
        </div>
      </section>

      <section id="newsletter" className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6" aria-labelledby="newsletter-heading">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-sky)]">DealGapIQ Investor Intelligence</p>
            <h2 id="newsletter-heading" className="mt-3 text-3xl font-bold text-[var(--text-heading)] sm:text-4xl">Get Investor Intelligence</h2>
            <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">Investor activity, market trends, financing conditions, SFR, multifamily, build-to-rent, deal availability, market opportunities, and new DealGapIQ research.</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-card)]">
            <h3 className="text-xl font-bold text-[var(--text-heading)]">Newsletter signup is being connected.</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">We will activate email capture when the delivery workflow is connected. Until then, no email address is collected or stored from this page.</p>
            <span className="mt-5 inline-flex rounded-full border border-dashed border-[var(--border-default)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-label)]">Coming Soon</span>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="closing-cta">
        <div className="mx-auto max-w-7xl">
          <h2 id="closing-cta" className="text-3xl font-bold text-[var(--text-heading)] sm:text-4xl lg:text-5xl">Understand the Market.<br />Then Analyze the Property.</h2>
          <p className="mt-4 max-w-3xl text-[var(--text-secondary)]">Every residential investment ultimately comes down to the numbers.</p>
          <div className="mt-8 grid border-t border-[var(--border-subtle)] md:grid-cols-4">
            {[
              ['Asking Price', 'What the seller wants.'],
              ['Income Value', "What the property's income supports."],
              ['Target Buy', "The acquisition price supported by the investor's objectives."],
              ['Deal Gap', 'The difference between the seller’s number and the number that makes the investment work.'],
            ].map(([label, text]) => (
              <div key={label} className="border-b border-[var(--border-subtle)] py-6 md:border-b-0 md:border-r md:px-6 first:md:pl-0 last:md:border-r-0">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-label)]">{label}</h3>
                <p className="mt-2 text-sm text-[var(--text-body)]">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-3xl font-bold text-[var(--text-heading)]">The Gap Is the Deal.</p>
          <Link href="/search?source=investor-intelligence&placement=footer-cta" className="mt-7 inline-flex rounded-full bg-[linear-gradient(135deg,var(--accent-brand-blue),var(--accent-sky-light))] px-6 py-3 font-semibold text-white hover:no-underline hover:opacity-95">Analyze a Property</Link>
        </div>
      </section>
    </main>
  )
}
