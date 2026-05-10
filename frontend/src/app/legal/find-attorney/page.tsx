import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Find a Creative-Finance Attorney — DealGapIQ',
  description:
    'Why subject-to, seller financing, and loan assumptions need a licensed real-estate attorney in your state — and how to find one who has actually closed these structures.',
  alternates: { canonical: '/legal/find-attorney' },
  openGraph: {
    title: 'Find a Creative-Finance Attorney',
    description:
      'How to find a real-estate attorney who has actually closed subject-to, seller financing, and loan-assumption deals.',
    url: '/legal/find-attorney',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Find a Creative-Finance Attorney',
    description:
      'Find a real-estate attorney who has closed subject-to and seller-financing deals.',
  },
}

export default function FindAttorneyPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-slate-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/discovery" className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-4">Find a creative-finance attorney</h1>
        <p className="text-[15px] leading-relaxed text-slate-400 mb-6">
          Seller financing, subject-to, and loan assumptions are legally sensitive. A licensed real-estate attorney in your
          state can review your contract and closing structure before you rely on it.
        </p>
        <p className="text-[15px] leading-relaxed text-slate-400 mb-6">
          DealGapIQ does not provide legal advice. Use your own counsel — especially for creative terms, trusts or LLCs,
          and assumption approvals.
        </p>
        <p className="text-sm text-slate-500">
          Affiliate / curated directory links may be added later (see product roadmap). For now, ask your local investor
          meetup or state bar referral service for a real-estate attorney who handles investor closings.
        </p>
      </div>
    </div>
  )
}
