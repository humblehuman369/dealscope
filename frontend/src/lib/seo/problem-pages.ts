/**
 * Config for the problem-intent landing pages at /answers/[slug].
 *
 * Each entry is one distinct investor problem from the 50-problem list in
 * docs/marketing/DIRECT_RESPONSE_PLAYBOOK.md §3. Adding a page is adding an
 * entry here; the route, sitemap and hub read from this array. Keyword
 * variants of an existing problem belong in that entry's FAQ, not as a new
 * entry.
 *
 * Headlines follow the direct-response formula the playbook adopts:
 * problem (H1) → agitate → next step, with the guarantee line fixed.
 */

import type { FaqItem } from '@/lib/seo/metadata'

export type ProblemPersona =
  | 'first-time'
  | 'active'
  | 'wholesaler'
  | 'house-hacker'
  | 'cold-market'

export type StrategyPath =
  | 'verdict'
  | 'income-value'
  | 'target-buy'
  | 'rent-estimate'
  | 'financing'
  | 'house-hack'
  | 'wholesale'

export interface ProblemStep {
  heading: string
  body: string
}

export interface ProblemPage {
  slug: string
  /** H1. Phrased the way the investor searches or says it. */
  problem: string
  /** One or two sentences that name the cost of not knowing. */
  agitate: string
  /** The single next action. Always leads to the address input. */
  nextStep: string
  metaTitle: string
  metaDescription: string
  persona: ProblemPersona
  strategyPath: StrategyPath
  /** Exactly three. */
  steps: [ProblemStep, ProblemStep, ProblemStep]
  faq: FaqItem[]
  relatedSlugs: string[]
  blogSlugs: string[]
}

export const GUARANTEE_LINE = 'Free verdict. No signup. No card.'

