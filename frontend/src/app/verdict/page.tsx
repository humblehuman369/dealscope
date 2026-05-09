import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'IQ Verdict — Real Estate Deal Scoring',
  description:
    'The IQ Verdict scores any U.S. residential listing in seconds: Deal Gap percentage, ranked strategy recommendations across six investment paths, and the maximum offer that makes the deal pencil. Free on every property.',
  alternates: { canonical: '/verdict' },
  openGraph: {
    title: 'IQ Verdict — Real Estate Deal Scoring',
    description:
      'Score any property in seconds: Deal Gap %, ranked strategies, and the max offer that makes the deal pencil.',
    url: '/verdict',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IQ Verdict — Real Estate Deal Scoring',
    description: 'Score any property in seconds: Deal Gap %, ranked strategies, max offer.',
  },
}

export default function VerdictMarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
          &larr; Back to DealGapIQ
        </Link>

        <header className="mt-10 mb-12">
          <p className="text-sm font-semibold tracking-widest text-sky-400 uppercase">Feature</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            The IQ Verdict
          </h1>
          <p className="text-xl text-slate-400 mt-4 leading-relaxed max-w-2xl">
            Paste any U.S. residential listing. In about fifteen seconds, the IQ Verdict tells you
            whether the deal pencils, how much it&apos;s off by, and the offer that closes the gap.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
            >
              Run a Free Verdict
            </Link>
            <span className="ml-4 text-sm text-slate-500">No sign-up required for the first 3 each month.</span>
          </div>
        </header>

        <div className="space-y-12 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What the Verdict actually tells you</h2>
            <p>
              Every Verdict surfaces three things most listing sites will never show you:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">The Deal Gap.</strong> The percentage between the asking price
                and what the deal will actually support, given today&apos;s rates, rents, and operating costs.
                A Gap of &minus;6.4% means the property is asking 6.4% more than the numbers justify under
                conventional financing.
              </li>
              <li>
                <strong className="text-slate-200">Ranked strategy recommendations.</strong> The same property
                scored across six investment strategies — Long-term Rental, Short-term Rental, BRRRR, Fix &amp; Flip,
                House Hacking, and Wholesale. The Verdict tells you which path is best for this listing, and which
                ones to skip.
              </li>
              <li>
                <strong className="text-slate-200">The max offer.</strong> For each closing path (cash, conventional,
                subject-to, seller-finance), the highest price you can offer and still hit your target return.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How the score is built</h2>
            <p>
              The IQ Verdict aggregates six data sources — including IQ Estimate, RentCast, Redfin, Realtor.com,
              and Mashvisor — to triangulate value, rent, expenses, and comps. It applies investor-grade
              defaults for vacancy, operating expenses, management fees, and capital reserves, then runs the
              property through six strategy models simultaneously.
            </p>
            <p className="mt-3">
              Pro Investor users can override every assumption — vacancy, opex ratio, financing terms, target DSCR
              — and rerun in real time. Free users get the same Verdict scoring, capped at three properties per
              month.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">When you would use this</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>You&apos;re scrolling Zillow or Redfin and want to know in seconds whether a listing is
                worth a serious look.</li>
              <li>You&apos;re comparing three or four properties at once and need an apples-to-apples ranking.</li>
              <li>You&apos;ve found a deal that almost works at asking, and you want to know exactly how much
                of an offer reduction makes it work — and which closing structure unlocks it.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What the Verdict isn&apos;t</h2>
            <p>
              An appraisal, an inspection, or financial advice. The Verdict is an analytics layer that points
              you at the right deals and the right offer math — see our{' '}
              <Link href="/disclosures" className="text-sky-400 hover:text-sky-300">disclosures</Link>
              {' '}for data limitations and methodology assumptions.
            </p>
          </section>

          <section>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Try it on a real listing</h3>
              <p className="text-slate-400 mb-4">
                The first three Verdicts each month are free. No credit card.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
              >
                Run a Free Verdict
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Related</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li><Link href="/strategy" className="text-sky-400 hover:text-sky-300">Strategy Analysis</Link> — the financial deep-dive that follows the Verdict</li>
              <li><Link href="/deal-maker" className="text-sky-400 hover:text-sky-300">DealMaker</Link> — structure and refine the offer</li>
              <li><Link href="/deal-gap" className="text-sky-400 hover:text-sky-300">What is the Deal Gap?</Link> — the methodology in plain English</li>
              <li><Link href="/pricing" className="text-sky-400 hover:text-sky-300">Pricing</Link> — Starter (free) and Pro Investor</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
