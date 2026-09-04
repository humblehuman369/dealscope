import { getAllBlogPosts } from '@/lib/content'
import type { BlogCalendarItem } from '@/features/admin/components/marketing'
import { MarketingOpsDashboard } from './MarketingOpsDashboard'

// Server component: blog dates come from frontend/content (filesystem), which
// the backend never sees. Everything else is fetched client-side by the
// dashboard against /api/v1/admin/marketing/*.
export default async function AdminMarketingPage() {
  const posts = await getAllBlogPosts()
  const blog: BlogCalendarItem[] = posts
    .filter((p) => Boolean(p.frontmatter.date_published))
    .map((p) => ({
      slug: p.slug,
      title: p.frontmatter.title,
      date_published: p.frontmatter.date_published as string,
    }))
  return <MarketingOpsDashboard blog={blog} />
}
