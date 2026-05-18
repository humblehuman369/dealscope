import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Property — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return children
}
