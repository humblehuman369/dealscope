import Link from 'next/link'
import { INDEXABLE_SITE_SECTIONS } from '@/lib/seo/indexable-routes'

type SiteLink = { href: string; label: string }

/** Crawlable internal links for pages discovered via sitemap but not yet indexed. */
export function ExploreDealGapIQSection() {
  const primary: SiteLink[] = INDEXABLE_SITE_SECTIONS.flatMap((s) => [...s.links]).slice(0, 12)

  return (
    <section
      className="border-t border-[var(--border-default)] bg-[var(--surface-card)] py-14"
      aria-labelledby="explore-dealgapiq-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="explore-dealgapiq-heading"
              className="text-2xl font-bold text-[var(--text-heading)] md:text-3xl"
            >
              Explore DealGapIQ
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[var(--text-secondary)]">
              Guides, strategy playbooks, glossary, and product pages — everything you need before
              you run your first Discovery.
            </p>
          </div>
          <Link
            href="/learn"
            className="text-sm font-bold text-[var(--accent-sky)] hover:underline shrink-0"
          >
            View all pages →
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] px-4 py-3 text-sm font-semibold text-[var(--text-body)] transition-colors hover:border-[var(--accent-sky)] hover:text-[var(--text-heading)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
