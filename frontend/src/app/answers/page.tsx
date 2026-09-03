import type { Metadata } from 'next'
import Link from 'next/link'
import { INDEXABLE_ROBOTS } from '@/lib/seo/metadata'
import { SITE_URL } from '@/lib/seo/blog-schema'
import { GUARANTEE_LINE, PROBLEM_PAGES } from '@/lib/seo/problem-pages'

const TITLE = 'Investor Questions, Answered on a Real Address'
const DESCRIPTION =
  'Does it cash flow? What should I offer? What is it worth to an investor? Each answer runs on the address you enter. Free verdict, no signup.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/answers' },
  robots: INDEXABLE_ROBOTS,
}

export default function AnswersHubPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/answers`,
    url: `${SITE_URL}/answers`,
    name: TITLE,
    description: DESCRIPTION,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    hasPart: PROBLEM_PAGES.map((p) => ({
      '@type': 'WebPage',
      '@id': `${SITE_URL}/answers/${p.slug}`,
      name: p.problem,
    })),
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
          {TITLE}
        </h1>
        <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
          {DESCRIPTION}
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-body)' }}>
          {GUARANTEE_LINE}
        </p>

        <ul className="mt-10 space-y-3">
          {PROBLEM_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/answers/${p.slug}`}
                className="block rounded-2xl border p-5 transition-colors hover:opacity-90"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
                  {p.problem}
                </span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {p.nextStep}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
