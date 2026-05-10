import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllContent, getContent } from '@/lib/content'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'

export async function generateStaticParams() {
  const terms = await getAllContent('glossary')
  return terms.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const term = await getContent('glossary', slug)
  if (!term) return {}
  const title = term.frontmatter.meta_title || term.frontmatter.title
  const description = term.frontmatter.meta_description
  return {
    title,
    description,
    alternates: { canonical: `/glossary/${slug}` },
    openGraph: {
      title,
      description,
      url: `/glossary/${slug}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function GlossaryTerm({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const term = await getContent('glossary', slug)
  if (!term) notFound()

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
      <div className="max-w-3xl mx-auto">
        <Link
          href="/glossary"
          className="inline-block mb-8 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-sky)' }}
        >
          ← All terms
        </Link>

        <article>
          <MarkdownArticle content={term.content} />
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
