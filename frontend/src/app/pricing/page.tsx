import type { Metadata } from 'next'
import PricingContent from './PricingContent'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description:
    'Know your number before you make the offer. DealGapIQ pricing: Starter free forever, Pro from $29.17/mo (annual) or $39.99/mo with a 7-day free trial.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — DealGapIQ',
    description:
      'DealGapIQ pricing: Starter (free) and Pro from $29.17/mo with a 7-day free trial.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — DealGapIQ',
    description:
      'DealGapIQ pricing: Starter (free) and Pro from $29.17/mo with a 7-day free trial.',
  },
}

export default function PricingPage() {
  return <PricingContent />
}
