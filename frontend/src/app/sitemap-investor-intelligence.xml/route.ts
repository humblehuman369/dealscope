import { ARTICLES, CATEGORIES, FEATURED_MARKETS, SITE_URL } from '@/lib/investor-intelligence'

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10)
  const urls = [
    '/investor-intelligence',
    '/investor-intelligence/methodology',
    '/investor-intelligence/great-investor-reset-2026',
    '/authors/brad-geisen',
    ...CATEGORIES.map((c) => `/investor-intelligence/${c.slug}`),
    ...ARTICLES.map((a) => `/investor-intelligence/${a.slug}`),
    ...FEATURED_MARKETS.map((m) => `/investor-intelligence/markets/${m.slug}`),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
