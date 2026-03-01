import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Get Started - DealGapIQ',
  description: 'Set up your investment preferences and get the most out of DealGapIQ.',
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
