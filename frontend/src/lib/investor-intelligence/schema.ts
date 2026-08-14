import type { Article, Category } from './types'
import { iiAbsolute, SITE_URL } from './urls'

const ORG_ID = `${SITE_URL}/#organization`
const PERSON_ID = `${SITE_URL}/about#brad-geisen`

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: iiAbsolute(item.path),
    })),
  }
}

export function hubJsonLd() {
  const url = iiAbsolute('/investor-intelligence')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name: 'DealGapIQ Investor Intelligence',
        description:
          'Residential real estate research, data, analysis, and property-level investment intelligence.',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': ORG_ID },
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Investor Intelligence', path: '/investor-intelligence' },
      ]),
    ],
  }
}

export function categoryJsonLd(category: Category) {
  const url = iiAbsolute(`/investor-intelligence/${category.slug}`)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name: category.headline,
        description: category.metaDescription,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': ORG_ID },
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Investor Intelligence', path: '/investor-intelligence' },
        { name: category.label, path: `/investor-intelligence/${category.slug}` },
      ]),
    ],
  }
}

export function articleJsonLd(article: Article, categoryLabel: string) {
  const url = iiAbsolute(`/investor-intelligence/${article.slug}`)
  const graph: Record<string, unknown>[] = [
    {
      '@type': article.schemaType,
      '@id': `${url}#article`,
      headline: article.headline,
      description: article.metaDescription,
      url,
      mainEntityOfPage: url,
      author: { '@id': PERSON_ID },
      publisher: { '@id': ORG_ID },
      inLanguage: 'en-US',
      ...(article.publishDate ? { datePublished: article.publishDate } : {}),
      ...(article.updatedDate || article.publishDate
        ? { dateModified: article.updatedDate ?? article.publishDate }
        : {}),
    },
    breadcrumbJsonLd([
      { name: 'DealGapIQ', path: '/' },
      { name: 'Investor Intelligence', path: '/investor-intelligence' },
      { name: categoryLabel, path: `/investor-intelligence/${article.category}` },
      { name: article.shortHeadline, path: `/investor-intelligence/${article.slug}` },
    ]),
  ]

  if (article.youtubeVideoId) {
    graph.push({
      '@type': 'VideoObject',
      name: article.headline,
      description: article.summary,
      thumbnailUrl: `https://i.ytimg.com/vi/${article.youtubeVideoId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${article.youtubeVideoId}`,
      ...(article.publishDate ? { uploadDate: article.publishDate } : {}),
    })
  }

  return { '@context': 'https://schema.org', '@graph': graph }
}

export function authorJsonLd() {
  const url = iiAbsolute('/authors/brad-geisen')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${url}#page`,
        url,
        name: 'Brad Geisen — DealGapIQ Investor Intelligence',
        mainEntity: { '@id': PERSON_ID },
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Authors', path: '/authors/brad-geisen' },
        { name: 'Brad Geisen', path: '/authors/brad-geisen' },
      ]),
    ],
  }
}

export function campaignJsonLd() {
  const url = iiAbsolute('/investor-intelligence/great-investor-reset-2026')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name: 'The Great Investor Reset — 2026',
        description:
          'DealGapIQ examines the forces redefining residential investment in 2026.',
        publisher: { '@id': ORG_ID },
      },
      breadcrumbJsonLd([
        { name: 'DealGapIQ', path: '/' },
        { name: 'Investor Intelligence', path: '/investor-intelligence' },
        { name: 'The Great Investor Reset — 2026', path: '/investor-intelligence/great-investor-reset-2026' },
      ]),
    ],
  }
}
