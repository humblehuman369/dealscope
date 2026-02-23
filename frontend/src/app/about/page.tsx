import type { Metadata } from 'next'
import { WhatIsDealGapIQ } from '@/components/landing/WhatIsDealGapIQ'

export const metadata: Metadata = {
  title: 'What is DealGapIQ? — DealGapIQ',
  description:
    'DealGapIQ answers the only question that matters: Is this actually a deal? Analyze any property, any strategy, instantly.',
}

export default function AboutPage() {
  return <WhatIsDealGapIQ />
}
