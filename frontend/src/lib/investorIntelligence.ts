export type InvestorIntelligenceTopic = {
  category: string
  categoryTone: 'trends' | 'policy' | 'deals' | 'financing' | 'prices' | 'multifamily' | 'btr' | 'flipping' | 'markets'
  title: string
  description: string
  href?: string
  live?: boolean
}

export const investorIntelligenceNav = [
  { label: 'Latest', href: '/investor-intelligence/' },
  { label: 'Markets', href: '/investor-intelligence/#market-intelligence' },
  { label: 'Investor Trends', href: '/investor-intelligence/#investor-trends' },
  { label: 'Finding Deals', href: '/investor-intelligence/#finding-deals' },
  { label: 'Financing', href: '/investor-intelligence/#financing' },
  { label: 'SFR', href: '/investor-intelligence/#sfr' },
  { label: 'Multifamily', href: '/investor-intelligence/#multifamily' },
  { label: 'Build-to-Rent', href: '/investor-intelligence/#build-to-rent' },
  { label: 'Flipping', href: '/investor-intelligence/#flipping' },
] as const

export const launchTopics: InvestorIntelligenceTopic[] = [
  {
    category: 'Investor Trends',
    categoryTone: 'trends',
    title: 'The Great Investor Reset — 2026',
    description:
      'Institutional investors are changing strategy. Smaller investors remain active. Financing costs are higher, operating expenses are rising, and easy cash flow is harder to find. We examine what the changing residential investment landscape means for independent investors.',
    href: '/investor-intelligence/great-investor-reset-2026/',
    live: true,
  },
  {
    category: 'Housing Policy',
    categoryTone: 'policy',
    title: 'The 350-Home Rule: What Investors Need to Know',
    description:
      'New federal restrictions are changing the acquisition landscape for large institutional owners of single-family homes. We will examine who is covered, which properties are affected, the major exceptions, and why build-to-rent remains part of the story.',
  },
  {
    category: 'Finding Deals',
    categoryTone: 'deals',
    title: "The Biggest Investor Problem Isn't Just Rates. It's Finding a Deal.",
    description:
      'Properties are available. But finding an acquisition where purchase price, rent, financing, expenses, and required returns all work together has become considerably more difficult.',
  },
  {
    category: 'Financing',
    categoryTone: 'financing',
    title: "Stop Underwriting Real Estate Like It's 2021",
    description:
      'Higher financing costs, more expensive insurance, rising taxes, and thinner margins mean investors need to rethink what they are willing to pay. The question is what price makes the property work today.',
  },
  {
    category: 'Home Prices',
    categoryTone: 'prices',
    title: 'Are Home Prices Going Up or Down? Actually, Both.',
    description:
      'Housing headlines can appear contradictory because different indexes measure different parts of the market. We examine what investors should actually watch when determining whether property values support the asking price.',
  },
  {
    category: 'Multifamily',
    categoryTone: 'multifamily',
    title: 'The Multifamily Supply Wave Is Beginning to Turn',
    description:
      'A historic development pipeline brought substantial new apartment supply into many U.S. markets. Now construction activity is slowing, setting up a different phase of the cycle.',
  },
  {
    category: 'Build-to-Rent',
    categoryTone: 'btr',
    title: "Build-to-Rent Didn't Disappear. It May Matter More.",
    description:
      'Housing affordability, household formation, lifestyle renting, institutional capital, development economics, and changing federal policy are creating a new strategic environment for build-to-rent.',
  },
  {
    category: 'Flipping',
    categoryTone: 'flipping',
    title: "Flipping Isn't Dead. Bad Acquisition Math Is.",
    description:
      'The purchase price determines how much room an investor has for renovation, financing, holding costs, commissions, unexpected repairs, market changes, and profit.',
  },
  {
    category: 'Investor Trends',
    categoryTone: 'trends',
    title: 'Foreign Buyers Are Pulling Back. Who Fills the Gap?',
    description:
      'Foreign residential purchasing activity has moderated from prior levels. We examine where that activity matters most and whether the change creates meaningful openings for domestic investors.',
  },
  {
    category: 'Market Intelligence',
    categoryTone: 'markets',
    title: 'Forget the “Hottest” Housing Markets. Where Do the Numbers Actually Work?',
    description:
      'Fast appreciation does not automatically make a market a good investment market. DealGapIQ will compare markets using price, rent, taxes, insurance, financing, vacancy, yield, and Deal Gap.',
  },
]

