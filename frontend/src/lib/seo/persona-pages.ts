/**
 * Config for the persona listicle landing pages at /for/[slug].
 *
 * One base page, many persona variants. The shared reason pool below is the
 * base page; each persona entry picks from it and adds two to four reasons
 * written for that persona only, then changes the headline. That is the
 * whole variant: headline plus a couple of reasons, the rest stays the same.
 * See docs/marketing/LISTICLE_LANDING_PAGES.md.
 *
 * These are ad landing pages first. Every entry ships `indexable: false`;
 * flip it only when the persona content is substantially unique, or the
 * family becomes near-duplicate content for Google.
 *
 * Copy rules: every reason is a verifiable product fact. Free = 10 analyses
 * and 10 saves a month. Pro features are marked "(Pro)". Directories and
 * exports unlock with the first payment, never during trial. Nothing is
 * fabricated; when a source has no data the product says unavailable.
 */

import type { FaqItem } from '@/lib/seo/metadata'
import type { ProblemPersona } from '@/lib/seo/problem-pages'

export type PersonaKey =
  | ProblemPersona
  | 'out-of-state'
  | 'brrrr'
  | 'portfolio-builder'
  | 'dscr-borrower'

export interface Reason {
  id: string
  heading: string
  body: string
}

export interface PersonaPage {
  slug: string
  persona: PersonaKey
  /** H1. "N reasons [persona] [do the smart thing]". N must equal the reason count. */
  headline: string
  /** One paragraph that names the persona's situation before the list starts. */
  intro: string
  /** Picks from BASE_REASONS, rendered after the persona reasons. */
  reasonIds: string[]
  /** Two to four reasons written for this persona only. Rendered first. */
  personaReasons: Reason[]
  /** The "run it on your address" block above the second address input. */
  offer: { heading: string; body: string }
  faq: FaqItem[]
  relatedAnswerSlugs: string[]
  blogSlugs: string[]
  /** False for ad-only pages. True adds the page to the sitemap and allows indexing. */
  indexable: boolean
  metaTitle: string
  metaDescription: string
}

export const BASE_REASONS: Reason[] = [
  {
    id: 'free-verdict',
    heading: 'Discovery runs in 15 seconds, free',
    body: 'Paste any US address. Multi-source value, a rent estimate, the Deal Gap and six strategy snapshots come back without a signup or a card.',
  },
  {
    id: 'three-sources',
    heading: 'Three value sources, shown side by side',
    body: 'Zillow, RentCast and Redfin estimates are pulled live and blended into one IQ Estimate. Every source stays visible. When one has no data for the address it reads unavailable; nothing is made up.',
  },
  {
    id: 'income-value',
    heading: 'What it is worth to an investor, not a homeowner',
    body: 'Income Value is the price at which the rent covers taxes, insurance, vacancy, reserves and the mortgage with margin left. It sits next to market value so you see both numbers and the distance between them.',
  },
  {
    id: 'deal-gap',
    heading: 'The Deal Gap, in dollars',
    body: 'Asking price minus the price that works. That one number is the offer conversation, and it is on the screen before you have spoken to anyone.',
  },
  {
    id: 'four-paths',
    heading: 'Four ways to close the gap when price alone will not',
    body: 'A price cut, a capital ask, a financing change such as seller carry or a 0% second, or a blended plan of smaller asks that reaches the same math. Each is modeled on this address.',
  },
  {
    id: 'scripts',
    heading: 'A negotiation script for each path',
    body: 'Who to call, the frame, the opener, the ask and what is in it for the seller. Print it, email it or copy it before the call. The scripts are included free.',
  },
  {
    id: 'six-strategies',
    heading: 'Six strategies on one address',
    body: 'Long-term rental, short-term rental, BRRRR, fix and flip, house hack and wholesale, each as its own snapshot, so you see which one the property actually supports.',
  },
  {
    id: 'off-market',
    heading: 'Works on addresses that are not listed',
    body: 'Any US street address resolves to public records and live estimates, listed or not. An off-market lead gets the same Discovery as a Zillow listing.',
  },
  {
    id: 'state-assumptions',
    heading: 'The assumptions are published, not hidden',
    body: 'Property tax, vacancy and appreciation for every state are on the /markets pages and shown in every Discovery. Pro lets you edit them per deal and watch the math change.',
  },
  {
    id: 'phone-first',
    heading: 'Built for the phone you already have out',
    body: 'Paste a Zillow link or an address, or scan the property from the camera in the iOS and Android apps. Same Discovery, same numbers, wherever you are standing.',
  },
]

