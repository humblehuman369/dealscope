import type { Metadata } from 'next'
import PricingContent from './PricingContent'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description:
    'Know your number before you make the offer. DealGapIQ pricing: Starter free forever (3 analyses/mo), Pro Investor at $29.17/mo annual with 7-day free trial.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing — DealGapIQ',
    description:
      'Starter free forever (3 analyses/mo). Pro Investor at $29.17/mo annual with 7-day free trial. No credit card.',
    url: '/pricing',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealGapIQ Pricing',
    description: 'Free starter, $29.17/mo Pro Investor. 7-day trial, no credit card.',
  },
}

export default function PricingPage() {
  return <PricingContent />
}
