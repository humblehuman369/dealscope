import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Properties - DealGapIQ',
  description: 'Search for a property address to analyze with DealGapIQ investment analytics.',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
