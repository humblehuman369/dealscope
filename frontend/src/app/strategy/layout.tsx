import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Strategy Analysis - DealGapIQ',
  description:
    'Deep-dive financial breakdown and benchmarks for your property across 6 investment strategies.',
}

export default function StrategyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
