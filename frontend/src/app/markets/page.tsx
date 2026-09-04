import type { Metadata } from 'next'
import Link from 'next/link'
import { getPostsByCategory } from '@/lib/content'
import { US_STATES } from '@/lib/us-states'
import { fetchStateMarkets, type StateMarketSummary } from '@/lib/markets'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { PostCard } from '@/components/blog/PostCard'
import { UsStatesMap } from '@/components/markets/UsStatesMap'
import { BRAND_OG_IMAGE } from '@/lib/brand'

// ISR: Next only accepts a literal here; keep in step with MARKETS_REVALIDATE_SECONDS.
export const revalidate = 86400

const TITLE = 'Investment Properties by State'
const DESCRIPTION =
  'Pick a state to search investment properties on a live map and see the property tax, vacancy, appreciation, and rent-to-price assumptions DealGapIQ applies there, plus hard money lender and cash buyer counts.'

export const metadata: Metadata = {
  title: `${TITLE} — DealGapIQ`,
  description: DESCRIPTION,
  alternates: { canonical: '/markets' },
  robots: INDEXABLE_ROBOTS,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/markets', type: 'website', images: [BRAND_OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default async function MarketsHubPage() {
  const [summaries, posts] = await Promise.all([fetchStateMarkets(), getPostsByCategory('markets')])
  const byCode = new Map((summaries ?? []).map((s) => [s.code, s]))
  const states = US_STATES.map((s) => ({ ...s, market: byCode.get(s.code) ?? null }))
  const withData = states.filter((s) => s.market?.indexable)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/markets#page`,
        url: `${SITE_URL}/markets`,
        name: TITLE,
        description: DESCRIPTION,
        publisher: { '@id': `${SITE_URL}/#organization` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: withData.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/markets/${s.slug}`,
            name: `${s.name} investment properties`,
          })),
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Markets', item: `${SITE_URL}/markets` },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-sky)' }}>
            Markets
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
            {TITLE}
          </h1>
          <p className="mt-4 max-w-3xl text-lg sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
            Pick a state to open its investment property map and see the inputs every DealGapIQ verdict starts from
            there: effective property tax, vacancy, appreciation, and the rent-to-price ratio, alongside how many
            hard money lenders and verified cash buyers in our directories work in that state.
          </p>
          <p className="mt-3 max-w-3xl text-sm" style={{ color: 'var(--text-muted)' }}>
            Counts come from the DealGapIQ lender and buyer directories and refresh daily. Assumptions are the
            platform baseline an investor can override per deal; they are not appraisals or market forecasts.
          </p>
        </header>

        <section aria-labelledby="us-map-heading" className="mb-12">
          <h2 id="us-map-heading" className="sr-only">
            Select a state on the map
          </h2>
          <div className="rounded-2xl border p-3 sm:p-6" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
            <UsStatesMap entries={states.map((s) => ({ state: s, indexable: Boolean(s.market?.indexable) }))} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>Highlighted states have a full market profile. Dimmed states expand as lenders and buyers are verified.</span>
            <Link
              href="/markets/near-me"
              className="inline-flex items-center rounded-full border px-4 py-2 font-medium transition-colors hover:border-[var(--accent-sky)]"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-heading)' }}
            >
              Search investment properties near me →
            </Link>
          </div>
        </section>

        {summaries === null && (
          <p
            className="mb-8 rounded-lg border px-4 py-3 text-sm"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--surface-card)' }}
          >
            Live directory counts are temporarily unavailable. State pages still show the assumption table.
          </p>
        )}

        <section aria-labelledby="states-heading">
          <h2 id="states-heading" className="mb-4 text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            All states
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((s) => (
              <li key={s.code}>
                <StateTile name={s.name} slug={s.slug} market={s.market} />
              </li>
            ))}
          </ul>
        </section>

        {posts.length > 0 && (
          <section className="mt-16" aria-labelledby="markets-posts-heading">
            <h2 id="markets-posts-heading" className="mb-6 text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
              How to read a market before you offer
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.slice(0, 3).map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
            <p className="mt-4 text-sm">
              <Link href="/blog/category/markets" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                All market articles →
              </Link>
            </p>
          </section>
        )}

        <section
          className="mt-16 rounded-2xl border p-6 sm:p-8"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
        >
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Run a real address through these assumptions.
          </h2>
          <p className="mt-3 max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            The verdict pulls the right state row automatically, then shows the Deal Gap, target buy price, and the
            offer structures that close it.
          </p>
          <Link
            href="/discovery?utm_source=markets&utm_medium=hub&utm_campaign=markets-index"
            className="mt-6 inline-flex rounded-full px-6 py-3 font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-sky)', color: 'var(--surface-base)' }}
          >
            Run a free verdict →
          </Link>
        </section>
      </div>
    </main>
  )
}

function StateTile({ name, slug, market }: { name: string; slug: string; market: StateMarketSummary | null }) {
  return (
    <Link
      href={`/markets/${slug}`}
      className="flex h-full flex-col justify-between rounded-xl border p-4 transition-colors hover:border-[var(--accent-sky)]"
      style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}
    >
      <span className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
        {name}
      </span>
      {market ? (
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>
            {market.lender_count.toLocaleString('en-US')} {market.lender_count === 1 ? 'lender' : 'lenders'}
          </span>
          <span>
            {market.buyer_count.toLocaleString('en-US')} {market.buyer_count === 1 ? 'cash buyer' : 'cash buyers'}
          </span>
          {market.has_state_specific_assumptions && (
            <span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--accent-sky)' }}>
              State-specific assumptions
            </span>
          )}
        </span>
      ) : (
        <span className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          View assumptions
        </span>
      )}
    </Link>
  )
}
