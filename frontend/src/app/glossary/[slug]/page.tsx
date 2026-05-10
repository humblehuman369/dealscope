import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllContent, getContent } from '@/lib/content'
import { MarkdownArticle } from '@/components/blog/MarkdownArticle'

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

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

function formatDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function GlossaryTerm({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const term = await getContent('glossary', slug)
  if (!term) notFound()

  const fm = term.frontmatter
  const author = fm.author || 'Brad Geisen'
  const datePublished = fm.date_published
  const dateModified = fm.date_modified || fm.date_published
  const publishedLabel = formatDate(datePublished)
  const modifiedLabel = formatDate(dateModified)

  const url = `${SITE_URL}/glossary/${slug}`
  const description =
    fm.meta_description ||
    `Definition and worked example of ${fm.title} from DealGapIQ.`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        '@id': `${url}#term`,
        name: fm.title,
        description,
        termCode: slug,
        url,
        inDefinedTermSet: `${SITE_URL}/glossary#termset`,
      },
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: fm.title,
        name: fm.title,
        description,
        url,
        mainEntityOfPage: url,
        about: { '@id': `${url}#term` },
        author: {
          '@type': 'Person',
          '@id': `${SITE_URL}/about#brad-geisen`,
          name: author,
          url: `${SITE_URL}/about`,
        },
        publisher: { '@id': `${SITE_URL}/#organization` },
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        inLanguage: 'en-US',
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', 'article p:first-of-type'],
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Glossary', item: `${SITE_URL}/glossary` },
          { '@type': 'ListItem', position: 3, name: fm.title, item: url },
        ],
      },
    ],
  }

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: 'var(--surface-base)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

          <div
            className="mt-10 pt-6 text-sm text-slate-500"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p>
              By{' '}
              <Link
                href="/about"
                className="font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent-sky)' }}
              >
                {author}
              </Link>
              {publishedLabel && (
                <>
                  {' · '}
                  <time dateTime={datePublished}>Published {publishedLabel}</time>
                </>
              )}
              {modifiedLabel && modifiedLabel !== publishedLabel && (
                <>
                  {' · '}
                  <time dateTime={dateModified}>Updated {modifiedLabel}</time>
                </>
              )}
            </p>
          </div>
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
