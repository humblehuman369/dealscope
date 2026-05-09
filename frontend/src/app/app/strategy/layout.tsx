import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Strategy Analysis - DealGapIQ',
  description:
    'Deep-dive financial breakdown and benchmarks for your property across 6 investment strategies.',
  // App route — gated by query params, JS-rendered. Marketing/SEO content lives at /strategy.
  robots: { index: false, follow: false },
}

export default function StrategyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
