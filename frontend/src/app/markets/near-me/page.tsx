import type { Metadata } from 'next'
import Link from 'next/link'
import { US_STATES } from '@/lib/us-states'
import { INDEXABLE_ROBOTS, buildFaqJsonLd, type FaqItem } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { NearMeSearchButton } from '@/components/markets/NearMeSearchButton'
import { stateMapSearchHref } from '@/lib/geo/map-search-links'

const TITLE = 'Investment Properties Near Me: Search Your Local Market'
const DESCRIPTION =
  'Find investment properties near you. DealGapIQ opens a live listings map around your location, then runs each address through the local tax, vacancy, and rent assumptions to show the Deal Gap.'

export const metadata: Metadata = {
  title: `${TITLE} — DealGapIQ`,
  description: DESCRIPTION,
  alternates: { canonical: '/markets/near-me' },
  robots: INDEXABLE_ROBOTS,
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/markets/near-me', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

const FAQ: FaqItem[] = [
  {
    question: 'How does DealGapIQ find investment properties near me?',
    answer:
      'With your permission the browser shares your location once, and the map opens centred there at a neighbourhood-level zoom. Listings inside the viewport come from RentCast and Zillow. Pan, zoom, or draw an area to change the search. Your location is never stored.',
  },
  {
    question: 'What if I do not want to share my location?',
    answer:
      'Pick your state from the list on this page. Each state map opens framed on the whole state, and you can zoom into your city or type a city or ZIP into the map search box.',
  },
  {
    question: 'Are the listings for sale right now?',
    answer:
      'The map shows active listings reported by RentCast and Zillow at the time you search, cached for a short window. Select any listing to run a free DealGapIQ verdict that pulls live rent and value estimates for that address.',
  },
  {
    question: 'How do I know if a nearby listing is a good investment?',
    answer:
      'Run the free verdict. DealGapIQ applies the state assumptions for property tax, vacancy, appreciation, and rent-to-price, pulls live rent and value estimates, and shows the Deal Gap between the asking price and the price at which the property works as a rental.',
  },
]

export default function NearMePage() {
  const url = `${SITE_URL}/markets/near-me`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Markets', item: `${SITE_URL}/markets` },
          { '@type': 'ListItem', position: 3, name: 'Near me', item: url },
        ],
      },
    ],
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(FAQ)) }} />
      <div className="mx-auto max-w-4xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link href="/markets" className="hover:underline">
            Markets
          </Link>
          <span aria-hidden="true" className="mx-2">
            /
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>Near me</span>
        </nav>

        <header className="mb-12">
          <p className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-sky)' }}>
            Local search
          </p>
          <h1 className="text-3xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
            Investment properties near me
          </h1>
          <p className="mt-4 max-w-3xl text-lg" style={{ color: 'var(--text-secondary)' }}>
            {DESCRIPTION}
          </p>
          <div className="mt-6">
            <NearMeSearchButton />
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Your browser asks for permission first. The location is used once to centre the map and is not saved.
          </p>
        </header>

        <section aria-labelledby="how-heading" className="mb-12">
          <h2 id="how-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            What happens after you search
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              ['Map opens on your area', 'Active listings from RentCast and Zillow load inside the viewport. Filter by price, beds, or listing status, or draw a custom boundary.'],
              ['Pick a listing', 'One tap runs the free DealGapIQ verdict: live rent and value estimates plus the state assumptions for tax, vacancy, and appreciation.'],
              ['See the Deal Gap', 'The verdict shows the price at which the property works as a rental and how far the asking price sits from it.'],
            ].map(([heading, body], i) => (
              <li key={heading} className="rounded-xl border p-5" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
                <p className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--accent-sky)' }}>
                  Step {i + 1}
                </p>
                <h3 className="mt-2 font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {heading}
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="states-heading" className="mb-12">
          <h2 id="states-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Or search by state
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Each link opens the map framed on the state. The state name opens its investment property page.
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {US_STATES.map((s) => (
              <li key={s.code} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
                <Link href={`/markets/${s.slug}`} className="font-medium hover:underline" style={{ color: 'var(--text-heading)' }}>
                  {s.name}
                </Link>
                <Link href={stateMapSearchHref(s)} aria-label={`Open the ${s.name} map`} className="hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
                  Map →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            Common questions
          </h2>
          <dl className="mt-5 divide-y rounded-xl border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-card)' }}>
            {FAQ.map((item) => (
              <div key={item.question} className="px-5 py-4" style={{ borderColor: 'var(--border-default)' }}>
                <dt className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {item.question}
                </dt>
                <dd className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-12 text-sm">
          <Link href="/markets" className="underline underline-offset-2 hover:opacity-80" style={{ color: 'var(--accent-sky)' }}>
            ← All states
          </Link>
        </p>
      </div>
    </main>
  )
}
