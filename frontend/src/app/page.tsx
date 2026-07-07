import type { Metadata } from 'next'
import { FaqJsonLd } from '@/components/seo/FaqJsonLd'
import HomePageClient from './_components/HomePageClient'

const defaultTitle = 'DealGapIQ - Real Estate Investment Analytics'
const defaultDescription =
  'Analyze properties across 6 investment strategies, see the Deal Gap, and get paid Pro access to verified cash buyers and 484+ hard money lenders. Score any deal in 60 seconds.'

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  alternates: { canonical: '/' },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: 'website',
    url: '/',
    siteName: 'DealGapIQ',
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
  },
  robots: { index: true, follow: true },
}

const HOME_FAQ = [
  {
    question: 'What is DealGapIQ?',
    answer:
      'DealGapIQ is a real estate investment analytics platform that scores any residential property in about 60 seconds across six strategies — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale — and shows the Deal Gap between the asking price and what actually works.',
  },
  {
    question: 'How is DealGapIQ different from a spreadsheet?',
    answer:
      'DealGapIQ pulls live market data from Zillow, RentCast, Redfin, Realtor.com, and AirROI, runs the full pro-forma on our servers, and surfaces a ranked score plus offer scripts. You get lender-ready numbers without building or maintaining your own model.',
  },
  {
    question: 'Do I need an account to analyze a property?',
    answer:
      'No. You can run Discovery on any address without signing in. A free account lets you save properties, customize default assumptions, and export reports.',
  },
  {
    question: 'What is the Deal Gap?',
    answer:
      'The Deal Gap is the percentage distance between the list price (or your offer) and the Target Buy — the price our model says makes the deal work for a given strategy. A negative gap means the seller is asking above what pencils; a positive gap means room to negotiate.',
  },
  {
    question: 'Which investment strategies does DealGapIQ support?',
    answer:
      'Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. Each strategy uses its own underwriting model and ranks independently so you see which path fits the property.',
  },
  {
    question: 'Does Pro include the Cash Buyer and Hard Money directories?',
    answer:
      'Yes — both directories are included with Pro, and the 7-day trial includes full directory access: search, filter, and open buyer and lender records. CSV and print exports unlock with your first payment.',
  },
  {
    question: 'What is in the Cash Buyer Directory?',
    answer:
      'A searchable database of verified fix-and-flip, BRRRR, and active cash buyers across major U.S. markets. Filter by city, county, or zip, view deal history where available, and save contacts to your DealGapIQ dashboard.',
  },
]

export default function HomePage() {
  return (
    <>
      <FaqJsonLd items={HOME_FAQ} />
      <HomePageClient />
    </>
  )
}
