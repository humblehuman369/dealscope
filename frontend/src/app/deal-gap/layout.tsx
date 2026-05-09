import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'What is the Deal Gap? — DealGapIQ',
  description:
    'The Deal Gap is the percentage between a listing\'s asking price and what the deal actually supports under today\'s rates, rents, and operating costs. Learn how the Deal Gap is calculated and how to use it.',
  alternates: { canonical: '/deal-gap' },
  openGraph: {
    title: 'What is the Deal Gap?',
    description:
      'The percentage between asking price and what the deal actually supports under today\'s rates, rents, and operating costs.',
    url: '/deal-gap',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What is the Deal Gap?',
    description: 'The percentage between asking price and what the deal actually supports.',
  },
}

export default function DealGapLayout({ children }: { children: React.ReactNode }) {
  return children
}
