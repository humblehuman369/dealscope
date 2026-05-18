import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Rehab — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function RehabLayout({ children }: { children: React.ReactNode }) {
  return children
}
