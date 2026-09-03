import { getAllBlogPosts, getBlogPost } from '@/lib/content'
import { getBlogCategory } from '@/lib/blog-categories'
import { OG_CONTENT_TYPE, OG_SIZE, renderBlogCard } from '@/lib/og/blog-card'

export const alt = 'DealGapIQ blog article cover'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map((p) => ({ slug: p.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  const fm = post?.frontmatter
  const category = fm?.category ? getBlogCategory(fm.category) : null
  return renderBlogCard({
    title: fm?.title ?? 'DealGapIQ Blog',
    eyebrow: category?.label ?? 'Blog',
    author: fm?.author,
    readTime: fm?.read_time,
    footer: `dealgapiq.com/blog/${slug}`,
  })
}
