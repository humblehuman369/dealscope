import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Admin — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
