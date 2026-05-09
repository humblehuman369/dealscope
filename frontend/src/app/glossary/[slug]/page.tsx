import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllContent, getContent } from '@/lib/content'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'
import { BreadcrumbsJsonLd } from '@/components/seo/Breadcrumbs'

const BASE = 'https://dealgapiq.com'

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
  const canonicalPath = `/glossary/${slug}`
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

export default async function GlossaryTerm({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const term = await getContent('glossary', slug)
  if (!term) notFound()

  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${BASE}/glossary/${slug}#term`,
    name: term.frontmatter.title,
    description: term.frontmatter.meta_description || '',
    url: `${BASE}/glossary/${slug}`,
    inDefinedTermSet: `${BASE}/glossary#termset`,
  }

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd) }}
      />
      <BreadcrumbsJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Glossary', url: '/glossary' },
          { name: term.frontmatter.title, url: `/glossary/${slug}` },
        ]}
      />
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
