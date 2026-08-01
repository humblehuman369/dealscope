'use client'

import { useSearchParams } from 'next/navigation'
import { PageExplainer } from '@/components/seo/PageExplainer'

/**
 * SEO explainer for /discovery. Hidden while Level 3 (Strategy Workbench) is
 * open so the page does not read as Discovery content stacked under Strategy.
 */
export function DiscoveryPageExplainer() {
  const searchParams = useSearchParams()
  if (searchParams?.get('view') === 'workbench') return null

  return (
    <PageExplainer
      title="What is Discovery?"
      intro="Discovery is DealGapIQ's instant scoring tool for residential investment properties. Paste an address or a Zillow link and, in under 60 seconds, see whether the deal is worth pursuing — across six investment strategies, with a transparent breakdown of the numbers behind the score."
      sections={[
        {
          heading: 'What it tells you',
          body: 'A Discovery score from 0 to 95 across Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. For each strategy you see the Target Buy (the price our model says works), the Income Value (the maximum price where cash flow stays positive), and the Deal Gap (the percentage distance between the asking price and Target Buy). Discovery ranks the strategies so you know which path actually fits the property in front of you.',
        },
        {
          heading: 'How it works',
          body: 'Discovery blends data from Zillow, RentCast, Redfin, Realtor.com, and AirROI with our own IQ Estimate model. We pull the property facts, run the financial math for each strategy with sensible default assumptions (which you can override later in DealMaker), and surface the leverage that the asking price hides. No spreadsheet, no copy-pasting comps.',
        },
        {
          heading: 'Who it is for',
          body: 'Active residential investors who scroll listings every day and want a fast, transparent score before they spend an hour modeling a deal that does not pencil. New investors who want to learn what makes a property work. Anyone who has ever asked, "Is this a good deal — and what should I actually offer?"',
        },
      ]}
      relatedLinks={[
        { href: '/deal-maker', label: 'Open DealMaker for offer scripts' },
        { href: '/pricing', label: 'Pricing & free trial' },
        { href: '/glossary/subject-to-financing', label: 'Glossary: Subject-To financing' },
      ]}
    />
  )
}
