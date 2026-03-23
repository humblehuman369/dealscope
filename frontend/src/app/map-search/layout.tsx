import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Map Search | DealScope',
  description: 'Search for investment properties by map — pan, zoom, or draw an area to discover listings.',
}

export default function MapSearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
