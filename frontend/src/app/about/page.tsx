import type { Metadata } from 'next'
import { AboutPageRedesign } from '@/components/landing/AboutPageRedesign'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'About — DealGapIQ',
  description:
    'DealGapIQ reduces complex investment analysis into three proprietary numbers — powered by real market data, transparent assumptions, and 35 years of institutional real estate intelligence.',
  alternates: { canonical: '/about' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'About — DealGapIQ',
    description:
      'The metric that changes how you evaluate deals. Analyze any property, any strategy, instantly.',
    url: '/about',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About — DealGapIQ',
    description:
      'The metric that changes how you evaluate deals. Analyze any property, any strategy, instantly.',
  },
}

export default function AboutPage() {
  return <AboutPageRedesign />
}
