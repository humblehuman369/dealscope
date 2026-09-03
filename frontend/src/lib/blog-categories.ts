export const BLOG_CATEGORY_SLUGS = [
  'creative-finance',
  'deal-analysis',
  'offers-negotiation',
  'financing',
  'strategies',
  'markets',
] as const

export type BlogCategorySlug = (typeof BLOG_CATEGORY_SLUGS)[number]

export type BlogCategory = {
  slug: BlogCategorySlug
  label: string
  description: string
  /** Pillar page the category funnels link equity toward. */
  pillarHref: string
  pillarLabel: string
}

export const BLOG_CATEGORIES: Record<BlogCategorySlug, BlogCategory> = {
  'creative-finance': {
    slug: 'creative-finance',
    label: 'Creative Finance',
    description:
      'Subject-To, seller carrybacks, wraps, lease options, and the Morby Method — how investors close when the bank math says no.',
    pillarHref: '/blog/creative-finance-field-guide',
    pillarLabel: 'Creative Finance Field Guide',
  },
  'deal-analysis': {
    slug: 'deal-analysis',
    label: 'Deal Analysis',
    description:
      'How to underwrite a rental, read cap rate and cash-on-cash, calculate DSCR, estimate ARV, and find the Deal Gap before you offer.',
    pillarHref: '/methodology',
    pillarLabel: 'DealGapIQ Methodology',
  },
  'offers-negotiation': {
    slug: 'offers-negotiation',
    label: 'Offers & Negotiation',
    description:
      'Offer structures, pitch scripts, and negotiation frames that trade price for terms instead of losing the deal on the call.',
    pillarHref: '/blog/how-to-make-an-offer-on-an-investment-property',
    pillarLabel: 'How to Make an Offer on an Investment Property',
  },
  financing: {
    slug: 'financing',
    label: 'Financing',
    description:
      'Hard money, DSCR loans, private money, and refinance seasoning — what each costs and when it fits the deal.',
    pillarHref: '/lenders',
    pillarLabel: 'Hard Money Lender Directory',
  },
  strategies: {
    slug: 'strategies',
    label: 'Strategies',
    description:
      'Long-term rental, STR, BRRRR, fix & flip, house hack, and wholesale — compared on the same property with the same numbers.',
    pillarHref: '/strategies/brrrr',
    pillarLabel: 'Investment strategy guides',
  },
  markets: {
    slug: 'markets',
    label: 'Markets',
    description:
      'State-level tax, vacancy, and appreciation assumptions, and how to read a local market before you write the offer.',
    pillarHref: '/markets',
    pillarLabel: 'Investor market data by state',
  },
}

export function isBlogCategorySlug(value: string): value is BlogCategorySlug {
  return (BLOG_CATEGORY_SLUGS as readonly string[]).includes(value)
}

export function getBlogCategory(slug: string): BlogCategory | null {
  return isBlogCategorySlug(slug) ? BLOG_CATEGORIES[slug] : null
}