export const marketPulse = [
  {
    label: 'Mortgage Rates',
    value: '6.67%',
    detail:
      'Freddie Mac 30-year fixed benchmark for the week ending August 13, 2026. Investor financing can price differently.',
    sourceLabel: 'Freddie Mac PMMS',
    sourceHref: 'https://www.freddiemac.com/pmms',
  },
  {
    label: 'Investor Activity',
    value: '11.3%',
    detail:
      'Investor share of 2025 purchases in Realtor.com’s deed-based corporate-investor dataset. Definitions vary by provider.',
    sourceLabel: 'Realtor.com Research',
    sourceHref: 'https://www.realtor.com/research/investor-report-june-2026/',
  },
  {
    label: 'Home Prices',
    value: 'Updating',
    detail:
      'National averages can hide large metro differences. DealGapIQ will publish verified price measures with source and reporting period.',
  },
  {
    label: 'Rental Fundamentals',
    value: 'Updating',
    detail:
      'Rental demand remains supported by affordability constraints, while rent growth, vacancy, and new supply vary materially by market.',
  },
]

export const coverage = [
  {
    id: 'investor-trends',
    label: 'Investor Trends',
    tone: 'trends',
    title: "Who Is Actually Buying America's Homes?",
    description:
      'The term real estate investor can describe everyone from someone purchasing a first rental property to a corporation controlling thousands of homes. Those investors do not behave the same way.',
    tracks: ['Small-investor acquisitions', 'Institutional buying', 'Institutional selling', 'Investor market share', 'Portfolio activity', 'Regulatory developments'],
  },
  {
    id: 'finding-deals',
    label: 'Finding Deals',
    tone: 'deals',
    title: 'The Listing Is Not the Deal.',
    description:
      'A desirable location, strong rental demand, attractive photos, and a motivated seller do not mean the numbers work. The investment starts with price, income, expenses, financing, and required return.',
    tracks: ['Asking price', 'Rental income', 'Vacancy', 'Taxes', 'Insurance', 'Maintenance', 'Financing', 'Target purchase price'],
  },
  {
    id: 'financing',
    label: 'Financing',
    tone: 'financing',
    title: 'The Cost of Money Changes the Deal.',
    description:
      'Financing does more than change a monthly payment. It changes cash flow, DSCR, cash-on-cash return, required equity, purchasing power, and maximum acquisition price.',
    tracks: ['Mortgage rates', 'DSCR', 'Cash-on-cash return', 'Required equity', 'Purchasing power', 'Maximum acquisition price'],
  },
  {
    id: 'sfr',
    label: 'Single-Family Rentals',
    tone: 'prices',
    title: 'Follow the Economics Behind the SFR Market.',
    description:
      'Single-family rentals remain a major component of U.S. residential investing. We track the forces influencing SFR performance and acquisition economics.',
    tracks: ['Rent growth', 'Vacancy', 'Investor activity', 'Property prices', 'Operating expenses', 'Institutional participation'],
  },
  {
    id: 'multifamily',
    label: 'Multifamily',
    tone: 'multifamily',
    title: 'The Next Multifamily Cycle Is Taking Shape.',
    description:
      'A wave of apartment construction reshaped rental conditions across many markets. Investors are now watching the supply pipeline, absorption, occupancy, rent growth, financing, and transaction activity.',
    tracks: ['Deliveries', 'Starts', 'Permits', 'Absorption', 'Occupancy', 'Rent growth', 'Financing', 'Transactions'],
  },
  {
    id: 'build-to-rent',
    label: 'Build-to-Rent',
    tone: 'btr',
    title: 'A Residential Investment Sector of Its Own.',
    description:
      'Build-to-rent combines characteristics of single-family housing, multifamily operations, development, and institutional investment.',
    tracks: ['Development pipelines', 'Capital flows', 'Rental demand', 'Construction economics', 'Federal policy', 'Market selection'],
  },
  {
    id: 'flipping',
    label: 'Flipping',
    tone: 'flipping',
    title: 'Successful Flips Begin With the Acquisition.',
    description:
      'Before renovation begins, investors need enough margin to absorb construction, financing, holding costs, closing costs, commissions, surprises, and profit.',
    tracks: ['Construction', 'Financing', 'Holding costs', 'Taxes', 'Insurance', 'Closing costs', 'Market movement', 'Profit'],
  },
] as const
