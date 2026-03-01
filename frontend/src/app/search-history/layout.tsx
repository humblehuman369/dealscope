import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search History - DealGapIQ',
  description: 'Your recent property searches.',
}

export default function SearchHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
