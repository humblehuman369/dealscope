import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getAllBlogPosts } from '@/lib/content'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { BlogIndexView, BLOG_PAGE_SIZE, paginate } from '@/components/blog/BlogIndexView'
import { BLOG_INDEX_DESCRIPTION, BLOG_INDEX_INTRO, blogPageHref } from '@/lib/blog-index'

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const n = Number(raw)
  return n >= 1 ? n : null
}

export async function generateStaticParams() {
  const all = await getAllBlogPosts()
  const totalPages = Math.ceil(all.length / BLOG_PAGE_SIZE)
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ n: String(i + 2) }))
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }): Promise<Metadata> {
  const { n } = await params
  const page = parsePage(n)
  if (!page) return {}
  return {
    title: `Blog — Page ${page}`,
    description: BLOG_INDEX_DESCRIPTION,
    alternates: { canonical: blogPageHref(page) },
    robots: INDEXABLE_ROBOTS,
  }
}

export default async function BlogIndexPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params
  const requested = parsePage(n)
  if (!requested) notFound()
  if (requested === 1) permanentRedirect('/blog')

  const all = await getAllBlogPosts()
  const { items, page, totalPages } = paginate(all, requested)
  if (requested > totalPages) notFound()

  return (
    <>
      <link rel="prev" href={`${SITE_URL}${blogPageHref(page - 1)}`} />
      {page < totalPages && <link rel="next" href={`${SITE_URL}${blogPageHref(page + 1)}`} />}
      <BlogIndexView
        title={`Blog — Page ${page}`}
        intro={BLOG_INDEX_INTRO}
        posts={items}
        page={page}
        totalPages={totalPages}
        pageHref={blogPageHref}
      />
    </>
  )
}