export const PROBLEM_PAGES: ProblemPage[] = [
  {
    slug: 'is-this-a-good-investment-property',
    problem: 'Is this a good investment property?',
    agitate:
      'The listing shows a price. It does not show what the property is worth as a rental, what it costs to carry, or how far the asking price sits from a number that works. Most investors find out after the tour.',
    nextStep: 'Paste the address. The verdict runs free in 15 seconds and shows the Deal Gap.',
    metaTitle: 'Is This a Good Investment Property? Free 15-Second Verdict',
    metaDescription:
      'Paste any US address and get a free investor verdict: multi-source value, rent estimate, Deal Gap between asking and target buy, and six strategy snapshots. No signup.',
    persona: 'first-time',
    strategyPath: 'verdict',
    steps: [
      {
        heading: 'Value and rent from multiple sources',
        body: 'Zillow, RentCast and Redfin estimates are pulled live and blended into one IQ Estimate. Every source is shown, nothing is fabricated.',
      },
      {
        heading: 'The Deal Gap',
        body: 'The verdict compares the asking price to the price at which the property works as a rental, with the state tax, vacancy and appreciation assumptions applied.',
      },
      {
        heading: 'Six strategies at a glance',
        body: 'Long-term rental, short-term rental, BRRRR, fix and flip, house hack and wholesale, each with its own snapshot so you see which one the property supports.',
      },
    ],
    faq: [
      {
        question: 'What makes a property a good investment?',
        answer:
          'For a rental, it is whether the income covers taxes, insurance, vacancy, maintenance, reserves and the mortgage with margin left. DealGapIQ expresses that as an Income Value and shows the gap between it and the asking price.',
      },
      {
        question: 'Do I need an account to check a property?',
        answer:
          'No. The first verdicts run without signup or a card. A free account adds saved properties and ten analyses a month; Pro unlocks editable assumptions, comps and exports.',
      },
      {
        question: 'Does the verdict work on off-market or unlisted properties?',
        answer:
          'Yes. Any US street address resolves to public records and live estimates. If a source has no data for the address, that field shows as unavailable rather than a guess.',
      },
      {
        question: 'Is this investment advice?',
        answer:
          'No. DealGapIQ analyzes; you decide. Every figure shows its source and the assumptions behind it so you can check the work.',
      },
    ],
    relatedSlugs: ['does-this-rental-cash-flow', 'what-should-i-offer-on-this-house', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'what-is-the-deal-gap'],
  },
  {
    slug: 'does-this-rental-cash-flow',
    problem: 'Does this rental cash flow?',
    agitate:
      'Most listings do not, once property tax, vacancy, insurance and reserves come off the top of the rent. A spreadsheet takes 45 minutes per property and still depends on the rent you typed in.',
    nextStep: 'Paste the address. The verdict pulls live rent estimates and runs the full rental P&L free.',
    metaTitle: 'Does This Rental Cash Flow? Free Rental Property Cash Flow Check',
    metaDescription:
      'Check whether a rental cash flows before you tour it. Live rent estimates, state tax and vacancy assumptions, and the price at which the numbers work. Free, no signup.',
    persona: 'first-time',
    strategyPath: 'income-value',
    steps: [
      {
        heading: 'Rent from live sources',
        body: 'RentCast and Zillow rent estimates are pulled for the exact address and averaged into one IQ rent figure. You see each source.',
      },
      {
        heading: 'Expenses that match the state',
        body: 'Property tax, vacancy and appreciation come from the state market table; insurance is derived from value. Every line can be overridden per deal.',
      },
      {
        heading: 'Cash flow and the break-even price',
        body: 'The long-term rental snapshot shows monthly cash flow at the asking price and the Income Value at which cash flow turns positive.',
      },
    ],
    faq: [
      {
        question: 'What counts as positive cash flow?',
        answer:
          'Rent minus vacancy, taxes, insurance, management, maintenance, reserves and debt service, with money left over every month. DealGapIQ shows each of those lines so you can see which one breaks the deal.',
      },
      {
        question: 'Where does the rent estimate come from?',
        answer:
          'From RentCast and Zillow for the specific address, averaged when both are in range. If neither reports rent, the field shows unavailable; DealGapIQ never fabricates rent from a percentage of price.',
      },
      {
        question: 'Can I change the down payment or interest rate?',
        answer:
          'Yes. The free verdict uses default financing; the Pro workbench lets you edit every assumption and watch the cash flow update.',
      },
    ],
    relatedSlugs: ['is-this-a-good-investment-property', 'how-much-rent-will-this-property-get', 'what-should-i-offer-on-this-house'],
    blogSlugs: ['cash-flow-positive-rental-properties', 'cap-rate-vs-cash-on-cash-return'],
  },
  {
    slug: 'what-should-i-offer-on-this-house',
    problem: 'What should I offer on this house?',
    agitate:
      'Offer too high and the deal never cash flows. Offer too low with no reason attached and the seller stops answering. Most investors guess a percentage off list and hope.',
    nextStep: 'Paste the address. The verdict shows the Target Buy price and four ways to structure the offer.',
    metaTitle: 'What Should I Offer on This House? Target Buy Price + 4 Offer Structures',
    metaDescription:
      'Get the price at which an investment property works, then four offer structures that close the gap: price, capital, financing or a blended plan, each with a script. Free.',
    persona: 'first-time',
    strategyPath: 'target-buy',
    steps: [
      {
        heading: 'Target Buy price',
        body: 'The price at which the property meets your return target after real expenses, computed from live value and rent estimates.',
      },
      {
        heading: 'Four offer structures',
        body: 'A price cut, a capital ask, a financing change such as seller carry, and a blended plan of smaller asks that reaches the same math.',
      },
      {
        heading: 'The script for each',
        body: 'Who to call, the frame, the opener, the ask and what is in it for the seller. Print it or copy it before the call.',
      },
    ],
    faq: [
      {
        question: 'How is the Target Buy price calculated?',
        answer:
          'It works backward from the income the property can produce: rent minus expenses at the state assumptions, then the purchase price that leaves your required return after debt service.',
      },
      {
        question: 'What if the seller will not drop the price?',
        answer:
          'Price is one of four levers. Seller financing, a 0% second, a rate buydown or a capital contribution can reach the same numbers without a headline price cut. The verdict shows which apply.',
      },
      {
        question: 'Are the negotiation scripts free?',
        answer:
          'Yes. The Four Paths and their scripts are included in the free tier.',
      },
    ],
    relatedSlugs: ['seller-wont-lower-the-price', 'is-this-a-good-investment-property', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['how-to-make-an-offer-on-an-investment-property', 'lake-worth-teardown-four-offer-structures'],
  },
  {
    slug: 'how-much-rent-will-this-property-get',
    problem: 'How much rent will this property get?',
    agitate:
      'A rent estimate that is $200 too high turns a cash-flowing deal into a monthly loss. Listing agents quote the optimistic number; you need the one the data supports.',
    nextStep: 'Paste the address. The verdict shows rent estimates from each source, side by side, free.',
    metaTitle: 'How Much Rent Will This Property Get? Multi-Source Rent Estimate',
    metaDescription:
      'See RentCast and Zillow rent estimates for any US address side by side, blended into one IQ rent figure, and what that rent means for cash flow. Free, no signup.',
    persona: 'first-time',
    strategyPath: 'rent-estimate',
    steps: [
      {
        heading: 'Each source, shown',
        body: 'RentCast and Zillow rent estimates for the exact address. When they disagree by more than 15%, the verdict flags it.',
      },
      {
        heading: 'One IQ rent figure',
        body: 'In-range sources are averaged; an outlier is dropped. If no source has rent for the address, the field reads unavailable.',
      },
      {
        heading: 'Rent to cash flow',
        body: 'The rent feeds the long-term rental snapshot so you see what it supports after taxes, vacancy and the mortgage.',
      },
    ],
    faq: [
      {
        question: 'Why do rent estimates differ between sources?',
        answer:
          'Each provider uses different comparables and update cadences. Showing both, and the gap between them, is more honest than picking one.',
      },
      {
        question: 'Can I compare against actual rental comps?',
        answer:
          'Pro includes rental comps around the subject property with distance, bedrooms and listed rent, so you can check the estimate against what is actually asking nearby.',
      },
      {
        question: 'Does this cover short-term rental income?',
        answer:
          'The short-term rental snapshot uses separate STR market data where available and shows it as unavailable where it is not.',
      },
    ],
    relatedSlugs: ['does-this-rental-cash-flow', 'is-this-a-good-investment-property'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'cash-flow-positive-rental-properties'],
  },
  {
    slug: 'seller-wont-lower-the-price',
    problem: "The seller won't lower the price. Is there another way?",
    agitate:
      'A 6% price cut is a no. Walking away is the default. But the same math can be reached with three smaller asks the seller can actually say yes to, and most investors never put them on the table.',
    nextStep: 'Paste the address. The verdict shows which financing and capital structures close the gap without a headline price cut.',
    metaTitle: "Seller Won't Lower the Price? Offer Structures That Close the Gap",
    metaDescription:
      'When the seller holds firm, seller financing, a 0% second, a rate buydown or a blended plan can reach the same numbers. See which apply to a specific address, free.',
    persona: 'cold-market',
    strategyPath: 'financing',
    steps: [
      {
        heading: 'Measure the gap',
        body: 'The verdict shows how far the asking price sits from the price at which the property works, in dollars.',
      },
      {
        heading: 'Split it into levers',
        body: 'Seller carryback, 0% second, rate buydown, subject-to, or a capital contribution. Each one is modeled against the real numbers for this address.',
      },
      {
        heading: 'Pitch what is in it for them',
        body: 'Each structure comes with the script: the seller gets full price on paper, a faster close, or monthly income. You get the cash flow.',
      },
    ],
    faq: [
      {
        question: 'What is a seller carryback?',
        answer:
          'The seller finances part of the price and receives payments over time instead of all cash at closing. It lets the seller hold the asking price while you lower the cash and debt you bring to the deal.',
      },
      {
        question: 'Is a blended plan realistic?',
        answer:
          'Three small asks, such as a 2% price reduction, a modest seller second and verified rent, often reach the same math as a 6% cut and are far more likely to get a yes. The verdict shows the blend that fits.',
      },
      {
        question: 'Is subject-to legal?',
        answer:
          'Subject-to purchases are legal; the lender may have a due-on-sale clause it can enforce. DealGapIQ models the numbers and flags the risk. It does not give legal advice.',
      },
    ],
    relatedSlugs: ['what-should-i-offer-on-this-house', 'is-this-a-good-investment-property'],
    blogSlugs: ['creative-finance-field-guide', 'subject-to-pitch-script-template', 'lake-worth-teardown-four-offer-structures'],
  },
  {
    slug: 'can-i-house-hack-this-property',
    problem: 'Can I house hack this property?',
    agitate:
      'Living in one unit while tenants pay the mortgage is the cheapest way into real estate, but only if the other units cover enough. Guess wrong and you bought an expensive house, not a first deal.',
    nextStep: 'Paste the address. The house-hack snapshot shows what the rented units cover and what you pay to live there.',
    metaTitle: 'Can I House Hack This Property? Free House Hack Analysis',
    metaDescription:
      'See whether a duplex, triplex or house with a rentable unit covers your mortgage while you live there, using live rent estimates and owner-occupied financing. Free.',
    persona: 'house-hacker',
    strategyPath: 'house-hack',
    steps: [
      {
        heading: 'Rent for the units you do not occupy',
        body: 'Live rent estimates for the address, scaled to the units you rent out.',
      },
      {
        heading: 'Owner-occupied financing',
        body: 'The snapshot models low-down-payment terms and shows your effective monthly housing cost after rent.',
      },
      {
        heading: 'The exit',
        body: 'When you move out, the same property becomes a full rental; the long-term rental snapshot sits alongside so you see both numbers.',
      },
    ],
    faq: [
      {
        question: 'What is house hacking?',
        answer:
          'Buying a property with owner-occupied financing, living in part of it and renting the rest, so tenants cover most or all of the mortgage while you build equity.',
      },
      {
        question: 'Does it only work for multifamily?',
        answer:
          'No. A single family with a basement apartment, ADU or spare rooms can work. The snapshot reflects whatever rentable units the address supports.',
      },
      {
        question: 'Can I compare FHA versus conventional terms?',
        answer:
          'Editable financing assumptions are a Pro feature; the free verdict uses standard owner-occupied defaults.',
      },
    ],
    relatedSlugs: ['does-this-rental-cash-flow', 'is-this-a-good-investment-property'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'hard-money-vs-dscr-loans'],
  },
  {
    slug: 'what-is-this-property-worth-to-an-investor',
    problem: 'What is this property worth to an investor?',
    agitate:
      'A homeowner pays for the kitchen. An investor pays for the income. The Zestimate tells you the first number; almost nothing tells you the second, and the difference is the whole negotiation.',
    nextStep: 'Paste the address. The verdict shows Income Value next to market value, free.',
    metaTitle: 'What Is This Property Worth to an Investor? Income Value vs Market Value',
    metaDescription:
      'See the income-based value of any US property next to its market estimates. The gap between them is your negotiating room. Free verdict, no signup.',
    persona: 'active',
    strategyPath: 'income-value',
    steps: [
      {
        heading: 'Market value from three sources',
        body: 'Zillow, RentCast and Redfin value estimates, blended into one IQ Estimate with each source shown.',
      },
      {
        heading: 'Income Value',
        body: 'The price at which the rent, after state-level expenses and financing, produces a positive return. This is what the property is worth as a business.',
      },
      {
        heading: 'The gap',
        body: 'Asking price minus Income Value, in dollars and percent. That number is your offer conversation.',
      },
    ],
    faq: [
      {
        question: 'Why is Income Value usually lower than market value?',
        answer:
          'Owner-occupants bid on lifestyle; investors bid on cash flow. In most markets today, rents have not kept pace with prices, so the income-supported price sits below the retail price.',
      },
      {
        question: 'Does a negative gap mean there is no deal?',
        answer:
          'No. It means the deal needs structure. The Four Paths show whether financing, capital or a blended plan can close the gap at a price the seller accepts.',
      },
      {
        question: 'Can I see the assumptions behind Income Value?',
        answer:
          'Yes. Every state assumption is published on the /markets pages and shown in the verdict. Pro lets you edit them per deal.',
      },
    ],
    relatedSlugs: ['is-this-a-good-investment-property', 'what-should-i-offer-on-this-house', 'does-this-rental-cash-flow'],
    blogSlugs: ['what-is-the-deal-gap', 'cap-rate-vs-cash-on-cash-return'],
  },
  {
    slug: 'should-i-wholesale-this-deal',
    problem: 'Should I wholesale this deal or keep it?',
    agitate:
      'An assignment fee today or cash flow for a decade. Choosing wrong on a good lead is expensive either way, and the answer depends on numbers most wholesalers estimate in their head.',
    nextStep: 'Paste the address. The verdict shows the wholesale snapshot next to the rental and flip snapshots, free.',
    metaTitle: 'Should I Wholesale This Deal? Wholesale vs Hold vs Flip Analysis',
    metaDescription:
      'Compare the assignment-fee math against holding or flipping the same property, using live value and rent estimates and the price a cash buyer will pay. Free, no signup.',
    persona: 'wholesaler',
    strategyPath: 'wholesale',
    steps: [
      {
        heading: 'What a cash buyer pays',
        body: 'The wholesale snapshot estimates the maximum allowable offer an end buyer supports from repaired value and rehab.',
      },
      {
        heading: 'Your spread',
        body: 'Contract price versus buyer price, less costs, equals the assignment fee this address can carry.',
      },
      {
        heading: 'The alternatives, side by side',
        body: 'Long-term rental and fix-and-flip snapshots for the same address so you compare the fee against what keeping it would produce.',
      },
    ],
    faq: [
      {
        question: 'How is the assignment fee estimated?',
        answer:
          'From the difference between the price a cash buyer can pay, based on repaired value and rehab, and the price you can contract. Both inputs are shown so you can adjust them.',
      },
      {
        question: 'How do I find cash buyers for the deal?',
        answer:
          'Pro includes a verified cash buyer directory filterable by state and city. The /markets pages show how many buyers are active in each state.',
      },
      {
        question: 'Can I analyze an off-market lead with no listing?',
        answer:
          'Yes. Any US street address resolves to public records and live estimates, listed or not.',
      },
    ],
    relatedSlugs: ['what-should-i-offer-on-this-house', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['how-to-find-off-market-properties', 'brrrr-vs-fix-and-flip'],
  },
]

const BY_SLUG = new Map(PROBLEM_PAGES.map((p) => [p.slug, p]))

export function getProblemPage(slug: string): ProblemPage | null {
  return BY_SLUG.get(slug) ?? null
}
