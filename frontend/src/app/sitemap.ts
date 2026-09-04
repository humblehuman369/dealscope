import type { MetadataRoute } from 'next'
import { getAllContent, type ContentFile } from '@/lib/content'
import { BLOG_CATEGORY_SLUGS } from '@/lib/blog-categories'
import { BLOG_PAGE_SIZE } from '@/components/blog/BlogIndexView'
import { blogPageHref } from '@/lib/blog-index'
import { fetchStateMarkets } from '@/lib/markets'
import { PERSONA_PAGES } from '@/lib/seo/persona-pages'
import { PROBLEM_PAGES } from '@/lib/seo/problem-pages'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

type StaticEntry = {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}

const STATIC_ROUTES: StaticEntry[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/learn', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/discovery', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/deal-maker', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/methodology', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/what-is-dealgapiq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/glossary', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/markets', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/markets/near-me', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/answers', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/investor-intelligence', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/help', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/national-averages', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/legal/find-attorney', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/comparisons/dealgapiq-vs-dealcheck', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/comparisons/dealgapiq-vs-mashvisor', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/comparisons/dealgapiq-vs-propstream', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/long-term-rental', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/short-term-rental', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/brrrr', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/fix-flip', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/house-hack', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/strategies/wholesale', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/disclosures', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

function lastModifiedFromContent(item: ContentFile, fallback: Date): Date {
  const raw = item.frontmatter.date_modified ?? item.frontmatter.date_published
  if (!raw) return fallback
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildDate = new Date()

  const [glossary, blog, investorIntelligence, stateMarkets] = await Promise.all([
    getAllContent('glossary').catch(() => []),
    getAllContent('blog').catch(() => []),
    getAllContent('investor-intelligence').catch(() => []),
    fetchStateMarkets(),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: buildDate,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const glossaryEntries: MetadataRoute.Sitemap = glossary.map((t) => ({
    url: `${SITE_URL}/glossary/${t.slug}`,
    lastModified: lastModifiedFromContent(t, buildDate),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const blogEntries: MetadataRoute.Sitemap = blog.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: lastModifiedFromContent(p, buildDate),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const newestBlogDate = blog.reduce<Date>(
    (latest, p) => {
      const d = lastModifiedFromContent(p, latest)
      return d > latest ? d : latest
    },
    new Date(0),
  )
  const blogHubDate = newestBlogDate.getTime() > 0 ? newestBlogDate : buildDate

  const blogCategoryEntries: MetadataRoute.Sitemap = BLOG_CATEGORY_SLUGS.map((slug) => ({
    url: `${SITE_URL}/blog/category/${slug}`,
    lastModified: blogHubDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const blogPageCount = Math.ceil(blog.length / BLOG_PAGE_SIZE)
  const blogPaginationEntries: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, blogPageCount - 1) },
    (_, i) => ({
      url: `${SITE_URL}${blogPageHref(i + 2)}`,
      lastModified: blogHubDate,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }),
  )

  // Only states that pass the backend's indexability guard belong in the
  // sitemap; the rest render noindex. No backend at build time → no state URLs.
  const marketEntries: MetadataRoute.Sitemap = (stateMarkets ?? [])
    .filter((s) => s.indexable)
    .map((s) => ({
      url: `${SITE_URL}/markets/${s.slug}`,
      lastModified: buildDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))

  const answerEntries: MetadataRoute.Sitemap = PROBLEM_PAGES.map((p) => ({
    url: `${SITE_URL}/answers/${p.slug}`,
    lastModified: buildDate,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  // Persona listicle pages are ad landers; only the ones promoted to
  // `indexable` belong in the sitemap.
  const personaEntries: MetadataRoute.Sitemap = PERSONA_PAGES.filter((p) => p.indexable).map((p) => ({
    url: `${SITE_URL}/for/${p.slug}`,
    lastModified: buildDate,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const investorIntelligenceEntries: MetadataRoute.Sitemap = investorIntelligence.map((p) => ({
    url: `${SITE_URL}/investor-intelligence/${p.slug}/`,
    lastModified: lastModifiedFromContent(p, buildDate),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    ...staticEntries,
    ...glossaryEntries,
    ...blogEntries,
    ...blogCategoryEntries,
    ...blogPaginationEntries,
    ...marketEntries,
    ...answerEntries,
    ...personaEntries,
    ...investorIntelligenceEntries,
  ]
}
