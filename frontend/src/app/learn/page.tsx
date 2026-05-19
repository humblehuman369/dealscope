import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllContent } from '@/lib/content'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { INDEXABLE_SITE_SECTIONS } from '@/lib/seo/indexable-routes'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://dealgapiq.com'

export const metadata: Metadata = {
  title: 'Site Map — DealGapIQ Pages & Guides',
  description:
    'Browse all DealGapIQ marketing pages: Discovery, Strategy, pricing, six investment strategy guides, glossary, blog, methodology, and comparisons.',
  alternates: { canonical: '/learn' },
  robots: INDEXABLE_ROBOTS,
}

export default async function LearnHubPage() {
  const [glossary, blog] = await Promise.all([
    getAllContent('glossary').catch(() => []),
    getAllContent('blog').catch(() => []),
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/learn`,
    url: `${SITE_URL}/learn`,
    name: 'DealGapIQ site map',
    description: 'Index of public DealGapIQ pages for investors.',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  }

  return (
    <main className="min-h-screen bg-[var(--surface-base)] px-6 py-16 text-[var(--text-body)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-4 text-3xl font-bold text-[var(--text-heading)] md:text-4xl">
          Explore DealGapIQ
        </h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
          Every public page on DealGapIQ — product overview, strategy guides, glossary, blog, and
          help. Use this hub to find the right resource before you analyze a property.
        </p>

        <div className="grid gap-10 md:grid-cols-2">
          {INDEXABLE_SITE_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
                {section.title}
              </h2>
              <ul className="space-y-2 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-medium text-[var(--accent-sky)] hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {blog.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
              Blog posts
            </h2>
            <ul className="space-y-2 text-sm">
              {blog.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-medium text-[var(--accent-sky)] hover:underline"
                  >
                    {post.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {glossary.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">
              Glossary terms
            </h2>
            <ul className="space-y-2 text-sm">
              {glossary.map((term) => (
                <li key={term.slug}>
                  <Link
                    href={`/glossary/${term.slug}`}
                    className="font-medium text-[var(--accent-sky)] hover:underline"
                  >
                    {term.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-sm text-[var(--text-muted)]">
          <Link href="/" className="text-[var(--accent-sky)] hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
