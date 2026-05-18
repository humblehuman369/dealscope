import type { Metadata } from 'next'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import WhatIsDealGapIQ from './WhatIsDealGapIQ'

export const metadata: Metadata = {
  title: 'What is DealGapIQ? — DealGapIQ',
  description:
    'DealGapIQ answers the only question that matters: Is this actually a deal? Analyze any property across six investment strategies and see the Deal Gap instantly.',
  alternates: { canonical: '/what-is-dealgapiq' },
  openGraph: {
    title: 'What is DealGapIQ?',
    description:
      'DealGapIQ answers the only question that matters: Is this actually a deal? Analyze any property across six investment strategies and see the Deal Gap.',
    url: '/what-is-dealgapiq',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What is DealGapIQ?',
    description:
      'Analyze any property across six investment strategies and see the Deal Gap instantly.',
  },
}

const WHAT_IS_FAQ = [
  {
    question: 'What problem does DealGapIQ solve?',
    answer:
      'Investors waste hours on spreadsheets for deals that never pencil. DealGapIQ answers “Is this actually a deal?” in about 60 seconds and shows the Deal Gap — how far the asking price is from what works.',
  },
  {
    question: 'Who is DealGapIQ for?',
    answer:
      'Active residential investors, wholesalers, and newer buyers who want transparent underwriting across long-term rental, STR, BRRRR, fix-and-flip, house hack, and wholesale on the same property.',
  },
  {
    question: 'How is DealGapIQ different from Zillow?',
    answer:
      'Zillow shows estimates. DealGapIQ runs full strategy-specific pro-formas, ranks paths, and outputs offer-ready numbers and scripts — not just a Zestimate.',
  },
]

export default function WhatIsItPage() {
  return (
    <>
      <FaqJsonLd items={WHAT_IS_FAQ} />
      <WhatIsDealGapIQ />
    </>
  )
}
