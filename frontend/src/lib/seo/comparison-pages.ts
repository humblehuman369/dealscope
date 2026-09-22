import type { ComparisonPageConfig, ComparisonTableRow } from '@/components/comparisons/ComparisonPage'
import { BUYER_COUNT, LENDER_COUNT, PRO_MONTHLY_PRICE, PRO_YEARLY_PER_MONTH, SOURCE_COUNT } from '@/lib/claims'

/**
 * Comparison pages (`/comparisons/*`). Same format as the home page: question
 * headings, a direct first sentence, a table, and a dated price footnote.
 *
 * Every competitor cell was read from the vendor's own public pages on
 * `PRICES_CHECKED` (URLs in each config's `sources`). If a vendor does not
 * state a feature publicly the cell says "Not listed"; nothing is inferred.
 * Phase 10.4 of the GEO plan re-checks each vendor monthly: update the cell,
 * the `accessed` dates and `PRICES_CHECKED`, which drives the footnote month,
 * `Article.dateModified` and the sitemap `lastmod`.
 *
 * DealGapIQ cells come from `@/lib/claims` and the content source of truth
 * (`docs/brand/content-source-of-truth.md`).
 */
export const PRICES_CHECKED = '2026-09-22'

const DGIQ = {
  price: `$0 free plan; Pro ${PRO_MONTHLY_PRICE}/mo or $${PRO_YEARLY_PER_MONTH}/mo billed annually`,
  freePlan: 'Yes: 3 discoveries a month, no card',
  trial: '7-day Pro trial, no card',
  strategies: 'Six: long-term rental, short-term rental, BRRRR, fix and flip, house hack, wholesale',
  targetBuy: 'Yes: target buy price on every discovery',
  dealGap: 'Yes: gap between list price and target buy price, as a percentage and a dollar amount',
  paths: 'Four paths plus a Blend (Price, Income, Terms, Equity), each with a worksheet and a negotiation script',
  creative: 'Yes: seller financing and subject-to in the Terms path',
  buyers: `${BUYER_COUNT} verified cash buyers (Pro)`,
  lenders: `${LENDER_COUNT} hard money lenders (Pro)`,
  sources: `${SOURCE_COUNT} sources including Zillow, Redfin, Realtor.com and RentCast, shown side by side`,
  platforms: 'Web, iOS, macOS, Android',
} as const

function rows(competitor: Record<keyof typeof DGIQ, string>): ComparisonTableRow[] {
  const labels: Record<keyof typeof DGIQ, string> = {
    price: 'Starting price',
    freePlan: 'Free plan',
    trial: 'Free trial',
    strategies: 'Strategies covered',
    targetBuy: 'Target buy price / maximum offer',
    dealGap: 'Deal gap (distance from list price)',
    paths: 'Paths to close the gap and negotiation scripts',
    creative: 'Seller financing / subject-to',
    buyers: 'Cash buyer directory',
    lenders: 'Hard money lender directory',
    sources: 'Valuation and listing sources',
    platforms: 'Platforms',
  }
  return (Object.keys(labels) as Array<keyof typeof DGIQ>).map((key) => ({
    label: labels[key],
    dealgapiq: DGIQ[key],
    competitor: competitor[key],
  }))
}

const NOT_LISTED = 'Not listed'

