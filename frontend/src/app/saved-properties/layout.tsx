import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Saved Properties - DealGapIQ',
  description: 'Your saved properties and analyses in DealGapIQ.',
}

export default function SavedPropertiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
