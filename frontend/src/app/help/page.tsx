import type { Metadata } from 'next'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is DealGapIQ?',
    answer:
      "DealGapIQ is a real estate investment analysis platform that evaluates properties across 6 investment strategies — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. It gives you a Discovery score (0-95) that tells you whether a deal is worth pursuing, plus a full financial breakdown so you can see exactly what you'd pay and what you'd earn.",
  },
  {
    category: 'Getting Started',
    question: 'How do I analyze a property?',
    answer:
      'On the web, click "Analyze a Property" on the homepage and enter an address. On mobile, you can either enter an address or point your phone\'s camera at any property to scan it. DealGapIQ will pull real market data and run a full financial analysis in about 60 seconds.',
  },
  {
    category: 'Getting Started',
    question: 'Do I need an account to use DealGapIQ?',
    answer:
      'No — you can analyze properties without an account. However, creating a free account lets you save properties, build a portfolio, track your search history, and customize your default investment assumptions.',
  },
  {
    category: 'Getting Started',
    question: 'Is DealGapIQ free?',
    answer:
      "Yes. DealGapIQ is currently in free beta. All features — including unlimited analyses, PDF reports, and portfolio tracking — are free during the beta period. We'll announce paid tiers before they launch, and beta users will get early-access pricing.",
  },
  {
    category: 'Analysis & Scoring',
    question: 'What is the Discovery score?',
    answer:
      "The Discovery score (0-95) is a composite rating that evaluates a property's investment potential. It factors in cash flow potential, price-to-value opportunity, market conditions, and risk. A score above 65 is generally a strong deal worth deeper analysis; 40-65 needs a closer look; below 40 doesn't work at the asking price.",
  },
  {
    category: 'Analysis & Scoring',
    question: 'Where does DealGapIQ get its data?',
    answer:
      'DealGapIQ pulls from multiple data sources including public property records, MLS listings, tax assessor data, rental market comps, short-term rental platforms, and comparable sales. We combine these sources to give you the most accurate picture possible.',
  },
  {
    category: 'Analysis & Scoring',
    question: 'Can I adjust the assumptions (down payment, rate, etc.)?',
    answer:
      'Yes. After running an analysis, use the "Change Terms" button to open the Deal Maker. You can adjust down payment percentage, interest rate, loan term, property taxes, insurance, management fees, vacancy rate, and more. The analysis recalculates instantly.',
  },
  {
    category: 'Analysis & Scoring',
    question: 'What are the 6 investment strategies?',
    answer:
      'DealGapIQ analyzes every property across: (1) Long-Term Rental — buy and hold with annual leases, (2) Short-Term Rental — Airbnb/VRBO style income, (3) BRRRR — Buy, Rehab, Rent, Refinance, Repeat, (4) Fix & Flip — buy, renovate, sell for profit, (5) House Hack — live in part, rent the rest, (6) Wholesale — contract and assign for a fee. Each strategy uses different financial models and metrics.',
  },
  {
    category: 'Reports & Export',
    question: 'Can I export a PDF report?',
    answer:
      'Yes. On Discovery, tap "Download PDF" in the action row. On Strategy, tap "Full Report" below Next Steps. Both open a lender-ready print view — use your browser Print dialog and choose Save as PDF. Pro subscription required.',
  },
  {
    category: 'Reports & Export',
    question: 'Can I export to Excel?',
    answer:
      'Yes. On Discovery or Strategy, tap "Download Excel" to get the full proforma workbook — inputs, calculations, and projections. Useful for custom modeling or sharing with partners. Pro subscription required.',
  },
  {
    category: 'Mobile App',
    question: 'How does the property scanner work?',
    answer:
      "The mobile scanner uses your phone's GPS and compass to identify the property you're pointing at. It searches parcel data in the direction you're facing and returns matching properties. If multiple properties are nearby, you'll see a disambiguation screen to confirm the right one.",
  },
  {
    category: 'Mobile App',
    question: 'Why is the scanner showing the wrong property?',
    answer:
      'GPS and compass accuracy can vary. Try: (1) Make sure you\'re standing close to the property, (2) Hold your phone steady and point directly at the building, (3) Adjust the distance slider if the property is further/closer than the default range. If it still picks the wrong one, tap "Not the right property?" to see all nearby candidates.',
  },
  {
    category: 'Account & Data',
    question: 'How do I save a property to my portfolio?',
    answer:
      'After running an analysis, tap/click the "Save" button on the Discovery screen or the "Save to Portfolio" option on the Strategy screen. The property will appear in your Portfolio tab with all the analysis data pre-filled.',
  },
  {
    category: 'Account & Data',
    question: 'Is my data secure?',
    answer:
      'Yes. We use industry-standard encryption for data in transit (TLS 1.3) and at rest. We never sell your personal information or property data. See our Privacy Policy for complete details.',
  },
  {
    category: 'Account & Data',
    question: 'How do I delete my account?',
    answer:
      'Go to Settings → Account → Delete Account. This permanently removes all your data including saved properties, search history, and profile information. This action cannot be undone.',
  },
]

const CATEGORIES = Array.from(new Set(FAQ_DATA.map((f) => f.category)))

export const metadata: Metadata = {
  title: 'Help Center — DealGapIQ',
  description:
    'Answers to common DealGapIQ questions: how to analyze a property, what the Discovery score means, the six investment strategies, the property scanner, exports, account, and data security.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help Center — DealGapIQ',
    description:
      'Answers to common questions about DealGapIQ — getting started, scoring, reports, mobile app, and account.',
    url: '/help',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Center — DealGapIQ',
    description:
      'Answers to common DealGapIQ questions about analysis, scoring, reports, and account.',
  },
}

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  url: 'https://dealgapiq.com/help',
  mainEntity: FAQ_DATA.map((f) => ({
    '@type': 'Question',
    name: f.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.answer,
    },
  })),
}

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            &larr; Back to DealGapIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Help Center</h1>
          <p className="text-slate-400">
            Find answers to common questions about DealGapIQ. Can&apos;t find what you need?{' '}
            <a
              href="mailto:support@dealgapiq.com"
              className="text-sky-400 hover:text-sky-300 underline"
            >
              Contact support
            </a>
            .
          </p>
        </div>

        {CATEGORIES.map((category) => {
          const items = FAQ_DATA.filter((f) => f.category === category)
          return (
            <section key={category} className="mb-10">
              <h2 className="text-lg font-bold text-white mb-3">{category}</h2>
              <div className="space-y-2">
                {items.map((faq) => (
                  <details
                    key={faq.question}
                    className="group rounded-xl border border-slate-700/50 bg-slate-900/40 open:border-sky-500/15 open:bg-slate-900/80 transition-colors"
                  >
                    <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                      <span className="text-[15px] font-semibold text-slate-200">
                        {faq.question}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-5 pt-0">
                      <p className="text-[14px] leading-relaxed text-slate-400">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )
        })}

        <div
          className="mt-12 rounded-xl p-6 text-center"
          style={{
            background: 'rgba(15,164,233,0.06)',
            border: '1px solid rgba(15,164,233,0.12)',
          }}
        >
          <h2 className="text-lg font-bold text-white mb-2">Still need help?</h2>
          <p className="text-sm text-slate-400 mb-4">
            Our team typically responds within 24 hours during business days.
          </p>
          <a
            href="mailto:support@dealgapiq.com?subject=DealGapIQ%20Support%20Request"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email Support
          </a>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; 2026 DealGapIQ. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
