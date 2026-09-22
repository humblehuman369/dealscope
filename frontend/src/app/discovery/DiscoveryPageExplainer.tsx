import { PageExplainer } from '@/components/seo/PageExplainer'
import { SPEED_CLAIM } from '@/lib/claims'

/**
 * SEO explainer for /discovery. Server component so the copy lands in the
 * prerendered HTML; `DiscoveryExplainerVisibility` hides it on the client while
 * Level 3 (Strategy Workbench) is open or under workflow v1 (P1-7).
 */
export function DiscoveryPageExplainer() {
  return (
    <PageExplainer
      title="What is Discovery?"
      intro={`Discovery is DealGapIQ's instant scoring tool for residential investment properties. Paste an address or a Zillow link and, ${SPEED_CLAIM}, see whether the deal is worth pursuing — across six investment strategies, with a transparent breakdown of the numbers behind the score.`}
      sections={[
        {
          heading: 'What it tells you',
          body: 'For each of six strategies — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale — you see the Target Buy (the price our model says works), the Income Value (the maximum price where cash flow stays positive), and the Deal Gap (the percentage distance between the asking price and Target Buy). Discovery ranks the strategies so you know which path actually fits the property in front of you.',
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
