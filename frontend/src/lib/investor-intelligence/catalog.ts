import type {
  Article,
  Campaign,
  Category,
  FeaturedMarket,
  MarketPulseCard,
  ProprietaryIndex,
} from './types'

export const CATEGORIES: Category[] = [
  {
    id: 'investor-trends',
    slug: 'investor-trends',
    navLabel: 'Investor Trends',
    label: 'Investor Trends',
    headline: 'Who Is Actually Buying America’s Homes?',
    summary:
      'The term “real estate investor” can describe everyone from someone purchasing a first rental property to a corporation controlling thousands of homes. Those investors do not behave the same way.',
    topics: [
      'Small-investor acquisitions',
      'Institutional buying',
      'Institutional selling',
      'Investor market share',
      'Portfolio activity',
      'Regulatory developments',
      'Acquisition strategies',
      'Capital flows',
    ],
    seoTitle: 'Investor Trends — Who Is Buying America’s Homes | DealGapIQ',
    metaDescription:
      'DealGapIQ Investor Intelligence tracks small-investor acquisitions, institutional buying and selling, market share, and the capital flows reshaping residential investment.',
  },
  {
    id: 'finding-deals',
    slug: 'finding-deals',
    navLabel: 'Finding Deals',
    label: 'Finding Deals',
    headline: 'The Listing Is Not the Deal.',
    summary:
      'A property can have a desirable location, strong rental demand, attractive photos, and a motivated seller. That does not mean the numbers work.',
    topics: [
      'Asking price',
      'Rental income',
      'Vacancy',
      'Taxes',
      'Insurance',
      'Maintenance',
      'HOA',
      'Financing',
      'Required return',
      'Target purchase price',
    ],
    seoTitle: 'Finding Deals — Asking Price vs Investment Value | DealGapIQ',
    metaDescription:
      'DealGapIQ examines asking price, rental income, expenses, financing, and Target Buy so investors can see whether a listing is actually a deal.',
  },
  {
    id: 'financing',
    slug: 'financing',
    navLabel: 'Financing',
    label: 'Financing',
    headline: 'The Cost of Money Changes the Deal.',
    summary:
      'Financing does more than change a monthly payment. It can change cash flow, DSCR, cash-on-cash return, required equity, purchasing power, and maximum acquisition price.',
    topics: [
      'Cash flow',
      'DSCR',
      'Cash-on-cash return',
      'Required equity',
      'Purchasing power',
      'Maximum acquisition price',
    ],
    seoTitle: 'Rates & Financing — How Debt Costs Change Target Buy | DealGapIQ',
    metaDescription:
      'Mortgage rates, DSCR loans, private lending, and leverage — translated into what residential investors can actually afford to pay.',
  },
  {
    id: 'single-family-rentals',
    slug: 'single-family-rentals',
    navLabel: 'SFR',
    label: 'Single-Family Rentals',
    headline: 'Follow the Economics Behind the SFR Market.',
    summary:
      'Single-family rentals remain a major component of U.S. residential investing. DealGapIQ Investor Intelligence tracks the forces influencing SFR performance.',
    topics: [
      'Rent growth',
      'Vacancy',
      'Investor activity',
      'Property prices',
      'Financing',
      'Operating expenses',
      'Institutional participation',
      'Build-to-rent competition',
    ],
    seoTitle: 'Single-Family Rentals — SFR Market Intelligence | DealGapIQ',
    metaDescription:
      'SFR rent growth, vacancy, investor activity, operating costs, and institutional participation — analyzed for residential investors.',
  },
  {
    id: 'multifamily',
    slug: 'multifamily',
    navLabel: 'Multifamily',
    label: 'Multifamily',
    headline: 'The Next Multifamily Cycle Is Taking Shape.',
    summary:
      'A wave of new apartment construction reshaped rental conditions across many markets. Now investors are watching deliveries, starts, absorption, occupancy, and rent growth.',
    topics: [
      'New deliveries',
      'Construction starts',
      'Permits',
      'Absorption',
      'Occupancy',
      'Rent growth',
      'Financing',
      'Transaction activity',
      'Replacement cost',
    ],
    seoTitle: 'Multifamily Intelligence — Supply, Occupancy, Rent Growth | DealGapIQ',
    metaDescription:
      'Apartment construction, deliveries, absorption, occupancy, and rent growth — what the shifting multifamily cycle means for investors.',
  },
  {
    id: 'build-to-rent',
    slug: 'build-to-rent',
    navLabel: 'Build-to-Rent',
    label: 'Build-to-Rent',
    headline: 'A Residential Investment Sector of Its Own.',
    summary:
      'Build-to-rent combines characteristics of single-family housing, multifamily operations, development, and institutional investment.',
    topics: [
      'Development pipelines',
      'Capital flows',
      'Community performance',
      'Rental demand',
      'Construction economics',
      'Federal policy',
      'Market selection',
    ],
    seoTitle: 'Build-to-Rent Intelligence — BTR Economics & Policy | DealGapIQ',
    metaDescription:
      'Build-to-rent pipelines, capital flows, community performance, and the federal policy changes that are reshaping purpose-built rental housing.',
  },
  {
    id: 'flipping',
    slug: 'flipping',
    navLabel: 'Flipping',
    label: 'Flipping',
    headline: 'Successful Flips Begin With the Acquisition.',
    summary:
      'Before renovation begins, investors need enough margin to absorb construction, financing, holding costs, taxes, insurance, closing costs, commissions, unexpected repairs, market movement, and profit.',
    topics: [
      'Construction',
      'Financing',
      'Holding costs',
      'Taxes',
      'Insurance',
      'Closing costs',
      'Sales commissions',
      'Unexpected repairs',
      'Market movement',
      'Profit',
    ],
    seoTitle: 'Flipping Intelligence — Acquisition Math, ARV, and Margins | DealGapIQ',
    metaDescription:
      'Flip volume, gross margins, renovation costs, and why acquisition discipline matters more than ever in a thinner-margin market.',
  },
  {
    id: 'markets',
    slug: 'markets',
    navLabel: 'Markets',
    label: 'Market Intelligence',
    headline: 'Where Do the Numbers Work?',
    summary:
      'There is no single “best” housing market for every investor. DealGapIQ Market Intelligence evaluates residential markets on the variables that decide an acquisition.',
    topics: [
      'Acquisition price',
      'Rental income',
      'Property taxes',
      'Insurance',
      'Vacancy',
      'Rent growth',
      'Investor activity',
      'Inventory',
      'Financing',
      'Estimated yield',
      'Deal availability',
    ],
    seoTitle: 'Market Intelligence — Where Investment Economics Work | DealGapIQ',
    metaDescription:
      'City comparisons, rental yields, price-to-rent, insurance, taxes, and Deal Gap — markets ranked by investment economics, not hype.',
  },
]

