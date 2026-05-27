import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hard Money Lender Directory | DealGapIQ',
  description:
    'Search verified hard money and private lenders by state, loan product, and loan size. Fix & flip, BRRRR, DSCR, bridge, and more.',
  alternates: { canonical: '/lenders' },
  robots: { index: true, follow: true },
}

export default function LendersLayout({ children }: { children: React.ReactNode }) {
  return children
}
