import { getAllContent } from '@/lib/content'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const posts = await getAllContent('blog')
  const now = new Date().toUTCString()

  const items = posts
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`
      const title = post.frontmatter.title
      const description = post.frontmatter.meta_description || ''
      return `
    <item>
      <title><![CDATA[${title}]]></title>
      <link>${url}</link>
      <description><![CDATA[${description}]]></description>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${now}</pubDate>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DealGapIQ Blog</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml('Real-estate investment analysis, creative-finance teardowns, and pitch scripts.')}</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
