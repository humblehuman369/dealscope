export const CATEGORY_IDS = [
  'investor-trends',
  'finding-deals',
  'financing',
  'single-family-rentals',
  'multifamily',
  'build-to-rent',
  'flipping',
  'markets',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

export type IntelligenceStatus = 'updating' | 'coming-soon' | 'in-development' | 'in-progress' | 'published'

export type CtaType = 'analyze' | 'markets' | 'financing' | 'flipping' | 'newsletter'

export type SchemaType = 'Article' | 'NewsArticle'

export type InvestorType = 'SFR' | 'Flipper' | 'Multifamily' | 'Broker / Agent' | 'Lender' | 'Other'

export type Category = {
  id: CategoryId
  slug: string
  navLabel: string
  label: string
  headline: string
  summary: string
  topics: string[]
  seoTitle: string
  metaDescription: string
}

export type Source = {
  organization: string
  reportTitle: string
  publicationDate?: string
  dataPeriod?: string
  url?: string
  tier: 1 | 2 | 3
}

export type ArticleSection = {
  heading: string
  paragraphs: string[]
  pullQuote?: string
}

export type Article = {
  slug: string
  headline: string
  shortHeadline: string
  subheadline?: string
  summary: string
  excerpt: string
  category: CategoryId
  /** Display label when the story sits in a campaign tag that is not a hub category (e.g. Housing Policy). */
  displayCategory?: string
  tags: string[]
  authorSlug: string
  status: IntelligenceStatus
  isFeatured: boolean
  isTrending: boolean
  campaignSlug?: string
  chapter?: number
  readingMinutes: number
  takeaways: string[]
  sections: ArticleSection[]
  sources: Source[]
  relatedSlugs: string[]
  ctaType: CtaType
  seoTitle: string
  metaDescription: string
  schemaType: SchemaType
  primaryKeyword: string
  publishDate?: string
  updatedDate?: string
  youtubeVideoId?: string
}

export type Campaign = {
  slug: string
  title: string
  description: string
  hero: string
  status: IntelligenceStatus
  seoTitle: string
  metaDescription: string
  articleSlugs: string[]
}

export type MarketPulseCard = {
  id: string
  title: string
  status: IntelligenceStatus
  summary: string
  href: string
  ctaLabel: string
}

export type FeaturedMarket = {
  slug: string
  name: string
  state: string
  summary: string
  status: IntelligenceStatus
}

export type ProprietaryIndex = {
  id: string
  name: string
  summary: string
  status: IntelligenceStatus
}

export type Author = {
  slug: string
  name: string
  role: string
  shortBio: string
  bio: string[]
  credentials: string[]
  linkedin: string
  imageSrc: string
  imageAlt: string
}
