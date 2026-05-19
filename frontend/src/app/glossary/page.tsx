import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllContent } from '@/lib/content'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

export const metadata: Metadata = {
  title: 'Glossary of Creative Finance Terms — DealGapIQ',
  description:
    'Plain-English definitions of the creative-finance structures active investors use: Subject-To, seller carrybacks, 0% 2nds, the Morby Method, FHA house-hack, and more.',
  alternates: { canonical: '/glossary' },
  robots: INDEXABLE_ROBOTS,
  openGraph: {
    title: 'Glossary of Creative Finance Terms — DealGapIQ',
    description:
      'Plain-English definitions of the creative-finance structures active investors use.',
    url: '/glossary',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Glossary of Creative Finance Terms — DealGapIQ',
    description:
      'Plain-English definitions of the creative-finance structures active investors use.',
  },
}

export default async function GlossaryIndex() {
  const terms = await getAllContent('glossary')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTermSet',
        '@id': `${SITE_URL}/glossary#termset`,
        name: 'DealGapIQ Real Estate & Creative Finance Glossary',
        description:
          'Plain-English definitions of the creative-finance structures active residential investors use.',
        url: `${SITE_URL}/glossary`,
        publisher: { '@id': `${SITE_URL}/#organization` },
        hasDefinedTerm: terms.map((t) => ({
          '@type': 'DefinedTerm',
          '@id': `${SITE_URL}/glossary/${t.slug}#term`,
          name: t.frontmatter.title,
          url: `${SITE_URL}/glossary/${t.slug}`,
          ...(t.frontmatter.meta_description
            ? { description: t.frontmatter.meta_description }
            : {}),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Glossary', item: `${SITE_URL}/glossary` },
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
        <header className="mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ color: 'var(--text-heading)' }}
          >
            Glossary of Creative Finance Terms
          </h1>
          <p className="text-lg sm:text-xl" style={{ color: 'var(--text-secondary)' }}>
            Plain-English definitions of the structures investors actually use to close deals.
          </p>
        </header>

        {terms.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Glossary coming soon.</p>
        ) : (
          <div className="space-y-6">
            {terms.map((term) => (
              <article
                key={term.slug}
                className="pb-6"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Link href={`/glossary/${term.slug}`} className="group block">
                  <h2
                    className="text-xl sm:text-2xl font-semibold mb-2 group-hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {term.frontmatter.title}
                  </h2>
                  {term.frontmatter.meta_description && (
                    <p
                      className="text-base leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {term.frontmatter.meta_description}
                    </p>
                  )}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
