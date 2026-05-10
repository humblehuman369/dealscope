import type { Metadata } from 'next'
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

export default function WhatIsItPage() {
  return <WhatIsDealGapIQ />
}
