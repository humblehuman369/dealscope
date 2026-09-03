import { BLOG_CATEGORY_SLUGS, getBlogCategory } from '@/lib/blog-categories'
import { OG_CONTENT_TYPE, OG_SIZE, renderBlogCard } from '@/lib/og/blog-card'

export const alt = 'DealGapIQ blog category cover'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((category) => ({ category }))
}

export default async function Image({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  const category = getBlogCategory(slug)
  return renderBlogCard({
    title: category?.description ?? 'DealGapIQ Blog',
    eyebrow: category?.label ?? 'Blog',
    footer: `dealgapiq.com/blog/category/${slug}`,
  })
}
