import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Photos — DealGapIQ',
  robots: NOINDEX_FOLLOW,
}

export default function PhotosLayout({ children }: { children: React.ReactNode }) {
  return children
}
