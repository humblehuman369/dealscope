import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Deal — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children
}
