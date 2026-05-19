import type { MetadataRoute } from 'next'
import { getAllContent, type ContentFile } from '@/lib/content'

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
  { path: '/strategy', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/deal-maker', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/methodology', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/what-is-dealgapiq', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/glossary', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
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

  const [glossary, blog] = await Promise.all([
    getAllContent('glossary').catch(() => []),
    getAllContent('blog').catch(() => []),
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
    priority: 0.6,
  }))

  return [...staticEntries, ...glossaryEntries, ...blogEntries]
}
