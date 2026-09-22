import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/JsonLd'
import { buildComparisonJsonLd } from '@/lib/seo/comparison-schema'
import type { FaqItem } from '@/lib/seo/metadata'

export type ComparisonSection = {
  /** Question heading (`<h2>`). */
  heading: string
  /** Paragraphs; the first one is the direct answer. */
  paragraphs: string[]
}

export type ComparisonTableRow = {
  label: string
  dealgapiq: string
  competitor: string
}

export type ComparisonSource = {
  label: string
  url: string
  /** YYYY-MM-DD the page was read. */
  accessed: string
}

export type ComparisonPageConfig = {
  slug: string
  competitor: string
  metadata: Metadata
  /** H1 and `Article.headline`. */
  headline: string
  /** First `<p>` after the H1: the direct answer. */
  lede: string
  sections: ComparisonSection[]
  table: ComparisonTableRow[]
  /** Vendor pages read for the competitor column, with the date read. */
  sources: ComparisonSource[]
  faq: FaqItem[]
  /** YYYY-MM-DD */
  datePublished: string
  /** YYYY-MM-DD; bump when competitor prices are re-checked. */
  dateModified: string
}

/** Every comparison page, for the "More comparisons" nav. Keep in sync with `COMPARISON_PAGES`. */
export const COMPARISON_LINKS = [
  { href: '/comparisons/dealgapiq-vs-dealcheck', label: 'vs DealCheck' },
  { href: '/comparisons/dealgapiq-vs-propstream', label: 'vs PropStream' },
  { href: '/comparisons/dealgapiq-vs-dealmachine', label: 'vs DealMachine' },
  { href: '/comparisons/dealgapiq-vs-mashvisor', label: 'vs Mashvisor' },
] as const

/** "September 2026" from "2026-09-22". */
export function monthYearLabel(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function priceFootnote(isoDate: string): string {
  return `Third-party prices from public review sites, ${monthYearLabel(isoDate)}; check each vendor.`
}

export function ComparisonPage({ config }: { config: ComparisonPageConfig }) {
  const footnote = priceFootnote(config.dateModified)

  return (
    <main className="min-h-screen bg-[var(--surface-base)] px-6 py-16 text-[var(--text-body)]">
      <JsonLd data={buildComparisonJsonLd(config)} />
      <article className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--accent-sky)]">
          Comparisons
        </p>
        <h1 className="mb-6 text-3xl font-bold text-[var(--text-heading)] md:text-4xl">
          {config.headline}
        </h1>
        <p className="mb-4 text-lg leading-relaxed text-[var(--text-body)]">{config.lede}</p>
        <p className="mb-10 text-sm text-[var(--text-muted)]">
          Updated{' '}
          <time dateTime={config.dateModified}>
            {new Date(`${config.dateModified}T12:00:00Z`).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </time>
        </p>

        {config.sections.map((section) => (
          <section key={section.heading} className="mb-10">
            <h2 className="mb-3 text-xl font-bold text-[var(--text-heading)] md:text-2xl">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mb-3 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-[var(--text-heading)] md:text-2xl">
            How do DealGapIQ and {config.competitor} compare side by side?
          </h2>
          <p className="mb-4 leading-relaxed">
            The table lists what each product publishes on its own site. A cell reads
            &ldquo;Not listed&rdquo; when the vendor does not state the feature publicly.
          </p>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-section)]">
                    <th scope="col" className="w-2/5 px-5 py-3 font-bold text-[var(--text-heading)]">
                      Capability
                    </th>
                    <th scope="col" className="px-5 py-3 font-bold text-[var(--accent-sky)]">
                      DealGapIQ
                    </th>
                    <th scope="col" className="px-5 py-3 font-bold text-[var(--text-heading)]">
                      {config.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {config.table.map((row) => (
                    <tr key={row.label} className="align-top">
                      <th scope="row" className="px-5 py-3 font-semibold text-[var(--text-body)]">
                        {row.label}
                      </th>
                      <td className="px-5 py-3 text-[var(--text-body)]">{row.dealgapiq}</td>
                      <td className="px-5 py-3 text-[var(--text-body)]">{row.competitor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--text-muted)]">{footnote}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Sources for the {config.competitor} column:{' '}
            {config.sources.map((source, index) => (
              <span key={source.url}>
                {index > 0 ? '; ' : ''}
                <a
                  href={source.url}
                  rel="nofollow noopener"
                  target="_blank"
                  className="underline hover:text-[var(--text-body)]"
                >
                  {source.label}
                </a>{' '}
                (read {source.accessed})
              </span>
            ))}
            .
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xl font-bold text-[var(--text-heading)] md:text-2xl">
            Frequently asked questions
          </h2>
          {config.faq.map((item) => (
            <div key={item.question} className="mb-5">
              <h3 className="mb-1 font-bold text-[var(--text-heading)]">{item.question}</h3>
              <p className="leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/discovery"
            className="rounded-2xl bg-[var(--accent-sky)] px-6 py-3 text-sm font-bold text-[var(--text-inverse)]"
          >
            Run a free discovery
          </Link>
          <Link
            href="/pricing"
            className="rounded-2xl border border-[var(--border-default)] px-6 py-3 text-sm font-bold text-[var(--text-heading)]"
          >
            See pricing
          </Link>
        </div>

        <nav className="mt-12 border-t border-[var(--border-default)] pt-8 text-sm">
          <p className="mb-3 font-semibold text-[var(--text-muted)]">More comparisons</p>
          <div className="flex flex-wrap gap-4">
            {COMPARISON_LINKS.filter((link) => link.href !== `/comparisons/${config.slug}`).map((link) => (
              <Link key={link.href} href={link.href} className="text-[var(--accent-sky)] hover:underline">
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </article>
    </main>
  )
}
