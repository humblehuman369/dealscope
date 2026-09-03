import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostsByCategory } from '@/lib/content'
import { US_STATES, getStateBySlug } from '@/lib/us-states'
import {
  assumptionsInDollars,
  fetchStateMarket,
  formatDollars,
  formatPercent,
  type StateMarketDetail,
} from '@/lib/markets'
import { INDEXABLE_ROBOTS, NOINDEX_FOLLOW } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { PostCard } from '@/components/blog/PostCard'

// ISR: Next only accepts a literal here; keep in step with MARKETS_REVALIDATE_SECONDS.
export const revalidate = 86400
export const dynamicParams = false

export function generateStaticParams() {
  return US_STATES.map((s) => ({ state: s.slug }))
}

function pageTitle(name: string) {
  return `${name} Real Estate Investor Market Data: Tax, Vacancy, Lenders & Cash Buyers`
}

function pageDescription(name: string, market: StateMarketDetail | null) {
  const counts =
    market && market.indexable
      ? ` ${market.lender_count} hard money lenders and ${market.buyer_count} verified cash buyers work in ${name}.`
      : ''
  return `The property tax, vacancy, appreciation, and rent-to-price assumptions DealGapIQ applies to ${name} rental analysis.${counts}`
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: slug } = await params
  const state = getStateBySlug(slug)
  if (!state) return {}
  const market = await fetchStateMarket(state.code)
  const title = pageTitle(state.name)
  const description = pageDescription(state.name, market)
  return {
    title: `${title} — DealGapIQ`,
    description,
    alternates: { canonical: `/markets/${state.slug}` },
    robots: market?.indexable ? INDEXABLE_ROBOTS : NOINDEX_FOLLOW,
    openGraph: { title, description, url: `/markets/${state.slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function StateMarketPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params
  const state = getStateBySlug(slug)
  if (!state) notFound()

  const [market, posts] = await Promise.all([fetchStateMarket(state.code), getPostsByCategory('markets')])
  const url = `${SITE_URL}/markets/${state.slug}`
  const discoveryHref = `/discovery?utm_source=markets&utm_medium=state&utm_campaign=${state.slug}`
  const assumptions = market?.assumptions ?? null
  const example = assumptions ? assumptionsInDollars(assumptions) : null
  const showLenders = (market?.lender_count ?? 0) > 0
  const showBuyers = (market?.buyer_count ?? 0) > 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        '@id': `${url}#place`,
        name: state.name,
        address: { '@type': 'PostalAddress', addressRegion: state.code, addressCountry: 'US' },
      },
      {
        '@type': 'Dataset',
        '@id': `${url}#dataset`,
        name: `${state.name} investor market assumptions and directory counts`,
        description: pageDescription(state.name, market),
        url,
        spatialCoverage: { '@id': `${url}#place` },
        creator: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        license: `${SITE_URL}/terms`,
        isAccessibleForFree: true,
        ...(market ? { dateModified: market.generated_at } : {}),
        variableMeasured: [
          'Effective property tax rate',
          'Vacancy rate',
          'Appreciation rate',
          'Rent-to-price ratio',
          'Hard money lender count',
          'Cash buyer count',
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Markets', item: `${SITE_URL}/markets` },
          { '@type': 'ListItem', position: 3, name: state.name, item: url },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/markets" className="hover:underline">
            Markets
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{state.name}</span>
        </nav>

        <header className="mb-10">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-sky)' }}>
            {state.code} · Investor market data
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
            {state.name} real estate investor market data
          </h1>
          <p className="mt-4 max-w-3xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            {pageDescription(state.name, market)}
          </p>
        </header>

        {assumptions && example ? (
          <section aria-labelledby="assumptions-heading" className="mb-12">
            <h2 id="assumptions-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
              What DealGapIQ assumes for {state.name} properties
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {assumptions.is_state_specific
                ? `${state.name} has its own row in the DealGapIQ market table. Every input can be overridden per deal.`
                : `${state.name} currently uses the national baseline; DealGapIQ has not set state-specific overrides here. Every input can be overridden per deal.`}
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-label)' }}>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                      Assumption
                    </th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                      Rate
                    </th>
                    <th scope="col" className="px-4 py-3 font-mono text-xs uppercase tracking-wide">
                      On a {formatDollars(example.price)} property
                    </th>
                  </tr>
                </thead>
                <tbody style={{ color: 'var(--text-secondary)' }}>
                  <AssumptionRow
                    label="Effective property tax"
                    rate={formatPercent(assumptions.property_tax_rate)}
                    dollars={`${formatDollars(example.annualPropertyTax)} / year`}
                  />
                  <AssumptionRow
                    label="Rent-to-price ratio"
                    rate={formatPercent(assumptions.rent_to_price_ratio)}
                    dollars={`${formatDollars(example.grossMonthlyRent)} / month gross rent`}
                  />
                  <AssumptionRow
                    label="Vacancy"
                    rate={formatPercent(assumptions.vacancy_rate)}
                    dollars={`${formatDollars(example.annualVacancyLoss)} / year (about ${example.vacancyWeeksPerYear.toFixed(1)} weeks empty)`}
                  />
                  <AssumptionRow
                    label="Appreciation"
                    rate={formatPercent(assumptions.appreciation_rate)}
                    dollars={`${formatDollars(example.firstYearAppreciation)} in year one`}
                  />
                </tbody>
              </table>
            </div>
            <div className="mt-5 space-y-3 text-base" style={{ color: 'var(--text-secondary)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                What this means for cash flow
              </h3>
              <p>
                Property tax and vacancy come straight off the top of gross rent before the mortgage is paid. On the
                {` ${formatDollars(example.price)} `}example above, DealGapIQ starts by removing
                {` ${formatDollars(example.annualPropertyTax + example.annualVacancyLoss)} `}a year for those two lines
                alone, then layers insurance, management, maintenance, and reserves on top. A listing has to clear all
                of that and the debt service before the verdict calls it cash-flow positive.
              </p>
              <p>
                The rent-to-price ratio is only a starting point for the rent estimate. When RentCast or Zillow report a
                rent for the specific address, the verdict uses those sources instead and shows the ratio for comparison.
              </p>
            </div>
          </section>
        ) : (
          <section className="mb-12 rounded-xl border px-4 py-4 text-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}>
            Market assumptions for {state.name} are temporarily unavailable. Run a verdict on an address to see the
            live inputs for that property.
          </section>
        )}

        {(showLenders || showBuyers) && market && (
          <section aria-labelledby="directory-heading" className="mb-12">
            <h2 id="directory-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
              Who funds and buys deals in {state.name}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {showLenders && (
                <DirectoryStat
                  value={market.lender_count}
                  label={market.lender_count === 1 ? 'hard money lender' : 'hard money lenders'}
                  detail={`Active directory lenders licensed in ${state.name}, including nationwide lenders.`}
                  href={`/lenders?state=${state.code}`}
                  cta={`Browse ${state.name} lenders`}
                />
              )}
              {showBuyers && (
                <DirectoryStat
                  value={market.buyer_count}
                  label={market.buyer_count === 1 ? 'verified cash buyer' : 'verified cash buyers'}
                  detail={`Fix-and-flip, BRRRR, and buy-and-hold investors based in ${state.name}.`}
                  href={`/directory?state=${state.code}`}
                  cta={`Browse ${state.name} cash buyers`}
                />
              )}
            </div>
            {market.buyer_cities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {state.name} cities with the most cash buyers
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {market.buyer_cities.map((c) => (
                    <li
                      key={c.city}
                      className="rounded-full border px-3 py-1 text-sm"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-elevated)' }}
                    >
                      {c.city} <span style={{ color: 'var(--text-muted)' }}>· {c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {market && !market.indexable && (
          <p className="mb-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            DealGapIQ does not yet have enough {state.name}-specific directory data to publish a full market profile.
            This page shows what exists and will expand as lenders and buyers are verified.
          </p>
        )}

        <section
          className="rounded-2xl border p-6 sm:p-8"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Analyze a {state.name} address with these inputs.
          </h2>
          <p className="mt-3 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Paste a listing and the verdict applies the {state.name} assumptions, pulls live rent and value estimates,
            and shows the Deal Gap between the asking price and your target buy.
          </p>
          <Link
            href={discoveryHref}
            className="mt-6 inline-flex rounded-full px-6 py-3 font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-sky)', color: 'var(--surface-base)' }}
          >
            Run a free verdict →
          </Link>
        </section>

        {posts.length > 0 && (
          <section className="mt-16" aria-labelledby="state-posts-heading">
            <h2 id="state-posts-heading" className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
              Reading a market before you offer
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.slice(0, 3).map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 text-sm">
          <Link href="/markets" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
            ← All states
          </Link>
        </p>
      </div>
    </main>
  )
}

function AssumptionRow({ label, rate, dollars }: { label: string; rate: string; dollars: string }) {
  return (
    <tr className="border-t" style={{ borderColor: 'var(--border-default)' }}>
      <th scope="row" className="px-4 py-3 font-medium" style={{ color: 'var(--text-heading)' }}>
        {label}
      </th>
      <td className="px-4 py-3 font-mono">{rate}</td>
      <td className="px-4 py-3">{dollars}</td>
    </tr>
  )
}

function DirectoryStat({
  value,
  label,
  detail,
  href,
  cta,
}: {
  value: number
  label: string
  detail: string
  href: string
  cta: string
}) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
      <p className="text-4xl font-bold" style={{ color: 'var(--text-heading)' }}>
        {value.toLocaleString('en-US')}
      </p>
      <p className="mt-1 text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        {detail}
      </p>
      <Link href={href} className="mt-4 inline-block text-sm font-medium underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
        {cta} →
      </Link>
    </div>
  )
}
