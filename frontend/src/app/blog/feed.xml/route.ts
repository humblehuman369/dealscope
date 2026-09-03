import { getAllBlogPosts } from '@/lib/content'
import { getBlogCategory } from '@/lib/blog-categories'
import { BLOG_INDEX_DESCRIPTION } from '@/lib/blog-index'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function rfc822(raw: string | undefined, fallback: Date): string {
  if (!raw) return fallback.toUTCString()
  const d = new Date(`${raw}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? fallback.toUTCString() : d.toUTCString()
}

export async function GET() {
  const posts = await getAllBlogPosts()
  const now = new Date()
  // Posts are already newest-first; the feed's build date is the latest change, not "now".
  const latest = posts
    .map((p) => p.frontmatter.date_modified ?? p.frontmatter.date_published)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)

  const items = posts
    .map((post) => {
      const url = `${BASE_URL}/blog/${post.slug}`
      const fm = post.frontmatter
      const category = fm.category ? getBlogCategory(fm.category) : null
      return `
    <item>
      <title><![CDATA[${fm.title}]]></title>
      <link>${url}</link>
      <description><![CDATA[${fm.meta_description || ''}]]></description>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(fm.date_published, now)}</pubDate>
      <atom:updated>${fm.date_modified ?? fm.date_published ?? ''}</atom:updated>${
        fm.author ? `\n      <dc:creator><![CDATA[${fm.author}]]></dc:creator>` : ''
      }${category ? `\n      <category><![CDATA[${category.label}]]></category>` : ''}
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>DealGapIQ Blog</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(BLOG_INDEX_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(latest, now)}</lastBuildDate>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
