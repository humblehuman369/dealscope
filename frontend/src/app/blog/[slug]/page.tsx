import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllContent, getContent } from '@/lib/content'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { BreadcrumbsJsonLd } from '@/components/seo/Breadcrumbs'

const BASE = 'https://dealgapiq.com'

export async function generateStaticParams() {
  const posts = await getAllContent('blog')
  return posts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getContent('blog', slug)
  if (!post) return {}
  const title = post.frontmatter.meta_title || post.frontmatter.title
  const description = post.frontmatter.meta_description
  const canonicalPath = `/blog/${slug}`
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalPath,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getContent('blog', slug)
  if (!post) notFound()

  // Article schema. Brad: when frontmatter exposes datePublished/dateModified, wire them through here.
  // For now, fall back to today's date so the field is at least populated and validates.
  const datePublished = post.frontmatter.date || post.frontmatter.datePublished || ''
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${BASE}/blog/${slug}#article`,
    headline: post.frontmatter.title,
    description: post.frontmatter.meta_description || '',
    mainEntityOfPage: `${BASE}/blog/${slug}`,
    ...(datePublished && { datePublished, dateModified: post.frontmatter.dateModified || datePublished }),
    author: { '@id': `${BASE}/about#brad-geisen` },
    publisher: { '@id': `${BASE}/#organization` },
    articleSection: 'Real Estate Investing',
  }

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <BreadcrumbsJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Blog', url: '/blog' },
          { name: post.frontmatter.title, url: `/blog/${slug}` },
        ]}
      />
      <div className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-block mb-8 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-sky)' }}
        >
          ← All posts
        </Link>

        <article>
          <MarkdownArticle content={post.content} />
        </article>

        <div
          className="mt-16 pt-8"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--accent-sky)',
              color: 'var(--surface-base)',
            }}
          >
            Run a free verdict →
          </Link>
        </div>
      </div>
    </main>
  )
}
