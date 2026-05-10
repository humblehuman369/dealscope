import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclosures — DealGapIQ',
  description:
    'Important disclosures about DealGapIQ: not investment, legal, tax, or financial advice; data-source limitations; affiliate relationships; and jurisdiction limits.',
  alternates: { canonical: '/disclosures' },
  openGraph: {
    title: 'Disclosures — DealGapIQ',
    description:
      'Important disclosures about DealGapIQ: not investment advice, data-source limitations, and affiliate relationships.',
    type: 'article',
  },
}

export default function DisclosuresPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            &larr; Back to DealGapIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Disclosures</h1>
          <p className="text-sm text-slate-500">Last updated: May 10, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              1. Not investment, legal, tax, or financial advice
            </h2>
            <p>
              DealGapIQ provides analytical estimates and decision-support
              tools for residential real-estate investors. Outputs from the
              platform — including the IQ Verdict score, Target Buy, Income
              Value, Deal Gap, projected cash flow, and any negotiation script
              suggestions — are educational in nature and do not constitute
              investment advice, legal advice, tax advice, accounting advice,
              brokerage services, appraisal services, or a recommendation to
              buy or sell any property. Always consult a licensed attorney,
              CPA, real-estate broker, mortgage professional, and any other
              qualified advisor before making a real-estate transaction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              2. Estimates are not appraisals
            </h2>
            <p>
              The IQ Estimate, Target Buy, and Income Value figures are
              algorithmic estimates derived from third-party data and DealGapIQ
              modeling. They are not appraisals, broker price opinions, or
              comparative market analyses prepared by a licensed appraiser or
              real-estate professional, and they should not be relied on as
              such. Actual market value, rent potential, repair costs, and
              transaction costs may differ materially.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              3. Data-source limitations
            </h2>
            <p className="mb-3">
              DealGapIQ blends data from multiple third-party providers,
              including Zillow, RentCast, Redfin, Realtor.com, and Mashvisor,
              alongside our internally derived IQ Estimate. Each provider has
              its own coverage, refresh cadence, and methodology. Data may be
              stale, incomplete, or inaccurate at the time of analysis.
              DealGapIQ does not guarantee the accuracy, completeness, or
              timeliness of any data displayed.
            </p>
            <p>
              For a detailed methodology, see our{' '}
              <Link
                href="/about"
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                About page
              </Link>
              . Independently verify all material facts (price, taxes,
              condition, rent, occupancy, financing terms) before relying on
              them in a transaction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              4. Forward-looking statements
            </h2>
            <p>
              Cash-flow projections, appreciation forecasts, and 10-year
              financial projections are forward-looking and inherently
              uncertain. Actual results will differ from projections, often
              materially. Past performance of comparable properties or markets
              is not indicative of future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              5. Affiliate and partner relationships
            </h2>
            <p>
              DealGapIQ may earn referral or affiliate compensation from
              certain third-party providers linked from the platform
              (including, where applicable, lenders, insurance providers,
              service contractors, and data partners). Affiliate compensation
              never influences the IQ Verdict score or any algorithmic output.
              Where a link is affiliate-compensated, we disclose it at the
              point of recommendation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              6. Jurisdiction and licensing
            </h2>
            <p>
              DealGapIQ is offered by DealGapIQ LLC, a U.S. limited liability
              company. The platform is intended primarily for use in the
              United States. DealGapIQ is not a licensed real-estate broker,
              mortgage broker, lender, attorney, CPA, financial advisor, or
              registered investment adviser. Real-estate licensing and
              consumer-protection laws vary by state and locality; you are
              responsible for compliance with the laws of any jurisdiction in
              which you transact.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              7. Forward-looking and editorial content
            </h2>
            <p>
              Educational content (blog posts, glossary entries, strategy
              guides, negotiation scripts) reflects the views of the author at
              the time of publication. Tax laws, lending guidelines, and
              market conditions change; verify currency before acting on any
              guidance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              8. Contact
            </h2>
            <p>
              Questions about these disclosures? Contact us through the{' '}
              <Link
                href="/help"
                className="text-sky-400 hover:text-sky-300 transition-colors"
              >
                Help Center
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
