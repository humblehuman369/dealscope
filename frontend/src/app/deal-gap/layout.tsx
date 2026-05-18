import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Deal Gap — Price Ladder Analysis | DealGapIQ',
  description:
    'Visualize the gap between list price, target buy, and income value with interactive buy-price adjustment for any property.',
  alternates: { canonical: '/deal-gap' },
  robots: NOINDEX_FOLLOW,
}

export default function DealGapLayout({ children }: { children: React.ReactNode }) {
  return children
}
