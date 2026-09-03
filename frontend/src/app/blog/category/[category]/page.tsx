import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostsByCategory } from '@/lib/content'
import { BLOG_CATEGORY_SLUGS, getBlogCategory } from '@/lib/blog-categories'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { buildBlogCollectionJsonLd, SITE_URL } from '@/lib/seo/blog-schema'
import { BlogIndexView } from '@/components/blog/BlogIndexView'
import { BlogViewTracker } from '@/components/blog/BlogViewTracker'

export function generateStaticParams() {
  return BLOG_CATEGORY_SLUGS.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category: slug } = await params
  const category = getBlogCategory(slug)
  if (!category) return {}
  const title = `${category.label} — Real Estate Investing Articles`
  return {
    title,
    description: category.description,
    alternates: { canonical: `/blog/category/${category.slug}` },
    robots: INDEXABLE_ROBOTS,
    openGraph: {
      title: `${category.label} — DealGapIQ Blog`,
      description: category.description,
      url: `/blog/category/${category.slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.label} — DealGapIQ Blog`,
      description: category.description,
    },
  }
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params
  const category = getBlogCategory(slug)
  if (!category) notFound()

  const posts = await getPostsByCategory(category.slug)
  const url = `${SITE_URL}/blog/category/${category.slug}`
  const jsonLd = buildBlogCollectionJsonLd({
    url,
    name: `${category.label} — DealGapIQ Blog`,
    description: category.description,
    posts,
    breadcrumbs: [
      { name: 'Home', item: `${SITE_URL}/` },
      { name: 'Blog', item: `${SITE_URL}/blog` },
      { name: category.label, item: url },
    ],
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogViewTracker event="blog_category_viewed" category={category.slug} />
      <BlogIndexView
        eyebrow="Blog category"
        title={category.label}
        intro={category.description}
        posts={posts}
        page={1}
        totalPages={1}
        pageHref={() => `/blog/category/${category.slug}`}
        activeCategory={category.slug}
        pillar={{ href: category.pillarHref, label: category.pillarLabel }}
      />
    </>
  )
}