const BASE_BY_ID = new Map(BASE_REASONS.map((r) => [r.id, r]))

export function getBaseReason(id: string): Reason | null {
  return BASE_BY_ID.get(id) ?? null
}

export const PERSONA_PAGES: PersonaPage[] = [
  {
    slug: 'first-time-investors',
    persona: 'first-time',
    headline: '9 reasons first-time investors run the address before the showing',
    intro:
      'The first deal is the one you learn on, and most of that learning happens after the drive, the tour and the spreadsheet. First-time investors who run the address first find out in 15 seconds whether the property is worth the Saturday.',
    personaReasons: [
      {
        id: 'plain-english',
        heading: 'A plain-English explanation, not a wall of ratios',
        body: 'Discovery explains the number the way a friend who invests would. You do not need to know what a cap rate is to read it; the terms are defined where they appear.',
      },
      {
        id: 'before-the-tour',
        heading: 'You find out before the tour, not after',
        body: 'Most first-time investors learn a listing does not pencil after the showing. Fifteen seconds on the address replaces that afternoon, and the next one.',
      },
      {
        id: 'ten-free',
        heading: 'Ten analyses a month on the free account',
        body: 'Enough to run every property from a weekend of searching, with up to ten saved so you can come back to the ones that held up.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'income-value', 'deal-gap', 'four-paths', 'six-strategies'],
    offer: {
      heading: 'Run it on the listing you are looking at right now',
      body: 'Paste the address. Discovery is free, there is no signup and no card, and the Four Paths and scripts are included.',
    },
    faq: [
      {
        question: 'Do I need to know real estate math to use this?',
        answer:
          'No. Discovery is written in plain English and every figure shows where it came from. The metrics glossary and the /methodology page explain each number if you want to go deeper.',
      },
      {
        question: 'What happens after free Discovery?',
        answer:
          'Nothing you do not choose. A free account adds ten analyses a month and ten saved properties. Pro unlocks editable assumptions, comps and exports if you want them.',
      },
      {
        question: 'Is this investment advice?',
        answer: 'No. DealGapIQ analyzes; you decide. Every number shows its source and assumptions so you can check the work.',
      },
    ],
    relatedAnswerSlugs: ['is-this-a-good-investment-property', 'does-this-rental-cash-flow', 'what-should-i-offer-on-this-house'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'what-is-the-deal-gap'],
    indexable: false,
    metaTitle: '9 Reasons First-Time Investors Run the Address Before the Showing',
    metaDescription:
      'A free 15-second Discovery on any US address: value, rent, the Deal Gap and six strategies, explained in plain English. Why first-time investors check before they tour.',
  },
  {
    slug: 'house-hackers',
    persona: 'house-hacker',
    headline: '8 reasons house hackers check the numbers before the FHA pre-approval',
    intro:
      'Living in one unit while tenants pay the mortgage is the cheapest way into real estate, but only if the other units cover enough. House hackers who run the address first know what they will actually pay to live there before the lender asks for documents.',
    personaReasons: [
      {
        id: 'owner-occupied',
        heading: 'Owner-occupied financing is modeled, not approximated',
        body: 'The house-hack snapshot uses low-down-payment terms and shows your effective monthly housing cost after the other units\u2019 rent comes in.',
      },
      {
        id: 'units-cover',
        heading: 'You see what the rented units cover',
        body: 'Live rent estimates for the address, scaled to the units you do not occupy. The difference between that and the payment is what the house costs you each month.',
      },
      {
        id: 'the-exit',
        heading: 'The exit is on the same screen',
        body: 'When you move out the property becomes a full rental. The long-term rental snapshot sits beside the house-hack one, so you know what it turns into before you buy it.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'deal-gap', 'four-paths', 'state-assumptions'],
    offer: {
      heading: 'Run the duplex before you run the pre-approval',
      body: 'Paste the address. The house-hack snapshot is part of free Discovery, no signup and no card.',
    },
    faq: [
      {
        question: 'Does it only work for duplexes and triplexes?',
        answer:
          'No. A single family with a basement apartment, ADU or spare rooms works too. The snapshot reflects whatever rentable units the address supports.',
      },
      {
        question: 'Can I compare FHA against conventional terms?',
        answer:
          'Free Discovery uses standard owner-occupied defaults. Editing the down payment, rate and term per deal is a Pro feature.',
      },
      {
        question: 'Is this financial advice?',
        answer: 'No. DealGapIQ analyzes; you decide. Talk to your lender about what you qualify for.',
      },
    ],
    relatedAnswerSlugs: ['can-i-house-hack-this-property', 'does-this-rental-cash-flow'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'cash-flow-positive-rental-properties'],
    indexable: false,
    metaTitle: '8 Reasons House Hackers Check the Numbers Before the FHA Pre-Approval',
    metaDescription:
      'See what the rented units cover and what you pay to live there, with owner-occupied financing modeled on the actual address. Free Discovery, no signup.',
  },
  {
    slug: 'wholesalers',
    persona: 'wholesaler',
    headline: '9 reasons wholesalers run Discovery before they make the call',
    intro:
      'A lead is a phone number and an address. What a cash buyer will pay for it, what you can contract it at, and whether assigning it is even the right move are numbers most wholesalers estimate in their head on the way to the call. Fifteen seconds puts them on the screen first.',
    personaReasons: [
      {
        id: 'mao',
        heading: 'What a cash buyer will actually pay',
        body: 'The wholesale snapshot estimates the maximum allowable offer an end buyer supports from repaired value and rehab. Both inputs are shown so you can adjust them.',
      },
      {
        id: 'spread',
        heading: 'Your spread, in dollars',
        body: 'Contract price versus buyer price, less costs, equals the assignment fee this address can carry. You know the number before you name a price.',
      },
      {
        id: 'assign-or-hold',
        heading: 'Assign, hold or flip, side by side',
        body: 'The long-term rental and fix-and-flip snapshots sit next to the wholesale one for the same address, so you see when a fee today is leaving a decade of cash flow on the table.',
      },
      {
        id: 'buyer-directory',
        heading: 'A verified cash buyer directory by market (Pro)',
        body: 'Filter buyers by state and city when you have a deal to move. The directory unlocks with the first Pro payment.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'off-market', 'phone-first', 'deal-gap'],
    offer: {
      heading: 'Run the lead before you dial',
      body: 'Paste the address from the lead sheet. The wholesale snapshot is part of free Discovery, no signup and no card.',
    },
    faq: [
      {
        question: 'Can I run a lead that has never been listed?',
        answer:
          'Yes. Any US street address resolves to public records and live estimates. If a source has no data for the address that field reads unavailable rather than a guess.',
      },
      {
        question: 'How is the assignment fee estimated?',
        answer:
          'From the difference between the price a cash buyer can pay, based on repaired value and rehab, and the price you can contract at. Both inputs are visible and adjustable.',
      },
      {
        question: 'Is the cash buyer directory in the free trial?',
        answer: 'No. Directories and exports unlock with your first payment, not during the trial.',
      },
    ],
    relatedAnswerSlugs: ['should-i-wholesale-this-deal', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['how-to-find-off-market-properties', 'brrrr-vs-fix-and-flip'],
    indexable: false,
    metaTitle: '9 Reasons Wholesalers Run Discovery Before They Make the Call',
    metaDescription:
      'MAO, the spread and assign-vs-hold on any lead in 15 seconds, listed or not. Why wholesalers run the address before they dial. Free Discovery, no signup.',
  },
  {
    slug: 'brrrr-investors',
    persona: 'brrrr',
    headline: '8 reasons BRRRR investors stopped rebuilding the same spreadsheet',
    intro:
      'Buy, rehab, rent, refinance, repeat is five spreadsheets pretending to be one, and the refinance tab is where most of them break. BRRRR investors who run the address first see whether the refinance is worth the rehab before they open Excel.',
    personaReasons: [
      {
        id: 'brrrr-vs-rental',
        heading: 'BRRRR against a straight rental on the same house',
        body: 'Both snapshots run on the same address, so you see whether the rehab and refinance beat buying it as-is and holding.',
      },
      {
        id: 'rehab-estimator',
        heading: 'Rehab estimates with regional costs (Pro)',
        body: 'Quick presets, regional cost data, budget versus actual with receipt upload, synced into the Deal Maker worksheet so the rehab number and the deal number never drift apart.',
      },
      {
        id: 'editable',
        heading: 'Every assumption editable, every number recalculated (Pro)',
        body: 'Change the after-repair value, the rehab, the holding period, the refinance rate or the refinance LTV. Cash flow and cash left in the deal update as you type.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'income-value', 'four-paths', 'six-strategies'],
    offer: {
      heading: 'Run the address before you run the rehab budget',
      body: 'Paste it. The BRRRR snapshot is part of free Discovery, no signup and no card.',
    },
    faq: [
      {
        question: 'Where does the after-repair value come from?',
        answer:
          'Free Discovery starts from the blended IQ Estimate. Pro comps let you set ARV from adjusted sale comparables and apply it to the deal.',
      },
      {
        question: 'Can I model the refinance terms?',
        answer:
          'The free snapshot uses default refinance assumptions. Editing the refinance rate, loan-to-value and holding period is part of the Pro workbench.',
      },
      {
        question: 'Is this investment advice?',
        answer: 'No. DealGapIQ analyzes; you decide. Every figure shows its source and assumptions.',
      },
    ],
    relatedAnswerSlugs: ['is-this-a-good-investment-property', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['brrrr-vs-fix-and-flip', 'hard-money-vs-dscr-loans'],
    indexable: false,
    metaTitle: '8 Reasons BRRRR Investors Stopped Rebuilding the Same Spreadsheet',
    metaDescription:
      'BRRRR next to a straight rental on the same address, rehab estimates with regional costs, every assumption editable. Free 15-second Discovery, no signup.',
  },
  {
    slug: 'creative-finance-buyers',
    persona: 'cold-market',
    headline: '8 reasons creative-finance buyers pull up the Four Paths before they pitch',
    intro:
      'You know what subject-to and a seller carryback are. The freeze happens on the phone, when the seller says no to the price and you need three smaller asks that reach the same math. The Four Paths put those asks, and the words for them, on the screen before you dial.',
    personaReasons: [
      {
        id: 'structures-modeled',
        heading: 'Sub2, seller carry, 0% seconds and buydowns against real numbers',
        body: 'Each structure is modeled on this address\u2019s live value and rent, not a hypothetical. You see the monthly payment and cash flow each one produces.',
      },
      {
        id: 'whats-in-it',
        heading: 'The \u201cwhat\u2019s in it for the seller\u201d is written for you',
        body: 'Full price on paper, a faster close, monthly income: the script frames each ask in the seller\u2019s terms, with the opener and the ask spelled out.',
      },
      {
        id: 'blended-plan',
        heading: 'The blended plan: three small asks that equal one big one',
        body: 'A 2% price reduction, a modest seller second and verified rent often reach the same math as a 6% cut, and are far more likely to get a yes. Discovery shows the blend that fits this address.',
      },
      {
        id: 'risk-flagged',
        heading: 'Risk is flagged, not hidden',
        body: 'Due-on-sale exposure on a subject-to is named on the card. Wraparounds and land contracts are not modeled. We analyze; you decide.',
      },
    ],
    reasonIds: ['free-verdict', 'income-value', 'deal-gap', 'scripts'],
    offer: {
      heading: 'Run the address before the seller picks up',
      body: 'Paste it. The Four Paths and every script are part of free Discovery, no signup and no card.',
    },
    faq: [
      {
        question: 'Is subject-to legal?',
        answer:
          'Subject-to purchases are legal; the lender may have a due-on-sale clause it can enforce. DealGapIQ models the numbers and flags the risk. It does not give legal advice.',
      },
      {
        question: 'Are the negotiation scripts free?',
        answer: 'Yes. The Four Paths and their scripts are included in the free tier.',
      },
      {
        question: 'Which structures are not modeled?',
        answer:
          'Wraparound mortgages and land contracts, pending state-by-state legal review. Subject-to, seller carrybacks, 0% seconds, rate buydowns, assumable mortgages and the blended plan are.',
      },
    ],
    relatedAnswerSlugs: ['seller-wont-lower-the-price', 'what-should-i-offer-on-this-house'],
    blogSlugs: ['creative-finance-field-guide', 'subject-to-pitch-script-template', 'lake-worth-teardown-four-offer-structures'],
    indexable: false,
    metaTitle: '8 Reasons Creative-Finance Buyers Pull Up the Four Paths Before They Pitch',
    metaDescription:
      'Subject-to, seller carry, 0% seconds and a blended plan modeled on the real address, with the script for each. Why creative-finance buyers run it before the call. Free.',
  },
  {
    slug: 'out-of-state-investors',
    persona: 'out-of-state',
    headline: '9 reasons out-of-state investors analyze from their phone before they fly',
    intro:
      'Buying where you do not live means every mistake costs a plane ticket. Out-of-state investors who run the address first know the tax rate, the vacancy assumption and the Deal Gap for a market they have never driven, before they book anything.',
    personaReasons: [
      {
        id: 'before-flight',
        heading: 'Run the address before you book the flight',
        body: 'Most remote investors fly to see properties a 15-second Discovery would have removed from the list. Run the whole shortlist from the couch first.',
      },
      {
        id: 'state-table',
        heading: 'Tax, vacancy and appreciation for a state you do not live in',
        body: 'Every state\u2019s assumptions are published on its /markets page and applied automatically in Discovery. You do not have to guess what property tax looks like two time zones away.',
      },
      {
        id: 'lenders-by-state',
        heading: 'Hard money and DSCR lenders in the state you are buying in (Pro)',
        body: 'The lender directory filters by the state of the property, not the state you live in. It unlocks with the first Pro payment.',
      },
      {
        id: 'save-compare',
        heading: 'Save across markets and compare side by side (Pro)',
        body: 'Save properties from three cities and read them on one screen. Unlimited saves and comparison are Pro; the free account saves ten.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'off-market', 'phone-first', 'deal-gap'],
    offer: {
      heading: 'Run the shortlist before you run to the airport',
      body: 'Paste an address in any state. Discovery is free, no signup and no card.',
    },
    faq: [
      {
        question: 'How do I know the local assumptions are right?',
        answer:
          'Property tax, vacancy and appreciation per state are published on /markets/[state] with their sources. Pro lets you override any of them per deal if you have better local data.',
      },
      {
        question: 'Can I find lenders and cash buyers in the target state?',
        answer:
          'Yes, with Pro. Both directories filter by state and city and unlock with your first payment. The /markets page for each state shows how many are active there.',
      },
      {
        question: 'Does it work in every state?',
        answer: 'Any US street address resolves. If a data source has no coverage for an address that field reads unavailable rather than a guess.',
      },
    ],
    relatedAnswerSlugs: ['is-this-a-good-investment-property', 'what-is-this-property-worth-to-an-investor'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'cash-flow-positive-rental-properties'],
    indexable: false,
    metaTitle: '9 Reasons Out-of-State Investors Analyze From Their Phone Before They Fly',
    metaDescription:
      'State tax and vacancy applied automatically, three value sources, the Deal Gap on any US address in 15 seconds. Run the shortlist before you book. Free, no signup.',
  },
  {
    slug: 'portfolio-builders',
    persona: 'portfolio-builder',
    headline: '9 reasons investors analyzing 30 properties a month quit Excel',
    intro:
      'Thirty properties to find one candidate is the job. Rebuilding the same spreadsheet thirty times is not the job, it is the obstacle. Investors running volume moved the first pass to a 15-second Discovery and kept the spreadsheet for the one that survives.',
    personaReasons: [
      {
        id: 'thirty-in-thirty',
        heading: '30 properties in 30 minutes, not 30 weekends',
        body: 'Fifteen seconds per address. The spreadsheet took 45 minutes and still depended on the rent you typed into it.',
      },
      {
        id: 'unlimited-pro',
        heading: 'Unlimited analyses and saves (Pro)',
        body: 'The free account runs ten a month. Pro removes the cap so the volume you already do is not rationed.',
      },
      {
        id: 'pipeline',
        heading: 'A pipeline, not a folder of tabs',
        body: 'Saved properties move through stages with tasks, documents and contacts attached. Side-by-side comparison of saved deals is Pro.',
      },
      {
        id: 'exports',
        heading: 'Excel proformas and PDF reports when you need the receipt (Pro)',
        body: 'For the lender, the partner or the file. Exports unlock with the first Pro payment.',
      },
    ],
    reasonIds: ['free-verdict', 'three-sources', 'income-value', 'deal-gap', 'four-paths'],
    offer: {
      heading: 'Run the next one on your list',
      body: 'Paste the address. Discovery is free, no signup and no card. Ten a month on a free account.',
    },
    faq: [
      {
        question: 'Can I still see the full math?',
        answer:
          'Yes. Every figure shows its source and assumptions in free Discovery. Pro adds the full calculation breakdown, editable assumptions and the Deal Maker worksheet.',
      },
      {
        question: 'Does it replace my model?',
        answer:
          'It replaces the first pass. If you have a bespoke model you trust, Pro exports the proforma to Excel so you can carry the numbers into it.',
      },
      {
        question: 'What does Pro cost?',
        answer: 'Pro is billed monthly or annually with a 7-day trial. Current pricing is on the /pricing page. Directories and exports unlock with the first payment.',
      },
    ],
    relatedAnswerSlugs: ['what-is-this-property-worth-to-an-investor', 'what-should-i-offer-on-this-house'],
    blogSlugs: ['how-to-analyze-a-rental-property', 'cap-rate-vs-cash-on-cash-return'],
    indexable: false,
    metaTitle: '9 Reasons Investors Analyzing 30 Properties a Month Quit Excel',
    metaDescription:
      'A 15-second first pass on every address, a pipeline instead of tabs, exports when you need the receipt. Why volume investors moved off the spreadsheet. Free Discovery.',
  },
  {
    slug: 'dscr-borrowers',
    persona: 'dscr-borrower',
    headline: '7 reasons DSCR borrowers run the ratio before they call the lender',
    intro:
      'A DSCR lender qualifies the property, not your W-2, and the ratio they want is set before you apply. Borrowers who run the address first know whether the rent covers the payment at the lender\u2019s threshold before the conversation starts.',
    personaReasons: [
      {
        id: 'dscr-on-screen',
        heading: 'DSCR is on the long-term rental analysis',
        body: 'Net operating income over debt service, computed from live rent estimates and the financing assumptions, with the benchmark bands most lenders use shown beside it.',
      },
      {
        id: 'rent-that-passes',
        heading: 'The rent number the ratio depends on, from more than one source',
        body: 'RentCast and Zillow rent estimates are pulled for the exact address and averaged when they agree. A rent estimate $200 too high is the difference between a 1.25 and a decline.',
      },
      {
        id: 'dscr-lenders',
        heading: 'DSCR lenders by state (Pro)',
        body: 'The hard money and DSCR lender directory filters by the state of the property. It unlocks with the first Pro payment.',
      },
    ],
    reasonIds: ['free-verdict', 'income-value', 'deal-gap', 'state-assumptions'],
    offer: {
      heading: 'Run the address before you run the application',
      body: 'Paste it. The long-term rental snapshot is part of free Discovery, no signup and no card.',
    },
    faq: [
      {
        question: 'Can I change the rate and down payment to match a lender\u2019s terms?',
        answer:
          'Free Discovery uses default financing. Editing rate, term, down payment and expenses per deal is part of the Pro workbench, and DSCR recalculates as you change them.',
      },
      {
        question: 'What DSCR do lenders want?',
        answer:
          'Most DSCR programs look for 1.20 to 1.25 or better, some accept lower with a higher rate or more down. Requirements vary by lender; the analysis shows the ratio, the lender sets the bar.',
      },
      {
        question: 'Is this lending advice?',
        answer: 'No. DealGapIQ analyzes the property; your lender qualifies the loan.',
      },
    ],
    relatedAnswerSlugs: ['does-this-rental-cash-flow', 'how-much-rent-will-this-property-get'],
    blogSlugs: ['how-to-calculate-dscr', 'dscr-loan-requirements', 'hard-money-vs-dscr-loans'],
    indexable: false,
    metaTitle: '7 Reasons DSCR Borrowers Run the Ratio Before They Call the Lender',
    metaDescription:
      'DSCR from live rent and financing assumptions on any US address, the rent it depends on from multiple sources, lenders by state. Free 15-second Discovery, no signup.',
  },
]

const BY_SLUG = new Map(PERSONA_PAGES.map((p) => [p.slug, p]))

export function getPersonaPage(slug: string): PersonaPage | null {
  return BY_SLUG.get(slug) ?? null
}

/** Persona reasons first, then the picked base reasons, in the order they render. */
export function resolveReasons(page: PersonaPage): Reason[] {
  const base = page.reasonIds.map(getBaseReason).filter((r): r is Reason => r !== null)
  return [...page.personaReasons, ...base]
}

/** The leading integer of the headline ("9 reasons …" → 9), or null when absent. */
export function headlineCount(headline: string): number | null {
  const m = /^(\d+)\s/.exec(headline)
  return m ? Number(m[1]) : null
}
