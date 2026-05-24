import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cash Buyer Directory | DealGapIQ',
  description:
    'Search verified fix-and-flip, BRRRR, and buy-and-hold cash buyers by city, county, or zip code.',
  alternates: { canonical: '/directory' },
  robots: { index: true, follow: true },
}

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
