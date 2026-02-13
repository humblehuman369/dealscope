'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'What is InvestIQ?',
    answer: 'InvestIQ is a real estate investment analysis platform that evaluates properties across 6 investment strategies — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. It gives you a VerdictIQ score (0-95) that tells you whether a deal is worth pursuing, plus a full financial breakdown so you can see exactly what you\'d pay and what you\'d earn.',
  },
  {
    category: 'Getting Started',
    question: 'How do I analyze a property?',
    answer: 'On the web, click "Analyze a Property" on the homepage and enter an address. On mobile, you can either enter an address or point your phone\'s camera at any property to scan it. InvestIQ will pull real market data and run a full financial analysis in about 60 seconds.',
  },
  {
    category: 'Getting Started',
    question: 'Do I need an account to use InvestIQ?',
    answer: 'No — you can analyze properties without an account. However, creating a free account lets you save properties, build a portfolio, track your search history, and customize your default investment assumptions.',
  },
  {
    category: 'Getting Started',
    question: 'Is InvestIQ free?',
    answer: 'Yes. InvestIQ is currently in free beta. All features — including unlimited analyses, PDF reports, and portfolio tracking — are free during the beta period. We\'ll announce paid tiers before they launch, and beta users will get early-access pricing.',
  },
  // Analysis & Scoring
  {
    category: 'Analysis & Scoring',
    question: 'What is the VerdictIQ score?',
    answer: 'The VerdictIQ score (0-95) is a composite rating that evaluates a property\'s investment potential. It factors in cash flow potential, price-to-value opportunity, market conditions, and risk. A score above 65 is generally a strong deal worth deeper analysis; 40-65 needs a closer look; below 40 doesn\'t work at the asking price.',
  },
  {
    category: 'Analysis & Scoring',
    question: 'Where does InvestIQ get its data?',
    answer: 'InvestIQ pulls from multiple data sources including public property records, MLS listings, tax assessor data, rental market comps, short-term rental platforms, and comparable sales. We combine these sources to give you the most accurate picture possible.',
  },
  {
    category: 'Analysis & Scoring',
    question: 'Can I adjust the assumptions (down payment, rate, etc.)?',
    answer: 'Yes. After running an analysis, use the "Change Terms" button to open the Deal Maker. You can adjust down payment percentage, interest rate, loan term, property taxes, insurance, management fees, vacancy rate, and more. The analysis recalculates instantly.',
  },
  {
    category: 'Analysis & Scoring',
    question: 'What are the 6 investment strategies?',
    answer: 'InvestIQ analyzes every property across: (1) Long-Term Rental — buy and hold with annual leases, (2) Short-Term Rental — Airbnb/VRBO style income, (3) BRRRR — Buy, Rehab, Rent, Refinance, Repeat, (4) Fix & Flip — buy, renovate, sell for profit, (5) House Hack — live in part, rent the rest, (6) Wholesale — contract and assign for a fee. Each strategy uses different financial models and metrics.',
  },
  // Reports & Export
  {
    category: 'Reports & Export',
    question: 'Can I export a PDF report?',
    answer: 'Yes. On the Strategy page, click "Full Report" to generate a lender-ready PDF with property details, financial breakdown, and analysis summary. On mobile, tap "Report" in the action bar to download and share the PDF.',
  },
  {
    category: 'Reports & Export',
    question: 'Can I export to Excel?',
    answer: 'Yes. On the Strategy page, click "Worksheet" to download an Excel file with the full proforma — including all inputs, calculations, and projections. This is useful for custom modeling or sharing with partners.',
  },
  // Mobile App
  {
    category: 'Mobile App',
    question: 'How does the property scanner work?',
    answer: 'The mobile scanner uses your phone\'s GPS and compass to identify the property you\'re pointing at. It searches parcel data in the direction you\'re facing and returns matching properties. If multiple properties are nearby, you\'ll see a disambiguation screen to confirm the right one.',
  },
  {
    category: 'Mobile App',
    question: 'Why is the scanner showing the wrong property?',
    answer: 'GPS and compass accuracy can vary. Try: (1) Make sure you\'re standing close to the property, (2) Hold your phone steady and point directly at the building, (3) Adjust the distance slider if the property is further/closer than the default range. If it still picks the wrong one, tap "Not the right property?" to see all nearby candidates.',
  },
  // Account & Data
  {
    category: 'Account & Data',
    question: 'How do I save a property to my portfolio?',
    answer: 'After running an analysis, tap/click the "Save" button on the VerdictIQ screen or the "Save to Portfolio" option on the StrategyIQ screen. The property will appear in your Portfolio tab with all the analysis data pre-filled.',
  },
  {
    category: 'Account & Data',
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption for data in transit (TLS 1.3) and at rest. We never sell your personal information or property data. See our Privacy Policy for complete details.',
  },
  {
    category: 'Account & Data',
    question: 'How do I delete my account?',
    answer: 'Go to Settings → Account → Delete Account. This permanently removes all your data including saved properties, search history, and profile information. This action cannot be undone.',
  },
]

const CATEGORIES = [...new Set(FAQ_DATA.map(f => f.category))]

export default function HelpCenterPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  const filtered = filter ? FAQ_DATA.filter(f => f.category === filter) : FAQ_DATA

  return (
    <div className="min-h-screen bg-black text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
            &larr; Back to InvestIQ
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Help Center</h1>
          <p className="text-slate-400">
            Find answers to common questions about InvestIQ. Can&apos;t find what you need?{' '}
            <a href="mailto:support@investiq.com" className="text-sky-400 hover:text-sky-300 underline">Contact support</a>.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setFilter(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              !filter ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === cat ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-2">
          {filtered.map((faq, i) => {
            const globalIndex = FAQ_DATA.indexOf(faq)
            const isOpen = openIndex === globalIndex
            return (
              <div
                key={globalIndex}
                className="rounded-xl border transition-colors"
                style={{
                  background: isOpen ? 'rgba(15,23,42,0.8)' : 'rgba(15,23,42,0.4)',
                  borderColor: isOpen ? 'rgba(56,189,248,0.15)' : 'rgba(51,65,85,0.5)',
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <span className="text-[15px] font-semibold text-slate-200">{faq.question}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0">
                    <p className="text-[14px] leading-relaxed text-slate-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Contact Section */}
        <div className="mt-12 rounded-xl p-6 text-center" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
          <h2 className="text-lg font-bold text-white mb-2">Still need help?</h2>
          <p className="text-sm text-slate-400 mb-4">
            Our team typically responds within 24 hours during business days.
          </p>
          <a
            href="mailto:support@investiq.com?subject=InvestIQ%20Support%20Request"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            Email Support
          </a>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
          <p>&copy; 2026 InvestIQ LLC. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