export const COMPARISON_PAGES: Record<string, ComparisonPageConfig> = {
  'dealgapiq-vs-dealcheck': {
    slug: 'dealgapiq-vs-dealcheck',
    competitor: 'DealCheck',
    datePublished: '2026-05-18',
    dateModified: PRICES_CHECKED,
    metadata: {
      title: 'DealGapIQ vs DealCheck: deal gap and four paths plus a Blend vs a calculator',
      description:
        'DealCheck is a property calculator from $0. DealGapIQ reports the deal gap and target buy price, then four paths plus a Blend with scripts.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-dealcheck' },
    },
    headline: 'DealGapIQ vs DealCheck',
    lede:
      'DealCheck is a real estate analysis calculator that checks whether a property works at a given price and can back into a maximum allowable offer. DealGapIQ reports the deal gap between the list price and the target buy price, then gives four paths plus a Blend to close it, each with a negotiation script. DealCheck is cheaper; DealGapIQ adds a cash buyer directory and shows five valuation sources side by side.',
    sections: [
      {
        heading: 'What is the difference between DealGapIQ and DealCheck?',
        paragraphs: [
          'DealCheck analyzes a property at the price you enter; DealGapIQ starts from the price the property needs to be and measures how far the listing is from it. Both compute a target price: DealCheck calls it a "max allowable offer" in its Purchase Offer Calculator, DealGapIQ calls it the target buy price and reports the deal gap, the distance between that price and the list price, as a percentage and a dollar amount.',
          'The larger difference is what happens next. DealGapIQ returns four paths plus a Blend to close the gap (Price, Income, Terms and Equity, and a Blend that combines them), each with an editable worksheet and a negotiation script. DealCheck does not list paths to close the gap or negotiation scripts on its site; it lets you model seller financing and subject-to loans inside its analysis.',
        ],
      },
      {
        heading: 'How much do DealGapIQ and DealCheck cost?',
        paragraphs: [
          `DealCheck starts at $0 (Starter), with Plus at $10 a month and Pro at $20 a month, and a 14-day trial on paid plans. DealGapIQ starts at $0 with three discoveries a month and no card; Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually, with a 7-day trial that also needs no card.`,
          `DealGapIQ Pro is the more expensive of the two. It includes directories of ${BUYER_COUNT} verified cash buyers and ${LENDER_COUNT} hard money lenders, comps, Excel proformas and PDF reports. DealCheck's paid plans raise saved-property and comps limits and include a nationwide lender directory of conventional, private money and hard money lenders.`,
        ],
      },
      {
        heading: 'Which one tells you what to offer?',
        paragraphs: [
          'Both do, in different ways. DealCheck\'s Purchase Offer Calculator returns the highest price that meets criteria you select. DealGapIQ returns the target buy price for each of six strategies and the deal gap on the listing, then shows how to close that gap without waiting for a price cut: a lower price, more income, different terms (seller financing or subject-to), shared equity, or a Blend. Each path comes with a negotiation script written for that seller.',
        ],
      },
      {
        heading: 'Which strategies does each cover?',
        paragraphs: [
          'DealGapIQ scores every address against six strategies: long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale. DealCheck lists rental properties (including house hacks), Airbnb and vacation rentals, BRRRR, flips and rehab projects, multi-family and commercial buildings, and wholesale deals. DealCheck covers multi-family and commercial; DealGapIQ does not.',
        ],
      },
      {
        heading: 'When should you use DealCheck instead?',
        paragraphs: [
          'Choose DealCheck if you want a low-cost calculator for multi-family or commercial buildings, or you already know your offer and only need to check the numbers at that price. Choose DealGapIQ if you want the gap on a listing, a path to close it, and a script to say it with.',
        ],
      },
    ],
    table: rows({
      price: '$0 Starter; Plus $10/mo; Pro $20/mo',
      freePlan: 'Yes: Starter, no credit card',
      trial: '14-day trial on paid plans',
      strategies:
        'Rental properties (incl. house hacks), Airbnb/vacation rentals, BRRRR, flips and rehab, multi-family and commercial, wholesale deals',
      targetBuy: 'Yes: Purchase Offer Calculator ("max allowable offers")',
      dealGap: NOT_LISTED,
      paths: NOT_LISTED,
      creative: 'Yes: seller financing and subject-to loan analysis',
      buyers: NOT_LISTED,
      lenders: 'Yes: nationwide lender directory (conventional, private money, hard money)',
      sources: 'Public records and online listings; vendors not named',
      platforms: 'Web, iOS, Android',
    }),
    sources: [
      { label: 'dealcheck.io/pricing', url: 'https://dealcheck.io/pricing', accessed: PRICES_CHECKED },
      { label: 'dealcheck.io (home)', url: 'https://dealcheck.io/', accessed: PRICES_CHECKED },
      { label: 'dealcheck.io/features', url: 'https://dealcheck.io/features', accessed: PRICES_CHECKED },
      {
        label: 'DealCheck help: creative financing',
        url: 'https://help.dealcheck.io/en/articles/6590118-analyzing-creative-financing-and-loan-strategies',
        accessed: PRICES_CHECKED,
      },
    ],
    faq: [
      {
        question: 'Is DealGapIQ a replacement for DealCheck?',
        answer:
          'For residential deals, yes: DealGapIQ reports the target buy price and the deal gap, then gives four paths plus a Blend with negotiation scripts. If you analyze multi-family or commercial buildings, DealCheck covers those and DealGapIQ does not.',
      },
      {
        question: 'Does DealCheck tell you the maximum price to pay?',
        answer:
          'Yes. DealCheck\'s Purchase Offer Calculator returns a maximum allowable offer based on criteria you choose. DealGapIQ also reports a target buy price, and adds the deal gap, the distance between that price and the list price, plus the paths and scripts to close it.',
      },
      {
        question: 'Which is cheaper, DealGapIQ or DealCheck?',
        answer: `DealCheck: $0 to $20 a month. DealGapIQ: $0 free plan, Pro ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually. Both free plans need no credit card.`,
      },
    ],
  },

  'dealgapiq-vs-propstream': {
    slug: 'dealgapiq-vs-propstream',
    competitor: 'PropStream',
    datePublished: '2026-05-18',
    dateModified: PRICES_CHECKED,
    metadata: {
      title: 'DealGapIQ vs PropStream: deal gap and four paths plus a Blend vs lead lists',
      description:
        'PropStream builds lead lists from $99/mo plus per-record fees. DealGapIQ analyzes one address: deal gap, target buy price, four paths plus a Blend. Free.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-propstream' },
    },
    headline: 'DealGapIQ vs PropStream',
    lede:
      'PropStream is a nationwide property data, lead list and marketing platform for finding motivated sellers; it starts at $99 a month plus per-record fees for skip tracing and mail. DealGapIQ is what you run once you have an address: it reports the deal gap and target buy price for six strategies and gives four paths plus a Blend to close the gap, starting free. They solve different problems and many investors use both.',
    sections: [
      {
        heading: 'What is the difference between DealGapIQ and PropStream?',
        paragraphs: [
          'PropStream finds properties and owners: on- and off-market lead lists, skip tracing, direct mail and calling. DealGapIQ analyzes the property in front of you: any address, on-market or off-market, scored against six strategies with a target buy price and the deal gap, then four paths plus a Blend to close it. PropStream does not need to be replaced by DealGapIQ; a PropStream lead can be pasted straight into a DealGapIQ discovery.',
        ],
      },
      {
        heading: 'How much do DealGapIQ and PropStream cost?',
        paragraphs: [
          `PropStream Essentials is $99 a month ($81 a month billed annually), Pro is $199 a month and Elite is $699 a month, each with a 7-day trial. Skip tracing, mail, emails and extra saves are billed per record on top. DealGapIQ is $0 with three discoveries a month and no card; Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually with a 7-day trial, and there are no per-record fees.`,
        ],
      },
      {
        heading: 'Which one tells you what to offer?',
        paragraphs: [
          'Both publish a maximum offer figure, but only DealGapIQ reports the deal gap. PropStream\'s Fix & Flip Analyzer estimates a maximum allowable offer (MAO) for a flip, and its Lead Automator includes AI calling scripts for the phone. DealGapIQ reports the target buy price for each of six strategies, the deal gap against the list price as a percentage and a dollar amount, and four paths plus a Blend (Price, Income, Terms, Equity) with a written negotiation script for each.',
        ],
      },
      {
        heading: 'Does either one need a mailing list or a motivated seller?',
        paragraphs: [
          'PropStream is built around lists and outreach to owners who may be motivated. DealGapIQ does not need either: any property qualifies, because the tool finds the gap and the structure that closes it, so you can make a structured offer on a normal listing.',
        ],
      },
      {
        heading: 'When should you use PropStream instead?',
        paragraphs: [
          'Choose PropStream when your job is finding owners at scale: building lists, skip tracing and running mail or call campaigns. Choose DealGapIQ when you have an address and need to know the price at which it works, how far the listing is from that price, and what to offer. Using PropStream to find and DealGapIQ to analyze is a common pairing.',
        ],
      },
    ],
    table: rows({
      price:
        'Essentials $99/mo ($81/mo billed annually); Pro $199/mo; Elite $699/mo; plus per-record fees (skip tracing from 10¢/contact, postcards from 57¢)',
      freePlan: 'No',
      trial: '7-day free trial with 50 free leads',
      strategies:
        'Rental ROI Calculator, Fix & Flip Analyzer, Rehab Calculator, ADU Calculator, Analysis Wizard (buy-and-hold cash flow)',
      targetBuy: 'Yes: maximum allowable offer (MAO) in the Fix & Flip Analyzer',
      dealGap: NOT_LISTED,
      paths: 'AI calling scripts for the phone; no written offer or negotiation scripts listed',
      creative: 'Not listed (an "Assumable Mortgages" lead list only)',
      buyers: 'Yes, as a "Cash Buyers" lead list of all-cash purchase records',
      lenders: NOT_LISTED,
      sources: 'Public records, MLS listings, private data sources and an AVM; vendors not named',
      platforms: 'Web, iOS, Android',
    }),
    sources: [
      { label: 'propstream.com/pricing', url: 'https://www.propstream.com/pricing', accessed: PRICES_CHECKED },
      { label: 'propstream.com (home)', url: 'https://www.propstream.com/', accessed: PRICES_CHECKED },
      {
        label: 'propstream.com/propstream-features',
        url: 'https://www.propstream.com/propstream-features',
        accessed: PRICES_CHECKED,
      },
      {
        label: 'propstream.com/propstream-mobile',
        url: 'https://www.propstream.com/propstream-mobile',
        accessed: PRICES_CHECKED,
      },
    ],
    faq: [
      {
        question: 'Can I use DealGapIQ with PropStream leads?',
        answer:
          'Yes. Paste any address from a PropStream list into a DealGapIQ discovery. DealGapIQ is an analysis tool, not a list provider, so the two are complementary.',
      },
      {
        question: 'Does PropStream have a free plan?',
        answer:
          'No. PropStream offers a 7-day free trial with 50 free leads on each plan; the entry plan is $99 a month. DealGapIQ has a free plan with three discoveries a month and no card.',
      },
      {
        question: 'Does DealGapIQ do skip tracing or direct mail?',
        answer:
          'No. DealGapIQ analyzes properties and structures offers. For skip tracing and mail campaigns, PropStream or a similar list platform is the right tool.',
      },
    ],
  },

  'dealgapiq-vs-dealmachine': {
    slug: 'dealgapiq-vs-dealmachine',
    competitor: 'DealMachine',
    datePublished: PRICES_CHECKED,
    dateModified: PRICES_CHECKED,
    metadata: {
      title: 'DealGapIQ vs DealMachine: deal gap and four paths plus a Blend vs driving for dollars',
      description:
        'DealMachine is driving for dollars and direct mail from $99/seat/mo. DealGapIQ analyzes one address: deal gap, target buy price, four paths plus a Blend.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-dealmachine' },
    },
    headline: 'DealGapIQ vs DealMachine',
    lede:
      'DealMachine is a property and owner data platform built around driving for dollars, skip tracing and direct mail; plans start at $99 per seat a month with mail billed per piece. DealGapIQ analyzes the property itself: it reports the deal gap and target buy price for six strategies and gives four paths plus a Blend to close the gap, starting free with no card. DealMachine finds owners; DealGapIQ tells you what to offer them.',
    sections: [
      {
        heading: 'What is the difference between DealGapIQ and DealMachine?',
        paragraphs: [
          'DealMachine\'s core is the owner: nationwide property and owner records, a driving-for-dollars mobile app, skip tracing, and AI-generated postcards. Its public tools include a Wholesale MAO Calculator, a BRRRR calculator, a rental property calculator and a comps tool. DealGapIQ\'s core is the deal: every address, on-market or off-market, scored against six strategies, with a target buy price, the deal gap against the list price, and four paths plus a Blend to close it, each with a negotiation script.',
        ],
      },
      {
        heading: 'How much do DealGapIQ and DealMachine cost?',
        paragraphs: [
          `DealMachine Basic is $99 per seat a month, Pro is $149 per seat a month and Scale is $599 per package a month; annual billing saves 17%, and postcards are billed per piece from $0.70. DealMachine is free to explore without a card but a paid plan is needed to reveal contacts and export, and the vendor states it no longer offers a time-limited free trial. DealGapIQ is $0 with three discoveries a month and no card; Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually, with a 7-day trial and no per-record or per-piece fees.`,
        ],
      },
      {
        heading: 'Which one tells you what to offer?',
        paragraphs: [
          'Both publish a maximum offer figure for wholesaling, but only DealGapIQ reports the deal gap and the paths to close it. DealMachine\'s Wholesale MAO Calculator estimates a maximum allowable offer, buyer spread and assignment fee. DealGapIQ reports the target buy price for each of six strategies, the deal gap as a percentage and a dollar amount, and four paths plus a Blend (Price, Income, Terms, Equity) with a written negotiation script for each. Seller financing and subject-to sit in the Terms path; DealMachine does not list creative-finance modeling.',
        ],
      },
      {
        heading: 'Does either one need a mailing list or a motivated seller?',
        paragraphs: [
          'DealMachine is built for finding and mailing owners who may be motivated. DealGapIQ does not need a list or a motivated seller: any property qualifies, because the tool finds the gap and the structure that closes it, so you can make a structured offer on a normal listing.',
        ],
      },
      {
        heading: 'When should you use DealMachine instead?',
        paragraphs: [
          'Choose DealMachine when you drive neighborhoods, need owner contact data at scale, and run postcard campaigns. Choose DealGapIQ when you have an address and need the price at which it works, the gap to the asking price, and the offer that closes it. A DealMachine lead can be pasted straight into a DealGapIQ discovery.',
        ],
      },
    ],
    table: rows({
      price:
        'Basic $99/seat/mo; Pro $149/seat/mo; Scale $599/package/mo; annual billing saves 17%; mail from $0.70 per postcard',
      freePlan: 'Free to explore, no card; paid plan needed to reveal contacts and export',
      trial: 'None (vendor: "no longer offers a time-limited free trial")',
      strategies:
        'Public calculators: Rental Property, BRRRR, Wholesale MAO, Rehab Estimator, Mortgage; "wholesale, flip, or buy-and-hold"',
      targetBuy: 'Yes: Wholesale MAO Calculator (maximum allowable offer)',
      dealGap: NOT_LISTED,
      paths: 'Not listed (AI-generated postcards for outreach)',
      creative: NOT_LISTED,
      buyers: NOT_LISTED,
      lenders: NOT_LISTED,
      sources: 'Recorded sales (50M+), real-time MLS data, owner records (240M+ people); vendors not named',
      platforms: 'Web, iOS, Android',
    }),
    sources: [
      { label: 'dealmachine.com/pricing', url: 'https://www.dealmachine.com/pricing', accessed: PRICES_CHECKED },
      { label: 'dealmachine.com (home)', url: 'https://www.dealmachine.com/', accessed: PRICES_CHECKED },
      { label: 'dealmachine.com/tools', url: 'https://www.dealmachine.com/tools', accessed: PRICES_CHECKED },
      {
        label: 'dealmachine.com/features/comps-analysis',
        url: 'https://www.dealmachine.com/features/comps-analysis',
        accessed: PRICES_CHECKED,
      },
      {
        label: 'DealMachine help: is DealMachine free',
        url: 'https://help.dealmachine.com/en/articles/13186423-is-dealmachine-free-to-use-or-is-there-cost',
        accessed: PRICES_CHECKED,
      },
    ],
    faq: [
      {
        question: 'Can I use DealGapIQ with DealMachine leads?',
        answer:
          'Yes. Paste any address from DealMachine into a DealGapIQ discovery to get the target buy price, the deal gap and four paths plus a Blend with negotiation scripts. DealGapIQ does not replace the driving-for-dollars or mail side.',
      },
      {
        question: 'Does DealMachine have a free trial?',
        answer:
          'DealMachine states it is free to explore without a credit card but no longer offers a time-limited free trial; a paid plan from $99 per seat a month is needed to reveal contacts and export. DealGapIQ has a free plan with three discoveries a month and a 7-day Pro trial, neither needing a card.',
      },
      {
        question: 'Does DealGapIQ include driving for dollars or direct mail?',
        answer:
          'No. DealGapIQ analyzes properties and structures offers. It does include Point & Scan, which runs a discovery when you point your phone camera at a house, but it does not send mail or skip trace owners.',
      },
    ],
  },

  'dealgapiq-vs-mashvisor': {
    slug: 'dealgapiq-vs-mashvisor',
    competitor: 'Mashvisor',
    datePublished: '2026-05-18',
    dateModified: PRICES_CHECKED,
    metadata: {
      title: 'DealGapIQ vs Mashvisor: six-strategy deal gap vs rental market data',
      description:
        'Mashvisor compares traditional and Airbnb rentals from $39.99/mo. DealGapIQ scores six strategies, reports the deal gap and gives four paths plus a Blend.',
      alternates: { canonical: '/comparisons/dealgapiq-vs-mashvisor' },
    },
    headline: 'DealGapIQ vs Mashvisor',
    lede:
      'Mashvisor is a rental market data platform that tells you whether a property earns more as a traditional rental or an Airbnb, using heatmaps and neighborhood analytics; plans start at $39.99 a month billed annually. DealGapIQ scores any address against six strategies, reports the target buy price and the deal gap against the list price, and gives four paths plus a Blend to close the gap, starting free. Mashvisor is for choosing a market and a rental strategy; DealGapIQ is for pricing and structuring the offer.',
    sections: [
      {
        heading: 'What is the difference between DealGapIQ and Mashvisor?',
        paragraphs: [
          'Mashvisor covers two rental strategies, traditional (long-term) and Airbnb (short-term), with market-level tools: Market Finder, Property Finder, heatmaps, an Airbnb calculator and neighborhood analytics. DealGapIQ covers six strategies (long-term rental, short-term rental, BRRRR, fix and flip, house hack, wholesale) on one address and answers a different question: what price makes it work, how far the listing is from that price, and which of four paths plus a Blend closes the gap.',
        ],
      },
      {
        heading: 'How much do DealGapIQ and Mashvisor cost?',
        paragraphs: [
          `Mashvisor Lite is $39.99 a month billed annually ($479.88 a year), Standard is $74.99 a month billed annually and Professional is $99.99 a month billed annually; the vendor's help center states platform plans do not include a free trial, and custom data exports are billed per export. DealGapIQ is $0 with three discoveries a month and no card; Pro is ${PRO_MONTHLY_PRICE} a month or $${PRO_YEARLY_PER_MONTH} a month billed annually with a 7-day trial.`,
        ],
      },
      {
        heading: 'Which one tells you what to offer?',
        paragraphs: [
          'DealGapIQ does. It reports the target buy price for each strategy and the deal gap as a percentage and a dollar amount, then four paths plus a Blend (Price, Income, Terms, Equity) with a negotiation script for each. Mashvisor does not list a target price, an offer calculator, or negotiation scripts; its output is rental income, occupancy, cash flow and cap rate comparisons for the two rental strategies.',
        ],
      },
      {
        heading: 'Where does each one get its data?',
        paragraphs: [
          `Mashvisor names its sources: the MLS, Zillow, Rentometer, Airbnb.com and the Census Bureau. DealGapIQ pulls valuation and listing data from ${SOURCE_COUNT} sources, including Zillow, Redfin, Realtor.com and RentCast, and shows them side by side so you can read the spread; short-term rental revenue and occupancy estimates come from AirROI.`,
        ],
      },
      {
        heading: 'When should you use Mashvisor instead?',
        paragraphs: [
          'Choose Mashvisor when you are picking a city or neighborhood for a short-term rental and want market heatmaps and occupancy data before you have an address. Choose DealGapIQ when you have an address and need the price, the gap and the offer, for any of six strategies.',
        ],
      },
    ],
    table: rows({
      price:
        'Lite $39.99/mo billed annually ($479.88/yr); Standard $74.99/mo billed annually; Professional $99.99/mo billed annually; custom exports $30–$35 each',
      freePlan: 'No (an API free plan only)',
      trial: 'None for platform plans, per the vendor help center',
      strategies: 'Two rental strategies: traditional (long-term) and Airbnb (short-term)',
      targetBuy: NOT_LISTED,
      dealGap: NOT_LISTED,
      paths: NOT_LISTED,
      creative: NOT_LISTED,
      buyers: NOT_LISTED,
      lenders: NOT_LISTED,
      sources: 'Named: MLS, Zillow, Rentometer, Airbnb.com, Census Bureau',
      platforms: 'Web; mobile apps not stated',
    }),
    sources: [
      { label: 'mashvisor.com/pricing', url: 'https://www.mashvisor.com/pricing', accessed: PRICES_CHECKED },
      { label: 'mashvisor.com (home)', url: 'https://www.mashvisor.com/', accessed: PRICES_CHECKED },
      { label: 'mashvisor.com/faq', url: 'https://www.mashvisor.com/faq', accessed: PRICES_CHECKED },
      {
        label: 'Mashvisor help: free trial',
        url: 'https://help.mashvisor.com/en/articles/2336754-does-mashvisor-offer-a-free-trial',
        accessed: PRICES_CHECKED,
      },
    ],
    faq: [
      {
        question: 'Does DealGapIQ use Mashvisor data?',
        answer:
          'No. DealGapIQ blends Zillow, Redfin, Realtor.com and RentCast for valuations and rent, and sources short-term rental revenue, nightly rate and occupancy projections from AirROI.',
      },
      {
        question: 'Does Mashvisor analyze flips, BRRRR or wholesale deals?',
        answer:
          'Mashvisor lists two rental strategies, traditional and Airbnb, and does not list flip, BRRRR or wholesale calculators. DealGapIQ scores every address against long-term rental, short-term rental, BRRRR, fix and flip, house hack, and wholesale.',
      },
      {
        question: 'Does Mashvisor have a free trial?',
        answer:
          'Mashvisor\'s help center states its platform subscriptions do not currently include a free trial; a free plan exists for API access only. DealGapIQ has a free plan with three discoveries a month and a 7-day Pro trial, neither needing a card.',
      },
    ],
  },
}

/** Named-tool columns on the home comparison table (Mashvisor is linked, not a fifth column). */
export const HOME_COMPARISON_SLUGS = [
  'dealgapiq-vs-dealcheck',
  'dealgapiq-vs-propstream',
  'dealgapiq-vs-dealmachine',
] as const

/**
 * Home page matrix: one row per comparison-page capability, cells copied
 * from each vendor's sourced table. Nothing is inferred here.
 */
export function getHomeComparisonTable() {
  const pages = HOME_COMPARISON_SLUGS.map((slug) => COMPARISON_PAGES[slug])
  const first = pages[0]
  return {
    competitors: pages.map((page) => page.competitor),
    rows: first.table.map((row) => ({
      label: row.label,
      dealgapiq: row.dealgapiq,
      competitors: pages.map((page) => {
        const match = page.table.find((candidate) => candidate.label === row.label)
        if (!match) {
          throw new Error(`Missing comparison row "${row.label}" on ${page.slug}`)
        }
        return match.competitor
      }),
    })),
    sources: pages.flatMap((page) => page.sources),
    checked: PRICES_CHECKED,
  }
}
