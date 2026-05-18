import type { Metadata } from 'next'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Price Intel — Comparable Sales & Rent Comps | DealGapIQ',
  description:
    'Unified sale and rent comp analysis with dual valuation, adjustment grids, and appraisal-ready exports for any investment property.',
  alternates: { canonical: '/price-intel' },
  robots: NOINDEX_FOLLOW,
}

export default function PriceIntelLayout({ children }: { children: React.ReactNode }) {
  return children
}
