import type { Metadata } from 'next'
import { getAllBlogPosts } from '@/lib/content'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { buildBlogCollectionJsonLd, SITE_URL } from '@/lib/seo/blog-schema'
import { BLOG_INDEX_DESCRIPTION, BLOG_INDEX_INTRO, blogPageHref } from '@/lib/blog-index'
import { BlogIndexView, paginate } from '@/components/blog/BlogIndexView'

export const metadata: Metadata = {
  title: 'Real Estate Investing Blog — Deal Analysis & Creative Finance',
  description: BLOG_INDEX_DESCRIPTION,
  alternates: {
    canonical: '/blog',
    types: { 'application/rss+xml': `${SITE_URL}/blog/feed.xml` },
  },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'DealGapIQ Blog — Deal Analysis & Creative Finance for Investors',
    description: BLOG_INDEX_DESCRIPTION,
    url: '/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DealGapIQ Blog — Deal Analysis & Creative Finance for Investors',
    description: BLOG_INDEX_DESCRIPTION,
  },
}

export default async function BlogIndex() {
  const all = await getAllBlogPosts()
  const { items, page, totalPages } = paginate(all, 1)
  const jsonLd = buildBlogCollectionJsonLd({
    url: `${SITE_URL}/blog`,
    name: 'DealGapIQ Blog',
    description: BLOG_INDEX_DESCRIPTION,
    posts: items,
    breadcrumbs: [
      { name: 'Home', item: `${SITE_URL}/` },
      { name: 'Blog', item: `${SITE_URL}/blog` },
    ],
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {totalPages > 1 && <link rel="next" href={`${SITE_URL}${blogPageHref(2)}`} />}
      <BlogIndexView
        title="Blog"
        intro={BLOG_INDEX_INTRO}
        posts={items}
        page={page}
        totalPages={totalPages}
        pageHref={blogPageHref}
        showFeatured
      />
    </>
  )
}
