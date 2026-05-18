import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'National Investment Benchmarks — Cap Rate, DSCR, Cash-on-Cash | DealGapIQ',
  description:
    'Reference guide to the eight metrics DealGapIQ uses — cap rate, cash-on-cash, DSCR, expense ratio, GRM, breakeven occupancy, equity capture, and cash flow yield — with national benchmarks and formulas.',
  alternates: { canonical: '/national-averages' },
  openGraph: {
    title: 'National Investment Benchmarks | DealGapIQ',
    description:
      'Cap rate, DSCR, cash-on-cash, and five more metrics with national benchmarks and interpretation guidance.',
    url: '/national-averages',
    type: 'article',
  },
  robots: { index: true, follow: true },
}

export default function NationalAveragesLayout({ children }: { children: React.ReactNode }) {
  return children
}
