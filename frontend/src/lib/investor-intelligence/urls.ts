export const SITE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : 'https://dealgapiq.com') || 'https://dealgapiq.com'

export const II_BASE = '/investor-intelligence'

export function iiPath(slug?: string): string {
  if (!slug) return II_BASE
  return `${II_BASE}/${slug}`
}

export function articlePath(slug: string): string {
  return iiPath(slug)
}

export function categoryPath(slug: string): string {
  return iiPath(slug)
}

export function campaignPath(slug: string): string {
  return iiPath(slug)
}

export function marketPath(slug: string): string {
  return `${II_BASE}/markets/${slug}`
}

export function authorPath(slug: string): string {
  return `/authors/${slug}`
}

export function iiAbsolute(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalized}`
}

/** Property analysis entry with Investor Intelligence attribution. */
export function analyzePropertyHref(placement: string, article?: string): string {
  const params = new URLSearchParams({
    source: 'investor-intelligence',
    placement,
    utm_source: 'investor-intelligence',
    utm_medium: 'web',
    utm_campaign: 'great-investor-reset',
    utm_content: placement,
  })
  if (article) params.set('article', article)
  return `/?${params.toString()}`
}

export const CTA_COPY: Record<
  'analyze' | 'markets' | 'financing' | 'flipping' | 'newsletter',
  { label: string; href: (article?: string) => string }
> = {
  analyze: {
    label: 'Analyze a Property',
    href: (article) => analyzePropertyHref('article-cta', article),
  },
  markets: {
    label: 'Explore Market Intelligence',
    href: () => categoryPath('markets'),
  },
  financing: {
    label: 'See How Rates Change Target Buy',
    href: (article) => analyzePropertyHref('financing-cta', article),
  },
  flipping: {
    label: 'Calculate Your Target Buy',
    href: (article) => analyzePropertyHref('flipping-cta', article),
  },
  newsletter: {
    label: 'Get Investor Intelligence',
    href: () => `${II_BASE}#newsletter`,
  },
}
