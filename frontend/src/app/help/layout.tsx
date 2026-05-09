import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help Center — DealGapIQ',
  description:
    'DealGapIQ Help Center: how to analyze a property, what the Verdict and VerdictIQ score mean, where the data comes from, exporting reports, mobile app questions, account and pricing.',
  alternates: { canonical: '/help' },
  openGraph: {
    title: 'Help Center — DealGapIQ',
    description: 'How DealGapIQ works, where the data comes from, and how to get the most out of every analysis.',
    url: '/help',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help Center — DealGapIQ',
    description: 'How DealGapIQ works and how to get the most out of every analysis.',
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
