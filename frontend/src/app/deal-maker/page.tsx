import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'DealMaker — Structure the Offer That Closes the Gap',
  description:
    'DealMaker is the offer-structuring workbench. Once the IQ Verdict tells you a property is off by 6%, DealMaker shows you how to close the gap with the right financing path: cash, conventional, subject-to, or seller-finance.',
  alternates: { canonical: '/deal-maker' },
  openGraph: {
    title: 'DealMaker — Structure the Offer That Closes the Gap',
    description:
      'Four closing paths, side by side. Build the offer that turns a no-deal into a deal.',
    url: '/deal-maker',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealMaker — Structure the Offer',
    description: 'Four closing paths, side by side. Turn a no-deal into a deal.',
  },
}

export default function DealMakerMarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
          &larr; Back to DealGapIQ
        </Link>

        <header className="mt-10 mb-12">
          <p className="text-sm font-semibold tracking-widest text-sky-400 uppercase">Feature</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-4 leading-tight">
            DealMaker
          </h1>
          <p className="text-xl text-slate-400 mt-4 leading-relaxed max-w-2xl">
            The Verdict tells you the gap. DealMaker tells you how to close it. Four closing paths
            laid side by side — cash, conventional, subject-to, and seller-finance — so you know
            exactly what to offer and how to structure it.
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
            <h2 className="text-2xl font-semibold text-white mb-4">The four paths</h2>
            <p className="mb-4">
              DealMaker scores the same property across four ways to close, in parallel:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Cash.</strong> The simplest math — no financing, no debt service.
                Lowest offer ceiling, highest certainty.
              </li>
              <li>
                <strong className="text-slate-200">Conventional.</strong> 25% down, 30-year fixed, today&apos;s
                investor rates. The default for most deals.
              </li>
              <li>
                <strong className="text-slate-200">Subject-to.</strong> Take title with the seller&apos;s existing
                mortgage in place. When the in-place rate is 3% and current rates are 7%, this can lift the offer
                ceiling by 15-25%.
              </li>
              <li>
                <strong className="text-slate-200">Seller-finance.</strong> The seller carries the note. When
                the seller wants tax-deferred income or has a hard time selling at price, this can be the
                offer that gets accepted.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">What DealMaker shows you</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Maximum offer per path.</strong> The highest price you can
                pay under each closing structure and still hit your target return.
              </li>
              <li>
                <strong className="text-slate-200">Side-by-side P&amp;L.</strong> Year-1 cash flow, NOI, IRR,
                cash-on-cash for each path, displayed simultaneously.
              </li>
              <li>
                <strong className="text-slate-200">Pitch script generator.</strong> For subject-to and
                seller-finance offers, DealMaker generates a script you can use with the seller — reframing the
                offer in terms of monthly income, tax treatment, and certainty of close.
              </li>
              <li>
                <strong className="text-slate-200">Sensitivity overlay.</strong> See how each path responds when
                interest rates move, rents disappoint, or the seller asks for different terms.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Where it fits</h2>
            <p>
              DealMaker is the third step in the workflow:
            </p>
            <ol className="list-decimal list-inside mt-3 space-y-1 text-slate-400">
              <li><Link href="/verdict" className="text-sky-400 hover:text-sky-300">Verdict</Link> &mdash; is this deal worth a serious look?</li>
              <li><Link href="/strategy" className="text-sky-400 hover:text-sky-300">Strategy</Link> &mdash; does it actually work financially?</li>
              <li><strong className="text-slate-200">DealMaker</strong> &mdash; what offer makes it close?</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Why creative finance matters</h2>
            <p>
              Most listings won&apos;t pencil at conventional financing in a high-rate environment. The deals
              that work today are either underpriced enough to absorb 7% rates, or structured around the
              seller&apos;s existing low-rate mortgage. DealMaker is the layer that lets you find both — and
              walk into the listing-agent conversation knowing exactly what you&apos;d offer and why.
            </p>
          </section>

          <section>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-2">DealMaker is included with Pro Investor</h3>
              <p className="text-slate-400 mb-4">
                Unlimited DealMaker scenarios, full sensitivity analysis, pitch-script generator, Excel and PDF
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
              <li><Link href="/verdict" className="text-sky-400 hover:text-sky-300">IQ Verdict</Link> &mdash; start here</li>
              <li><Link href="/strategy" className="text-sky-400 hover:text-sky-300">Strategy Analysis</Link> &mdash; financial deep-dive</li>
              <li><Link href="/glossary" className="text-sky-400 hover:text-sky-300">Glossary</Link> &mdash; subject-to, seller-finance, and other creative-finance terms</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
