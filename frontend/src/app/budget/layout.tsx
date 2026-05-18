import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Budget — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return children
}
