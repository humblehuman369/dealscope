import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllContent, getContent } from '@/lib/content'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'

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
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${slug}`,
      type: 'article',
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

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
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
