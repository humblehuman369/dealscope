import type { Metadata } from 'next'
import { PageExplainer } from '@/components/seo/PageExplainer'

export const metadata: Metadata = {
  title: 'Strategy Analysis — Full Financial Deep-Dive | DealGapIQ',
  description:
    'Full financial deep-dive for any property: cash-on-cash, NOI, DSCR, sensitivity analysis, 10-year projections, and benchmarks across Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale.',
  alternates: { canonical: '/strategy' },
  openGraph: {
    title: 'Strategy Analysis — Full Financial Deep-Dive',
    description:
      'Cash-on-cash, NOI, DSCR, sensitivity, and 10-year projections across six investment strategies.',
    url: '/strategy',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Analysis — Full Financial Deep-Dive',
    description:
      'Cash-on-cash, NOI, DSCR, sensitivity, and 10-year projections across six investment strategies.',
  },
}

const STRATEGY_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://dealgapiq.com/strategy',
  url: 'https://dealgapiq.com/strategy',
  name: 'Strategy Analysis — Full Financial Deep-Dive',
  description: 'Full financial deep-dive for any property across six investment strategies.',
  isPartOf: { '@id': 'https://dealgapiq.com/#website' },
  about: { '@id': 'https://dealgapiq.com/#software' },
}

export default function StrategyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRATEGY_JSONLD) }}
      />
      {children}
      <PageExplainer
        title="What is Strategy Analysis?"
        intro="Strategy Analysis is the financial deep-dive behind every Discovery. Where Discovery tells you whether a deal works, Strategy Analysis shows you exactly why — line by line, assumption by assumption — across all six investment strategies."
        sections={[
          {
            heading: 'What you see',
            body: 'A full pro-forma for the property: monthly cash flow, NOI, cap rate, cash-on-cash return, DSCR, gross rent multiplier, and 10-year financial projections. Sensitivity analysis shows how your returns shift if rents move, vacancy spikes, or rates change. Benchmarks compare the property against typical performance in the local market.',
          },
          {
            heading: 'How the math works',
            body: 'Every number is calculated by the DealGapIQ backend from the underlying property data, current market rents, taxes, insurance estimates, and the financing scenario you choose. Default assumptions are conservative; you can override any of them in DealMaker. We do not hide the math — every line is auditable.',
          },
          {
            heading: 'When to use it',
            body: 'Use Strategy Analysis after Discovery flags a property worth investigating, when you want to understand why a strategy ranked the way it did, or when you need a defensible set of numbers to share with a lender, partner, or seller.',
          },
        ]}
        relatedLinks={[
          { href: '/discovery', label: 'Run Discovery' },
          { href: '/deal-maker', label: 'Adjust assumptions in DealMaker' },
          { href: '/strategies/brrrr', label: 'Strategy guide: BRRRR' },
          { href: '/strategies/long-term-rental', label: 'Strategy guide: Long-Term Rental' },
        ]}
      />
    </>
  )
}
