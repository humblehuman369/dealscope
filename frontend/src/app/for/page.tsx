import type { Metadata } from 'next'
import Link from 'next/link'
import { NOINDEX_FOLLOW } from '@/lib/seo/metadata'
import { PERSONA_PAGES } from '@/lib/seo/persona-pages'

const TITLE = 'DealGapIQ for the Way You Invest'
const DESCRIPTION =
  'First deal or fiftieth, house hack or wholesale, in-state or three time zones away. Pick the page written for how you invest.'

// Hub for the ad landing pages. Stays out of the index while the pages it
// links to do; it exists so the breadcrumb and internal links resolve.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/for' },
  robots: NOINDEX_FOLLOW,
}

export default function ForHubPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: 'var(--surface-base)' }}>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-5xl" style={{ color: 'var(--text-heading)' }}>
          {TITLE}
        </h1>
        <p className="mt-4 text-lg" style={{ color: 'var(--text-secondary)' }}>
          {DESCRIPTION}
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-body)' }}>
          Free Discovery. No signup. No card.
        </p>

        <ul className="mt-10 space-y-3">
          {PERSONA_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/for/${p.slug}`}
                className="block rounded-2xl border p-5 transition-colors hover:opacity-90"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--border-default)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
                  {p.headline}
                </span>
                <span className="mt-1 block text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {p.offer.heading}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
