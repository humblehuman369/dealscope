import { ARTICLES, SITE_URL } from '@/lib/investor-intelligence'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildFeed(): string {
  const now = new Date().toUTCString()
  const items = ARTICLES.map((article) => {
    const url = `${SITE_URL}/investor-intelligence/${article.slug}`
    const pub = article.publishDate ? new Date(article.publishDate).toUTCString() : now
    return `
    <item>
      <title><![CDATA[${article.headline}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description><![CDATA[${article.metaDescription}]]></description>
      <category>${escapeXml(article.displayCategory ?? article.category)}</category>
      <pubDate>${pub}</pubDate>
    </item>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DealGapIQ Investor Intelligence</title>
    <link>${SITE_URL}/investor-intelligence</link>
    <atom:link href="${SITE_URL}/investor-intelligence/feed" rel="self" type="application/rss+xml" />
    <description>${escapeXml('Residential real estate investor research, market intelligence, and Deal Gap analysis.')}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>${items}
  </channel>
</rss>`
}

export function GET() {
  return new Response(buildFeed(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
