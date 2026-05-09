import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Strategy Analysis — Financial Deep-Dive for Real Estate Deals',
  description:
    'Strategy Analysis is the financial deep-dive that follows your IQ Verdict — full benchmarks, sensitivity tables, 10-year projections, and editable assumptions across six investment strategies.',
  alternates: { canonical: '/strategy' },
  openGraph: {
    title: 'Strategy Analysis — Financial Deep-Dive for Real Estate Deals',
    description:
      'Full financial breakdown, benchmarks, and sensitivity analysis across six investment strategies.',
    url: '/strategy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Analysis — Financial Deep-Dive',
    description: 'Full breakdown, benchmarks, and sensitivity analysis across six strategies.',
  },
}

export default function StrategyMarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
          &larr; Back to DealGapIQ
        </Link>

        <header className="mt-10 mb-12">
          <p className="text-sm font-semibold tracking-widest text-sky-400 uppercase">Feature</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            Strategy Analysis
          </h1>
          <p className="text-xl text-slate-400 mt-4 leading-relaxed max-w-2xl">
            The financial deep-dive that follows the IQ Verdict. Where the Verdict gives you a score,
            Strategy Analysis gives you the full P&amp;L — line by line, year by year, with every
            assumption editable.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
            >
              Start with a Free Verdict
            </Link>
          </div>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What you get</h2>
            <ul className="list-disc list-inside mt-2 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Full operating model.</strong> Year-1 cash flow, NOI, cap rate,
                cash-on-cash, IRR, DSCR, and break-even rent — for the strategy the Verdict ranked highest, and
                any of the other five you want to compare.
              </li>
              <li>
                <strong className="text-slate-200">Editable assumptions.</strong> Vacancy rate, operating expense
                ratio, property management fee, capex reserve, financing terms, exit cap, hold period — every
                input is exposed and rerunnable.
              </li>
              <li>
                <strong className="text-slate-200">Sensitivity analysis.</strong> See how the deal performs when
                rates move ±100 bps, when rents come in 5% under projection, when vacancy doubles. The numbers
                that look good at one scenario can fall apart at another.
              </li>
              <li>
                <strong className="text-slate-200">10-year projection.</strong> Cash flow, equity buildup, and
                cumulative return for the full hold, with optional refinance and disposition modeling.
              </li>
              <li>
                <strong className="text-slate-200">Excel and PDF export.</strong> The full model leaves the tool
                with you — for a lender, a partner, or your own records.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">The six strategies</h2>
            <p className="mb-4">
              Each strategy uses the same property data but applies a different financial model:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><strong className="text-slate-200">Long-term Rental (LTR)</strong> — annual lease, monthly cash flow, equity buildup</li>
              <li><strong className="text-slate-200">Short-term Rental (STR)</strong> — daily rate, occupancy, seasonality</li>
              <li><strong className="text-slate-200">BRRRR</strong> — buy, rehab, rent, refinance, repeat</li>
              <li><strong className="text-slate-200">Fix &amp; Flip</strong> — ARV, rehab budget, holding costs, sale timeline</li>
              <li><strong className="text-slate-200">House Hacking</strong> — owner-occupied with a rental component</li>
              <li><strong className="text-slate-200">Wholesale</strong> — assignment fee, contract pricing, buyer pool</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Who this is for</h2>
            <p>
              Investors who&apos;ve made it past &ldquo;does this look interesting?&rdquo; and need to answer
              &ldquo;does this actually work?&rdquo; — before writing an offer, before talking to a lender,
              before pitching a partner. Strategy Analysis is the underwriting layer.
            </p>
          </section>

          <section>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Pro Investor unlocks the full deep-dive</h3>
              <p className="text-slate-400 mb-4">
                Unlimited analyses, editable assumptions, sensitivity tables, 10-year projections, Excel and PDF
                export. $29.17/month annual. 7-day free trial, no credit card.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
              >
                See pricing
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><Link href="/verdict" className="text-sky-400 hover:text-sky-300">IQ Verdict</Link> — the 15-second deal score that comes first</li>
              <li><Link href="/deal-maker" className="text-sky-400 hover:text-sky-300">DealMaker</Link> — refine the offer structure once the deal pencils</li>
              <li><Link href="/strategies" className="text-sky-400 hover:text-sky-300">The six investment strategies</Link> — full explainer</li>
              <li><Link href="/glossary" className="text-sky-400 hover:text-sky-300">Glossary</Link> — definitions for cap rate, DSCR, NOI, and the rest</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
