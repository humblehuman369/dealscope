import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Analyzing — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function AnalyzingLayout({ children }: { children: React.ReactNode }) {
  return children
}