export const MARKET_PULSE: MarketPulseCard[] = [
  {
    id: 'mortgage_rate',
    title: 'Mortgage Rates',
    status: 'updating',
    summary:
      'Financing costs remain one of the most important variables affecting purchasing power, debt service, cash flow, and investor target prices.',
    href: '/investor-intelligence/financing',
    ctaLabel: 'View Financing Intelligence',
  },
  {
    id: 'investor_activity',
    title: 'Investor Activity',
    status: 'updating',
    summary:
      'Residential investors remain active, but the composition of the market is changing as smaller investors continue acquiring while large institutional strategies evolve.',
    href: '/investor-intelligence/investor-trends',
    ctaLabel: 'View Investor Trends',
  },
  {
    id: 'home_prices',
    title: 'Home Prices',
    status: 'updating',
    summary:
      'National housing appreciation has slowed from earlier-cycle highs, while individual metropolitan areas continue to produce widely different results.',
    href: '/investor-intelligence/markets',
    ctaLabel: 'View Market Intelligence',
  },
  {
    id: 'rental_fundamentals',
    title: 'Rental Fundamentals',
    status: 'updating',
    summary:
      'Rental demand remains supported by homeownership affordability constraints, while new supply, vacancy, and rent growth vary significantly by market.',
    href: '/investor-intelligence/single-family-rentals',
    ctaLabel: 'View Rental Intelligence',
  },
]

export const FEATURED_MARKETS: FeaturedMarket[] = [
  {
    slug: 'memphis-tn',
    name: 'Memphis',
    state: 'Tennessee',
    status: 'in-progress',
    summary:
      'Affordable acquisition prices and strong investor interest make Memphis a market DealGapIQ Investor Intelligence is monitoring closely.',
  },
  {
    slug: 'kansas-city-mo',
    name: 'Kansas City',
    state: 'Missouri',
    status: 'in-progress',
    summary:
      'Kansas City combines a diversified economy, central U.S. location, and residential investment activity that makes it an important market to watch.',
  },
  {
    slug: 'cleveland-oh',
    name: 'Cleveland',
    state: 'Ohio',
    status: 'in-progress',
    summary:
      'Relative affordability and income-oriented investment characteristics make Cleveland a candidate for deeper DealGapIQ analysis.',
  },
]

