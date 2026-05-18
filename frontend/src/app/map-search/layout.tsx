import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Map Search | DealGapIQ',
  description:
    'Search for investment properties by map — pan, zoom, or draw an area to discover listings.',
  alternates: { canonical: '/map-search' },
  robots: { index: false, follow: true },
}

export default function MapSearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
