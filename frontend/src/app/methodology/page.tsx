import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

export const metadata: Metadata = {
  title: 'Methodology — How DealGapIQ Calculates the Deal Gap | DealGapIQ',
  description:
    'How DealGapIQ blends six data sources into the IQ Estimate, derives Target Buy and Income Value, and computes the Deal Gap. What we model, what we deliberately do not, and our editable-assumptions philosophy.',
  alternates: { canonical: '/methodology' },
  openGraph: {
    title: 'Methodology — How DealGapIQ Calculates the Deal Gap',
    description:
      'The six data sources, the IQ Estimate, the three core metrics, and what we deliberately do not model.',
    url: '/methodology',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Methodology — How DealGapIQ Calculates the Deal Gap',
    description:
      'Six data sources, the IQ Estimate, three core metrics, and what we deliberately do not model.',
  },
}

const PAGE_URL = `${SITE_URL}/methodology`

const JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${PAGE_URL}#article`,
      headline: 'Methodology — How DealGapIQ Calculates the Deal Gap',
      description:
        'How DealGapIQ blends six data sources into the IQ Estimate, derives Target Buy and Income Value, and computes the Deal Gap.',
      url: PAGE_URL,
      mainEntityOfPage: PAGE_URL,
      author: { '@id': `${SITE_URL}/about#brad-geisen` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      datePublished: '2026-05-10',
      dateModified: '2026-05-10',
      inLanguage: 'en-US',
      about: { '@id': `${SITE_URL}/#software` },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Methodology', item: PAGE_URL },
      ],
    },
  ],
}

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />
      <article className="max-w-3xl mx-auto px-6 py-16">
        <header className="mb-12">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            &larr; Back to DealGapIQ
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mt-6 mb-3">
            How DealGapIQ Calculates the Deal Gap
          </h1>
          <p className="text-sm text-slate-500">
            By{' '}
            <Link href="/about" className="text-sky-400 hover:text-sky-300">
              Brad Geisen
            </Link>{' '}
            &middot;{' '}
            <time dateTime="2026-05-10">Last updated May 10, 2026</time>
          </p>
        </header>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <p className="text-base text-slate-300">
              Most real estate analysis tools are black boxes. You enter an
              address and get a number. We don&apos;t do that. This page
              documents how the IQ Estimate, Target Buy, Income Value, and Deal
              Gap are produced &mdash; what data feeds them, what we model, and
              what we deliberately do not.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              The three numbers DealGapIQ produces
            </h2>
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  Target Buy
                </h3>
                <p className="text-slate-400">
                  The price at which a property meets the return thresholds for
                  a given investment strategy. If you offer at or below the
                  Target Buy, the strategy pencils on the assumptions in front
                  of you. Computed independently for each of the six
                  strategies, since each strategy values the same property
                  differently.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  Income Value
                </h3>
                <p className="text-slate-400">
                  The maximum price at which the property still produces
                  positive cash flow under a given strategy. It&apos;s the
                  ceiling beyond which the deal stops covering itself, even if
                  appreciation is your thesis.
                </p>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  Deal Gap
                </h3>
                <p className="text-slate-400">
                  The percentage distance between the asking price and the
                  Target Buy. A positive Deal Gap means the asking price is
                  above what the strategy supports. A negative Deal Gap means
                  the property is already priced below your Target Buy &mdash;
                  rare, and worth a closer look.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              The data layer
            </h2>
            <p className="text-slate-400 mb-4">
              No single data source is sufficient for residential investment
              analysis. Each source has coverage gaps, refresh-cadence
              limitations, and a methodology built for a different audience.
              DealGapIQ blends multiple sources so a weakness in any one
              doesn&apos;t poison the analysis.
            </p>
            <ul className="space-y-2 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Zillow</strong> &mdash;
                listing data and Zestimate (built for homeowners, not
                investors; we use it as one input, not the answer).
              </li>
              <li>
                <strong className="text-slate-200">RentCast</strong> &mdash;
                rental comparables and short-term rental performance signals.
              </li>
              <li>
                <strong className="text-slate-200">Redfin</strong> &mdash;
                listing data and recent comparable sales.
              </li>
              <li>
                <strong className="text-slate-200">Realtor.com</strong> &mdash;
                listing data and market metrics.
              </li>
              <li>
                <strong className="text-slate-200">Mashvisor</strong> &mdash;
                investment-grade rental and STR analytics.
              </li>
              <li>
                <strong className="text-slate-200">IQ Estimate</strong> &mdash;
                our own model, blended from the above plus public records and
                tax assessor data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              The IQ Estimate
            </h2>
            <p className="text-slate-400">
              The IQ Estimate is the blended valuation we use as the starting
              point for every strategy calculation. It is not a replacement for
              an appraisal; it&apos;s a fast, multi-source consensus that gives
              you a defensible number to work from. When the underlying sources
              agree, the IQ Estimate is tight. When they disagree, the analysis
              flags the divergence so you know the data is contested before you
              act on it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Six strategies, six different valuations
            </h2>
            <p className="text-slate-400 mb-3">
              The same property is worth different amounts under different
              strategies. A house that doesn&apos;t pencil as a long-term
              rental can be a strong fix-and-flip; a house that fails as a flip
              can be a cash-flow winner with the right financing structure.
              DealGapIQ runs every property against all six strategies and
              ranks them by fit.
            </p>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>
                <Link
                  href="/strategies/long-term-rental"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Long-Term Rental
                </Link>{' '}
                &mdash; cash flow on annual leases.
              </li>
              <li>
                <Link
                  href="/strategies/short-term-rental"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Short-Term Rental
                </Link>{' '}
                &mdash; ADR, occupancy, RevPAR.
              </li>
              <li>
                <Link
                  href="/strategies/brrrr"
                  className="text-sky-400 hover:text-sky-300"
                >
                  BRRRR
                </Link>{' '}
                &mdash; ARV, refi cash-out, capital recycling.
              </li>
              <li>
                <Link
                  href="/strategies/fix-flip"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Fix &amp; Flip
                </Link>{' '}
                &mdash; MAO, rehab budget, holding costs.
              </li>
              <li>
                <Link
                  href="/strategies/house-hack"
                  className="text-sky-400 hover:text-sky-300"
                >
                  House Hack
                </Link>{' '}
                &mdash; FHA/VA financing, rent offsets, owner-occupant rules.
              </li>
              <li>
                <Link
                  href="/strategies/wholesale"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Wholesale
                </Link>{' '}
                &mdash; assignment-fee math from the buyer&apos;s MAO.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Editable assumptions
            </h2>
            <p className="text-slate-400">
              Every assumption that drives the math is editable in DealMaker:
              down payment, interest rate, loan term, property taxes,
              insurance, vacancy, management fees, repairs, capex reserve,
              rehab budget, exit costs. Defaults are conservative. Sensitivity
              analysis lets you see how Discovery shifts when an assumption
              changes &mdash; so you can stress-test the deal before you
              stress-test it with real money.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Creative finance
            </h2>
            <p className="text-slate-400">
              Subject-To, seller carrybacks, 0% seconds, the Morby Method, and
              loan assumptions are first-class structures in DealMaker. Plug in
              the seller&apos;s loan balance and rate and the math runs against
              the actual capital stack &mdash; not just &ldquo;20% down,
              today&apos;s rate.&rdquo; Worked examples and risks are in the{' '}
              <Link
                href="/glossary/subject-to-financing"
                className="text-sky-400 hover:text-sky-300"
              >
                glossary
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              What we deliberately do not model
            </h2>
            <ul className="space-y-2 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Appreciation forecasts.</strong>{' '}
                We do not project a specific price growth rate. Long-horizon
                appreciation is too sensitive to macro conditions, local
                supply, and policy to be useful in a per-deal Discovery. You can
                model your own appreciation assumption in DealMaker for the
                10-year projection.
              </li>
              <li>
                <strong className="text-slate-200">Tax strategy.</strong>{' '}
                Depreciation, 1031 exchanges, cost segregation, opportunity
                zone treatment &mdash; all out of scope. Your CPA owns this;
                we don&apos;t want to give you a number that depends on
                personal tax facts we can&apos;t see.
              </li>
              <li>
                <strong className="text-slate-200">Macro market timing.</strong>{' '}
                We score the deal in front of you, not the cycle around it.
              </li>
              <li>
                <strong className="text-slate-200">Insurance specifics.</strong>{' '}
                We use category-typical insurance estimates. Specialty coverage
                (flood, wind, earthquake, vacant-property policies) requires a
                quote &mdash; the platform&apos;s estimate is a placeholder,
                not a binder.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Editorial principles
            </h2>
            <ul className="space-y-2 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Numbers over narratives.</strong>{' '}
                Listing copy is written to sell. Discovery is written to
                inform.
              </li>
              <li>
                <strong className="text-slate-200">Transparent assumptions.</strong>{' '}
                Every input is visible and editable. We don&apos;t hide
                methodology behind a paywall or a marketing wrapper.
              </li>
              <li>
                <strong className="text-slate-200">
                  Conservative defaults.
                </strong>{' '}
                When in doubt, the default assumption is the one that makes
                the deal look worse. You should be the one talking yourself
                into a deal &mdash; not us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Important disclosure
            </h2>
            <p className="text-slate-400">
              DealGapIQ provides analytical estimates and decision-support
              tools. Outputs are educational and do not constitute investment,
              legal, tax, or financial advice. Estimates are not appraisals.
              See the full{' '}
              <Link
                href="/disclosures"
                className="text-sky-400 hover:text-sky-300"
              >
                disclosures
              </Link>{' '}
              for data-source limitations, jurisdiction notes, and affiliate
              relationships.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">
              Changelog
            </h2>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>
                <strong className="text-slate-200">2026-05-10</strong> &mdash;
                Initial public methodology document.
              </li>
            </ul>
          </section>
        </div>

        <div
          className="mt-16 pt-8"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-90 bg-sky-500 text-slate-950"
          >
            Run a free Discovery on any property &rarr;
          </Link>
        </div>
      </article>
    </main>
  )
}
