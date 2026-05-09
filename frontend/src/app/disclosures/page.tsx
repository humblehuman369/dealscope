import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclosures — DealGapIQ',
  description:
    'DealGapIQ disclosures: data accuracy, source limitations, methodology assumptions, "not financial advice" disclaimer, and conflicts of interest.',
  alternates: { canonical: '/disclosures' },
  openGraph: {
    title: 'Disclosures — DealGapIQ',
    description: 'Data accuracy, methodology, and disclaimers for the DealGapIQ platform.',
    url: '/disclosures',
    type: 'website',
  },
}

export default function DisclosuresPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
            &larr; Back to DealGapIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Disclosures</h1>
          <p className="text-sm text-slate-500">Last updated: May 8, 2026</p>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Not Financial, Investment, Legal, or Tax Advice</h2>
            <p className="font-semibold text-amber-400/90">
              DealGapIQ is an analytics and education tool. It is not a financial advisor, lender, real estate broker, attorney, or tax professional.
            </p>
            <p className="mt-3">
              Verdicts, scores, projections, offer recommendations, and strategy snapshots produced by the Service are for informational and
              educational purposes only. They do not constitute a recommendation to buy, sell, finance, or invest in any specific property, and
              they should not be relied on as the sole basis for any real estate, lending, or investment decision. Consult qualified
              professionals before making any decision involving real property, financing, taxes, or insurance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Data Sources and No Warranty of Accuracy</h2>
            <p>
              DealGapIQ aggregates data from multiple third-party sources, which may include but are not limited to:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li><strong className="text-slate-300">RentCast</strong> — rental estimates, property data, and market statistics</li>
              <li><strong className="text-slate-300">Redfin</strong>, <strong className="text-slate-300">Realtor.com</strong>, <strong className="text-slate-300">Mashvisor</strong> — listing data and valuations (via marketplace gateways)</li>
              <li><strong className="text-slate-300">AXESSO</strong> — listings, valuations, and market data</li>
              <li><strong className="text-slate-300">Google Maps</strong> — geocoding and mapping</li>
              <li>Public records, MLS feeds, and other licensed data providers</li>
            </ul>
            <p className="mt-3">
              Third-party data may be incomplete, delayed, estimated, or inaccurate. DealGapIQ provides no warranty — express or implied — as
              to the accuracy, completeness, timeliness, or fitness for any particular purpose of any data, computation, or recommendation
              presented by the Service. Property characteristics, comparable sales, rental estimates, and tax records should be independently
              verified before any transaction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Methodology and Assumptions</h2>
            <p>
              DealGapIQ&apos;s Verdict, Deal Gap, Target Buy, and strategy projections are computed from default assumptions about vacancy,
              operating expenses, management fees, capital reserves, financing terms, and other variables. These defaults are designed to
              reflect typical market conditions but will not match every property, market, or investor profile.
            </p>
            <p className="mt-3">
              Pro Investor users can override these assumptions and run their own sensitivity analyses. Outputs are projections, not
              guarantees of future performance. Past comparable sales, historical rents, and forecasted appreciation are not predictive of
              future results.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Forward-Looking Information</h2>
            <p>
              Projections, forecasts, IRRs, cash-on-cash estimates, and 10-year cash flow models are forward-looking and depend on
              assumptions that may not hold. Actual returns can vary materially due to market conditions, property condition, tenant
              behavior, regulatory changes, financing availability, and other factors outside DealGapIQ&apos;s control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Affiliate Relationships and Conflicts of Interest</h2>
            <p>
              DealGapIQ may, from time to time, link to third-party services (lenders, attorneys, contractors, listing platforms). Where any
              such relationship is compensated — for example, an affiliate referral fee — we will identify the relationship at the point of
              link or in this section. As of the &ldquo;Last updated&rdquo; date above, DealGapIQ has no compensated affiliate relationships
              with any data provider, lender, broker, or service named within the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Founder and Operating Entity</h2>
            <p>
              DealGapIQ is operated by DealGapIQ LLC. The Service was founded by Brad Geisen, who is also the founder of Foreclosure.com.
              Brad Geisen has more than 35 years of leadership across real estate, asset management, and financial technology, including
              the 1991 HUD property-disposition pilot program (the first GSE outsourcing partnership in federal agency history) and 30+
              years as a trusted technology provider to Fannie Mae (HomePath.com) and Freddie Mac (HomeSteps.com).
            </p>
            <p className="mt-3">
              Notwithstanding that history, <strong className="text-slate-200">DealGapIQ LLC is a distinct legal entity</strong> from
              Foreclosure.com Inc., from any GSE, and from any of their affiliates. Data, content, and operations of the Service are not
              derived from or controlled by Foreclosure.com Inc., HUD, Fannie Mae, Freddie Mac, or any other entity referenced in
              connection with the founder&apos;s prior or ongoing work. Property data is sourced from third-party providers (see Section 2).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. No Fiduciary Duty</h2>
            <p>
              No use of the Service creates a fiduciary, advisory, or agency relationship between DealGapIQ LLC and any user. Users are
              solely responsible for their investment decisions and for engaging qualified professionals as needed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Updates to These Disclosures</h2>
            <p>
              We may update these disclosures from time to time. Material changes will be reflected in the &ldquo;Last updated&rdquo; date
              above. Continued use of the Service after an update constitutes acceptance of the revised disclosures.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Related Documents</h2>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><Link href="/terms" className="text-sky-400 hover:text-sky-300">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sky-400 hover:text-sky-300">Privacy Policy</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