export const PROPRIETARY_INDEXES: ProprietaryIndex[] = [
  {
    id: 'market-score',
    name: 'DealGapIQ Market Score',
    summary: 'A multidimensional measure of residential investment conditions.',
    status: 'in-development',
  },
  {
    id: 'deal-availability',
    name: 'Deal Availability Index',
    summary:
      'Designed to measure how frequently listed properties approach investor-supported acquisition values.',
    status: 'in-development',
  },
  {
    id: 'investor-affordability',
    name: 'Investor Affordability Index',
    summary:
      'Designed to measure the impact of prices, financing, and operating expenses on investor purchasing power.',
    status: 'in-development',
  },
  {
    id: 'rental-opportunity',
    name: 'Rental Opportunity Index',
    summary: 'Designed to identify markets where rental economics appear comparatively attractive.',
    status: 'in-development',
  },
  {
    id: 'deal-gap-index',
    name: 'Deal Gap Index',
    summary:
      'Designed to measure the difference between asking prices and DealGapIQ-supported Target Buy values across a market.',
    status: 'in-development',
  },
]

const CAMPAIGN_SLUG = 'great-investor-reset-2026'

export const ARTICLES: Article[] = [
  {
    slug: 'who-is-buying-americas-homes',
    headline: 'Wall Street Is Pulling Back. Small Investors Are Still Buying.',
    shortHeadline: 'The Great Investor Reset — 2026',
    subheadline: 'Who is buying, who is selling, and why the residential investor landscape is changing.',
    summary:
      'Institutional acquisition activity is retreating while small investors remain active, federal policy changes the rules for large buyers, and finding profitable deals becomes increasingly difficult.',
    excerpt: 'Who is buying, who is selling, and why the residential investor landscape is changing.',
    category: 'investor-trends',
    tags: ['Institutional Investors', 'Mom-and-Pop Investors', 'The Great Investor Reset'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: true,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 1,
    readingMinutes: 12,
    takeaways: [
      'Institutional acquisition activity has declined from earlier-cycle highs.',
      'Smaller investors remain a major part of residential investor purchases.',
      'New federal restrictions affect large institutional buyers of existing single-family homes.',
      'Financing and operating costs remain challenging.',
      'The investment opportunity depends on acquisition price — not on assuming appreciation will rescue a marginal deal.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Something important is changing inside the U.S. residential investment market.',
          'Large institutional investors have substantially reduced acquisition activity from earlier-cycle highs. Smaller investors remain active. Federal policy is changing the rules governing certain institutional purchases of existing single-family homes.',
        ],
      },
      {
        heading: 'Why It Matters',
        paragraphs: [
          'At the same time, today’s investor faces a much harder acquisition environment. Financing costs remain elevated. Insurance and property taxes have increased. Maintenance and renovation costs continue to pressure returns. Home-price appreciation can no longer be assumed to rescue a marginal acquisition.',
          'The result is a market where finding properties may not be the biggest challenge.',
        ],
        pullQuote: 'Finding properties that actually work is.',
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'DealGapIQ Investor Intelligence examines the forces behind what we call The Great Investor Reset: a shift in who is buying, what they are willing to pay, and which properties still pencil once financing, insurance, taxes, and required returns are taken seriously.',
          'Every major story in this series ends at the same question: what does this mean for the deal?',
        ],
      },
    ],
    sources: [],
    relatedSlugs: [
      '350-home-rule-institutional-investors',
      'finding-real-estate-deals-2026',
      'real-estate-underwriting-2026',
    ],
    ctaType: 'analyze',
    seoTitle: 'The Great Investor Reset — 2026 | DealGapIQ Investor Intelligence',
    metaDescription:
      'Institutional investors are pulling back. Small investors are still buying. DealGapIQ examines the forces redefining residential investment in 2026.',
    schemaType: 'Article',
    primaryKeyword: 'institutional investors residential real estate 2026',
  },
  {
    slug: '350-home-rule-institutional-investors',
    headline: 'The 350-Home Rule: What Investors Need to Know',
    shortHeadline: 'The 350-Home Rule',
    subheadline: 'What the new institutional investor restrictions actually mean.',
    summary:
      'New federal restrictions are changing the acquisition landscape for large institutional owners of single-family homes. DealGapIQ will examine who is covered, which properties are affected, the major exceptions, and why build-to-rent remains an important part of the story.',
    excerpt: 'What the new institutional investor restrictions actually mean.',
    category: 'investor-trends',
    displayCategory: 'Housing Policy',
    tags: ['Institutional Investors', 'Trump Housing Policy', 'ROAD to Housing Act', 'Build-to-Rent'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 2,
    readingMinutes: 10,
    takeaways: [
      'New federal restrictions target large institutional owners of existing single-family homes.',
      'Coverage, property type, and exceptions determine who is actually affected.',
      'Build-to-rent remains a structurally different part of the institutional story.',
      'Independent investors should watch how large-buyer constraints change local competition.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'New federal restrictions are changing the acquisition landscape for large institutional owners of single-family homes.',
          'DealGapIQ Investor Intelligence will examine who is covered, which properties are affected, the major exceptions, and why build-to-rent remains an important part of the story.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Policy that changes who can buy existing homes does not automatically create bargains. It changes the competitive set. The investor question is whether that shift shows up in asking prices, days on market, and the gap between list price and Target Buy.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['who-is-buying-americas-homes', 'build-to-rent-2026', 'finding-real-estate-deals-2026'],
    ctaType: 'analyze',
    seoTitle: 'The 350-Home Rule: What Investors Need to Know | DealGapIQ',
    metaDescription:
      'New federal restrictions on large institutional owners of single-family homes — who is covered, which properties are affected, and why build-to-rent still matters.',
    schemaType: 'Article',
    primaryKeyword: '350 home rule institutional investors',
  },
  {
    slug: 'finding-real-estate-deals-2026',
    headline: 'The Biggest Investor Problem Isn’t Just Rates. It’s Finding a Deal.',
    shortHeadline: 'Why Investors Are Struggling to Find Good Deals',
    summary:
      'Properties are available. But finding an acquisition where purchase price, rent, financing, expenses, and required returns all work together has become considerably more difficult.',
    excerpt: 'The problem isn’t a lack of properties. It’s the mathematics.',
    category: 'finding-deals',
    tags: ['Deal Availability', 'Income Value', 'Target Buy', 'Deal Gap'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 3,
    readingMinutes: 9,
    takeaways: [
      'Listings are not the same thing as deals.',
      'Deal availability has become one of the defining challenges of the 2026 investor market.',
      'Purchase price, rent, financing, expenses, and required return have to work together.',
      'The useful question is: at what price does the property become a deal?',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Properties are available. But finding an acquisition where purchase price, rent, financing, expenses, and required returns all work together has become considerably more difficult.',
          'We look at why deal availability has become one of the defining challenges of the 2026 investor market.',
        ],
        pullQuote: 'The market isn’t running out of properties. It’s running out of properties that pencil.',
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Asking price is the seller’s number. Income Value is what the property’s income supports. Target Buy is the acquisition price supported by the investor’s objectives. The Deal Gap is the difference.',
          'Closing that gap — through price, income, financing, equity, concessions, renovation, or structure — is the work of underwriting, not of hoping the market cooperates.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['real-estate-underwriting-2026', 'who-is-buying-americas-homes', 'market-rankings'],
    ctaType: 'analyze',
    seoTitle: 'Finding Real Estate Deals in 2026 | DealGapIQ Investor Intelligence',
    metaDescription:
      'The biggest investor problem in 2026 isn’t just rates. It’s finding a property where price, rent, financing, and expenses actually work.',
    schemaType: 'Article',
    primaryKeyword: 'finding real estate deals 2026',
  },
  {
    slug: 'real-estate-underwriting-2026',
    headline: 'Stop Underwriting Real Estate Like It’s 2021',
    shortHeadline: 'Stop Underwriting Like It’s 2021',
    summary:
      'Higher financing costs, more expensive insurance, rising taxes, and thinner margins mean investors need to rethink what they are willing to pay.',
    excerpt: 'How today’s financing environment changes what investors can afford to pay.',
    category: 'financing',
    tags: ['Mortgage Rates', 'DSCR', 'Cash Flow', 'Underwriting'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 4,
    readingMinutes: 8,
    takeaways: [
      'The mathematics of residential investing have changed since 2021.',
      'Higher financing costs, insurance, and taxes compress what an investor can pay.',
      'The question is no longer whether rates eventually come down.',
      'The question is: what price makes the property work today?',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'The mathematics of residential investing have changed. Higher financing costs, more expensive insurance, rising taxes, and thinner margins mean investors need to rethink what they are willing to pay.',
          'The question is no longer: “Will rates eventually come down?”',
        ],
        pullQuote: 'What price makes the property work today?',
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Underwriting to a future rate cut is a bet, not an analysis. DealGapIQ translates today’s debt service, operating costs, and required return into a Target Buy — then shows the Deal Gap against the asking price.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['finding-real-estate-deals-2026', 'who-is-buying-americas-homes', 'home-price-trends'],
    ctaType: 'financing',
    seoTitle: 'Stop Underwriting Real Estate Like It’s 2021 | DealGapIQ',
    metaDescription:
      'Higher rates, insurance, and taxes have changed what investors can pay. DealGapIQ explains how to underwrite to today’s numbers, not 2021 assumptions.',
    schemaType: 'Article',
    primaryKeyword: 'real estate underwriting 2026',
  },
  {
    slug: 'home-price-trends',
    headline: 'Are Home Prices Going Up or Down? Actually, Both.',
    shortHeadline: 'Are Home Prices Going Up or Down?',
    summary:
      'Housing headlines can appear contradictory because different indexes measure different parts of the market. National averages can also hide dramatic differences between metropolitan areas.',
    excerpt: 'Why the answer depends on the data — and the market.',
    category: 'markets',
    displayCategory: 'Home Prices',
    tags: ['Home Prices', 'HPA', 'Market Intelligence'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 5,
    readingMinutes: 8,
    takeaways: [
      'Different house-price indexes measure different parts of the market.',
      'National averages hide large metro-level differences.',
      'Investors should watch whether local values support the asking price — not the national headline.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Housing headlines can appear contradictory because different indexes measure different parts of the market. National averages can also hide dramatic differences between metropolitan areas.',
          'DealGapIQ Investor Intelligence examines what investors should actually watch when determining whether property values support the asking price.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Appreciation is not a substitute for acquisition math. A market can be “up” nationally and still overpriced for a specific property once rent, taxes, insurance, and financing are applied.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['market-rankings', 'real-estate-underwriting-2026', 'finding-real-estate-deals-2026'],
    ctaType: 'markets',
    seoTitle: 'Home Price Trends: Up or Down? | DealGapIQ Investor Intelligence',
    metaDescription:
      'Why housing headlines conflict, how indexes differ, and what investors should watch when deciding whether an asking price is supported.',
    schemaType: 'Article',
    primaryKeyword: 'home price trends 2026',
  },
  {
    slug: 'multifamily-supply-wave',
    headline: 'The Multifamily Supply Wave Is Beginning to Turn',
    shortHeadline: 'The Multifamily Supply Wave Is Turning',
    summary:
      'A historic development pipeline brought substantial new apartment supply into many U.S. markets. Now construction activity is slowing.',
    excerpt: 'What slowing development could mean for the next rental cycle.',
    category: 'multifamily',
    tags: ['Multifamily', 'Apartment Construction', 'Rent Growth', 'Absorption'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 6,
    readingMinutes: 9,
    takeaways: [
      'A historic pipeline delivered substantial new apartment supply.',
      'Construction activity is now slowing.',
      'As deliveries are absorbed and future supply moderates, fundamentals may enter a different phase.',
      'The opportunity is market-specific, not national.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'A historic development pipeline brought substantial new apartment supply into many U.S. markets. Now construction activity is slowing.',
          'As recent deliveries are absorbed and future supply moderates, multifamily fundamentals could begin entering a different phase. We examine the markets, risks, and potential opportunities investors should be watching.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Supply waves do not turn uniformly. Investors should watch deliveries, absorption, occupancy, and rent growth in the specific submarket — then bring those conditions back to property-level yield and Target Buy.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['build-to-rent-2026', 'market-rankings', 'home-price-trends'],
    ctaType: 'markets',
    seoTitle: 'The Multifamily Supply Wave Is Turning | DealGapIQ',
    metaDescription:
      'Apartment construction is slowing after a historic delivery wave. What that means for occupancy, rent growth, and investor opportunity.',
    schemaType: 'Article',
    primaryKeyword: 'multifamily supply 2026',
  },
  {
    slug: 'build-to-rent-2026',
    headline: 'Build-to-Rent Didn’t Disappear. It May Matter More.',
    shortHeadline: 'Build-to-Rent Didn’t Disappear',
    summary:
      'Purpose-built rental communities remain an important part of the residential investment landscape as housing affordability, household formation, and federal policy reshape the sector.',
    excerpt:
      'Housing affordability, household formation, lifestyle renting, institutional capital, and federal policy are creating a new strategic environment for build-to-rent.',
    category: 'build-to-rent',
    tags: ['Build-to-Rent', 'Institutional Investors', 'Federal Policy'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 7,
    readingMinutes: 8,
    takeaways: [
      'Build-to-rent did not disappear with the institutional pullback in existing homes.',
      'Purpose-built communities sit at the intersection of SFR, multifamily, and development.',
      'Federal policy toward existing-home purchases may increase the strategic importance of BTR.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Purpose-built rental communities remain an important part of the residential investment landscape.',
          'Housing affordability, household formation, lifestyle renting, institutional capital, development economics, and changing federal policy are creating a new strategic environment for build-to-rent.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'If policy constrains large purchases of existing single-family homes, capital does not vanish. It looks for another vehicle. BTR is one of the most plausible.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: [
      '350-home-rule-institutional-investors',
      'multifamily-supply-wave',
      'who-is-buying-americas-homes',
    ],
    ctaType: 'markets',
    seoTitle: 'Build-to-Rent Didn’t Disappear. It May Matter More. | DealGapIQ',
    metaDescription:
      'Why purpose-built rental communities may become more important as institutional strategy and federal policy toward existing homes change.',
    schemaType: 'Article',
    primaryKeyword: 'build to rent 2026',
  },
  {
    slug: 'flipping-acquisition-math',
    headline: 'Flipping Isn’t Dead. Bad Acquisition Math Is.',
    shortHeadline: 'Flipping Isn’t Dead. Bad Acquisition Math Is.',
    summary:
      'The purchase price determines how much room an investor has for renovation, financing, holding costs, commissions, market changes, unexpected repairs, and profit.',
    excerpt: 'In a thinner-margin market, acquisition discipline matters more than ever.',
    category: 'flipping',
    tags: ['Flipping', 'ARV', 'Acquisition', 'Target Buy'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 8,
    readingMinutes: 7,
    takeaways: [
      'Flip outcomes are decided at acquisition, not at the punch list.',
      'Thinner margins leave less room for renovation overruns and market movement.',
      'Target Buy has to absorb construction, hold, financing, commissions, and profit.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'The purchase price determines how much room an investor has for renovation, financing, holding costs, commissions, market changes, unexpected repairs, and profit.',
          'In a thinner-margin market, acquisition discipline matters more than ever.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'A flip is not dead because renovation is hard. It fails when the bid leaves no gap. Calculate Target Buy first. Then decide whether the work is worth doing.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['finding-real-estate-deals-2026', 'real-estate-underwriting-2026', 'home-price-trends'],
    ctaType: 'flipping',
    seoTitle: 'Flipping Isn’t Dead. Bad Acquisition Math Is. | DealGapIQ',
    metaDescription:
      'Why successful flips begin with the acquisition price — and how Target Buy has to absorb renovation, hold, financing, and profit.',
    schemaType: 'Article',
    primaryKeyword: 'house flipping 2026',
  },
  {
    slug: 'foreign-buyers',
    headline: 'Foreign Buyers Are Pulling Back. Who Fills the Gap?',
    shortHeadline: 'Foreign Buyers Are Pulling Back',
    summary:
      'Foreign residential purchasing activity has moderated from prior levels. The effect will not be uniform.',
    excerpt:
      'Where foreign buyers historically matter most — and whether declining activity creates opportunities for domestic investors.',
    category: 'investor-trends',
    tags: ['Foreign Buyers', 'Investor Activity', 'Florida'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 9,
    readingMinutes: 8,
    takeaways: [
      'Foreign residential purchasing has moderated from prior levels.',
      'The effect is concentrated in markets where foreign buyers historically mattered most.',
      'A pullback is not automatically a bargain — it is a change in the buyer mix.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Foreign residential purchasing activity has moderated from prior levels. The effect will not be uniform.',
          'DealGapIQ Investor Intelligence examines where foreign buyers historically matter most and whether declining activity creates meaningful opportunities for domestic investors.',
        ],
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Who fills a gap in demand matters less than whether asking prices adjust. If they do not, the Deal Gap stays where it is.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['who-is-buying-americas-homes', 'market-rankings', 'home-price-trends'],
    ctaType: 'markets',
    seoTitle: 'Foreign Buyers Are Pulling Back. Who Fills the Gap? | DealGapIQ',
    metaDescription:
      'Foreign residential buying has moderated. DealGapIQ examines where that matters most and whether it creates room for domestic investors.',
    schemaType: 'Article',
    primaryKeyword: 'foreign buyers US housing 2026',
  },
  {
    slug: 'market-rankings',
    headline: 'Forget the “Hottest” Housing Markets. Where Do the Numbers Actually Work?',
    shortHeadline: 'Where Do the Numbers Actually Work?',
    summary:
      'Fast appreciation does not automatically make a market a good investment market. Low property prices do not automatically make one attractive either.',
    excerpt: 'Price. Rent. Taxes. Insurance. Financing. Vacancy. Yield. And Deal Gap.',
    category: 'markets',
    tags: ['Market Rankings', 'Yield', 'Insurance', 'Property Taxes', 'Deal Gap'],
    authorSlug: 'brad-geisen',
    status: 'coming-soon',
    isFeatured: false,
    isTrending: true,
    campaignSlug: CAMPAIGN_SLUG,
    chapter: 10,
    readingMinutes: 9,
    takeaways: [
      '“Hottest” is not the same as investable.',
      'Low prices are not the same as attractive yields.',
      'Investors should compare markets on price, rent, taxes, insurance, financing, vacancy, yield, and Deal Gap.',
    ],
    sections: [
      {
        heading: 'The Story',
        paragraphs: [
          'Fast appreciation does not automatically make a market a good investment market. Low property prices do not automatically make one attractive either.',
          'DealGapIQ will compare residential markets using the variables investors actually care about: price, rent, taxes, insurance, financing, vacancy, yield, and Deal Gap.',
        ],
        pullQuote: 'Price. Rent. Taxes. Insurance. Financing. Vacancy. Yield. And Deal Gap.',
      },
      {
        heading: 'The DealGapIQ Perspective',
        paragraphs: [
          'Market intelligence tells you where to look. Property intelligence tells you whether to buy. Rankings that ignore operating costs and financing are marketing, not analysis.',
        ],
      },
    ],
    sources: [],
    relatedSlugs: ['home-price-trends', 'finding-real-estate-deals-2026', 'who-is-buying-americas-homes'],
    ctaType: 'markets',
    seoTitle: 'Where Do the Numbers Work? Market Rankings | DealGapIQ',
    metaDescription:
      'DealGapIQ compares residential markets on price, rent, taxes, insurance, financing, vacancy, yield, and Deal Gap — not on hype.',
    schemaType: 'Article',
    primaryKeyword: 'best real estate markets for investors 2026',
  },
]

export const CAMPAIGN: Campaign = {
  slug: CAMPAIGN_SLUG,
  title: 'The Great Investor Reset — 2026',
  hero: 'Institutional investors are retreating. Small investors remain active. Financing is expensive. Operating costs are rising. Rental supply is shifting.',
  description:
    'DealGapIQ examines the forces redefining residential investment in 2026 — who is buying, what they can pay, and where the numbers still work.',
  status: 'coming-soon',
  seoTitle: 'The Great Investor Reset — 2026 | DealGapIQ Investor Intelligence',
  metaDescription:
    'A DealGapIQ research series: institutional pullback, the 350-home rule, deal availability, underwriting, home prices, multifamily, build-to-rent, flipping, and market rankings.',
  articleSlugs: ARTICLES.filter((a) => a.campaignSlug === CAMPAIGN_SLUG)
    .sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0))
    .map((a) => a.slug),
}

export const CATEGORY_RESEARCH: Record<string, { title: string; slug?: string }[]> = {
  'investor-trends': [
    { title: 'The Great Investor Reset', slug: 'who-is-buying-americas-homes' },
    { title: 'The 350-Home Rule', slug: '350-home-rule-institutional-investors' },
    { title: 'Foreign Buyers Are Pulling Back', slug: 'foreign-buyers' },
  ],
  'finding-deals': [
    { title: 'Why Finding Good Deals Has Become So Difficult', slug: 'finding-real-estate-deals-2026' },
    { title: 'Deal Gap of the Week' },
  ],
  financing: [{ title: 'Stop Underwriting Like It’s 2021', slug: 'real-estate-underwriting-2026' }],
  'single-family-rentals': [{ title: 'New SFR intelligence' }],
  multifamily: [
    { title: 'The Multifamily Supply Wave Is Beginning to Turn', slug: 'multifamily-supply-wave' },
  ],
  'build-to-rent': [{ title: 'Build-to-Rent Didn’t Disappear', slug: 'build-to-rent-2026' }],
  flipping: [{ title: 'Flipping Isn’t Dead. Bad Acquisition Math Is.', slug: 'flipping-acquisition-math' }],
  markets: [{ title: 'Market rankings', slug: 'market-rankings' }],
}

export const DEAL_GAP_LEVERS = [
  'Purchase-price negotiation',
  'Improved income',
  'Financing structure',
  'Additional equity',
  'Seller concessions',
  'Renovation',
  'Expense reduction',
  'Alternative deal structure',
] as const

export const NEWSLETTER_TOPICS = [
  'Investor activity',
  'Residential market trends',
  'Mortgage and financing conditions',
  'SFR',
  'Multifamily',
  'Build-to-rent',
  'Deal availability',
  'Market opportunities',
  'Deal Gap of the Week',
  'New DealGapIQ research',
] as const

export const HUB_NAV = [
  { href: '/investor-intelligence', label: 'Latest', match: 'hub' as const },
  { href: '/investor-intelligence/markets', label: 'Markets', slug: 'markets' },
  { href: '/investor-intelligence/investor-trends', label: 'Investor Trends', slug: 'investor-trends' },
  { href: '/investor-intelligence/finding-deals', label: 'Finding Deals', slug: 'finding-deals' },
  { href: '/investor-intelligence/financing', label: 'Financing', slug: 'financing' },
  { href: '/investor-intelligence/single-family-rentals', label: 'SFR', slug: 'single-family-rentals' },
  { href: '/investor-intelligence/multifamily', label: 'Multifamily', slug: 'multifamily' },
  { href: '/investor-intelligence/build-to-rent', label: 'Build-to-Rent', slug: 'build-to-rent' },
  { href: '/investor-intelligence/flipping', label: 'Flipping', slug: 'flipping' },
]

export const FEATURED_ARTICLE_SLUG = 'who-is-buying-americas-homes'

const articleBySlug = new Map(ARTICLES.map((a) => [a.slug, a]))
const categoryBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]))
const marketBySlug = new Map(FEATURED_MARKETS.map((m) => [m.slug, m]))

export function getArticle(slug: string): Article | undefined {
  return articleBySlug.get(slug)
}

export function getCategory(slug: string): Category | undefined {
  return categoryBySlug.get(slug)
}

export function getMarket(slug: string): FeaturedMarket | undefined {
  return marketBySlug.get(slug)
}

export function getArticlesByCategory(categoryId: string): Article[] {
  return ARTICLES.filter((a) => a.category === categoryId)
}

export function getTrendingArticles(): Article[] {
  return ARTICLES.filter((a) => a.isTrending).sort((a, b) => (a.chapter ?? 99) - (b.chapter ?? 99))
}

export function getFeaturedArticle(): Article {
  const featured = ARTICLES.find((a) => a.isFeatured) ?? ARTICLES[0]
  return featured
}

export function getRelatedArticles(article: Article): Article[] {
  return article.relatedSlugs
    .map((slug) => articleBySlug.get(slug))
    .filter((a): a is Article => Boolean(a))
}

export function getCampaignArticles(): Article[] {
  return CAMPAIGN.articleSlugs
    .map((slug) => articleBySlug.get(slug))
    .filter((a): a is Article => Boolean(a))
}

export function allIntelligencePaths(): string[] {
  return [
    '/investor-intelligence',
    '/investor-intelligence/methodology',
    '/investor-intelligence/great-investor-reset-2026',
    ...CATEGORIES.map((c) => `/investor-intelligence/${c.slug}`),
    ...ARTICLES.map((a) => `/investor-intelligence/${a.slug}`),
    ...FEATURED_MARKETS.map((m) => `/investor-intelligence/markets/${m.slug}`),
    '/authors/brad-geisen',
  ]
}

export const RESERVED_SLUGS = new Set([
  ...CATEGORIES.map((c) => c.slug),
  CAMPAIGN.slug,
  'methodology',
  'markets',
  'feed',
])
