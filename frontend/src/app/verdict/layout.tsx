import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IQ Verdict - DealGapIQ',
  description:
    'View your property IQ Verdict with ranked strategy recommendations and deal scores across LTR, STR, BRRRR, Fix & Flip, House Hacking, and Wholesale.',
}

export default function VerdictLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
