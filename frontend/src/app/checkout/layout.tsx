import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Checkout — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
