import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Deal Maker - DealGapIQ',
  description:
    'Build your deal with purchase price, financing, and expenses. See metrics across 6 investment strategies.',
}

export default function DealMakerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
