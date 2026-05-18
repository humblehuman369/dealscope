import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Compare — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
