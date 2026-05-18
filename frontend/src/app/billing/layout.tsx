import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing - DealGapIQ',
  description: 'Manage your DealGapIQ subscription and billing.',
  alternates: { canonical: '/billing' },
  robots: { index: false, follow: true },
}

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return children
}
