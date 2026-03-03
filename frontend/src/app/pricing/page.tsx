import type { Metadata } from 'next'
import PricingContent from './PricingContent'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description:
    'Know your number before you make the offer. DealGapIQ pricing: Starter free forever, Pro with 7-day free trial.',
}

export default function PricingPage() {
  return <PricingContent />
}
