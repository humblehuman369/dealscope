import type { Metadata } from 'next'
import PricingContent from './PricingContent'

export const metadata: Metadata = {
  title: 'Pricing — DealGapIQ',
  description:
    'Choose the plan that fits how you invest. Free Starter or Pro with full calculation breakdowns, editable inputs, and Excel proformas.',
}

export default function PricingPage() {
  return <PricingContent />
}
