import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Deal Maker - DealGapIQ',
  description:
    'Build your deal with purchase price, financing, and expenses. See metrics across 6 investment strategies.',
  robots: NOINDEX_FOLLOW,
}

export default function DealMakerLayout({ children }: { children: React.ReactNode }) {
  return children
}
