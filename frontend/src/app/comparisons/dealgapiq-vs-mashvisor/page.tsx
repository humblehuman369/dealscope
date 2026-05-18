import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparisons/ComparisonPage'
import { COMPARISON_PAGES } from '@/lib/seo/comparison-pages'

const config = COMPARISON_PAGES['dealgapiq-vs-mashvisor']

export const metadata: Metadata = config.metadata

export default function DealGapIQVsMashvisorPage() {
  return <ComparisonPage config={config} />
}
