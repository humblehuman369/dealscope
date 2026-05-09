import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DealMaker - DealGapIQ',
  description:
    'Structure offers across cash, conventional, subject-to, and seller-finance closing paths.',
  // App route — gated by query params, JS-rendered. Marketing/SEO content lives at /deal-maker.
  robots: { index: false, follow: false },
}

export default function DealMakerAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
