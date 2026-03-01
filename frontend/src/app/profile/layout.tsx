import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profile - DealGapIQ',
  description: 'Manage your DealGapIQ account, business profile, investor preferences, and notifications.',
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
