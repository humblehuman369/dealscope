import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Debug — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return children
}
